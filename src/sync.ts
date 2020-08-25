import { google } from 'googleapis';
import { parse } from './csv';
import ora from 'ora';
import { getTaskLists, getTasks, createTaskList } from './tasks';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';

interface SyncOptions {
  dryrun: boolean;
}

// TODO:
// function readFile(): Promise<

export async function syncData(
  csvPath: string,
  oauth2Client: OAuth2Client,
  options: SyncOptions
): Promise<void> {
  const spinner = ora('Authorizing with Google.').start();
  const service = google.tasks({ version: 'v1', auth: oauth2Client });
  spinner.succeed('Authorized with Google.');

  spinner.start('Loading task lists.');

  const lists = await getTaskLists(service);
  spinner.succeed(`Loaded ${lists.length} task lists.`);
  spinner.start('Loading task data');
  const data = await parse(path.join(process.cwd(), csvPath));

  spinner.succeed(`Got ${data.length} tasks to create.`);
  if (data.length === 0) return;

  const listIds = new Map<string, string>();
  const tasks = new Map<string, Set<string>>();

  for (const list of lists) {
    spinner.start(`Loading existing tasks for "${list.title!}" list.`);
    const existing = await getTasks(service, list.id!);
    spinner.succeed(
      `Loaded ${existing.length} existing tasks for "${list.title!}" list.`
    );

    const existingSet = new Set<string>();
    for (const task of existing) {
      existingSet.add(task.title!);
    }

    listIds.set(list.title!, list.id!);
    tasks.set(list.id!, existingSet);
  }

  for (const task of data) {
    let listId;
    if (!listIds.has(task.list)) {
      spinner.info(`"${task.list}" list does not exist, creating it.`);
      spinner.start(`Creating "${task.list}" list`);
      listId = await createTaskList(service, task.list);
      listIds.set(task.list, listId);
      spinner.succeed(`Created "${task.list}" list.`);
    } else {
      listId = listIds.get(task.list);
    }

    const title =
      'prefix' in task && !!task.prefix ? `${task.prefix} - ${task.name}` : task.name;
    spinner.start(`Creating "${title}" in "${task.list}" list.`);
    if (tasks.has(listId) && tasks.get(listId)!.has(title)) {
      spinner.info(
        `Skipping creating "${title}" in "${task.list}" list, since it already exists.`
      );
    } else {
      if (!options.dryrun) {
        await service.tasks.insert({
          tasklist: listId,
          requestBody: {
            title,
            due: task.date.toISOString(),
            notes: task.notes
          }
        });
      }
      spinner.succeed(`Created "${title}" in "${task.list}" list.`);
    }
  }
  spinner.succeed('Done creating tasks.');
  spinner.stop();
}

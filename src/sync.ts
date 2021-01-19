import { google } from 'googleapis';
import { parse } from './csv';
import ora from 'ora';
import { getTaskLists, getTasks, createTaskList } from './tasks';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { TaskList } from './types';

interface SyncOptions {
  dryrun: boolean;
}

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

  // list name/ list title -> TaskList
  const listNameToList = new Map<string, { list: TaskList; loadedTasks: boolean }>(
    lists.map((item) => [item.title!, { list: item, loadedTasks: false }])
  );
  // List -> set of task names
  const tasks = new Map<string, Set<string>>();

  const loadTasks = async (listName: string): Promise<TaskList> => {
    const value = listNameToList.get(listName);
    if (!value) throw new TypeError('List not found.');

    const { list } = value;

    spinner.start(`Loading existing tasks for "${list.title!}" list.`);
    const existing = await getTasks(service, list.id!);
    spinner.succeed(
      `Loaded ${existing.length} existing tasks for "${list.title!}" list.`
    );

    const existingSet = new Set<string>();
    for (const task of existing) {
      existingSet.add(task.title!);
    }

    listNameToList.set(listName, { list, loadedTasks: true });
    tasks.set(list.id!, existingSet);

    return list;
  };

  for (const task of data) {
    let listId;

    // Create list if not found in api
    if (!listNameToList.has(task.list)) {
      spinner.info(`"${task.list}" list does not exist, creating it.`);
      spinner.start(`Creating "${task.list}" list`);
      const list = await createTaskList(service, task.list);
      listId = list.id;
      tasks.set(listId, new Set());
      listNameToList.set(task.list, { list, loadedTasks: true });
      spinner.succeed(`Created "${task.list}" list.`);
    } else {
      // check if loaded if not load in tasks
      const { list, loadedTasks } = listNameToList.get(task.list)!;
      if (!loadedTasks) {
        listId = (await loadTasks(task.list)).id;
      } else {
        listId = list.id;
      }
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

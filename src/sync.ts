import { google, sheets_v4, tasks_v1 } from 'googleapis';
import { parse } from './csv';
import ora from 'ora';
import { getTaskLists, getTasks, createTaskList } from './google';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { CleanWantedTask, Task, TaskList } from './types';

interface SyncOptions {
  dryrun: boolean;
}

class TaskService {
  private listTitleToTask = new Map<string, TaskList>();
  // No not found then list has not loaded tasks from api
  private listTitleToTasknames = new Map<string, Set<string>>();

  constructor(
    private readonly service: tasks_v1.Tasks,
    public readonly spinner?: ora.Ora
  ) {}

  public async loadLists(): Promise<void> {
    this.spinner?.start('Loading task lists.');
    const lists = await getTaskLists(this.service);

    lists.forEach((list) => this.listTitleToTask.set(list.title!, list));

    this.spinner?.succeed(`Loaded ${lists.length} task lists.`);
  }

  public async loadTasks(listTitle: string): Promise<Set<string>> {
    const list = this.listTitleToTask.get(listTitle);
    if (!list) throw new TypeError('List not found.');

    this.spinner?.start(`Loading existing tasks for "${list.title!}" list.`);
    const existing = await getTasks(this.service, list.id!);
    this.spinner?.succeed(
      `Loaded ${existing.length} existing tasks for "${list.title!}" list.`
    );

    const taskTitleSet = new Set<string>();
    for (const task of existing) {
      taskTitleSet.add(task.title!);
    }

    this.listTitleToTasknames.set(listTitle, taskTitleSet);

    return taskTitleSet;
  }

  public async getList(
    listTitle: string
  ): Promise<{ list: TaskList; taskSet: Set<string> } | undefined> {
    const list = this.listTitleToTask.get(listTitle);
    if (!list) return undefined;

    const taskTitleSet = !this.listTitleToTasknames.has(listTitle)
      ? await this.loadTasks(listTitle)
      : this.listTitleToTasknames.get(listTitle)!;

    return { list, taskSet: taskTitleSet };
  }

  public async createList(listTitle: string): Promise<TaskList> {
    this.spinner?.info(`"${listTitle}" list does not exist, creating it.`);
    // this.spinner?.start(`Creating "${listTitle}" list`);
    const list = await createTaskList(this.service, listTitle);

    this.listTitleToTask.set(listTitle, list);
    this.listTitleToTasknames.set(listTitle, new Set());

    this.spinner?.succeed(`Created "${listTitle}" list.`);

    return list;
  }

  public async createTask(
    listTitle: string,
    body: Pick<Required<Task>, 'title' | 'due' | 'notes'>,
    options: {
      // Creates task if already found by title
      recreate?: boolean;
      // Creates a list and adds task to the list if list title is not found
      upsertList?: boolean;
    } = {}
  ): Promise<void> {
    const { recreate = false, upsertList = true } = options;

    let list = this.listTitleToTask.get(listTitle);
    if (!list) {
      if (!upsertList) throw new TypeError(`List with title "${listTitle}" not found.`);
      list = await this.createList(listTitle);
    }

    this.spinner?.start(`Creating "${body.title}" in "${list.title}" list.`);
    if (
      recreate ||
      !(
        // Get existing tasks and check if task title already exists
        (
          this.listTitleToTasknames.get(listTitle) ?? (await this.loadTasks(listTitle))
        ).has(body.title!)
      )
    ) {
      await this.service.tasks.insert({
        tasklist: list.id!,
        requestBody: body
      });
      this.spinner?.succeed(`Created "${body.title}" in "${list.title}" list.`);
    } else {
      this.spinner?.info(
        `Skipping creating "${body.title}" in "${list.title}" list, since it already exists.`
      );
    }
  }
}

export async function syncRawData(service: tasks_v1.Tasks, data: CleanWantedTask[]) {
  const spinner = ora().start();

  spinner.succeed(`Got ${data.length} tasks to create.`);
  if (data.length === 0) return;

  const taskService = new TaskService(service, spinner);

  await taskService.loadLists();

  for (const task of data) {
    const body = {
      title: task.name,
      due: task.date.toISOString(),
      notes: task.notes ?? ''
    };

    await taskService.createTask(task.list, body);
  }
  spinner.succeed('Done creating tasks.');
  spinner.stop();
}

export async function syncCsvData(
  csvPath: string,
  oauth2Client: OAuth2Client,
  options: SyncOptions
): Promise<void> {
  const service = google.tasks({ version: 'v1', auth: oauth2Client });
  const data = await parse(path.join(process.cwd(), csvPath));

  return syncRawData(service, (data as unknown) as CleanWantedTask[]);
}

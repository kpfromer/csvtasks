import fs from 'fs';
import readline from 'readline';
import { tasks_v1 } from 'googleapis';

const getArray = <T>(value: T[] | undefined): T[] => (!!value ? value : []);

export const readFile = (file: string): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    fs.readFile(file, (error, content) => (!!error ? reject(error) : resolve(content)))
  );
export const writeFile = (file: string, data: string): Promise<void> =>
  new Promise((resolve, reject) =>
    fs.writeFile(file, data, (error) => {
      if (error) return reject(error);
      resolve();
    })
  );

export const question = (ask: string): Promise<string> =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(ask, (code) => {
      rl.close();
      resolve(code);
    });
  });

export const createTaskList = async (
  service: tasks_v1.Tasks,
  name: string
): Promise<string> => {
  const { id } = (
    await service.tasklists.insert({
      requestBody: { title: name }
    })
  ).data;
  if (!id) throw new Error('Failed to create task list.');
  return id;
};

export const getTaskLists = async (
  service: tasks_v1.Tasks
): Promise<tasks_v1.Schema$TaskList[]> => {
  const { items } = (await service.tasklists.list({ maxResults: 100 })).data;
  return items === undefined ? [] : items;
};

export const getTasks = async (
  service: tasks_v1.Tasks,
  tasklistId: string
): Promise<tasks_v1.Schema$Task[]> => {
  let items: tasks_v1.Schema$Task[] = [];
  let nextPageToken: string | undefined | null = undefined;

  do {
    const { items: newItems, nextPageToken: newToken } = (
      await service.tasks.list({
        maxResults: 100,
        showCompleted: true,
        showHidden: true,
        tasklist: tasklistId,
        ...(nextPageToken ? { pageToken: nextPageToken } : {})
      })
    ).data;
    nextPageToken = newToken;
    items = [...items, ...getArray(newItems)];
  } while (!!nextPageToken);

  return items;
};

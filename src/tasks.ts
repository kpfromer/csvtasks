import fs from "fs";
import readline from "readline";
import { google, tasks_v1 } from "googleapis";

const getArray = <T>(value: T[] | undefined): T[] => (!!value ? value : []);

export const readFile = (file: string): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    fs.readFile(file, (error, content) =>
      !!error ? reject(error) : resolve(content)
    )
  );
export const writeFile = (file: string, data: string): Promise<void> =>
  new Promise((resolve, reject) =>
    fs.writeFile(file, data, error => {
      if (error) return reject(error);
      resolve();
    })
  );

export const question = (ask: string): Promise<string> =>
  new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(ask, code => {
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
  if (!id) throw new Error("Failed to create task list.");
  return id;
};

export const getTaskLists = async (
  service: tasks_v1.Tasks
): Promise<tasks_v1.Schema$TaskList[]> => {
  const { items } = (await service.tasklists.list({ maxResults: "100" })).data;
  return items === undefined ? [] : items;
};

export const getTasks = async (
  service: tasks_v1.Tasks,
  tasklistId: string
): Promise<tasks_v1.Schema$Task[]> => {
  let { items, nextPageToken } = (
    await service.tasks.list({ maxResults: "100", tasklist: tasklistId })
  ).data;
  while (nextPageToken !== undefined) {
    const { data } = await service.tasks.list({
      maxResults: "100",
      tasklist: tasklistId
    });
    items = [...getArray(items), ...getArray(data.items)];
    nextPageToken = data.nextPageToken;
  }
  return getArray(items);
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 */
export async function authorize(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  // Check if we have previously stored a token.
  const buffer = await readFile(TOKEN_PATH);
  oAuth2Client.setCredentials(JSON.parse(buffer.toString()));
  return oAuth2Client;
}

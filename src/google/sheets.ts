import { sheets_v4 } from 'googleapis';
import { CleanWantedTask, WantedTask } from '../types';
import { parseDate } from 'chrono-node';

const rowTitles = ['name', 'list', 'date', 'notes', 'hide'] as const;

export async function getTaskSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<(WantedTask & { date: string })[]> {
  const {
    data: { values }
  } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A1:E'
  });

  if (!values || values.length === 0) throw new TypeError('Invalid spreadsheet');

  // column index -> object key
  const headers = new Map<number, string>();
  const headersSet = new Set<string>();

  values[0].forEach((header, index) => {
    header = (header as string).toLocaleLowerCase();
    headers.set(index, header);
    headersSet.add(header);
  });

  if (!rowTitles.every((title) => headersSet.has(title))) {
    const foundHeaders = Array.from(headers.entries()).map(([key, value]) => value);

    throw new TypeError(
      `Invalid headers for spreadsheet. Recieved: "${foundHeaders.join(
        ','
      )}". Wanted: "${rowTitles.join(',')}"`
    );
  }

  const entries = values.slice(1).map((columns) =>
    columns.reduce(
      (obj, column, index) => ({
        ...obj,
        [headers.get(index)!]: column
      }),
      {} as WantedTask
    )
  ) as (WantedTask & { date: string })[];

  return entries;
}

export function santizeTaskSheet(
  tasks: (WantedTask & { date: string })[]
): CleanWantedTask[] {
  return tasks
    .filter((task) => !!task.name && !!task.date && task.hide !== 'TRUE')
    .map((task) => {
      const hide = task.hide === 'TRUE';

      const date = parseDate(task.date);
      if (!(date instanceof Date))
        throw new TypeError(`Invalid task date: "${task.date}"`);

      return { ...task, date, hide } as CleanWantedTask;
    });
}

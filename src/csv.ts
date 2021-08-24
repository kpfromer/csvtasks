import fs from 'fs';
import csv from 'csv-parser';
import { parseDate } from 'chrono-node';

const parseCsv = <T>(file: string): Promise<T[]> =>
  new Promise((resolve, reject) => {
    const results: T[] = [];
    fs.createReadStream(file)
      .pipe(
        csv({
          mapHeaders: ({ header, index }) => header.toLowerCase()
        })
      )
      .on('data', (data: T) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });

export const parse = async (
  file: string
): Promise<
  {
    prefix?: string;
    name: string;
    list: string;
    date: Date;
    notes?: string;
  }[]
> => {
  const results = await parseCsv<{
    prefix?: string;
    name: string;
    list: string;
    date: string;
    hide?: string;
  }>(file);
  return results
    .filter((row) => !!row.name && (!('hide' in row) || ('hide' in row && !row.hide)))
    .map((row) => {
      const parsedDate = parseDate(row.date);
      if (!(parsedDate instanceof Date))
        throw new TypeError(
          `Invalid date "${row.date}" for assignment with name "${row.name}"`
        );

      return {
        ...row,
        date: parsedDate
      };
    });
};

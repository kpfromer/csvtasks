#!/usr/bin/env node
import yargs from 'yargs';
import ConfigStore from 'configstore';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { syncCsvData, syncRawData } from './sync';
import { authorizeUser } from './google';
import { google } from 'googleapis';
import { getTaskSheet, santizeTaskSheet } from './google/sheets';

const DEFAULT_CSV = 'googletasks.csv';

export const config = new ConfigStore('googletasks-sync', {});

yargs
  .command('init', 'Creates a sample csv file.', {}, async () => {
    const fileContents = 'Name,Date,List,Notes,Hide';
    await promisify(fs.writeFile)(path.join(process.cwd(), DEFAULT_CSV), fileContents);
  })
  .command(
    'sync [file]',
    'Syncs a csv file with google tasks.',
    {
      file: {
        alias: 'f',
        type: 'string',
        default: DEFAULT_CSV
      },
      dryrun: {
        type: 'boolean',
        default: false
      },
      id: {
        alias: 'i',
        type: 'string',
        description: 'The google spread sheet id',
        demandOption: false
      }
    },
    async ({ file, dryrun, id }) => {
      const auth = await authorizeUser();
      if (id) {
        const auth = await authorizeUser();
        const sheets = google.sheets({ version: 'v4', auth });
        const data = santizeTaskSheet(await getTaskSheet(sheets, id));
        const service = google.tasks({ version: 'v1', auth });

        await syncRawData(service, data);
      } else {
        await syncCsvData(file, auth, { dryrun });
      }
    }
  )
  .command('clean', 'Removes google token (aka logouts).', {}, () => {
    config.delete('tokens');
  })
  .alias('h', 'help')
  .scriptName('csvtasks').argv;

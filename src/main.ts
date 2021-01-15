#!/usr/bin/env node
import yargs from 'yargs';
import ConfigStore from 'configstore';
import fs from 'fs';
import readline from 'readline';
import opener from 'opener';
import path from 'path';
import { promisify } from 'util';
import { syncData } from './sync';
import UserAuthorizer from './auth';

const SCOPES = ['https://www.googleapis.com/auth/tasks'];
const DEFAULT_CSV = 'googletasks.csv';

export const config = new ConfigStore('googletasks-sync', {});

function prompt(url: string): Promise<string> {
  console.log(`Authorize this app in your browser.\nURL: ${url}`);
  opener(url);
  return new Promise(function (resolve, reject) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Enter the code here: ', function (code) {
      rl.close();
      code = code.trim();
      if (code.length > 0) {
        resolve(code);
      } else {
        reject(new Error('No code provided'));
      }
    });
  });
}

function authorizeUser() {
  const options = {
    clientId: '867864663032-ei2kmp7c5kp3rtridik1e7ntr9qgmcd3.apps.googleusercontent.com',
    clientSecret: 'DvD6ORJt50uyvM008hklakV1',
    prompt
  };
  const auth = new UserAuthorizer(options);
  return auth.getUserCredentials('username', SCOPES); // TODO: change username to be custom for multiple users
}

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
      }
    },
    async ({ file, dryrun }) => {
      const auth = await authorizeUser();
      await syncData(file, auth, { dryrun });
    }
  )
  .command('clean', 'Removes google token (aka logouts).', {}, () => {
    config.delete('tokens');
  })
  .alias('h', 'help')
  .scriptName('csvtasks').argv;

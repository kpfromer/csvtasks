# csvtasks

## Description

A CLI tool to sync and create todo items using a csv spreadsheet files with google tasks.

## Installation

`npm install -g csvtasks`
`yarn global add csvtasks`

## Basic usage

### Init

Run the following command to create a sample csv file.
`csvtasks init`

Then edit and add tasks to that file.

### Sync

Once ready to sync/create tasks run `csvtasks sync`

Using a custom file name: `csvtasks sync -f customfile.csv`

On the first run you will be prompted to login with your google login. After this the Google OAuth will be saved, and you will not be asked to do this again.

### Clean

If you want to remove the oauth token run `csvtasks clean`

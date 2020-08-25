# csvtasks

[![npm version](https://badge.fury.io/js/csvtasks.svg)](https://badge.fury.io/js/csvtasks)
![Build Status](https://github.com/kpfromer/csvtasks/workflows/Publish/badge.svg?branch=master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

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

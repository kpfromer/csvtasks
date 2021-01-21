import { tasks_v1 } from 'googleapis';

export type TaskList = tasks_v1.Schema$TaskList;
export type Task = tasks_v1.Schema$Task;

export interface WantedTask {
  name: string;
  list: string;
  date: Date;
  notes: string;
  hide?: string;
}

export interface CleanWantedTask {
  name: string;
  list: string;
  date: Date;
  notes: string;
  hide: boolean;
}

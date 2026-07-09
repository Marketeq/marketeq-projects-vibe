import { Task } from './task';

export interface Phase {
  id: string;
  name: string;
  stageName?: string;
  startDay?: number;
  endDay?: number;
  order?: number;
  projectId: string;
  task?: Task[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

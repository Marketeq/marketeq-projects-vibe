import { Task } from './task';

export interface Phase {
  id: string;
  name: string;
  stageName?: string;
  startDay?: number;
  endDay?: number;
  order?: number;
  phaseType?: string | null;
  recurrenceSchedule?: string | null;
  recurrenceCount?: number | null;
  projectId: string;
  task?: Task[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

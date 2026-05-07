export interface Task {
  id: string;
  taskName: string;
  role: string;
  description?: string | null;
  location: string[];
  experience: string[];
  experienceLevel: string;
  duration: string;
  estimatedHours?: number;
  phaseId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

import { TaskEntity } from '../entities/task.entity';
import { Task } from '../../../../interface/task';

export class TaskMapper {
  static toDomain(raw: TaskEntity): Task {
    return {
      id: raw.id,
      taskName: raw.taskName,
      role: raw.role,
      location: raw.location,
      experience: raw.experience,
      experienceLevel: raw.experienceLevel,
      duration: raw.duration,
      estimatedHours: raw.estimatedHours,
      phaseId: raw.phaseId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    };
  }

  static toPersistence(task: Task): TaskEntity {
    const taskEntity = new TaskEntity();

    if (task.id) {
      taskEntity.id = task.id;
    }

    taskEntity.taskName = task.taskName;
    taskEntity.role = task.role;
    taskEntity.location = task.location ?? [];
    taskEntity.experience = task.experience ?? [];
    taskEntity.experienceLevel = task.experienceLevel;
    taskEntity.duration = task.duration;
    taskEntity.estimatedHours = task.estimatedHours!;
    taskEntity.phaseId = task.phaseId;

    taskEntity.createdAt = task.createdAt;
    taskEntity.updatedAt = task.updatedAt;
    taskEntity.deletedAt = task.deletedAt;

    return taskEntity;
  }
}

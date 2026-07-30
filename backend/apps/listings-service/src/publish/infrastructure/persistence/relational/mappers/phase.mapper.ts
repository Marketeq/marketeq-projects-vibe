import { PhaseEntity } from '../entities/phase.entity';
import { Phase } from '../../../../interface/phase';

export class PhaseMapper {
  static toDomain(raw: PhaseEntity): Phase {
    return {
      id: raw.id,
      name: raw.name,
      projectId: raw.projectId,
      stageName: raw.stageName,
      startDay: raw.startDay,
      endDay: raw.endDay,
      order: raw.order,
      phaseType: raw.phaseType,
      recurrenceSchedule: raw.recurrenceSchedule,
      recurrenceCount: raw.recurrenceCount,
      task: raw.tasks,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    };
  }

  static toPersistence(phase: Phase): PhaseEntity {
    const phaseEntity = new PhaseEntity();

    if (phase.id && typeof phase.id === 'string') {
      phaseEntity.id = phase.id;
    }
    phaseEntity.name = phase.name;
    phaseEntity.stageName = phase.stageName!;
    phaseEntity.startDay = phase.startDay!;
    phaseEntity.endDay = phase.endDay!;
    phaseEntity.order = phase.order!;
    phaseEntity.phaseType = phase.phaseType ?? null;
    phaseEntity.recurrenceSchedule = phase.recurrenceSchedule ?? null;
    phaseEntity.recurrenceCount = phase.recurrenceCount ?? null;
    phaseEntity.projectId = phase.projectId;

    // Map timestamps
    phaseEntity.createdAt = phase.createdAt;
    phaseEntity.updatedAt = phase.updatedAt;
    phaseEntity.deletedAt = phase.deletedAt;

    return phaseEntity;
  }
}

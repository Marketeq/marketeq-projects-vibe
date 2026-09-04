import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TravelClassification, DeclaredDuration } from '../entities/enums/identity-verification.enums';

export class ClassifyTravelDto {
  @IsEnum(TravelClassification)
  classification: TravelClassification;

  @IsOptional()
  @IsEnum(DeclaredDuration)
  declaredDuration?: DeclaredDuration;
}

export class TravelStatusResponseDto {
  userId: string;
  travelClassification: TravelClassification | null;
  declaredDuration: DeclaredDuration | null;
  travelModeActive: boolean;
  travelModeActivatedAt: Date | null;
  lastTravelReminderSentAt: Date | null;
  nextTravelReminderAt: Date | null;
}

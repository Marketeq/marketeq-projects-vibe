import { IsUUID } from 'class-validator';

export class AckLaunchDto {
  @IsUUID() launchId!: string;
}

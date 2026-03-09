import { IsArray, IsString } from 'class-validator';

export class IngestActivityWatchEventsDto {
  @IsString() bucketId!: string;
  @IsArray() events!: any[];
}

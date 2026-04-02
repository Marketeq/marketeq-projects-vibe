import { IsArray, IsNumber, IsObject, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class ActivityWatchEventItemDto {
  @IsString() timestamp!: string;
  @IsNumber() duration!: number;
  @IsObject() data!: Record<string, unknown>;
}

export class IngestActivityWatchEventsDto {
  @IsString() bucketId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityWatchEventItemDto)
  events!: ActivityWatchEventItemDto[];
}

import { IsArray, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateListDto {
  @IsString()
  @Length(1, 40)
  name: string;
}

export class UpdateListDto {
  @IsString()
  @Length(1, 40)
  name: string;
}

export class AssignListsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  listIds: string[];
}

export const BULK_ACTIONS = [
  'star',
  'unstar',
  'pin',
  'unpin',
  'archive',
  'unarchive',
  'spam',
  'unspam',
  'mute',
  'unmute',
  'trash',
  'untrash',
  'mark-unread',
  'mark-read',
] as const;

export type BulkAction = typeof BULK_ACTIONS[number];

export class BulkStateDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @IsIn(BULK_ACTIONS)
  action: BulkAction;
}

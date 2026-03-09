import { IsString } from 'class-validator';
export class ReadPresignDto { @IsString() key!: string; }

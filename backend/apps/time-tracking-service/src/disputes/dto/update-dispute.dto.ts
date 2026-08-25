import { IsString, IsOptional } from 'class-validator';


export class UpdateDisputeDto {
  @IsString() status!: string; // 'resolved_for_contractor' | 'resolved_for_client' | 'cancelled'
  @IsOptional() @IsString() resolutionNote?: string;
}
 
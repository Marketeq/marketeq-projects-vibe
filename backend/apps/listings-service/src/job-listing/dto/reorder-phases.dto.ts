import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

// Accepts an ordered array of phase IDs representing the desired new order.
// The service validates that SETUP remains first and ONGOING remains last.
// Only RECURRING phase IDs can change position. Any attempt to reorder
// SETUP or ONGOING phases is rejected with a 422 Unprocessable Entity.
export class ReorderPhasesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  orderedPhaseIds: string[];
}

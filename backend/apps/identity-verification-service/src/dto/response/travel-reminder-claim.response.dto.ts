// Exactly this and nothing else: no identifier, time, day number or state.
export class TravelReminderClaimResponseDto {
  claimed!: boolean;

  static from(result: { claimed: boolean }): TravelReminderClaimResponseDto {
    const dto = new TravelReminderClaimResponseDto();
    dto.claimed = result.claimed === true;
    return dto;
  }
}

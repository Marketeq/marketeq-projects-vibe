import { ApiProperty } from '@nestjs/swagger';

export class GetOfferResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  priceUsd: number;

  @ApiProperty()
  deliveryDays: number;
}

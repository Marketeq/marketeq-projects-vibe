import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateOfferDto {
  @ApiProperty({ example: 'Ux audit' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'I will do a UX audit of your website' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  priceUsd: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  deliveryDays: number;
}

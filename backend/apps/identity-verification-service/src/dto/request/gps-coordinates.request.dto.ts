import { IsNumber, Max, Min } from 'class-validator';

// Browser geolocation result. Only the two numbers are accepted — the global
// ValidationPipe (whitelist + forbidNonWhitelisted) rejects any country, city,
// state or other field a client tries to send. Display information only.
export class GpsCoordinatesRequestDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude!: number;
}

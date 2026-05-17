import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class GetRatesQueryDto {
  // Role title. Case-insensitive lookup against ps_platform_rate_averages.role.
  // If not provided, returns rates aggregated across all roles.
  @IsString()
  @MaxLength(100)
  @IsOptional()
  role?: string;

  // Geographic region. Must match one of the eight platform regions.
  @IsIn([
    'United States', 'Canada', 'United Kingdom',
    'Western Europe', 'Eastern Europe', 'Latin America',
    'South Asia', 'Southeast Asia',
  ])
  @IsOptional()
  location?: string;

  // Experience level.
  @IsIn(['junior', 'mid', 'senior'])
  @IsOptional()
  experience?: string;

  // Work schedule. Custom schedules are normalised before lookup.
  @IsIn(['full_time', 'part_time', 'custom'])
  @IsOptional()
  schedule?: string;
}

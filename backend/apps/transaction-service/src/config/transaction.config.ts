import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsIn, IsOptional, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsNumber()
  PORT!: number;

  @IsString()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  RABBITMQ_URL?: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsOptional()
  @IsString()
  ABLY_API_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsIn(['development', 'staging', 'production'])
  NODE_ENV!: string;
}
 
export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `[transaction-service] Startup failed — missing or invalid env vars:\n` +
      errors.map(e => `  - ${e.property}: ${Object.values(e.constraints || {}).join(', ')}`).join('\n')
    );
  }
  return validated;
}
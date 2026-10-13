import {
  Controller,
  ValidationError,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { RatesService } from '../services/rates.service';
import { GetRatesQueryDto } from '../dto/get-rates-query.dto';

const collectMessages = (errors: ValidationError[]): string[] =>
  errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...collectMessages(error.children ?? []),
  ]);

@Controller()
export class RatesRpcController {
  constructor(private readonly ratesService: RatesService) {}

  @MessagePattern('rate.get')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new RpcException({
          statusCode: 400,
          message: collectMessages(errors).join(', '),
        }),
    }),
  )
  async getRate(@Payload() query: GetRatesQueryDto) {
    try {
      return await this.ratesService.getRates(query);
    } catch (err) {
      if (err instanceof RpcException) throw err;
      throw new RpcException({
        statusCode: 500,
        message: err instanceof Error ? err.message : 'Unexpected error',
      });
    }
  }
}

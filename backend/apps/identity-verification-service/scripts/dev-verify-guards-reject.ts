import { ExecutionContext } from '@nestjs/common';
import { BearerAuthGuard } from '../src/common/guards/bearer-auth.guard';
import { InternalServiceGuard } from '../src/common/guards/internal-service.guard';

function fakeContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

function main(): void {
  const bearerGuard = new BearerAuthGuard();
  try {
    bearerGuard.canActivate(fakeContext({ authorization: 'Bearer test-token' }));
    console.log('UNEXPECTED: BearerAuthGuard did not reject.');
  } catch (err) {
    console.log(`BearerAuthGuard rejected as expected: ${(err as Error).message}`);
  }

  const internalGuard = new InternalServiceGuard();
  try {
    internalGuard.canActivate(fakeContext({}));
    console.log('UNEXPECTED: InternalServiceGuard did not reject.');
  } catch (err) {
    console.log(`InternalServiceGuard rejected as expected: ${(err as Error).message}`);
  }
}

main();

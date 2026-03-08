import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class MachineAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-machine-token'];
    if (!token || token !== process.env.MACHINE_SECRET) {
      throw new UnauthorizedException('Invalid machine token');
    }
    return true;
  }
}

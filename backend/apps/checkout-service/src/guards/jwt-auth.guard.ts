import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";

const normalizeKey = (value?: string) => (value ? value.replace(/\\n/g, '\n') : value);

const verifyAccessToken = (token: string) => {
  const publicKey = normalizeKey(process.env.AUTH_JWT_PUBLIC_KEY);
  if (publicKey) {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  }

  const secret = process.env.JWT_SECRET;
  if (secret) {
    return jwt.verify(token, secret);
  }

  throw new UnauthorizedException('JWT verifier is not configured');
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing auth token");
    }

    const publicKey = this.config
      .get<string>("AUTH_JWT_PUBLIC_KEY")
      ?.replace(/\\n/g, "\n");
    const secretOrKey = publicKey || this.config.get<string>("JWT_SECRET");

    try {
      req.user = verifyAccessToken(authHeader.split(' ')[1]);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}

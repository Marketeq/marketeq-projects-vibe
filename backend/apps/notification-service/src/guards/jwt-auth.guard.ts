import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

const normalizeKey = (value?: string) =>
	value ? value.replace(/\\n/g, '\n') : value;

const verifyAccessToken = (token: string) => {
	const publicKey = normalizeKey(process.env.AUTH_JWT_PUBLIC_KEY);
	if (publicKey) {
		return jwt.verify(token, publicKey, {
			algorithms: ['RS256'],
		}) as Record<string, unknown>;
	}

	const secret = process.env.JWT_SECRET;
	if (secret) {
		return jwt.verify(token, secret) as Record<string, unknown>;
	}

	throw new UnauthorizedException('JWT verifier is not configured');
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest();
		const authHeader = request.headers?.authorization;

		if (!authHeader || typeof authHeader !== 'string') {
			throw new UnauthorizedException('Missing Authorization header');
		}

		const [scheme, token] = authHeader.split(' ');
		if (scheme !== 'Bearer' || !token) {
			throw new UnauthorizedException('Invalid Authorization header format');
		}

		try {
			const payload = verifyAccessToken(token);
			request.user = payload;
			return true;
		} catch {
			throw new UnauthorizedException('Invalid or expired token');
		}
	}
}

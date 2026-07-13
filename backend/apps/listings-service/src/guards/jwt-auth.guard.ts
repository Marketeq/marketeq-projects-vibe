import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

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
			// Ensure request.user.id is set for downstream logic
			request.user = {
				...payload,
				id: payload.id || payload.sub,
			};
			return true;
		} catch {
			throw new UnauthorizedException('Invalid or expired token');
		}
	}
}

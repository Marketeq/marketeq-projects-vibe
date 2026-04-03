import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosHeaders } from 'axios';
import { getRequest } from '../common/request-context';

@Injectable()
export class HttpForwarderService {
  constructor(private readonly httpService: HttpService) {
    this.httpService.axiosRef.interceptors.request.use((config) => {
      const req = getRequest();
      if (!req) {
        return config;
      }

      const headers = AxiosHeaders.from(config.headers ?? {});
      const setHeader = (key: string, value: string) => {
        if (!value) return;
        headers.set(key, value);
      };
      const authHeader =
        (req.headers['authorization'] as string | undefined) ??
        (req.headers['Authorization'] as string | undefined);

      const existingAuth =
        headers.get('authorization') ?? headers.get('Authorization');
      if (authHeader && !existingAuth) {
        setHeader('Authorization', authHeader);
      }

      const user = (req as {
        user?: { id?: string; sub?: string; email?: string };
      }).user;
      if (user) {
        const userId = user.id ?? user.sub;
        const userSub = user.sub ?? user.id;

        if (userId) setHeader('x-user-id', userId);
        if (userSub) setHeader('x-user-sub', userSub);
        if (user.email) setHeader('x-user-email', user.email);
      }

      config.headers = headers;
      return config;
    });
  }
}

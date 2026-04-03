import { Injectable } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';

@Injectable()
export class UserClientService {
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: 'user-service', port: 3001 },
    });
  }

  async getUser(id: string) {
    return this.client.send({ cmd: 'get_user' }, { id }).toPromise();
  }
}

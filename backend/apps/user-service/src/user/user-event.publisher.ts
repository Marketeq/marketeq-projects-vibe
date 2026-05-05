import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { User } from './entities/user.entity';

@Injectable()
export class UserEventPublisher {
  private readonly logger = new Logger(UserEventPublisher.name);

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  /**
   * Publishes a user.profile.updated event to the cms.events exchange.
   * This is consumed by cms-service to keep Payload talent profiles in sync.
   */
  async publishProfileUpdated(user: User): Promise<void> {
    const payload = {
      event: 'user.profile.updated',
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.overview,
      location: user.location,
      timezone: user.timezone,
      availability: user.availability,
      rate: user.rate,
      // Pass a source tag to prevent infinite sync loops
      source: 'user-service',
      timestamp: new Date().toISOString(),
    };

    try {
      // Use emit() for fire-and-forget events
      this.client.emit('user.profile.updated', payload);
      this.logger.log(`Published user.profile.updated for user ${user.id} (${user.username})`);
    } catch (err) {
      this.logger.error(`Failed to publish user.profile.updated for user ${user.id}:`, err);
    }
  }
}

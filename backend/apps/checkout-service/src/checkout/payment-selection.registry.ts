import { BadRequestException, Injectable } from '@nestjs/common';
import type { PaymentMethod } from './entities/checkout-session.entity';
import { SavedCardsService } from './saved-cards.service';

export interface PaymentSelectionSummary {
  id: string;
}

export interface PaymentSelectionResolver {
  resolve(clientId: string, id: string): Promise<PaymentSelectionSummary>;
  find(clientId: string, id: string): Promise<PaymentSelectionSummary | null>;
}

@Injectable()
export class PaymentSelectionRegistry {
  private readonly resolvers = new Map<PaymentMethod, PaymentSelectionResolver>();

  constructor(savedCardsService: SavedCardsService) {
    this.resolvers.set('card', {
      resolve: (clientId, id) =>
        savedCardsService.getCardView(clientId, id),
      find: (clientId, id) =>
        savedCardsService.findCardView(clientId, id),
    });
  }

  resolve(
    method: PaymentMethod,
    clientId: string,
    id: string,
  ): Promise<PaymentSelectionSummary> {
    return this.resolverFor(method).resolve(clientId, id);
  }

  find(
    method: PaymentMethod,
    clientId: string,
    id: string,
  ): Promise<PaymentSelectionSummary | null> {
    const resolver = this.resolvers.get(method);
    return resolver ? resolver.find(clientId, id) : Promise.resolve(null);
  }

  private resolverFor(method: PaymentMethod): PaymentSelectionResolver {
    const resolver = this.resolvers.get(method);
    if (!resolver) {
      throw new BadRequestException({
        code: 'PAYMENT_SELECTION_UNSUPPORTED',
        message: 'This payment method cannot be saved on a session yet',
      });
    }
    return resolver;
  }
}

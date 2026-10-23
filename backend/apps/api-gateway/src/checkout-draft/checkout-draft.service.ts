import { HttpException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

const STATUS_ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_FAILED',
  429: 'TOO_MANY_REQUESTS',
  502: 'BAD_GATEWAY',
};

const withErrorCode = (data: unknown, status: number): object => {
  const body: Record<string, unknown> =
    typeof data === 'object' && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : { message: typeof data === 'string' ? data : undefined };
  if (typeof body.code === 'string') return body;
  const blocked = Array.isArray(body.blockingReasons);
  return {
    ...body,
    code: blocked
      ? 'CHECKOUT_BLOCKED'
      : (STATUS_ERROR_CODES[status] ?? 'REQUEST_FAILED'),
    ...(blocked && !body.message
      ? { message: 'Checkout cannot continue' }
      : {}),
  };
};

// Checkout-service owns the summary; gateway just authenticates and forwards,
// reshaping the response into the shape the frontend already expects.
@Injectable()
export class CheckoutDraftGatewayService {
  private readonly logger = new Logger(CheckoutDraftGatewayService.name);
  private readonly checkoutUrl: string;
  private readonly internalServiceToken: string | undefined;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.checkoutUrl =
      config.get<string>('CHECKOUT_SERVICE_URL') || 'http://localhost:3009';
    this.internalServiceToken = config.get<string>('INTERNAL_SERVICE_TOKEN');
  }

  private headers(clientId: string) {
    return {
      'x-client-id': clientId,
      ...(this.internalServiceToken
        ? { 'x-internal-token': this.internalServiceToken }
        : {}),
    };
  }

  async createCardSetupIntent(clientId: string) {
    return this.forward('post', '/cards/setup-intent', clientId, 'start a card setup');
  }

  async saveCard(body: Record<string, unknown>, clientId: string) {
    return this.forward('post', '/cards', clientId, 'save a card', { body });
  }

  async listCards(clientId: string) {
    return this.forward('get', '/cards', clientId, 'list saved cards');
  }

  async getCard(cardId: string, clientId: string) {
    return this.forward('get', `/cards/${encodeURIComponent(cardId)}`, clientId, 'get a saved card');
  }

  async updateCard(cardId: string, body: Record<string, unknown>, clientId: string) {
    return this.forward('patch', `/cards/${encodeURIComponent(cardId)}`, clientId, 'update a saved card', { body });
  }

  async deleteCard(cardId: string, clientId: string) {
    return this.forward('delete', `/cards/${encodeURIComponent(cardId)}`, clientId, 'delete a saved card');
  }

  async createDraft(listingId: string, clientId: string) {
    return this.forward('post', `/listings/${listingId}/draft`, clientId, `create checkout draft for ${listingId}`);
  }

  async discardDraft(draftId: string, clientId: string) {
    return this.forward('delete', `/drafts/${draftId}`, clientId, `discard checkout draft ${draftId}`);
  }

  async getDraft(listingId: string, clientId: string) {
    return this.forward('get', `/listings/${listingId}/draft`, clientId, `get checkout draft for ${listingId}`);
  }

  async getDraftScope(draftId: string, clientId: string) {
    return this.forward('get', `/drafts/${draftId}/scope`, clientId, `get checkout draft scope for ${draftId}`);
  }

  async getDraftPricing(draftId: string, clientId: string) {
    return this.forward('get', `/drafts/${draftId}/pricing`, clientId, `get checkout draft pricing for ${draftId}`);
  }

  async getDraftTeam(draftId: string, clientId: string) {
    return this.forward('get', `/drafts/${draftId}/team`, clientId, `get checkout draft team for ${draftId}`);
  }

  async getCheckoutSession(sessionId: string, clientId: string) {
    return this.forward('get', `/session/${sessionId}`, clientId, `get checkout session ${sessionId}`);
  }

  async getSessionPaymentMethods(
    sessionId: string,
    clientId: string,
    balanceApplied?: string,
  ) {
    return this.forward('get', `/session/${sessionId}/payment-methods`, clientId, `get payment methods for checkout session ${sessionId}`, balanceApplied === undefined ? {} : { params: { balanceApplied } });
  }

  async applySessionCode(
    sessionId: string,
    body: Record<string, unknown>,
    clientId: string,
  ) {
    return this.forward('post', `/session/${sessionId}/apply-code`, clientId, `apply a code to checkout session ${sessionId}`, { body });
  }

  async removeSessionCode(
    sessionId: string,
    code: string,
    clientId: string,
  ) {
    return this.forward('delete', `/session/${sessionId}/apply-code/${encodeURIComponent(code)}`, clientId, `remove a code from checkout session ${sessionId}`);
  }

  async createDraftSession(
    draftId: string,
    body: Record<string, unknown>,
    clientId: string,
  ) {
    return this.forward('post', `/drafts/${draftId}/create-session`, clientId, `create a session for checkout draft ${draftId}`, { body });
  }

  async addDraftPhase(
    draftId: string,
    body: Record<string, unknown>,
    clientId: string,
  ) {
    return this.forward('post', `/drafts/${draftId}/phases`, clientId, `add a phase to checkout draft ${draftId}`, { body });
  }

  async replaceDraftMember(
    draftId: string,
    body: Record<string, unknown>,
    clientId: string,
  ) {
    return this.forward('post', `/drafts/${draftId}/team/replace-member`, clientId, `replace a member in checkout draft ${draftId}`, { body });
  }

  async updateDraftRole(
    draftId: string,
    body: Record<string, unknown>,
    clientId: string,
  ) {
    return this.forward('post', `/drafts/${draftId}/team/update-role`, clientId, `update a role in checkout draft ${draftId}`, { body });
  }

  async removeDraftMemberAndTasks(
    draftId: string,
    body: Record<string, unknown>,
    clientId: string,
  ) {
    return this.forward('post', `/drafts/${draftId}/team/remove-member`, clientId, `remove a member from checkout draft ${draftId}`, { body });
  }

  async removeDraftMember(
    draftId: string,
    userId: string,
    version: string,
    clientId: string,
  ) {
    return this.forward('delete', `/drafts/${draftId}/team/${userId}`, clientId, `remove a member from checkout draft ${draftId}`, { params: { version } });
  }

  async applyDraftCode(
    draftId: string,
    body: Record<string, unknown>,
    clientId: string,
  ) {
    return this.forward('post', `/drafts/${draftId}/apply-code`, clientId, `apply a code to checkout draft ${draftId}`, { body });
  }

  async removeDraftCode(
    draftId: string,
    code: string,
    clientId: string,
  ) {
    return this.forward('delete', `/drafts/${draftId}/apply-code/${encodeURIComponent(code)}`, clientId, `remove a code from checkout draft ${draftId}`);
  }

  async duplicateDraftPhase(
    draftId: string,
    phaseId: string,
    body: Record<string, unknown>,
    clientId: string,
  ) {
    return this.forward('post', `/drafts/${draftId}/phases/${phaseId}/duplicate`, clientId, `duplicate a phase in checkout draft ${draftId}`, { body });
  }

  async updateDraftPhase(
    draftId: string,
    phaseId: string,
    body: Record<string, unknown>,
    clientId: string,
  ) {
    return this.forward('patch', `/drafts/${draftId}/phases/${phaseId}`, clientId, `edit a phase in checkout draft ${draftId}`, { body });
  }

  async deleteDraftPhase(
    draftId: string,
    phaseId: string,
    version: string,
    clientId: string,
  ) {
    return this.forward('delete', `/drafts/${draftId}/phases/${phaseId}`, clientId, `delete a phase from checkout draft ${draftId}`, { params: { version } });
  }

  async addDraftTask(
    draftId: string,
    phaseId: string,
    body: Record<string, unknown>,
    clientId: string,
  ) {
    return this.forward('post', `/drafts/${draftId}/phases/${phaseId}/tasks`, clientId, `add a task to checkout draft ${draftId}`, { body });
  }

  async updateDraftTask(
    draftId: string,
    taskId: string,
    body: Record<string, unknown>,
    clientId: string,
  ) {
    return this.forward('patch', `/drafts/${draftId}/tasks/${taskId}`, clientId, `edit a task in checkout draft ${draftId}`, { body });
  }

  async deleteDraftTask(
    draftId: string,
    taskId: string,
    version: string,
    clientId: string,
  ) {
    return this.forward('delete', `/drafts/${draftId}/tasks/${taskId}`, clientId, `delete a task from checkout draft ${draftId}`, { params: { version } });
  }

  private async forward(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    clientId: string,
    action: string,
    options: { body?: unknown; params?: Record<string, unknown> } = {},
  ) {
    try {
      const url = `${this.checkoutUrl}/v1/checkout${path}`;
      const config = {
        headers: this.headers(clientId),
        ...(options.params ? { params: options.params } : {}),
      };
      const request =
        method === 'get' || method === 'delete'
          ? this.http[method](url, config)
          : this.http[method](url, options.body ?? null, config);
      const response = await firstValueFrom(request);
      return response.data;
    } catch (err) {
      this.rethrowDraftError(err, action);
    }
  }

  private rethrowDraftError(err: unknown, action: string): never {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    if (
      status === 502 ||
      (status !== undefined && status >= 400 && status < 500)
    ) {
      throw new HttpException(
        withErrorCode(axiosErr.response!.data, status),
        status,
      );
    }
    this.logger.warn(`Failed to ${action}: ${axiosErr.message}`);
    throw err;
  }

  async getListingSummary(listingId: string, _clientId: string) {
    let summary;
    try {
      summary = await firstValueFrom(
        this.http.get(`${this.checkoutUrl}/v1/checkout/listings/${listingId}/summary`, {
          headers: this.internalServiceToken
            ? { 'x-internal-token': this.internalServiceToken }
            : {},
        }),
      );
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 404) {
        throw new NotFoundException('Listing not found');
      }
      this.rethrowDraftError(err, `fetch checkout summary for ${listingId}`);
    }
    const { listing, phases, projectCost } = summary.data;

    return {
      listing,
      draft: {
        id: null,
        listingId: listing.id,
        phases,
        projectCost,
        createdAt: null,
        updatedAt: null,
      },
    };
  }
}

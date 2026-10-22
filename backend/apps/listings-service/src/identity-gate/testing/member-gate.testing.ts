import { Observable, of } from 'rxjs';
import { IdentityVerificationGateClient } from '../identity-verification-gate.client';
import { MemberAddGate } from '../member-add-gate';

export const OPEN = { gateOpen: true, missingRequirements: 'none' };
export const CLOSED = (m = 'both') => ({ gateOpen: false, missingRequirements: m });

/**
 * The REAL MemberAddGate over the REAL gate client, with only the RabbitMQ
 * transport stubbed. `identity` is what identity-verification-service would answer
 * per account (absent = it has no profile and, like identity, is reported closed).
 */
export function makeMemberGate(
  identity: Record<string, { gateOpen: boolean; missingRequirements: string }>,
  opts: { impl?: (pattern: string, record: any) => Observable<unknown>; broker?: string | undefined } = {},
) {
  const reply = (record: any) => ({
    decisions: (record.data.userIds as string[]).map((userId) => ({ userId, ...(identity[userId] ?? CLOSED('both')) })),
  });
  const transport = jest.fn(opts.impl ?? ((_p: string, record: any) => of(reply(record))));
  const config = { get: (k: string) => (k === 'RABBITMQ_URL' ? ('broker' in opts ? opts.broker : 'amqp://test') : undefined) };
  const client = new IdentityVerificationGateClient({ send: transport } as any, config as any);
  const gate = new MemberAddGate(client);
  const asked = () => transport.mock.calls.flatMap((c) => c[1].data.userIds as string[]);
  return { gate, transport, asked };
}

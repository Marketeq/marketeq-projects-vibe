import { of, throwError, NEVER } from 'rxjs'
import { GATE_CHANGED_PATTERN, RmqGateChangePublisher, USER_GATE_QUEUE } from './gate-change-publisher'

const make = (
  algolia: any,
  listings: any = { emit: jest.fn(() => of(undefined)) },
  payout: any = { emit: jest.fn(() => of(undefined)) },
  user: any = { emit: jest.fn(() => of(undefined)) },
) => new RmqGateChangePublisher(algolia as any, listings as any, payout as any, user as any)

describe('G1 gate change publisher', () => {
  const change = { userId: 'a1', gateOpen: false, occurredAt: '2026-10-14T12:00:00.000Z' }

  it('emits identity.gate_changed with exactly the account and the decision', async () => {
    const client = { emit: jest.fn(() => of(undefined)) }
    const listings = { emit: jest.fn(() => of(undefined)) }
    const payout = { emit: jest.fn(() => of(undefined)) }
    await make(client, listings, payout).publish(change)
    // G9: and to payout-service's own queue.
    expect(payout.emit).toHaveBeenCalledWith(GATE_CHANGED_PATTERN, change)
    expect(client.emit).toHaveBeenCalledWith(GATE_CHANGED_PATTERN, change)
    // G5: the very same event goes to listings-service's own queue.
    expect(listings.emit).toHaveBeenCalledWith(GATE_CHANGED_PATTERN, change)
    expect(GATE_CHANGED_PATTERN).toBe('identity.gate_changed')
  })

  it('G1: the very same event also goes to user-service\'s own durable queue (talent discovery filters by it)', async () => {
    const ok = { emit: jest.fn(() => of(undefined)) }
    const user = { emit: jest.fn(() => of(undefined)) }
    await make(ok, ok, ok, user).publish(change)
    expect(user.emit).toHaveBeenCalledTimes(1)
    expect(user.emit).toHaveBeenCalledWith(GATE_CHANGED_PATTERN, change)
    expect(USER_GATE_QUEUE).toBe('user_service_gate_queue')
  })

  it('a refusal by the user-service queue alone rejects, so the sweep keeps the change', async () => {
    const ok = { emit: jest.fn(() => of(undefined)) }
    const down = { emit: jest.fn(() => throwError(() => new Error('connection closed'))) }
    await expect(make(ok, ok, ok, down).publish(change)).rejects.toThrow('connection closed')
  })

  it('rejects when the broker does not accept the event, so the sweep keeps the change', async () => {
    const client = { emit: jest.fn(() => throwError(() => new Error('connection closed'))) }
    await expect(make(client).publish(change)).rejects.toThrow('connection closed')
    // ...and so does a refusal by the listings queue alone.
    const ok = { emit: jest.fn(() => of(undefined)) }
    await expect(make(ok, client).publish(change)).rejects.toThrow('connection closed')
    await expect(make(ok, ok, client).publish(change)).rejects.toThrow('connection closed')
  })

  it('rejects instead of hanging when the broker never answers', async () => {
    jest.useFakeTimers()
    try {
      const client = { emit: jest.fn(() => NEVER) }
      const done = expect(make(client).publish(change)).rejects.toBeDefined()
      await jest.advanceTimersByTimeAsync(5001)
      await done
    } finally {
      jest.useRealTimers()
    }
  })
})

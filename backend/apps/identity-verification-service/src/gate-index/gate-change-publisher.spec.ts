import { of, throwError, NEVER } from 'rxjs'
import { GATE_CHANGED_PATTERN, RmqGateChangePublisher } from './gate-change-publisher'

describe('G1 gate change publisher', () => {
  const change = { userId: 'a1', gateOpen: false, occurredAt: '2026-10-14T12:00:00.000Z' }

  it('emits identity.gate_changed with exactly the account and the decision', async () => {
    const client = { emit: jest.fn(() => of(undefined)) }
    await new RmqGateChangePublisher(client as any).publish(change)
    expect(client.emit).toHaveBeenCalledWith(GATE_CHANGED_PATTERN, change)
    expect(GATE_CHANGED_PATTERN).toBe('identity.gate_changed')
  })

  it('rejects when the broker does not accept the event, so the sweep keeps the change', async () => {
    const client = { emit: jest.fn(() => throwError(() => new Error('connection closed'))) }
    await expect(new RmqGateChangePublisher(client as any).publish(change)).rejects.toThrow('connection closed')
  })

  it('rejects instead of hanging when the broker never answers', async () => {
    jest.useFakeTimers()
    try {
      const client = { emit: jest.fn(() => NEVER) }
      const done = expect(new RmqGateChangePublisher(client as any).publish(change)).rejects.toBeDefined()
      await jest.advanceTimersByTimeAsync(5001)
      await done
    } finally {
      jest.useRealTimers()
    }
  })
})

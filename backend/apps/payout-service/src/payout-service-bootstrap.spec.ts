// payout-service must be able to start. The PayoutPublisher -> WithdrawalNotifier -> PayoutService ->
// PauseStatusService -> PayoutPublisher import cycle only resolves when payout.service is loaded before
// payout.publisher. main.ts used to import the gate queue name from the gate consumer FIRST, which
// loaded payout.publisher first, left PayoutPublisher undefined while PauseStatusService was decorated,
// and the service died at boot with "Nest can't resolve dependencies of the PauseStatusService
// (..., ?)" - something no unit test noticed because none of them boots the module graph.
//
// These are source-level guards on purpose: under ts-jest an unresolved import cycle shows up as `Object`
// in the decorator metadata, not `undefined`, so the failure cannot be reproduced in a unit test. It was
// verified by booting the built service (it must start and reach "Nest application successfully started").
import 'reflect-metadata'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('payout-service boot import order', () => {
  const main = readFileSync(join(__dirname, 'main.ts'), 'utf8')

  it('main.ts takes the gate queue name from a file with no imports, not from the consumer', () => {
    expect(main).toContain("from './consumers/gate-queue.constants'")
    expect(main).not.toMatch(/from '\.\/consumers\/gate-changed\.consumer'/)
    const constants = readFileSync(join(__dirname, 'consumers', 'gate-queue.constants.ts'), 'utf8')
    expect(constants).not.toMatch(/^\s*import\s/m)
  })

  it('the consumer still exports the same name, so existing imports keep working', () => {
    const consumer = readFileSync(join(__dirname, 'consumers', 'gate-changed.consumer.ts'), 'utf8')
    expect(consumer).toContain("export { PAYOUT_GATE_QUEUE } from './gate-queue.constants'")
  })
})

// The queue identity-verification-service publishes `identity.gate_changed` to for this service.
// Kept in a file with no imports on purpose: main.ts needs the name before the module graph is
// loaded, and importing it from the consumer (which pulls in the gate and pause services) would
// load payout.publisher first and break the publisher -> WithdrawalNotifier -> PayoutService ->
// PauseStatusService -> publisher import cycle (PauseStatusService would get an undefined
// PayoutPublisher and the service would not start).
export const PAYOUT_GATE_QUEUE = 'payout_service_gate_queue';

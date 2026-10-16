import {
  checkDuplicateEvent,
  checkOutOfOrder,
  checkUnknownSession,
} from './didit-webhook-event-tracker';

describe('checkDuplicateEvent', () => {
  it('flags an already-processed event_id as a duplicate', () => {
    const processed = new Set(['evt_1', 'evt_2']);
    expect(checkDuplicateEvent('evt_1', processed)).toEqual({ isDuplicate: true });
  });

  it('does not flag a new event_id', () => {
    const processed = new Set(['evt_1']);
    expect(checkDuplicateEvent('evt_2', processed)).toEqual({ isDuplicate: false });
  });

  it('treats an empty processed set as no duplicates possible', () => {
    expect(checkDuplicateEvent('evt_1', new Set())).toEqual({ isDuplicate: false });
  });
});

describe('checkUnknownSession', () => {
  it('flags a session_id we never issued as unknown', () => {
    const known = new Set(['sess_1']);
    expect(checkUnknownSession('sess_999', known)).toEqual({ isUnknown: true });
  });

  it('does not flag a session_id we did issue', () => {
    const known = new Set(['sess_1']);
    expect(checkUnknownSession('sess_1', known)).toEqual({ isUnknown: false });
  });

  it('treats every session as unknown when nothing has been recorded yet', () => {
    expect(checkUnknownSession('sess_1', new Set())).toEqual({ isUnknown: true });
  });
});

describe('checkOutOfOrder', () => {
  it('is never out of order the first time a session is seen', () => {
    const lastSeen = new Map<string, number>();
    expect(checkOutOfOrder('sess_1', 1000, lastSeen)).toEqual({ isOutOfOrder: false });
  });

  it('flags an event at or before the last-seen timestamp as out of order', () => {
    const lastSeen = new Map([['sess_1', 1000]]);
    expect(checkOutOfOrder('sess_1', 999, lastSeen)).toEqual({ isOutOfOrder: true });
    expect(checkOutOfOrder('sess_1', 1000, lastSeen)).toEqual({ isOutOfOrder: true });
  });

  it('does not flag an event strictly after the last-seen timestamp', () => {
    const lastSeen = new Map([['sess_1', 1000]]);
    expect(checkOutOfOrder('sess_1', 1001, lastSeen)).toEqual({ isOutOfOrder: false });
  });

  it('is scoped per session — another session\'s history does not affect this one', () => {
    const lastSeen = new Map([['sess_1', 5000]]);
    expect(checkOutOfOrder('sess_2', 1, lastSeen)).toEqual({ isOutOfOrder: false });
  });
});

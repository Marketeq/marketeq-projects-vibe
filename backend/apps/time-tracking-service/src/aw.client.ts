export type AWEventData = { app?: string; title?: string; status?: string };
export type Event = { timestamp?: string; duration?: number; data?: AWEventData };
export type Bucket = { id?: string };

export async function listBuckets(): Promise<Bucket[]> { return []; }
export async function getEvents(_bucketId: string, _startISO?: string, _endISO?: string): Promise<Event[]> { return []; }

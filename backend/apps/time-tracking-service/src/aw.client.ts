import axios from 'axios';

export type AWEventData = { app?: string; title?: string; status?: string };
export type Event = { timestamp?: string; duration?: number; data?: AWEventData };
export type Bucket = { id?: string };

const BASE_URL = process.env.ACTIVITYWATCH_BASE_URL || 'http://localhost:5600/api/0';

export async function listBuckets(): Promise<Bucket[]> {
  try {
    const response = await axios.get(`${BASE_URL}/buckets`, { timeout: 5000 });
    const data = response.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return Object.keys(data).map((id) => ({ id, ...data[id] }));
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.warn(
      `[aw.client] Failed to list buckets from ActivityWatch: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

export async function getEvents(
  bucketId: string,
  startISO?: string,
  endISO?: string,
): Promise<Event[]> {
  try {
    const params: Record<string, string> = {};
    if (startISO) params.start = startISO;
    if (endISO) params.end = endISO;

    const response = await axios.get(`${BASE_URL}/buckets/${bucketId}/events`, {
      params,
      timeout: 5000,
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.warn(
      `[aw.client] Failed to get events for bucket "${bucketId}": ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

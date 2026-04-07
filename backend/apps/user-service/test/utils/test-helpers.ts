export function getBaseURL() {
  return process.env.TEST_BASE_URL || 'http://127.0.0.1:3003';
}

export function createUserPayload() {
  const timestamp = Date.now();
  return {
    username: `user_${timestamp}`,
    email: `user_${timestamp}@test.com`,
    bio: 'integration test user',
    location: 'Test City',
    timezone: 'UTC',
    availability: 'Full-time',
    rateMin: 10,
    rateMax: 50,
  };
}

export function getAuthHeaders(token?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function logResponse(response: any) {
  console.log('--- RESPONSE START ---');
  console.log('Status:', response.status());
  try {
    const json = await response.json();
    console.log('Body (JSON):', JSON.stringify(json, null, 2));
  } catch {
    const text = await response.text();
    console.log('Body (Text):', text);
  }
  console.log('--- RESPONSE END ---\n');
}

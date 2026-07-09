import { test, expect } from '@playwright/test';
import { createUserPayload, logResponse } from './utils/test-helpers';

test.describe('User API (integration)', () => {
  test('POST /user creates a user', async ({ request }) => {
    const payload = createUserPayload();
    const res = await request.post('/user', { data: payload });
    await logResponse(res);
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.email).toBe(payload.email);
  });

  test('GET /user/:id returns the created user', async ({ request }) => {
    const payload = createUserPayload();
    const createRes = await request.post('/user', { data: payload });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    await logResponse(createRes);

    const getRes = await request.get(`/user/${created.id}`);
    expect(getRes.status()).toBe(200);
    const user = await getRes.json();
    expect(user.id).toBe(created.id);
    expect(user.email).toBe(payload.email);
  });

  test('PATCH /user/:id updates the user email', async ({ request }) => {
    const payload = createUserPayload();
    const createRes = await request.post('/user', { data: payload });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    await logResponse(createRes);

    const newEmail = `${payload.username}@test.com`;
    const patchRes = await request.patch(`/user/${created.id}`, {
      data: { email: newEmail },
    });
    await logResponse(patchRes);
    expect([200, 204]).toContain(patchRes.status());

    const verifyRes = await request.get(`/user/${created.id}`);
    await logResponse(verifyRes);
    expect(verifyRes.status()).toBe(200);
    const updated = await verifyRes.json();
    expect(updated.email).toBe(newEmail);
  });
});

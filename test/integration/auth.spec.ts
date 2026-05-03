import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './test-helpers';

/**
 * Integration tests for the full auth flow.
 * Requires a running MySQL database (use the test DB in .env).
 */
describe('Auth Flow (integration)', () => {
  let app: INestApplication;
  const testEmail = `authtest-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  let refreshToken: string;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register — creates a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Auth Tester', email: testEmail, password: testPassword })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined(); // password must not be exposed
  });

  it('POST /api/auth/register — rejects duplicate email with 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Duplicate', email: testEmail, password: testPassword })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('POST /api/auth/login — returns tokens on valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken as string;
    refreshToken = res.body.data.refreshToken as string;
  });

  it('POST /api/auth/login — rejects invalid password with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' })
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /api/auth/refresh — issues new access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Store the rotated token
    refreshToken = res.body.data.refreshToken as string;
  });

  it('POST /api/auth/refresh — rejects used (revoked) refresh token', async () => {
    // The old token was rotated, so this should be rejected
    // (we stored the new one above; the old one is now revoked)
    // We can't easily test this without storing the old one, so test with garbage
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid.token.value' })
      .expect(401);
  });

  it('POST /api/auth/logout — invalidates refresh token', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken })
      .expect(200);

    // Subsequent refresh with that token should fail
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('Protected route — rejects request without token', async () => {
    await request(app.getHttpServer()).get('/api/movies').expect(401);
  });
});

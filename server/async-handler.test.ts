import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { AddressInfo } from 'node:net';
import { safeAsyncHandler } from './async-handler';

// Importing auth constructs the storage pool; no database request is made here,
// but provide a local-only URL so this regression test also runs without app env.
if (!process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://localhost/async-handler-tests';
}
const { getCurrentUser, requireAuth } = await import('./auth');
const { storage } = await import('./storage');

async function withServer(app: express.Express, run: (baseUrl: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

function errorBoundary(app: express.Express) {
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ message: error.message });
  });
}

test('safeAsyncHandler forwards rejected Express 4 route handlers to error middleware', async () => {
  const app = express();
  app.get('/api/admin/users', safeAsyncHandler(async (_req, _res) => {
    throw new Error('admin users query failed');
  }));
  errorBoundary(app);

  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/admin/users`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { message: 'admin users query failed' });
  });
});

test('the mounted current-user route and requireAuth middleware forward storage rejections', async () => {
  const app = express();
  app.use(cookieParser());
  app.get('/api/auth/user', safeAsyncHandler(getCurrentUser));
  app.get('/api/protected', requireAuth, (_req, res) => res.sendStatus(204));
  errorBoundary(app);

  const originalDescriptor = Object.getOwnPropertyDescriptor(storage, 'getSession');
  Object.defineProperty(storage, 'getSession', {
    configurable: true,
    writable: true,
    value: async () => { throw new Error('session lookup failed'); },
  });

  try {
    await withServer(app, async baseUrl => {
      for (const path of ['/api/auth/user', '/api/protected']) {
        const response = await fetch(`${baseUrl}${path}`, { headers: { cookie: 'sessionId=test-session' } });
        assert.equal(response.status, 500);
        assert.deepEqual(await response.json(), { message: 'session lookup failed' });
      }
    });
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(storage, 'getSession', originalDescriptor);
    } else {
      delete (storage as any).getSession;
    }
  }
});
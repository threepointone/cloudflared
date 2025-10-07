import { afterAll, beforeAll, expect, test } from 'vitest';
import https from 'node:https';
import { startHelloWorldServer } from '../src/hello/server.js';

let server: ReturnType<typeof startHelloWorldServer> | null = null;
let port = 0;

beforeAll(async () => {
  server = startHelloWorldServer({ address: 'localhost:' });
  await new Promise<void>((resolve) => server!.once('listening', () => resolve()));
  port = (server!.address() as any).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
});

test('health endpoint returns ok', async () => {
  const body = await fetchHttps(`https://localhost:${port}/_health`);
  expect(body).toBe('ok');
});

function fetchHttps(urlStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(urlStr, { rejectUnauthorized: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.from(c)));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
  });
}

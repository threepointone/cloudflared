import http from 'node:http';
import https from 'node:https';
import { AddressInfo } from 'node:net';
import { WebSocketServer } from 'ws';
import { getHelloCredentials } from '../tlsconfig/hello.js';

export interface StartOptions {
  address: string; // host:port or host: or :port
  logger?: Pick<Console, 'log' | 'error'>;
}

export interface OriginUpTime {
  startTime: Date;
  uptime: string;
}

const UptimeRoute = '/uptime';
const WSRoute = '/ws';
const SSERoute = '/sse';
const HealthRoute = '/_health';
const defaultSSEFreqMs = 10_000;

export function createTLSServer() {
  const { key, cert } = getHelloCredentials();
  const server = https.createServer({ key, cert });
  return server;
}

export function startHelloWorldServer(options: StartOptions) {
  const logger = options.logger ?? console;
  const server = createTLSServer();

  // WebSocket echo server
  const wss = new WebSocketServer({ noServer: true });
  wss.on('connection', (ws) => {
    ws.on('message', (data, isBinary) => {
      ws.send(data, { binary: isBinary });
    });
  });

  server.on('upgrade', (req, socket, head) => {
    if (new URL(req.url ?? '/', `https://${req.headers.host}`).pathname === WSRoute) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  const startTime = new Date();

  server.on('request', async (req, res) => {
    const url = new URL(req.url ?? '/', `https://${req.headers.host}`);
    if (url.pathname === UptimeRoute) {
      const uptimeMs = Date.now() - startTime.getTime();
      const body: OriginUpTime = {
        startTime,
        uptime: `${uptimeMs}ms`,
      };
      const json = JSON.stringify(body);
      res.setHeader('content-type', 'application/json');
      res.writeHead(200);
      res.end(json);
      return;
    }

    if (url.pathname === SSERoute) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const freqParam = url.searchParams.get('freq');
      const freqMs = freqParam ? parseDurationMs(freqParam) ?? defaultSSEFreqMs : defaultSSEFreqMs;
      let counter = 0;
      const interval = setInterval(() => {
        try {
          res.write(`${counter}\n\n`);
          counter++;
        } catch {
          clearInterval(interval);
        }
      }, freqMs);
      req.on('close', () => clearInterval(interval));
      return;
    }

    if (url.pathname === HealthRoute) {
      res.writeHead(200);
      res.end('ok');
      return;
    }

    // root handler: echo request info using a minimal HTML like the Go version
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks).toString('utf8');
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.writeHead(200);
    res.end(renderIndex({
      serverName: process.env.HOSTNAME || 'the Cloudflare Tunnel test server',
      req,
      body,
    }));
  });

  const { host, port } = splitHostPort(options.address);
  server.listen({ host, port }, () => {
    const addr = server.address() as AddressInfo;
    logger.log(`Starting Hello World server at ${addr.address}:${addr.port}`);
  });

  return server;
}

function splitHostPort(input: string): { host?: string; port?: number } {
  // formats: "host:port", "host:", ":port"
  if (input.startsWith(':')) {
    const port = Number(input.slice(1)) || 0;
    return { port };
  }
  const idx = input.lastIndexOf(':');
  if (idx === -1) return { host: input || 'localhost', port: 0 };
  const host = input.slice(0, idx) || 'localhost';
  const portStr = input.slice(idx + 1);
  const port = Number(portStr) || 0;
  return { host, port };
}

function parseDurationMs(value: string): number | null {
  // supports e.g. "10s", "500ms"
  if (/^\d+ms$/.test(value)) return Number(value.slice(0, -2));
  if (/^\d+s$/.test(value)) return Number(value.slice(0, -1)) * 1000;
  if (/^\d+m$/.test(value)) return Number(value.slice(0, -1)) * 60_000;
  return null;
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderIndex(params: { serverName: string; req: http.IncomingMessage; body: string }) {
  const { serverName, req, body } = params;
  const headers = Object.entries(req.headers)
    .map(([k, v]) => `Header: ${esc(k)}, Value: ${esc(Array.isArray(v) ? v.join(', ') : String(v))}`)
    .join('\n');
  const transferEncoding = Array.isArray((req as any).transferEncoding)
    ? (req as any).transferEncoding.join(', ')
    : String((req as any).transferEncoding || '');
  const url = new URL(req.url ?? '/', `https://${req.headers.host}`);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=Edge">
    <title>Cloudflare Tunnel Connection</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <h1>Congrats! You created a tunnel!</h1>
    <section>
      <div>Method: ${esc(req.method || '')}</div>
      <div>Protocol: HTTP/${esc(String(req.httpVersion))}</div>
      <div>Request URL: ${esc(url.toString())}</div>
      <div>Transfer encoding: ${esc(transferEncoding)}</div>
      <div>Host: ${esc(String(req.headers.host || ''))}</div>
      <div>Remote address: ${esc(String((req.socket && (req.socket as any).remoteAddress) || ''))}</div>
      <div>Request URI: ${esc(req.url || '')}</div>
      <pre>${esc(headers)}</pre>
      <div>Body: ${esc(body)}</div>
    </section>
  </body>
 </html>`;
}

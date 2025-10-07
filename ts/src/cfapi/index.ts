export type Tunnel = {
  id: string;
  name: string;
  created_at?: string;
  deleted_at?: string | null;
  connections?: Array<{ colo_name?: string; id?: string }>;
};

type CloudflareApiResponse<T> = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<unknown>;
  result: T;
};

export class CloudflareClient {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(params?: { apiToken?: string; baseUrl?: string }) {
    const token = params?.apiToken ?? process.env.CLOUDFLARE_API_TOKEN;
    if (!token) {
      throw new Error('CLOUDFLARE_API_TOKEN is required');
    }
    this.apiToken = token;
    this.baseUrl = params?.baseUrl ?? 'https://api.cloudflare.com/client/v4';
  }

  async listTunnels(accountId?: string): Promise<Tunnel[]> {
    const acct = accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!acct) {
      throw new Error('Account ID is required. Set CLOUDFLARE_ACCOUNT_ID or pass --account');
    }
    const pathname = `/accounts/${encodeURIComponent(acct)}/cfd_tunnel`;
    const res = await this.request<CloudflareApiResponse<Tunnel[]>>('GET', pathname);
    if (!res.success) {
      const msg = res.errors?.map((e) => `${e.code}: ${e.message}`).join(', ') || 'unknown error';
      throw new Error(`Cloudflare API error: ${msg}`);
    }
    return res.result;
  }

  private async request<T>(method: string, pathname: string, body?: unknown): Promise<T> {
    const url = new URL(pathname, this.baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiToken}`,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
    }
    return (await response.json()) as T;
  }
}


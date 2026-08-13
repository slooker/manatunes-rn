// Navidrome's native REST API — distinct from the Subsonic API. Used only for actions
// the Subsonic API doesn't expose, like linking a user's ListenBrainz account (the same
// endpoints Navidrome's own web UI calls under the hood).
const CLIENT_UNIQUE_ID = 'manatunes-rn';

export interface NavidromeConfig {
  serverUrl: string;
  username: string;
  password: string;
}

export class NavidromeClient {
  private config: NavidromeConfig;

  constructor(config: NavidromeConfig) {
    this.config = config;
  }

  private async login(): Promise<string> {
    const response = await fetch(`${this.baseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.config.username, password: this.config.password }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? 'Login failed');
    return body.token;
  }

  async getListenBrainzStatus(): Promise<boolean> {
    const body = await this.request('GET', '/api/listenbrainz/link');
    return body?.status === true;
  }

  async linkListenBrainz(token: string): Promise<void> {
    await this.request('PUT', '/api/listenbrainz/link', { token });
  }

  async unlinkListenBrainz(): Promise<void> {
    await this.request('DELETE', '/api/listenbrainz/link');
  }

  private baseUrl(): string {
    return this.config.serverUrl.replace(/\/$/, '');
  }

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    const token = await this.login();
    const response = await fetch(`${this.baseUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-ND-Authorization': `Bearer ${token}`,
        'X-ND-Client-Unique-Id': CLIENT_UNIQUE_ID,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(json?.error ?? `Request failed (${response.status})`);
    return json;
  }
}

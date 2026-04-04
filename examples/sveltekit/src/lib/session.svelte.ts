import {
  createPkceCodeChallenge,
  createPkceCodeVerifier,
  getAuthorizationUrl,
  makeSpotifyBrowserSession,
} from "@spotify-effect/browser";
import type { BrowserRefreshableTokens } from "@spotify-effect/browser";
import * as Effect from "effect/Effect";

type BrowserSession = ReturnType<typeof makeSpotifyBrowserSession>;

export class Session {
  clientId = $state("");
  tokens = $state<BrowserRefreshableTokens | undefined>(undefined);
  profile = $state<Record<string, unknown> | null>(null);
  isExchanging = $state(false);
  isFetchingProfile = $state(false);
  error = $state<string | null>(null);

  private bs: BrowserSession | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this._init();
    }
  }

  private _init(): void {
    this.bs = makeSpotifyBrowserSession({
      sessionStorage: window.sessionStorage,
      localStorage: window.localStorage,
      history: window.history,
    });
    const pkceState = this.bs.getPkceState();
    if (pkceState?.clientId) {
      this.clientId = pkceState.clientId;
    }
    this.tokens = this.bs.getTokens();
  }

  get isLoggedIn(): boolean {
    return this.tokens !== undefined;
  }

  get tokenExpiresIn(): number | null {
    if (!this.tokens) return null;
    return this.tokens.accessTokenExpiresAt - Date.now();
  }

  get tokenExpiresLabel(): string {
    const ms = this.tokenExpiresIn;
    if (ms === null) return "—";
    if (ms <= 0) return "expired";
    const min = Math.floor(ms / 60_000);
    if (min < 60) return `~${min}m`;
    return `~${Math.floor(min / 60)}h ${min % 60}m`;
  }

  setClientId(id: string): void {
    this.clientId = id;
  }

  setTokens(t: BrowserRefreshableTokens): void {
    this.tokens = t;
    this.bs?.setTokens(t);
  }

  clearCallbackParams(url: URL): void {
    this.bs?.clearCallbackParams(url);
  }

  getPkceState() {
    return this.bs?.getPkceState();
  }

  async startPkceLogin(scopes: string): Promise<void> {
    if (!this.clientId) throw new Error("Client ID is required");
    if (!this.bs) return;

    const redirectUri = `${window.location.origin}/`;
    const verifier = await Effect.runPromise(createPkceCodeVerifier());
    const challenge = await Effect.runPromise(createPkceCodeChallenge(verifier));

    const scopeList = scopes
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const url = getAuthorizationUrl(this.clientId, redirectUri, "code", {
      ...(scopeList.length > 0 ? { scope: scopeList as never } : null),
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    this.bs.setPkceState({ verifier, clientId: this.clientId, redirectUri });
    window.location.assign(url);
  }

  async exchangeCode(code: string): Promise<void> {
    const pkceState = this.bs?.getPkceState();
    if (!pkceState) {
      this.error = "No stored PKCE state. Start the login flow from this page.";
      return;
    }

    this.isExchanging = true;
    this.error = null;

    try {
      const response = await fetch("/api/pkce/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: pkceState.clientId,
          redirectUri: pkceState.redirectUri,
          code,
          codeVerifier: pkceState.verifier,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Exchange failed");

      const stored: BrowserRefreshableTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        accessTokenExpiresAt: Date.now() + data.expires_in * 1000,
      };

      this.setTokens(stored);
      this.clearCallbackParams(new URL(window.location.href));
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.isExchanging = false;
    }
  }

  async fetchProfile(): Promise<void> {
    if (!this.tokens) return;
    const pkceState = this.getPkceState();

    this.isFetchingProfile = true;
    this.error = null;

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: pkceState?.clientId ?? this.clientId,
          redirectUri: pkceState?.redirectUri ?? `${window.location.origin}/`,
          accessToken: this.tokens.accessToken,
          refreshToken: this.tokens.refreshToken,
          accessTokenExpiresAt: this.tokens.accessTokenExpiresAt,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.profile || !data.credentials)
        throw new Error(data.message ?? "Profile fetch failed");

      this.setTokens({
        accessToken: data.credentials.accessToken ?? this.tokens.accessToken,
        refreshToken: data.credentials.refreshToken ?? this.tokens.refreshToken,
        accessTokenExpiresAt:
          data.credentials.accessTokenExpiresAt ?? this.tokens.accessTokenExpiresAt,
      });

      this.profile = data.profile as Record<string, unknown>;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.isFetchingProfile = false;
    }
  }

  async refreshTokens(): Promise<void> {
    if (!this.tokens?.refreshToken) return;
    const pkceState = this.getPkceState();

    try {
      const response = await fetch("/api/token/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: pkceState?.clientId ?? this.clientId,
          redirectUri: pkceState?.redirectUri ?? `${window.location.origin}/`,
          refreshToken: this.tokens.refreshToken,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Token refresh failed");

      this.setTokens({
        accessToken: data.accessToken,
        refreshToken: this.tokens.refreshToken,
        accessTokenExpiresAt: Date.now() + data.expiresIn * 1000,
      });
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  logout(): void {
    this.tokens = undefined;
    this.profile = null;
    localStorage.removeItem("spotify-effect:tokens");
  }
}

export const session = new Session();

import { m as makeSpotifyBrowserSession, c as createPkceCodeVerifier, a as createPkceCodeChallenge, S as SpotifyWebApi } from './index2-D5GVHfyz.js';
import * as Effect4 from 'effect/Effect';

class Session {
  clientId = "";
  tokens = void 0;
  profile = null;
  isExchanging = false;
  isFetchingProfile = false;
  error = null;
  bs = null;
  constructor() {
    if (typeof window !== "undefined") {
      this._init();
    }
  }
  _init() {
    this.bs = makeSpotifyBrowserSession({
      sessionStorage: window.sessionStorage,
      localStorage: window.localStorage,
      history: window.history
    });
    const pkceState = this.bs.getPkceState();
    if (pkceState?.clientId) {
      this.clientId = pkceState.clientId;
    }
    this.tokens = this.bs.getTokens();
  }
  get isLoggedIn() {
    return this.tokens !== void 0;
  }
  get tokenExpiresIn() {
    if (!this.tokens) return null;
    return this.tokens.accessTokenExpiresAt - Date.now();
  }
  get tokenExpiresLabel() {
    const ms = this.tokenExpiresIn;
    if (ms === null) return "—";
    if (ms <= 0) return "expired";
    const min = Math.floor(ms / 6e4);
    if (min < 60) return `~${min}m`;
    return `~${Math.floor(min / 60)}h ${min % 60}m`;
  }
  setClientId(id) {
    this.clientId = id;
  }
  setTokens(t) {
    this.tokens = t;
    this.bs?.setTokens(t);
  }
  clearCallbackParams(url) {
    this.bs?.clearCallbackParams(url);
  }
  getPkceState() {
    return this.bs?.getPkceState();
  }
  async startPkceLogin(scopes) {
    if (!this.clientId) throw new Error("Client ID is required");
    if (!this.bs) return;
    const redirectUri = `${window.location.origin}/`;
    const verifier = await Effect4.runPromise(createPkceCodeVerifier());
    const challenge = await Effect4.runPromise(createPkceCodeChallenge(verifier));
    const spotify = new SpotifyWebApi({ clientId: this.clientId, redirectUri });
    const scopeList = scopes.split(/\s+/).map((s) => s.trim()).filter(Boolean);
    const url = spotify.getAuthorizationCodePKCEUrl(this.clientId, {
      clientId: this.clientId,
      redirectUri,
      ...scopeList.length > 0 ? { scope: scopeList } : null,
      code_challenge: challenge,
      code_challenge_method: "S256"
    });
    this.bs.setPkceState({ verifier, clientId: this.clientId, redirectUri });
    window.location.assign(url);
  }
  async exchangeCode(code) {
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
          codeVerifier: pkceState.verifier
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Exchange failed");
      const stored = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        accessTokenExpiresAt: Date.now() + data.expires_in * 1e3
      };
      this.setTokens(stored);
      this.clearCallbackParams(new URL(window.location.href));
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.isExchanging = false;
    }
  }
  async fetchProfile() {
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
          accessTokenExpiresAt: this.tokens.accessTokenExpiresAt
        })
      });
      const data = await response.json();
      if (!response.ok || !data.profile || !data.credentials) throw new Error(data.message ?? "Profile fetch failed");
      this.setTokens({
        accessToken: data.credentials.accessToken ?? this.tokens.accessToken,
        refreshToken: data.credentials.refreshToken ?? this.tokens.refreshToken,
        accessTokenExpiresAt: data.credentials.accessTokenExpiresAt ?? this.tokens.accessTokenExpiresAt
      });
      this.profile = data.profile;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.isFetchingProfile = false;
    }
  }
  logout() {
    this.tokens = void 0;
    this.profile = null;
    localStorage.removeItem("spotify-effect:tokens");
  }
}
const session = new Session();

export { session as s };
//# sourceMappingURL=session.svelte-Dr2HCVqU.js.map

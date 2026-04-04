import * as Effect from "effect/Effect";
import {
  createPkceCodeChallenge,
  createPkceCodeVerifier,
  getAuthorizationUrl,
  makeSpotifyBrowserSession,
  readAuthorizationCallback,
} from "@spotify-effect/browser";
import type { AuthorizationScope, BrowserRefreshableTokens } from "@spotify-effect/browser";

const accessTokenInput = document.querySelector<HTMLTextAreaElement>("#access-token");
const trackIdInput = document.querySelector<HTMLInputElement>("#track-id");
const fetchButton = document.querySelector<HTMLButtonElement>("#fetch-track");
const authClientIdInput = document.querySelector<HTMLInputElement>("#auth-client-id");
const authRedirectUriInput = document.querySelector<HTMLInputElement>("#auth-redirect-uri");
const authStateInput = document.querySelector<HTMLInputElement>("#auth-state");
const authScopeInput = document.querySelector<HTMLInputElement>("#auth-scope");
const authCodeButton = document.querySelector<HTMLButtonElement>("#generate-auth-code-url");
const pkceButton = document.querySelector<HTMLButtonElement>("#generate-pkce-url");
const pingServerButton = document.querySelector<HTMLButtonElement>("#ping-server");
const exchangePkceButton = document.querySelector<HTMLButtonElement>("#exchange-pkce-code");
const fetchCurrentUserButton = document.querySelector<HTMLButtonElement>("#fetch-current-user");
const callbackCodeInput = document.querySelector<HTMLInputElement>("#callback-code");
const codeVerifierInput = document.querySelector<HTMLInputElement>("#code-verifier");
const authOutput = document.querySelector<HTMLElement>("#auth-output");
const profileOutput = document.querySelector<HTMLElement>("#profile-output");
const output = document.querySelector<HTMLElement>("#output");
const status = document.querySelector<HTMLElement>("#status");
const sessionStatus = document.querySelector<HTMLElement>("#session-status");

const authorizationScopes: ReadonlyArray<AuthorizationScope> = [
  "ugc-image-upload",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "app-remote-control",
  "user-read-email",
  "user-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-read-private",
  "playlist-modify-private",
  "user-library-modify",
  "user-library-read",
  "user-top-read",
  "user-read-playback-position",
  "user-read-recently-played",
  "user-follow-read",
  "user-follow-modify",
];

const defaultRedirectUri = `http://127.0.0.1:${window.location.port || "3012"}/`;
const browserSession = makeSpotifyBrowserSession({
  sessionStorage: window.sessionStorage,
  localStorage: window.localStorage,
  history: window.history,
});

const setStatus = (message: string): void => {
  if (status !== null) {
    status.textContent = message;
  }
};

const setSessionStatus = (message: string): void => {
  if (sessionStatus !== null) {
    sessionStatus.textContent = message;
  }
};

const setOutput = (element: HTMLElement | null, value: unknown): void => {
  if (element !== null) {
    element.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }
};

const formatError = (error: unknown): unknown => {
  if (typeof error !== "object" || error === null) {
    return error;
  }

  const record = error as Record<string, unknown>;

  if (record._tag === "SpotifyHttpError") {
    return {
      _tag: record._tag,
      status: record.status,
      method: record.method,
      url: record.url,
      apiMessage: record.apiMessage,
      body: record.body,
    };
  }

  return record;
};

const parseScopes = (value: string): ReadonlyArray<AuthorizationScope> =>
  value
    .split(" ")
    .map((item) => item.trim())
    .filter(
      (item): item is AuthorizationScope =>
        item.length > 0 && authorizationScopes.some((scope) => scope === item),
    );

const readAuthorizationInputs = (): {
  clientId: string;
  redirectUri: string;
  state?: string;
  scope?: ReadonlyArray<AuthorizationScope>;
} => {
  const state = authStateInput?.value.trim() ?? "";
  const scope = parseScopes(authScopeInput?.value ?? "");
  const redirectUri = authRedirectUriInput?.value.trim() || defaultRedirectUri;

  return {
    clientId: authClientIdInput?.value.trim() ?? "",
    redirectUri,
    ...(state.length === 0 ? null : { state }),
    ...(scope.length === 0 ? null : { scope }),
  };
};

const syncStoredStateToUi = (): void => {
  const callback = readAuthorizationCallback(new URL(window.location.href));
  const pkceState = browserSession.getPkceState();
  const tokens = browserSession.getTokens();

  if (callbackCodeInput !== null) {
    callbackCodeInput.value = callback.code ?? "";
  }

  if (codeVerifierInput !== null) {
    codeVerifierInput.value = pkceState?.verifier ?? "";
  }

  if (authClientIdInput !== null && pkceState?.clientId !== undefined) {
    authClientIdInput.value = pkceState.clientId;
  }

  if (authRedirectUriInput !== null) {
    authRedirectUriInput.value = pkceState?.redirectUri ?? defaultRedirectUri;
  }

  if (authStateInput !== null) {
    authStateInput.value = callback.state ?? pkceState?.state ?? "";
  }

  if (accessTokenInput !== null && tokens !== undefined) {
    accessTokenInput.value = tokens.accessToken;
  }

  if (tokens !== undefined) {
    setOutput(profileOutput, {
      message: "Stored refreshable tokens available",
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    });
    setSessionStatus("Refreshable session available in this browser");
  } else {
    setSessionStatus("No stored browser auth session yet");
  }
};

const fetchTrack = async (): Promise<void> => {
  const accessToken = accessTokenInput?.value.trim() ?? "";
  const trackId = trackIdInput?.value.trim() ?? "";

  if (accessToken.length === 0 || trackId.length === 0) {
    setStatus("Provide both an access token and a track ID.");
    return;
  }

  fetchButton!.disabled = true;
  setStatus("Fetching track...");

  try {
    const response = await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessToken, trackId }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw payload;
    }

    setOutput(output, payload);
    setStatus("Track fetched successfully.");
  } catch (error) {
    setOutput(output, formatError(error));
    setStatus("Request failed.");
  } finally {
    fetchButton!.disabled = false;
  }
};

const generateAuthorizationCodeUrl = (): void => {
  const inputs = readAuthorizationInputs();

  if (inputs.clientId.length === 0 || inputs.redirectUri.length === 0) {
    setOutput(authOutput, "Provide both client ID and redirect URI.");
    return;
  }

  setOutput(authOutput, getAuthorizationUrl(inputs.clientId, inputs.redirectUri, "code", inputs));
};

const pingServer = async (): Promise<void> => {
  pingServerButton!.disabled = true;
  setStatus("Pinging traced server...");

  try {
    const response = await fetch("/api/ping");
    const payload = await response.json();

    if (!response.ok) {
      throw payload;
    }

    setOutput(authOutput, payload);
    setStatus("Ping succeeded. Check Jaeger for spotify-effect-example-browser.");
  } catch (error) {
    setOutput(authOutput, formatError(error));
    setStatus("Ping failed.");
  } finally {
    pingServerButton!.disabled = false;
  }
};

const startPkceLogin = async (): Promise<void> => {
  const inputs = readAuthorizationInputs();

  if (inputs.clientId.length === 0 || inputs.redirectUri.length === 0) {
    setOutput(authOutput, "Provide both client ID and redirect URI.");
    return;
  }

  const verifier = await Effect.runPromise(createPkceCodeVerifier());
  const challenge = await Effect.runPromise(createPkceCodeChallenge(verifier));
  const url = getAuthorizationUrl(inputs.clientId, inputs.redirectUri, "code", {
    ...inputs,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  browserSession.setPkceState({
    verifier,
    clientId: inputs.clientId,
    redirectUri: inputs.redirectUri,
    ...(inputs.state === undefined ? null : { state: inputs.state }),
  });

  if (codeVerifierInput !== null) {
    codeVerifierInput.value = verifier;
  }

  setOutput(authOutput, url);
  setStatus("Redirecting to Spotify for PKCE login...");
  window.location.assign(url);
};

const exchangePkceCode = async (): Promise<void> => {
  const callback = readAuthorizationCallback(new URL(window.location.href));
  const code = callbackCodeInput?.value.trim() || callback.code || "";
  const pkceState = browserSession.getPkceState();
  const verifier = codeVerifierInput?.value.trim() || pkceState?.verifier || "";
  const clientId = authClientIdInput?.value.trim() || pkceState?.clientId || "";
  const redirectUri =
    authRedirectUriInput?.value.trim() || pkceState?.redirectUri || defaultRedirectUri;

  if (code.length === 0 || verifier.length === 0 || clientId.length === 0) {
    setOutput(profileOutput, {
      message: "Missing values required for PKCE exchange.",
      callbackCodePresent: code.length > 0,
      verifierPresent: verifier.length > 0,
      clientIdPresent: clientId.length > 0,
      hint: "Use Start PKCE login from this page so the verifier and client ID are stored automatically.",
    });
    return;
  }

  exchangePkceButton!.disabled = true;
  setStatus("Exchanging PKCE code for tokens...");

  try {
    const response = await fetch("/api/pkce/exchange", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        redirectUri,
        code,
        codeVerifier: verifier,
      }),
    });

    const tokens = await response.json();

    if (!response.ok) {
      throw tokens;
    }

    const storedTokens: BrowserRefreshableTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
    };

    browserSession.setTokens(storedTokens);

    if (accessTokenInput !== null) {
      accessTokenInput.value = tokens.access_token;
    }

    setOutput(profileOutput, {
      tokens,
      message: "Tokens exchanged and stored locally for this browser example.",
    });
    setSessionStatus("Refreshable tokens stored. You can now fetch the current user profile.");
    setStatus("PKCE code exchange succeeded.");
    browserSession.clearCallbackParams(new URL(window.location.href));
  } catch (error) {
    setOutput(profileOutput, formatError(error));
    setStatus("PKCE code exchange failed.");
  } finally {
    exchangePkceButton!.disabled = false;
  }
};

const fetchCurrentUserProfile = async (): Promise<void> => {
  const pkceState = browserSession.getPkceState();
  const tokens = browserSession.getTokens();
  const clientId = authClientIdInput?.value.trim() || pkceState?.clientId || "";
  const redirectUri =
    authRedirectUriInput?.value.trim() || pkceState?.redirectUri || defaultRedirectUri;

  if (tokens === undefined) {
    setOutput(
      profileOutput,
      "Exchange a PKCE code first so the browser example has refreshable tokens.",
    );
    return;
  }

  fetchCurrentUserButton!.disabled = true;
  setStatus("Fetching current user profile...");

  try {
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        redirectUri,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      }),
    });

    const payload = (await response.json()) as {
      profile?: unknown;
      credentials?: Partial<BrowserRefreshableTokens>;
    };

    if (!response.ok || payload.profile === undefined || payload.credentials === undefined) {
      throw payload;
    }

    browserSession.setTokens({
      accessToken: payload.credentials.accessToken ?? tokens.accessToken,
      refreshToken: payload.credentials.refreshToken ?? tokens.refreshToken,
      accessTokenExpiresAt: payload.credentials.accessTokenExpiresAt ?? tokens.accessTokenExpiresAt,
    });

    if (accessTokenInput !== null) {
      accessTokenInput.value = payload.credentials.accessToken ?? tokens.accessToken;
    }

    setOutput(profileOutput, payload.profile);
    setSessionStatus("Logged in and ready. Stored tokens will be reused for this browser example.");
    setStatus("Fetched current user profile.");
  } catch (error) {
    setOutput(profileOutput, formatError(error));
    setStatus("Current user profile request failed.");
  } finally {
    fetchCurrentUserButton!.disabled = false;
  }
};

fetchButton?.addEventListener("click", () => {
  void fetchTrack();
});

authCodeButton?.addEventListener("click", generateAuthorizationCodeUrl);
pingServerButton?.addEventListener("click", () => {
  void pingServer();
});

pkceButton?.addEventListener("click", () => {
  void startPkceLogin();
});

exchangePkceButton?.addEventListener("click", () => {
  void exchangePkceCode();
});

fetchCurrentUserButton?.addEventListener("click", () => {
  void fetchCurrentUserProfile();
});

syncStoredStateToUi();

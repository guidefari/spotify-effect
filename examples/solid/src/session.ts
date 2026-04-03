import { createSignal } from "solid-js";
import * as Effect from "effect/Effect";
import {
  createPkceCodeChallenge,
  createPkceCodeVerifier,
  getAuthorizationUrl,
  makeSpotifyBrowserSession,
  makeSpotifyLayer,
  SpotifyAuth,
  Library,
  Users,
} from "spotify-effect";
import type {
  BrowserRefreshableTokens,
  PrivateUser,
  SavedAlbum,
  SavedTrack,
  Paging,
} from "spotify-effect";

export const DEFAULT_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-library-read",
  "user-top-read",
  "user-read-recently-played",
  "user-follow-read",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

const bs = makeSpotifyBrowserSession({
  sessionStorage: window.sessionStorage,
  localStorage: window.localStorage,
  history: window.history,
});

export const [clientId, setClientId] = createSignal(
  bs.getPkceState()?.clientId ?? "",
);

const [_tokens, _setTokens] = createSignal<BrowserRefreshableTokens | undefined>(
  bs.getTokens(),
);
export const tokens = _tokens;

export const [profile, setProfile] = createSignal<PrivateUser | null>(null);
export const [isExchanging, setIsExchanging] = createSignal(false);
export const [isFetchingProfile, setIsFetchingProfile] = createSignal(false);
export const [sessionError, setSessionError] = createSignal<string | null>(null);

function setTokens(t: BrowserRefreshableTokens): void {
  _setTokens(t);
  bs.setTokens(t);
}

export const isLoggedIn = () => _tokens() !== undefined;

export const tokenExpiresLabel = () => {
  const t = _tokens();
  if (!t) return "—";
  const ms = t.accessTokenExpiresAt - Date.now();
  if (ms <= 0) return "expired";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `~${min}m`;
  return `~${Math.floor(min / 60)}h ${min % 60}m`;
};

const formatDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const tokenExpiresAt = () => {
  const t = _tokens();
  if (!t) return null;
  return formatDate(t.accessTokenExpiresAt);
};

export async function startPkceLogin(scopes: string): Promise<void> {
  const id = clientId();
  if (!id) throw new Error("Client ID is required");

  const redirectUri = `${window.location.origin}/`;
  const verifier = await Effect.runPromise(createPkceCodeVerifier());
  const challenge = await Effect.runPromise(createPkceCodeChallenge(verifier));

  const scopeList = scopes
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const url = getAuthorizationUrl(id, redirectUri, "code", {
    ...(scopeList.length > 0 ? { scope: scopeList as never } : null),
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  bs.setPkceState({ verifier, clientId: id, redirectUri });
  window.location.assign(url);
}

export async function exchangeCode(code: string): Promise<void> {
  const pkceState = bs.getPkceState();
  if (!pkceState) {
    setSessionError("No stored PKCE state. Start the login flow from this page.");
    return;
  }

  setIsExchanging(true);
  setSessionError(null);

  try {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const auth = yield* SpotifyAuth;
        return yield* auth.getRefreshableUserTokensWithPkce({
          clientId: pkceState.clientId,
          code,
          codeVerifier: pkceState.verifier,
        });
      }).pipe(
        Effect.provide(
          makeSpotifyLayer({
            clientId: pkceState.clientId,
            redirectUri: pkceState.redirectUri,
          }),
        ),
      ),
    );

    setTokens({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      accessTokenExpiresAt: Date.now() + result.expires_in * 1000,
    });

    bs.clearCallbackParams(new URL(window.location.href));
  } catch (err) {
    setSessionError(err instanceof Error ? err.message : String(err));
  } finally {
    setIsExchanging(false);
  }
}

export async function fetchProfile(): Promise<void> {
  const t = _tokens();
  if (!t) return;

  setIsFetchingProfile(true);
  setSessionError(null);

  try {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const users = yield* Users;
        return yield* users.getCurrentUserProfile();
      }).pipe(Effect.provide(makeSpotifyLayer({}, { accessToken: t.accessToken }))),
    );

    setProfile(result);
  } catch (err) {
    setSessionError(err instanceof Error ? err.message : String(err));
  } finally {
    setIsFetchingProfile(false);
  }
}

export function logout(): void {
  _setTokens(undefined);
  setProfile(null);
  setSessionError(null);
  localStorage.removeItem("spotify-effect:tokens");
}

export type LibraryData = {
  albums: Paging<SavedAlbum> | null;
  tracks: Paging<SavedTrack> | null;
  albumsError: string | null;
  tracksError: string | null;
};

export const [libraryData, setLibraryData] = createSignal<LibraryData | null>(null);
export const [isLoadingLibrary, setIsLoadingLibrary] = createSignal(false);
export const [libraryError, setLibraryError] = createSignal<string | null>(null);

export async function fetchLibrary(limit = 12, offset = 0): Promise<void> {
  const t = _tokens();
  if (!t) {
    setLibraryError("No access token — log in first.");
    return;
  }

  setIsLoadingLibrary(true);
  setLibraryError(null);

  const layer = makeSpotifyLayer({}, { accessToken: t.accessToken });

  const [albumsResult, tracksResult] = await Promise.allSettled([
    Effect.runPromise(
      Effect.gen(function* () {
        const library = yield* Library;
        return yield* library.getSavedAlbums({ limit, offset });
      }).pipe(Effect.provide(layer)),
    ),
    Effect.runPromise(
      Effect.gen(function* () {
        const library = yield* Library;
        return yield* library.getSavedTracks({ limit, offset });
      }).pipe(Effect.provide(layer)),
    ),
  ]);

  setLibraryData({
    albums: albumsResult.status === "fulfilled" ? albumsResult.value : null,
    tracks: tracksResult.status === "fulfilled" ? tracksResult.value : null,
    albumsError:
      albumsResult.status === "rejected"
        ? String(albumsResult.reason)
        : null,
    tracksError:
      tracksResult.status === "rejected"
        ? String(tracksResult.reason)
        : null,
  });

  setIsLoadingLibrary(false);
}

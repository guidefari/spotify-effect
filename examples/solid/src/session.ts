import { createSignal } from "solid-js";
import * as Effect from "effect/Effect";
import { SpotifyBrowser } from "@spotify-effect/browser";
import type { BrowserRefreshableTokens, AuthorizationScope } from "@spotify-effect/browser";
import type { PrivateUser, SavedAlbum, SavedTrack, Paging } from "@spotify-effect/core";

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

export const [clientId, setClientId] = createSignal("");

const browserLayer = (id: string) =>
  SpotifyBrowser.layer({
    clientId: id,
    redirectUri: `${window.location.origin}/`,
    session: {
      sessionStorage: window.sessionStorage,
      localStorage: window.localStorage,
      history: window.history,
    },
  });

const run = <A>(effect: Effect.Effect<A, unknown, SpotifyBrowser>) =>
  Effect.runPromise(effect.pipe(Effect.provide(browserLayer(clientId()))));

const initLayer = browserLayer("");
const initTokens = Effect.runSync(
  Effect.gen(function* () {
    const spotify = yield* SpotifyBrowser;
    return spotify.auth.getTokens();
  }).pipe(Effect.provide(initLayer)),
);

if (initTokens) {
  const pkceClientId = Effect.runSync(
    Effect.gen(function* () {
      const spotify = yield* SpotifyBrowser;
      return spotify.auth.getSession().getPkceState()?.clientId ?? "";
    }).pipe(Effect.provide(initLayer)),
  );
  if (pkceClientId) setClientId(pkceClientId);
}

const [_tokens, _setTokens] = createSignal<BrowserRefreshableTokens | undefined>(initTokens);
export const tokens = _tokens;

export const [profile, setProfile] = createSignal<PrivateUser | null>(null);
export const [isExchanging, setIsExchanging] = createSignal(false);
export const [isFetchingProfile, setIsFetchingProfile] = createSignal(false);
export const [sessionError, setSessionError] = createSignal<string | null>(null);

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
  const scopeList = scopes
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean) as AuthorizationScope[];

  const url = await run(
    Effect.gen(function* () {
      const spotify = yield* SpotifyBrowser;
      return yield* spotify.auth.startPkceLogin({ scopes: scopeList });
    }),
  );

  window.location.assign(url);
}

export async function exchangeCode(code: string): Promise<void> {
  setIsExchanging(true);
  setSessionError(null);

  try {
    const tokens = await run(
      Effect.gen(function* () {
        const spotify = yield* SpotifyBrowser;
        return yield* spotify.auth.exchangeCode(code);
      }),
    );
    _setTokens(tokens);
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
    const result = await run(
      Effect.gen(function* () {
        const spotify = yield* SpotifyBrowser;
        return yield* spotify.users.getCurrentUserProfile();
      }),
    );
    setProfile(result);
  } catch (err) {
    setSessionError(err instanceof Error ? err.message : String(err));
  } finally {
    setIsFetchingProfile(false);
  }
}

export function logout(): void {
  Effect.runSync(
    Effect.gen(function* () {
      const spotify = yield* SpotifyBrowser;
      spotify.auth.logout();
    }).pipe(Effect.provide(browserLayer(clientId()))),
  );
  _setTokens(undefined);
  setProfile(null);
  setSessionError(null);
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
  if (!_tokens()) {
    setLibraryError("No access token — log in first.");
    return;
  }

  setIsLoadingLibrary(true);
  setLibraryError(null);

  const [albumsResult, tracksResult] = await Promise.allSettled([
    run(
      Effect.gen(function* () {
        const spotify = yield* SpotifyBrowser;
        return yield* spotify.library.getSavedAlbums({ limit, offset });
      }),
    ),
    run(
      Effect.gen(function* () {
        const spotify = yield* SpotifyBrowser;
        return yield* spotify.library.getSavedTracks({ limit, offset });
      }),
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

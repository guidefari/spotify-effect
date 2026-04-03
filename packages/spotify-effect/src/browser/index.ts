import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { ServiceMap } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import { makeSpotifyLayer } from "../makeSpotifyLayer";
import type { SpotifyApiOptions, SpotifyCredentials } from "../services/SpotifyConfig";
import type { AuthorizationScope } from "../model/SpotifyAuthorization";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import { getAuthorizationUrl } from "../utils/getAuthorizationUrl";
import {
  createPkceCodeChallenge,
  createPkceCodeVerifier,
  makeSpotifyBrowserSession,
  type SpotifyBrowserSession,
  type BrowserRefreshableTokens,
} from "./SpotifyBrowserSession";
import { SpotifyAuth, type SpotifyAuthService } from "../services/SpotifyAuth";
import { Albums } from "../services/Albums";
import { Artists } from "../services/Artists";
import { Browse } from "../services/Browse";
import { Follow } from "../services/Follow";
import { Library } from "../services/Library";
import { Markets } from "../services/Markets";
import { Personalization } from "../services/Personalization";
import { Player } from "../services/Player";
import { Playlists } from "../services/Playlists";
import { Search } from "../services/Search";
import { Tracks } from "../services/Tracks";
import { Users } from "../services/Users";

const browserHttpClientLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  Layer.succeed(HttpClient.TracerPropagationEnabled, false),
);

export const makeSpotifyBrowserLayer = (
  options: SpotifyApiOptions = {},
  credentials: SpotifyCredentials = {},
) => makeSpotifyLayer({ ...options, httpClientLayer: browserHttpClientLayer }, credentials);

type AlbumsService = ServiceMap.Service.Shape<typeof Albums>;
type ArtistsService = ServiceMap.Service.Shape<typeof Artists>;
type BrowseService = ServiceMap.Service.Shape<typeof Browse>;
type FollowService = ServiceMap.Service.Shape<typeof Follow>;
type LibraryService = ServiceMap.Service.Shape<typeof Library>;
type MarketsService = ServiceMap.Service.Shape<typeof Markets>;
type PersonalizationService = ServiceMap.Service.Shape<typeof Personalization>;
type PlayerService = ServiceMap.Service.Shape<typeof Player>;
type PlaylistsService = ServiceMap.Service.Shape<typeof Playlists>;
type SearchService = ServiceMap.Service.Shape<typeof Search>;
type TracksService = ServiceMap.Service.Shape<typeof Tracks>;
type UsersService = ServiceMap.Service.Shape<typeof Users>;

export interface SpotifyBrowserOptions {
  readonly clientId: string;
  readonly redirectUri?: string;
  readonly session: {
    readonly sessionStorage: Storage;
    readonly localStorage: Storage;
    readonly history: History;
  };
}

export class SpotifyBrowser extends ServiceMap.Service<SpotifyBrowser, {
  readonly auth: {
    readonly startPkceLogin: (opts: {
      readonly scopes: ReadonlyArray<AuthorizationScope>;
      readonly redirectUri?: string;
    }) => Effect.Effect<string>;
    readonly exchangeCode: (code: string) => Effect.Effect<BrowserRefreshableTokens, SpotifyRequestError>;
    readonly refreshToken: (refreshToken: string) => Effect.Effect<BrowserRefreshableTokens, SpotifyRequestError>;
    readonly getTokens: () => BrowserRefreshableTokens | undefined;
    readonly setTokens: (tokens: BrowserRefreshableTokens) => void;
    readonly logout: () => void;
    readonly getSession: () => SpotifyBrowserSession;
  };
  readonly albums: AlbumsService;
  readonly artists: ArtistsService;
  readonly browse: BrowseService;
  readonly follow: FollowService;
  readonly library: LibraryService;
  readonly markets: MarketsService;
  readonly personalization: PersonalizationService;
  readonly player: PlayerService;
  readonly playlists: PlaylistsService;
  readonly search: SearchService;
  readonly tracks: TracksService;
  readonly users: UsersService;
}>()("spotify-effect/SpotifyBrowser") {
  static layer(options: SpotifyBrowserOptions) {
    const session = makeSpotifyBrowserSession(options.session);
    let currentToken: string | undefined = session.getTokens()?.accessToken;

    const getCredentials = (): SpotifyCredentials => ({
      ...(currentToken !== undefined ? { accessToken: currentToken } : null),
    });

    const make = Effect.gen(function* () {
      const auth = yield* SpotifyAuth;
      const albums = yield* Albums;
      const artists = yield* Artists;
      const browse = yield* Browse;
      const follow = yield* Follow;
      const library = yield* Library;
      const markets = yield* Markets;
      const personalization = yield* Personalization;
      const player = yield* Player;
      const playlists = yield* Playlists;
      const search = yield* Search;
      const tracks = yield* Tracks;
      const users = yield* Users;

      return {
        auth: {
          startPkceLogin: (opts: {
            readonly scopes: ReadonlyArray<AuthorizationScope>;
            readonly redirectUri?: string;
          }): Effect.Effect<string> =>
            Effect.gen(function* () {
              const redirectUri = opts.redirectUri ?? options.redirectUri ?? `${window.location.origin}/`;
              const verifier = yield* createPkceCodeVerifier();
              const challenge = yield* createPkceCodeChallenge(verifier);

              const url = getAuthorizationUrl(options.clientId, redirectUri, "code", {
                scope: opts.scopes,
                code_challenge: challenge,
                code_challenge_method: "S256",
              });

              session.setPkceState({
                verifier,
                clientId: options.clientId,
                redirectUri,
              });

              return url;
            }),

          exchangeCode: (code: string): Effect.Effect<BrowserRefreshableTokens, SpotifyRequestError> =>
            Effect.gen(function* () {
              const pkceState = session.getPkceState();
              if (!pkceState) {
                return yield* Effect.die(new Error("No stored PKCE state. Start the login flow first."));
              }

              const result = yield* auth.getRefreshableUserTokensWithPkce({
                clientId: pkceState.clientId,
                code,
                codeVerifier: pkceState.verifier,
              });

              const tokens: BrowserRefreshableTokens = {
                accessToken: result.access_token,
                refreshToken: result.refresh_token,
                accessTokenExpiresAt: Date.now() + result.expires_in * 1000,
              };

              currentToken = tokens.accessToken;
              session.setTokens(tokens);
              session.clearCallbackParams(new URL(window.location.href));

              return tokens;
            }),

          refreshToken: (refreshToken: string): Effect.Effect<BrowserRefreshableTokens, SpotifyRequestError> =>
            Effect.gen(function* () {
              const result = yield* auth.getRefreshedAccessToken(refreshToken);

              const existing = session.getTokens();
              const tokens: BrowserRefreshableTokens = {
                accessToken: result.access_token,
                refreshToken: existing?.refreshToken ?? refreshToken,
                accessTokenExpiresAt: Date.now() + result.expires_in * 1000,
              };

              currentToken = tokens.accessToken;
              session.setTokens(tokens);

              return tokens;
            }),

          getTokens: (): BrowserRefreshableTokens | undefined => session.getTokens(),

          setTokens: (tokens: BrowserRefreshableTokens): void => {
            currentToken = tokens.accessToken;
            session.setTokens(tokens);
          },

          logout: (): void => {
            currentToken = undefined;
            options.session.localStorage.removeItem("spotify-effect:tokens");
          },

          getSession: (): SpotifyBrowserSession => session,
        },
        albums,
        artists,
        browse,
        follow,
        library,
        markets,
        personalization,
        player,
        playlists,
        search,
        tracks,
        users,
      };
    });

    const spotifyLayer = makeSpotifyBrowserLayer(
      { clientId: options.clientId, redirectUri: options.redirectUri ?? "" },
      getCredentials(),
    );

    return Layer.effect(SpotifyBrowser)(make).pipe(
      Layer.provideMerge(spotifyLayer),
    );
  }
}

export type SpotifyBrowserClient = ServiceMap.Service.Shape<typeof SpotifyBrowser>;

export {
  createPkceCodeChallenge,
  createPkceCodeVerifier,
  makeSpotifyBrowserSession,
  readAuthorizationCallback,
} from "./SpotifyBrowserSession";
export { getAuthorizationUrl } from "../utils/getAuthorizationUrl";
export type {
  BrowserAuthorizationCallback,
  BrowserPkceState,
  BrowserRefreshableTokens,
  SpotifyBrowserSession,
} from "./SpotifyBrowserSession";
export type { GetAuthorizationUrlOptions, PKCEExtensionOptions } from "../utils/getAuthorizationUrl";
export type { SpotifyApiOptions, SpotifyCredentials } from "../services/SpotifyConfig";
export type { AuthorizationScope } from "../model/SpotifyAuthorization";

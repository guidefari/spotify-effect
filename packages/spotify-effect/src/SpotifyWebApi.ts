import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { FetchHttpClient, type HttpClient } from "effect/unstable/http";
import { TracksApi } from "./api/Tracks";
import { UsersApi } from "./api/Users";
import { SpotifyConfigurationError, type SpotifyRequestError } from "./errors/SpotifyError";
import type {
  GetRefreshableUserTokensResponse,
  GetRefreshedAccessTokenResponse,
  GetTemporaryAppTokensResponse,
} from "./model/SpotifyAuthorization";
import type { PrivateUser, Track } from "./model/SpotifyObjects";
import type { MarketOptions } from "./model/SpotifyOptions";
import type { GetTracksResponse } from "./model/SpotifyResponses";
import { makeSpotifyAuth } from "./services/SpotifyAuth";
import type { SpotifyAuth } from "./services/SpotifyAuth";
import { makeSpotifyRequest } from "./services/SpotifyRequest";
import {
  getAuthorizationUrl,
  type GetAuthorizationUrlOptions,
  type PKCEExtensionOptions,
} from "./utils/getAuthorizationUrl";

export interface SpotifyWebApiOptions {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  httpClientLayer?: Layer.Layer<HttpClient.HttpClient>;
}

export interface SpotifyWebApiCredentials {
  accessToken?: string;
  accessTokenExpiresAt?: number;
  refreshToken?: string;
}

interface RefreshableTokensState {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: number;
  readonly refreshToken: string;
}

interface ProvidedTracksApi {
  getTrack(trackId: string, options?: MarketOptions): Effect.Effect<Track, SpotifyRequestError>;
  getTracks(
    trackIds: ReadonlyArray<string>,
    options?: MarketOptions,
  ): Effect.Effect<GetTracksResponse["tracks"], SpotifyRequestError>;
}

interface ProvidedUsersApi {
  getCurrentUserProfile(): Effect.Effect<PrivateUser, SpotifyRequestError>
}

const isConfigured = (value: string): boolean => value.length > 0;

export class SpotifyWebApi {
  private readonly _clientId: string;
  private readonly _clientSecret: string;
  private readonly _redirectUri: string;
  private accessToken: string;
  private accessTokenExpiresAt: number | undefined;
  private refreshToken: string | undefined;
  private readonly provideHttpClient: <A, E>(effect: Effect.Effect<A, E, HttpClient.HttpClient>) => Effect.Effect<A, E>;
  private readonly appAuth: SpotifyAuth;
  private temporaryAppTokens: GetTemporaryAppTokensResponse | undefined;

  public readonly tracks: ProvidedTracksApi;
  public readonly users: ProvidedUsersApi;

  public constructor(options: SpotifyWebApiOptions = {}, credentials?: SpotifyWebApiCredentials) {
    this._clientId = options.clientId ?? "";
    this._clientSecret = options.clientSecret ?? "";
    this._redirectUri = options.redirectUri ?? "";
    this.accessToken = credentials?.accessToken ?? "";
    this.accessTokenExpiresAt = credentials?.accessTokenExpiresAt;
    this.refreshToken = credentials?.refreshToken;
    this.appAuth = makeSpotifyAuth({
      clientId: this._clientId,
      clientSecret: this._clientSecret,
      redirectUri: this._redirectUri,
    });

    const layer = options.httpClientLayer ?? FetchHttpClient.layer;
    this.provideHttpClient = <A, E>(
      effect: Effect.Effect<A, E, HttpClient.HttpClient>,
    ): Effect.Effect<A, E> => Effect.provide(effect, layer);

    const rawTracks = new TracksApi(
      makeSpotifyRequest({
        getAccessToken: () => this.resolveAccessToken(),
      }),
    );
    const rawUsers = new UsersApi(
      makeSpotifyRequest({
        getAccessToken: () => this.resolveAccessToken(),
      }),
    )

    this.tracks = {
      getTrack: (trackId, opts) => this.provideHttpClient(rawTracks.getTrack(trackId, opts)),
      getTracks: (trackIds, opts) => this.provideHttpClient(rawTracks.getTracks(trackIds, opts)),
    };
    this.users = {
      getCurrentUserProfile: () => this.provideHttpClient(rawUsers.getCurrentUserProfile()),
    }
  }

  public getTemporaryAppTokens(): Effect.Effect<GetTemporaryAppTokensResponse, SpotifyRequestError> {
    return this.provideHttpClient(this.getOrCreateTemporaryAppTokens());
  }

  public getAuthorizationCodeUrl(options?: GetAuthorizationUrlOptions): string {
    return getAuthorizationUrl(this.clientId, this.redirectUri, "code", options)
  }

  public getAuthorizationCodePKCEUrl(
    clientId: string,
    options: GetAuthorizationUrlOptions & PKCEExtensionOptions,
  ): string {
    return getAuthorizationUrl(clientId, this.redirectUri, "code", options)
  }

  public getTemporaryAuthorizationUrl(options?: GetAuthorizationUrlOptions): string {
    return getAuthorizationUrl(this.clientId, this.redirectUri, "token", options)
  }

  public getTokenWithAuthenticateCode(
    code: string,
  ): Effect.Effect<GetRefreshableUserTokensResponse, SpotifyRequestError> {
    return this.provideHttpClient(
      this.appAuth.getRefreshableUserTokens(code).pipe(
        Effect.tap((tokens) => this.storeRefreshableTokens(tokens)),
      ),
    )
  }

  public getTokenWithAuthenticateCodePKCE(
    code: string,
    codeVerifier: string,
    clientId: string,
  ): Effect.Effect<GetRefreshableUserTokensResponse, SpotifyRequestError> {
    return this.provideHttpClient(
      this.appAuth.getRefreshableUserTokensWithPkce({
        clientId,
        code,
        codeVerifier,
      }).pipe(Effect.tap((tokens) => this.storeRefreshableTokens(tokens))),
    )
  }

  public getRefreshedAccessToken(
    refreshToken: string,
  ): Effect.Effect<GetRefreshedAccessTokenResponse, SpotifyRequestError> {
    return this.provideHttpClient(
      this.appAuth.getRefreshedAccessToken(refreshToken).pipe(
        Effect.tap((tokens) =>
          Effect.sync(() => {
            this.accessToken = tokens.access_token;
            this.accessTokenExpiresAt = Date.now() + tokens.expires_in * 1000;
            this.refreshToken = refreshToken;
          }),
        ),
      ),
    )
  }

  public getAccessToken(): string {
    return this.accessToken;
  }

  public setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
    this.accessTokenExpiresAt = undefined;
  }

  public setRefreshableUserTokens(tokens: GetRefreshableUserTokensResponse): void {
    this.accessToken = tokens.access_token;
    this.accessTokenExpiresAt = Date.now() + tokens.expires_in * 1000;
    this.refreshToken = tokens.refresh_token;
  }

  public getAccessTokenExpiresAt(): number | undefined {
    return this.accessTokenExpiresAt
  }

  public getRefreshToken(): string | undefined {
    return this.refreshToken
  }

  private resolveAccessToken(): Effect.Effect<string, SpotifyRequestError, HttpClient.HttpClient> {
    if (isConfigured(this.accessToken) && !this.hasExpiredAccessToken()) {
      return Effect.succeed(this.accessToken);
    }

    if (isConfigured(this.refreshToken ?? "")) {
      return this.refreshAccessToken().pipe(Effect.map((tokens) => tokens.access_token));
    }

    if (isConfigured(this._clientId) && isConfigured(this._clientSecret)) {
      return this.getOrCreateTemporaryAppTokens().pipe(Effect.map((tokens) => tokens.access_token));
    }

    return Effect.fail(
      new SpotifyConfigurationError({
        message: "Provide an access token or configure clientId and clientSecret",
      }),
    );
  }

  private hasExpiredAccessToken(): boolean {
    return this.accessTokenExpiresAt !== undefined && Date.now() >= this.accessTokenExpiresAt
  }

  private refreshAccessToken(): Effect.Effect<
    GetRefreshedAccessTokenResponse,
    SpotifyRequestError,
    HttpClient.HttpClient
  > {
    const refreshToken = this.refreshToken

    if (refreshToken === undefined || refreshToken.length === 0) {
      return Effect.fail(
        new SpotifyConfigurationError({
          message: "refreshToken is required to refresh a user access token",
        }),
      )
    }

    return this.appAuth.getRefreshedAccessToken(refreshToken).pipe(
      Effect.tap((tokens) =>
        Effect.sync(() => {
          this.accessToken = tokens.access_token;
          this.accessTokenExpiresAt = Date.now() + tokens.expires_in * 1000;
        }),
      ),
    )
  }

  private storeRefreshableTokens(tokens: GetRefreshableUserTokensResponse): Effect.Effect<void> {
    return Effect.sync(() => {
      this.accessToken = tokens.access_token;
      this.accessTokenExpiresAt = Date.now() + tokens.expires_in * 1000;
      this.refreshToken = tokens.refresh_token;
    })
  }

  private getOrCreateTemporaryAppTokens(): Effect.Effect<
    GetTemporaryAppTokensResponse,
    SpotifyRequestError,
    HttpClient.HttpClient
  > {
    if (this.temporaryAppTokens !== undefined) {
      return Effect.succeed(this.temporaryAppTokens);
    }

    return this.appAuth.getTemporaryAppTokens().pipe(
      Effect.tap((tokens) => Effect.sync(() => {
        this.temporaryAppTokens = tokens;
      })),
    );
  }

  public get clientId(): string {
    return this._clientId;
  }

  public get clientSecret(): string {
    return this._clientSecret;
  }

  public get redirectUri(): string {
    return this._redirectUri;
  }
}

export default SpotifyWebApi;

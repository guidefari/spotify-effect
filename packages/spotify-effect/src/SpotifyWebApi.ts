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
import { makeSpotifySession, type SpotifySession } from "./services/SpotifySession";
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
  private readonly provideHttpClient: <A, E>(effect: Effect.Effect<A, E, HttpClient.HttpClient>) => Effect.Effect<A, E>;
  private readonly appAuth: SpotifyAuth;
  private readonly session: SpotifySession;

  public readonly tracks: ProvidedTracksApi;
  public readonly users: ProvidedUsersApi;

  public constructor(options: SpotifyWebApiOptions = {}, credentials?: SpotifyWebApiCredentials) {
    this._clientId = options.clientId ?? "";
    this._clientSecret = options.clientSecret ?? "";
    this._redirectUri = options.redirectUri ?? "";
    this.appAuth = makeSpotifyAuth({
      clientId: this._clientId,
      clientSecret: this._clientSecret,
      redirectUri: this._redirectUri,
    });
    this.session = makeSpotifySession(credentials)

    const layer = options.httpClientLayer ?? FetchHttpClient.layer;
    this.provideHttpClient = <A, E>(
      effect: Effect.Effect<A, E, HttpClient.HttpClient>,
    ): Effect.Effect<A, E> => Effect.provide(effect, layer);

    const rawTracks = new TracksApi(
      makeSpotifyRequest({
        getAccessToken: () =>
          this.session.getAccessToken({
            auth: this.appAuth,
            canUseClientCredentials: isConfigured(this._clientId) && isConfigured(this._clientSecret),
          }),
      }),
    );
    const rawUsers = new UsersApi(
      makeSpotifyRequest({
        getAccessToken: () =>
          this.session.getAccessToken({
            auth: this.appAuth,
            canUseClientCredentials: isConfigured(this._clientId) && isConfigured(this._clientSecret),
          }),
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
    return this.provideHttpClient(this.session.getTemporaryAppTokens(this.appAuth));
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
        Effect.tap((tokens) => this.session.setRefreshableUserTokens(tokens)),
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
      }).pipe(Effect.tap((tokens) => this.session.setRefreshableUserTokens(tokens))),
    )
  }

  public getRefreshedAccessToken(
    refreshToken: string,
  ): Effect.Effect<GetRefreshedAccessTokenResponse, SpotifyRequestError> {
    return this.provideHttpClient(
      this.appAuth.getRefreshedAccessToken(refreshToken).pipe(
        Effect.tap((tokens) => this.session.updateRefreshedAccessToken(refreshToken, tokens)),
      ),
    )
  }

  public getAccessToken(): string {
    return this.session.getStoredAccessToken();
  }

  public setAccessToken(accessToken: string): void {
    Effect.runSync(this.session.setAccessToken(accessToken));
  }

  public setRefreshableUserTokens(tokens: GetRefreshableUserTokensResponse): void {
    Effect.runSync(this.session.setRefreshableUserTokens(tokens));
  }

  public getAccessTokenExpiresAt(): number | undefined {
    return this.session.getStoredAccessTokenExpiresAt()
  }

  public getRefreshToken(): string | undefined {
    return this.session.getStoredRefreshToken()
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

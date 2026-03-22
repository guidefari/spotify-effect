import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { FetchHttpClient, type HttpClient } from "effect/unstable/http";
import { TracksApi } from "./api/Tracks";
import { SpotifyConfigurationError, type SpotifyRequestError } from "./errors/SpotifyError";
import type { GetTemporaryAppTokensResponse } from "./model/SpotifyAuthorization";
import type { Track } from "./model/SpotifyObjects";
import type { MarketOptions } from "./model/SpotifyOptions";
import type { GetTracksResponse } from "./model/SpotifyResponses";
import { makeSpotifyAuth } from "./services/SpotifyAuth";
import type { SpotifyAuth } from "./services/SpotifyAuth";
import { makeSpotifyRequest } from "./services/SpotifyRequest";

export interface SpotifyWebApiOptions {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  httpClientLayer?: Layer.Layer<HttpClient.HttpClient>;
}

export interface SpotifyWebApiCredentials {
  accessToken?: string;
}

interface ProvidedTracksApi {
  getTrack(trackId: string, options?: MarketOptions): Effect.Effect<Track, SpotifyRequestError>;
  getTracks(
    trackIds: ReadonlyArray<string>,
    options?: MarketOptions,
  ): Effect.Effect<GetTracksResponse["tracks"], SpotifyRequestError>;
}

const isConfigured = (value: string): boolean => value.length > 0;

export class SpotifyWebApi {
  private readonly _clientId: string;
  private readonly _clientSecret: string;
  private readonly _redirectUri: string;
  private accessToken: string;
  private readonly provideHttpClient: <A, E>(effect: Effect.Effect<A, E, HttpClient.HttpClient>) => Effect.Effect<A, E>;
  private readonly appAuth: SpotifyAuth;
  private temporaryAppTokens: GetTemporaryAppTokensResponse | undefined;

  public readonly tracks: ProvidedTracksApi;

  public constructor(options: SpotifyWebApiOptions = {}, credentials?: SpotifyWebApiCredentials) {
    this._clientId = options.clientId ?? "";
    this._clientSecret = options.clientSecret ?? "";
    this._redirectUri = options.redirectUri ?? "";
    this.accessToken = credentials?.accessToken ?? "";
    this.appAuth = makeSpotifyAuth({ clientId: this._clientId, clientSecret: this._clientSecret });

    const layer = options.httpClientLayer ?? FetchHttpClient.layer;
    this.provideHttpClient = <A, E>(
      effect: Effect.Effect<A, E, HttpClient.HttpClient>,
    ): Effect.Effect<A, E> => Effect.provide(effect, layer);

    const rawTracks = new TracksApi(
      makeSpotifyRequest({
        getAccessToken: () => this.resolveAccessToken(),
      }),
    );

    this.tracks = {
      getTrack: (trackId, opts) => this.provideHttpClient(rawTracks.getTrack(trackId, opts)),
      getTracks: (trackIds, opts) => this.provideHttpClient(rawTracks.getTracks(trackIds, opts)),
    };
  }

  public getTemporaryAppTokens(): Effect.Effect<GetTemporaryAppTokensResponse, SpotifyRequestError> {
    return this.provideHttpClient(this.getOrCreateTemporaryAppTokens());
  }

  public getAccessToken(): string {
    return this.accessToken;
  }

  public setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }

  private resolveAccessToken(): Effect.Effect<string, SpotifyRequestError, HttpClient.HttpClient> {
    if (isConfigured(this.accessToken)) {
      return Effect.succeed(this.accessToken);
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

import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { FetchHttpClient, type HttpClient } from "effect/unstable/http";
import { TracksApi } from "./api/Tracks";
import type { SpotifyRequestError } from "./errors/SpotifyError";
import type { Track } from "./model/SpotifyObjects";
import type { MarketOptions } from "./model/SpotifyOptions";
import type { GetTracksResponse } from "./model/SpotifyResponses";
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

export class SpotifyWebApi {
  private readonly _clientId: string;
  private readonly _clientSecret: string;
  private readonly _redirectUri: string;
  private accessToken: string;

  public readonly tracks: ProvidedTracksApi;

  public constructor(options: SpotifyWebApiOptions = {}, credentials?: SpotifyWebApiCredentials) {
    this._clientId = options.clientId ?? "";
    this._clientSecret = options.clientSecret ?? "";
    this._redirectUri = options.redirectUri ?? "";
    this.accessToken = credentials?.accessToken ?? "";

    const layer = options.httpClientLayer ?? FetchHttpClient.layer;
    const provide = <A, E>(
      effect: Effect.Effect<A, E, HttpClient.HttpClient>,
    ): Effect.Effect<A, E> => Effect.provide(effect, layer);

    const rawTracks = new TracksApi(
      makeSpotifyRequest({
        getAccessToken: () => this.accessToken,
      }),
    );

    this.tracks = {
      getTrack: (trackId, opts) => provide(rawTracks.getTrack(trackId, opts)),
      getTracks: (trackIds, opts) => provide(rawTracks.getTracks(trackIds, opts)),
    };
  }

  public getAccessToken(): string {
    return this.accessToken;
  }

  public setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
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

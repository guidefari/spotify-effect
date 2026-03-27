import * as Effect from "effect/Effect";
import type { HttpClient } from "effect/unstable/http";
import type { SpotifyRequest, SpotifyRequestOptions } from "../services/SpotifyRequest";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { AudioAnalysis, AudioFeatures, Track } from "../model/SpotifyObjects";
import { TrackSchema } from "../model/SpotifyObjectSchemas";
import type { MarketOptions } from "../model/SpotifyOptions";
import type { GetAudioFeaturesForTracksResponse, GetTracksResponse } from "../model/SpotifyResponses";
import {
  AudioAnalysisResponseSchema,
  AudioFeaturesResponseSchema,
  GetAudioFeaturesForTracksResponseSchema,
  GetTracksResponseSchema,
} from "../model/SpotifyResponseSchemas";

const withMarketQuery = (options?: MarketOptions): SpotifyRequestOptions | undefined =>
  options?.market === undefined ? undefined : { query: { market: options.market } };

const withTrackIdsQuery = (
  trackIds: ReadonlyArray<string>,
  options?: MarketOptions,
): SpotifyRequestOptions => ({
  query: {
    ids: trackIds.join(","),
    ...(options?.market === undefined ? null : { market: options.market }),
  },
});

export class TracksApi {
  constructor(private readonly request: SpotifyRequest) {}

  public getTrack(
    trackId: string,
    options?: MarketOptions,
  ): Effect.Effect<Track, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema(
      `/tracks/${trackId}`,
      TrackSchema,
      withMarketQuery(options),
    );
  }

  public getTracks(
    trackIds: ReadonlyArray<string>,
    options?: MarketOptions,
  ): Effect.Effect<GetTracksResponse["tracks"], SpotifyRequestError, HttpClient.HttpClient> {
    return this.request
      .getJsonWithSchema("/tracks", GetTracksResponseSchema, withTrackIdsQuery(trackIds, options))
      .pipe(Effect.map((response) => response.tracks));
  }

  public getAudioAnalysisForTrack(
    trackId: string,
  ): Effect.Effect<AudioAnalysis, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema(`/audio-analysis/${trackId}`, AudioAnalysisResponseSchema);
  }

  public getAudioFeaturesForTrack(
    trackId: string,
  ): Effect.Effect<AudioFeatures, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema(`/audio-features/${trackId}`, AudioFeaturesResponseSchema);
  }

  public getAudioFeaturesForTracks(
    trackIds: ReadonlyArray<string>,
  ): Effect.Effect<GetAudioFeaturesForTracksResponse["audio_features"], SpotifyRequestError, HttpClient.HttpClient> {
    return this.request
      .getJsonWithSchema("/audio-features", GetAudioFeaturesForTracksResponseSchema, {
        query: { ids: trackIds.join(",") },
      })
      .pipe(Effect.map((response) => response.audio_features));
  }
}

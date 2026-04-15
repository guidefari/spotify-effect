import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Tracks } from "../services/Tracks";
import {
  SpotifyRequest,
  type SpotifyRequestOptions,
  type SpotifyRequestService,
} from "../services/SpotifyRequest";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { AudioAnalysis, AudioFeatures, Track } from "../model/SpotifyObjects";
import { TrackSchema } from "../model/SpotifyObjectSchemas";
import type { MarketOptions } from "../model/SpotifyOptions";
import type {
  GetAudioFeaturesForTracksResponse,
  GetTracksResponse,
} from "../model/SpotifyResponses";
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
  constructor(private readonly request: SpotifyRequestService) {}

  public getTrack(
    trackId: string,
    options?: MarketOptions,
  ): Effect.Effect<Track, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      `/tracks/${trackId}`,
      TrackSchema,
      withMarketQuery(options),
    );
  }

  public getTracks(
    trackIds: ReadonlyArray<string>,
    options?: MarketOptions,
  ): Effect.Effect<GetTracksResponse["tracks"], SpotifyRequestError> {
    return this.request
      .getJsonWithSchema("/tracks", GetTracksResponseSchema, withTrackIdsQuery(trackIds, options))
      .pipe(Effect.map((response) => response.tracks));
  }

  public getAudioAnalysisForTrack(
    trackId: string,
  ): Effect.Effect<AudioAnalysis, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      `/audio-analysis/${trackId}`,
      AudioAnalysisResponseSchema,
    );
  }

  public getAudioFeaturesForTrack(
    trackId: string,
  ): Effect.Effect<AudioFeatures, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      `/audio-features/${trackId}`,
      AudioFeaturesResponseSchema,
    );
  }

  public getAudioFeaturesForTracks(
    trackIds: ReadonlyArray<string>,
  ): Effect.Effect<GetAudioFeaturesForTracksResponse["audio_features"], SpotifyRequestError> {
    return this.request
      .getJsonWithSchema("/audio-features", GetAudioFeaturesForTracksResponseSchema, {
        query: { ids: trackIds.join(",") },
      })
      .pipe(Effect.map((response) => response.audio_features));
  }
}

export const layer = Layer.effect(
  Tracks,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new TracksApi(request);

    return {
      getTrack: api.getTrack.bind(api),
      getTracks: api.getTracks.bind(api),
      getAudioAnalysisForTrack: api.getAudioAnalysisForTrack.bind(api),
      getAudioFeaturesForTrack: api.getAudioFeaturesForTrack.bind(api),
      getAudioFeaturesForTracks: api.getAudioFeaturesForTracks.bind(api),
    };
  }),
);

import * as Effect from "effect/Effect";
import type { HttpClient } from "effect/unstable/http";
import type { SpotifyRequest, SpotifyRequestOptions } from "../services/SpotifyRequest";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Track } from "../model/SpotifyObjects";
import type { MarketOptions } from "../model/SpotifyOptions";
import type { GetTracksResponse } from "../model/SpotifyResponses";

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
    return this.request.getJson<Track>(`/tracks/${trackId}`, withMarketQuery(options));
  }

  public getTracks(
    trackIds: ReadonlyArray<string>,
    options?: MarketOptions,
  ): Effect.Effect<GetTracksResponse["tracks"], SpotifyRequestError, HttpClient.HttpClient> {
    return this.request
      .getJson<GetTracksResponse>("/tracks", withTrackIdsQuery(trackIds, options))
      .pipe(Effect.map((response) => response.tracks));
  }
}

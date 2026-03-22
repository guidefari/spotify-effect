import type * as Effect from "effect/Effect"
import type { SpotifyRequest, SpotifyRequestOptions } from "../services/SpotifyRequest"
import type { SpotifyRequestError } from "../errors/SpotifyError"
import type { Track } from "../model/SpotifyObjects"
import type { MarketOptions } from "../model/SpotifyOptions"

const withMarketQuery = (
  options?: MarketOptions,
): SpotifyRequestOptions | undefined =>
  options?.market === undefined ? undefined : { query: { market: options.market } }

export class TracksApi {
  constructor(private readonly request: SpotifyRequest) {}

  public getTrack(
    trackId: string,
    options?: MarketOptions,
  ): Effect.Effect<Track, SpotifyRequestError> {
    return this.request.getJson<Track>(`/tracks/${trackId}`, withMarketQuery(options))
  }
}

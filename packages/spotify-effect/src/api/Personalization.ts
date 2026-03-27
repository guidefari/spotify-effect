import * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Artist, Paging, Track } from "../model/SpotifyObjects";
import type { PersonalizationOptions } from "../model/SpotifyOptions";
import {
  GetMyTopArtistsResponseSchema,
  GetMyTopTracksResponseSchema,
} from "../model/SpotifyResponseSchemas";
import type { SpotifyRequest, SpotifyRequestOptions } from "../services/SpotifyRequest";
import { HttpClient } from "effect/unstable/http";

const buildQuery = (options?: Record<string, unknown>): SpotifyRequestOptions | undefined => {
  if (options === undefined) return undefined;
  const query: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      query[key] = value as string | number;
    }
  }
  return Object.keys(query).length > 0 ? { query } : undefined;
};

export class PersonalizationApi {
  private readonly request: SpotifyRequest;

  public constructor(request: SpotifyRequest) {
    this.request = request;
  }

  public getMyTopArtists(
    options?: PersonalizationOptions,
  ): Effect.Effect<Paging<Artist>, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema(
      "/me/top/artists",
      GetMyTopArtistsResponseSchema,
      buildQuery(options),
    );
  }

  public getMyTopTracks(
    options?: PersonalizationOptions,
  ): Effect.Effect<Paging<Track>, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema(
      "/me/top/tracks",
      GetMyTopTracksResponseSchema,
      buildQuery(options),
    );
  }
}

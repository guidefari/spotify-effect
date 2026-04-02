import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Artist, Paging, Track } from "../model/SpotifyObjects";
import type { PersonalizationOptions } from "../model/SpotifyOptions";
import {
  GetMyTopArtistsResponseSchema,
  GetMyTopTracksResponseSchema,
} from "../model/SpotifyResponseSchemas";
import { Personalization } from "../services/Personalization";
import { SpotifyRequest, type SpotifyRequestOptions, type SpotifyRequestService } from "../services/SpotifyRequest";

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
  private readonly request: SpotifyRequestService;

  public constructor(request: SpotifyRequestService) {
    this.request = request;
  }

  public getMyTopArtists(
    options?: PersonalizationOptions,
  ): Effect.Effect<Paging<Artist>, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      "/me/top/artists",
      GetMyTopArtistsResponseSchema,
      buildQuery(options),
    );
  }

  public getMyTopTracks(
    options?: PersonalizationOptions,
  ): Effect.Effect<Paging<Track>, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      "/me/top/tracks",
      GetMyTopTracksResponseSchema,
      buildQuery(options),
    );
  }
}

export const layer = Layer.effect(
  Personalization,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new PersonalizationApi(request);

    return {
      getMyTopArtists: api.getMyTopArtists.bind(api),
      getMyTopTracks: api.getMyTopTracks.bind(api),
    };
  }),
);

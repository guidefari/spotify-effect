import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Album, Paging, SimplifiedTrack } from "../model/SpotifyObjects";
import { AlbumSchema } from "../model/SpotifyObjectSchemas";
import type { GetAlbumTracksOptions, MarketOptions } from "../model/SpotifyOptions";
import type { GetAlbumsResponse } from "../model/SpotifyResponses";
import {
  GetAlbumTracksResponseSchema,
  GetAlbumsResponseSchema,
} from "../model/SpotifyResponseSchemas";
import { Albums } from "../services/Albums";
import { SpotifyRequest, type SpotifyRequestOptions, type SpotifyRequestService } from "../services/SpotifyRequest";

const withMarketQuery = (options?: MarketOptions): SpotifyRequestOptions | undefined =>
  options?.market === undefined ? undefined : { query: { market: options.market } };

const withAlbumIdsQuery = (
  albumIds: ReadonlyArray<string>,
  options?: MarketOptions,
): SpotifyRequestOptions => ({
  query: {
    ids: albumIds.join(","),
    ...(options?.market === undefined ? null : { market: options.market }),
  },
});

const withAlbumTracksQuery = (
  options?: GetAlbumTracksOptions,
): SpotifyRequestOptions | undefined => {
  if (options === undefined) return undefined;
  const query: Record<string, string | number> = {};
  if (options.limit !== undefined) query.limit = options.limit;
  if (options.offset !== undefined) query.offset = options.offset;
  if (options.market !== undefined) query.market = options.market;
  return Object.keys(query).length > 0 ? { query } : undefined;
};

export class AlbumsApi {
  constructor(private readonly request: SpotifyRequestService) {}

  public getAlbum(
    albumId: string,
    options?: MarketOptions,
  ): Effect.Effect<Album, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      `/albums/${albumId}`,
      AlbumSchema,
      withMarketQuery(options),
    );
  }

  public getAlbums(
    albumIds: ReadonlyArray<string>,
    options?: MarketOptions,
  ): Effect.Effect<GetAlbumsResponse["albums"], SpotifyRequestError> {
    return this.request
      .getJsonWithSchema("/albums", GetAlbumsResponseSchema, withAlbumIdsQuery(albumIds, options))
      .pipe(Effect.map((response) => response.albums));
  }

  public getAlbumTracks(
    albumId: string,
    options?: GetAlbumTracksOptions,
  ): Effect.Effect<Paging<SimplifiedTrack>, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      `/albums/${albumId}/tracks`,
      GetAlbumTracksResponseSchema,
      withAlbumTracksQuery(options),
    );
  }
}

export const layer = Layer.effect(
  Albums,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new AlbumsApi(request);

    return {
      getAlbum: api.getAlbum.bind(api),
      getAlbums: api.getAlbums.bind(api),
      getAlbumTracks: api.getAlbumTracks.bind(api),
    };
  }),
);

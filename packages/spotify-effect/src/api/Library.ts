import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Paging, SavedAlbum, SavedTrack } from "../model/SpotifyObjects";
import type {
  GetSavedAlbumsOptions,
  GetSavedTracksOptions,
  RemoveSavedShowsOptions,
} from "../model/SpotifyOptions";
import {
  BooleanArraySchema,
  GetSavedAlbumsResponseSchema,
  GetSavedTracksResponseSchema,
} from "../model/SpotifyResponseSchemas";
import { Library } from "../services/Library";
import {
  SpotifyRequest,
  type SpotifyRequestOptions,
  type SpotifyRequestService,
} from "../services/SpotifyRequest";

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

export class LibraryApi {
  private readonly request: SpotifyRequestService;

  public constructor(request: SpotifyRequestService) {
    this.request = request;
  }

  public getSavedAlbums(
    options?: GetSavedAlbumsOptions,
  ): Effect.Effect<Paging<SavedAlbum>, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      "/me/albums",
      GetSavedAlbumsResponseSchema,
      buildQuery(options),
    );
  }

  public getSavedTracks(
    options?: GetSavedTracksOptions,
  ): Effect.Effect<Paging<SavedTrack>, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      "/me/tracks",
      GetSavedTracksResponseSchema,
      buildQuery(options),
    );
  }

  public areAlbumsSaved(
    albumIds: ReadonlyArray<string>,
  ): Effect.Effect<boolean[], SpotifyRequestError> {
    return this.request.getJsonWithSchema("/me/albums/contains", BooleanArraySchema, {
      query: { ids: albumIds.join(",") },
    });
  }

  public areTracksSaved(
    trackIds: ReadonlyArray<string>,
  ): Effect.Effect<boolean[], SpotifyRequestError> {
    return this.request.getJsonWithSchema("/me/tracks/contains", BooleanArraySchema, {
      query: { ids: trackIds.join(",") },
    });
  }

  public saveAlbums(albumIds: ReadonlyArray<string>): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson("/me/albums", { query: { ids: albumIds.join(",") } });
  }

  public saveTracks(trackIds: ReadonlyArray<string>): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson("/me/tracks", { query: { ids: trackIds.join(",") } });
  }

  public removeSavedAlbums(
    albumIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.deleteVoid("/me/albums", { query: { ids: albumIds.join(",") } });
  }

  public removeSavedTracks(
    trackIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.deleteVoid("/me/tracks", { query: { ids: trackIds.join(",") } });
  }

  public removeSavedShows(
    showIds: ReadonlyArray<string>,
    options?: RemoveSavedShowsOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.deleteVoid("/me/shows", {
      query: {
        ids: showIds.join(","),
        ...(options?.market !== undefined ? { market: options.market } : null),
      },
    });
  }
}

export const layer = Layer.effect(
  Library,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new LibraryApi(request);

    return {
      getSavedAlbums: api.getSavedAlbums.bind(api),
      getSavedTracks: api.getSavedTracks.bind(api),
      areAlbumsSaved: api.areAlbumsSaved.bind(api),
      areTracksSaved: api.areTracksSaved.bind(api),
      saveAlbums: api.saveAlbums.bind(api),
      saveTracks: api.saveTracks.bind(api),
      removeSavedAlbums: api.removeSavedAlbums.bind(api),
      removeSavedTracks: api.removeSavedTracks.bind(api),
      removeSavedShows: api.removeSavedShows.bind(api),
    };
  }),
);

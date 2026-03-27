import * as Effect from "effect/Effect";
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

export class LibraryApi {
  private readonly request: SpotifyRequest;

  public constructor(request: SpotifyRequest) {
    this.request = request;
  }

  public getSavedAlbums(
    options?: GetSavedAlbumsOptions,
  ): Effect.Effect<Paging<SavedAlbum>, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema("/me/albums", GetSavedAlbumsResponseSchema, buildQuery(options));
  }

  public getSavedTracks(
    options?: GetSavedTracksOptions,
  ): Effect.Effect<Paging<SavedTrack>, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema("/me/tracks", GetSavedTracksResponseSchema, buildQuery(options));
  }

  public areAlbumsSaved(
    albumIds: ReadonlyArray<string>,
  ): Effect.Effect<boolean[], SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema("/me/albums/contains", BooleanArraySchema, {
      query: { ids: albumIds.join(",") },
    });
  }

  public areTracksSaved(
    trackIds: ReadonlyArray<string>,
  ): Effect.Effect<boolean[], SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema("/me/tracks/contains", BooleanArraySchema, {
      query: { ids: trackIds.join(",") },
    });
  }

  public saveAlbums(
    albumIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.putJson("/me/albums", { query: { ids: albumIds.join(",") } });
  }

  public saveTracks(
    trackIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.putJson("/me/tracks", { query: { ids: trackIds.join(",") } });
  }

  public removeSavedAlbums(
    albumIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.deleteVoid("/me/albums", { query: { ids: albumIds.join(",") } });
  }

  public removeSavedTracks(
    trackIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.deleteVoid("/me/tracks", { query: { ids: trackIds.join(",") } });
  }

  public removeSavedShows(
    showIds: ReadonlyArray<string>,
    options?: RemoveSavedShowsOptions,
  ): Effect.Effect<void, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.deleteVoid("/me/shows", {
      query: {
        ids: showIds.join(","),
        ...(options?.market !== undefined ? { market: options.market } : null),
      },
    });
  }
}

import * as Effect from "effect/Effect";
import type { HttpClient } from "effect/unstable/http";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Category } from "../model/SpotifyObjects";
import { CategorySchema } from "../model/SpotifyObjectSchemas";
import type {
  GetCategoriesOptions,
  GetCategoryOptions,
  GetCategoryPlaylistsOptions,
  GetFeaturedPlaylistsOptions,
  GetNewReleasesOptions,
} from "../model/SpotifyOptions";
import type {
  GetAvailableGenreSeedsResponse,
  GetCategoriesResponse,
  GetCategoryPlaylistsResponse,
  GetFeaturedPlaylistsResponse,
  GetNewReleasesResponse,
} from "../model/SpotifyResponses";
import {
  GetAvailableGenreSeedsResponseSchema,
  GetCategoriesResponseSchema,
  GetCategoryPlaylistsResponseSchema,
  GetFeaturedPlaylistsResponseSchema,
  GetNewReleasesResponseSchema,
} from "../model/SpotifyResponseSchemas";
import type { SpotifyRequest, SpotifyRequestOptions } from "../services/SpotifyRequest";

const buildQuery = (
  options: Record<string, string | number | undefined> | undefined,
): SpotifyRequestOptions | undefined => {
  if (options === undefined) return undefined;
  const query: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) query[key] = value;
  }
  return Object.keys(query).length > 0 ? { query } : undefined;
};

export class BrowseApi {
  constructor(private readonly request: SpotifyRequest) {}

  public getCategories(
    options?: GetCategoriesOptions,
  ): Effect.Effect<
    GetCategoriesResponse["categories"],
    SpotifyRequestError,
    HttpClient.HttpClient
  > {
    return this.request
      .getJsonWithSchema("/browse/categories", GetCategoriesResponseSchema, buildQuery(options))
      .pipe(Effect.map((response) => response.categories));
  }

  public getCategory(
    categoryId: string,
    options?: GetCategoryOptions,
  ): Effect.Effect<Category, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema(
      `/browse/categories/${categoryId}`,
      CategorySchema,
      buildQuery(options),
    );
  }

  public getCategoryPlaylists(
    categoryId: string,
    options?: GetCategoryPlaylistsOptions,
  ): Effect.Effect<
    GetCategoryPlaylistsResponse["playlists"],
    SpotifyRequestError,
    HttpClient.HttpClient
  > {
    return this.request
      .getJsonWithSchema(
        `/browse/categories/${categoryId}/playlists`,
        GetCategoryPlaylistsResponseSchema,
        buildQuery(options),
      )
      .pipe(Effect.map((response) => response.playlists));
  }

  public getFeaturedPlaylists(
    options?: GetFeaturedPlaylistsOptions,
  ): Effect.Effect<GetFeaturedPlaylistsResponse, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema(
      "/browse/featured-playlists",
      GetFeaturedPlaylistsResponseSchema,
      buildQuery(options),
    );
  }

  public getNewReleases(
    options?: GetNewReleasesOptions,
  ): Effect.Effect<GetNewReleasesResponse["albums"], SpotifyRequestError, HttpClient.HttpClient> {
    return this.request
      .getJsonWithSchema("/browse/new-releases", GetNewReleasesResponseSchema, buildQuery(options))
      .pipe(Effect.map((response) => response.albums));
  }

  public getAvailableGenreSeeds(): Effect.Effect<
    GetAvailableGenreSeedsResponse["genres"],
    SpotifyRequestError,
    HttpClient.HttpClient
  > {
    return this.request
      .getJsonWithSchema(
        "/recommendations/available-genre-seeds",
        GetAvailableGenreSeedsResponseSchema,
      )
      .pipe(Effect.map((response) => response.genres));
  }
}

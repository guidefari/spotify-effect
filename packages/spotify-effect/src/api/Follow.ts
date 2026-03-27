import * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Artist, CursorBasedPaging } from "../model/SpotifyObjects";
import type { FollowPlaylistOptions, GetFollowedArtistsOptions } from "../model/SpotifyOptions";
import { BooleanArraySchema, GetFollowedArtistsResponseSchema } from "../model/SpotifyResponseSchemas";
import type { SpotifyRequest } from "../services/SpotifyRequest";
import { HttpClient } from "effect/unstable/http";

export class FollowApi {
  private readonly request: SpotifyRequest;

  public constructor(request: SpotifyRequest) {
    this.request = request;
  }

  public getFollowedArtists(
    options?: GetFollowedArtistsOptions,
  ): Effect.Effect<CursorBasedPaging<Artist>, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request
      .getJsonWithSchema("/me/following", GetFollowedArtistsResponseSchema, {
        query: {
          type: "artist",
          ...(options?.limit !== undefined ? { limit: options.limit } : null),
          ...(options?.after !== undefined ? { after: options.after } : null),
        },
      })
      .pipe(Effect.map((r) => r.artists));
  }

  public followArtists(
    artistIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.putJson("/me/following", {
      query: { type: "artist", ids: artistIds.join(",") },
    });
  }

  public unfollowArtists(
    artistIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.deleteVoid("/me/following", {
      query: { type: "artist", ids: artistIds.join(",") },
    });
  }

  public followUsers(
    userIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.putJson("/me/following", {
      query: { type: "user", ids: userIds.join(",") },
    });
  }

  public unfollowUsers(
    userIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.deleteVoid("/me/following", {
      query: { type: "user", ids: userIds.join(",") },
    });
  }

  public isFollowingArtists(
    artistIds: ReadonlyArray<string>,
  ): Effect.Effect<boolean[], SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema("/me/following/contains", BooleanArraySchema, {
      query: { type: "artist", ids: artistIds.join(",") },
    });
  }

  public isFollowingUsers(
    userIds: ReadonlyArray<string>,
  ): Effect.Effect<boolean[], SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema("/me/following/contains", BooleanArraySchema, {
      query: { type: "user", ids: userIds.join(",") },
    });
  }

  public followPlaylist(
    playlistId: string,
    options?: FollowPlaylistOptions,
  ): Effect.Effect<void, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.putJson(`/playlists/${playlistId}/followers`, {
      ...(options !== undefined ? { body: options } : null),
    });
  }

  public unfollowPlaylist(
    playlistId: string,
  ): Effect.Effect<void, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.deleteVoid(`/playlists/${playlistId}/followers`);
  }

  public areFollowingPlaylist(
    playlistId: string,
    userIds: ReadonlyArray<string>,
  ): Effect.Effect<boolean[], SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema(
      `/playlists/${playlistId}/followers/contains`,
      BooleanArraySchema,
      { query: { ids: userIds.join(",") } },
    );
  }
}

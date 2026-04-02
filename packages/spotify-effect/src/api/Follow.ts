import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { Artist, CursorBasedPaging } from "../model/SpotifyObjects";
import type { FollowPlaylistOptions, GetFollowedArtistsOptions } from "../model/SpotifyOptions";
import { BooleanArraySchema, GetFollowedArtistsResponseSchema } from "../model/SpotifyResponseSchemas";
import { Follow } from "../services/Follow";
import { SpotifyRequest, type SpotifyRequestService } from "../services/SpotifyRequest";

export class FollowApi {
  private readonly request: SpotifyRequestService;

  public constructor(request: SpotifyRequestService) {
    this.request = request;
  }

  public getFollowedArtists(
    options?: GetFollowedArtistsOptions,
  ): Effect.Effect<CursorBasedPaging<Artist>, SpotifyRequestError> {
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
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson("/me/following", {
      query: { type: "artist", ids: artistIds.join(",") },
    });
  }

  public unfollowArtists(
    artistIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.deleteVoid("/me/following", {
      query: { type: "artist", ids: artistIds.join(",") },
    });
  }

  public followUsers(
    userIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson("/me/following", {
      query: { type: "user", ids: userIds.join(",") },
    });
  }

  public unfollowUsers(
    userIds: ReadonlyArray<string>,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.deleteVoid("/me/following", {
      query: { type: "user", ids: userIds.join(",") },
    });
  }

  public isFollowingArtists(
    artistIds: ReadonlyArray<string>,
  ): Effect.Effect<boolean[], SpotifyRequestError> {
    return this.request.getJsonWithSchema("/me/following/contains", BooleanArraySchema, {
      query: { type: "artist", ids: artistIds.join(",") },
    });
  }

  public isFollowingUsers(
    userIds: ReadonlyArray<string>,
  ): Effect.Effect<boolean[], SpotifyRequestError> {
    return this.request.getJsonWithSchema("/me/following/contains", BooleanArraySchema, {
      query: { type: "user", ids: userIds.join(",") },
    });
  }

  public followPlaylist(
    playlistId: string,
    options?: FollowPlaylistOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson(`/playlists/${playlistId}/followers`, {
      ...(options !== undefined ? { body: options } : null),
    });
  }

  public unfollowPlaylist(
    playlistId: string,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.deleteVoid(`/playlists/${playlistId}/followers`);
  }

  public areFollowingPlaylist(
    playlistId: string,
    userIds: ReadonlyArray<string>,
  ): Effect.Effect<boolean[], SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      `/playlists/${playlistId}/followers/contains`,
      BooleanArraySchema,
      { query: { ids: userIds.join(",") } },
    );
  }
}

export const layer = Layer.effect(
  Follow,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new FollowApi(request);

    return {
      getFollowedArtists: api.getFollowedArtists.bind(api),
      followArtists: api.followArtists.bind(api),
      unfollowArtists: api.unfollowArtists.bind(api),
      followUsers: api.followUsers.bind(api),
      unfollowUsers: api.unfollowUsers.bind(api),
      isFollowingArtists: api.isFollowingArtists.bind(api),
      isFollowingUsers: api.isFollowingUsers.bind(api),
      followPlaylist: api.followPlaylist.bind(api),
      unfollowPlaylist: api.unfollowPlaylist.bind(api),
      areFollowingPlaylist: api.areFollowingPlaylist.bind(api),
    };
  }),
);

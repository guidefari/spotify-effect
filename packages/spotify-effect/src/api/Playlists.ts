import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type {
  Paging,
  Playlist,
  PlaylistDetails,
  PlaylistItem,
  SimplifiedPlaylist,
} from "../model/SpotifyObjects";
import type {
  AddItemsToPlaylistOptions,
  CreatePlaylistOptions,
  GetMyPlaylistsOptions,
  GetPlaylistItemsOptions,
  GetPlaylistOptions,
  GetUserPlaylistsOptions,
} from "../model/SpotifyOptions";
import type { SnapshotIdResponse } from "../model/SpotifyResponses";
import {
  GetMyPlaylistsResponseSchema,
  GetPlaylistItemsResponseSchema,
  GetUserPlaylistsResponseSchema,
  PlaylistSchema,
  SnapshotIdResponseSchema,
} from "../model/SpotifyResponseSchemas";
import { Playlists } from "../services/Playlists";
import { SpotifyRequest, type SpotifyRequestOptions, type SpotifyRequestService } from "../services/SpotifyRequest";

const buildQuery = (options?: Record<string, unknown>): SpotifyRequestOptions | undefined => {
  if (options === undefined) return undefined;
  const query: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        query[key] = value.join(",");
      } else {
        query[key] = value as string | number;
      }
    }
  }
  return Object.keys(query).length > 0 ? { query } : undefined;
};

export class PlaylistsApi {
  private readonly request: SpotifyRequestService;

  public constructor(request: SpotifyRequestService) {
    this.request = request;
  }

  public getPlaylist(
    playlistId: string,
    options?: GetPlaylistOptions,
  ): Effect.Effect<Playlist, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      `/playlists/${playlistId}`,
      PlaylistSchema,
      buildQuery(options),
    );
  }

  public getPlaylistItems(
    playlistId: string,
    options?: GetPlaylistItemsOptions,
  ): Effect.Effect<Paging<PlaylistItem>, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      `/playlists/${playlistId}/tracks`,
      GetPlaylistItemsResponseSchema,
      buildQuery(options),
    );
  }

  public getMyPlaylists(
    options?: GetMyPlaylistsOptions,
  ): Effect.Effect<Paging<SimplifiedPlaylist>, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      "/me/playlists",
      GetMyPlaylistsResponseSchema,
      buildQuery(options),
    );
  }

  public getUserPlaylists(
    userId: string,
    options?: GetUserPlaylistsOptions,
  ): Effect.Effect<Paging<SimplifiedPlaylist>, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      `/users/${userId}/playlists`,
      GetUserPlaylistsResponseSchema,
      buildQuery(options),
    );
  }

  public createPlaylist(
    userId: string,
    name: string,
    options?: CreatePlaylistOptions,
  ): Effect.Effect<Playlist, SpotifyRequestError> {
    return this.request.postJsonWithSchema(
      `/users/${userId}/playlists`,
      PlaylistSchema,
      {
        body: {
          name,
          ...options,
        },
      },
    );
  }

  public addItemsToPlaylist(
    playlistId: string,
    uris: ReadonlyArray<string>,
    options?: AddItemsToPlaylistOptions,
  ): Effect.Effect<SnapshotIdResponse, SpotifyRequestError> {
    return this.request.postJsonWithSchema(
      `/playlists/${playlistId}/tracks`,
      SnapshotIdResponseSchema,
      {
        body: {
          uris,
          ...(options?.position !== undefined ? { position: options.position } : null),
        },
      },
    );
  }

  public removePlaylistItems(
    playlistId: string,
    uris: ReadonlyArray<string>,
    snapshotId?: string,
  ): Effect.Effect<SnapshotIdResponse, SpotifyRequestError> {
    return this.request.deleteJson(
      `/playlists/${playlistId}/tracks`,
      SnapshotIdResponseSchema,
      {
        body: {
          tracks: uris.map((uri) => ({ uri })),
          ...(snapshotId !== undefined ? { snapshot_id: snapshotId } : null),
        },
      },
    );
  }

  public changePlaylistDetails(
    playlistId: string,
    details: PlaylistDetails,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson(`/playlists/${playlistId}`, { body: details });
  }
}

export const layer = Layer.effect(
  Playlists,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new PlaylistsApi(request);

    return {
      getPlaylist: api.getPlaylist.bind(api),
      getPlaylistItems: api.getPlaylistItems.bind(api),
      getMyPlaylists: api.getMyPlaylists.bind(api),
      getUserPlaylists: api.getUserPlaylists.bind(api),
      createPlaylist: api.createPlaylist.bind(api),
      addItemsToPlaylist: api.addItemsToPlaylist.bind(api),
      removePlaylistItems: api.removePlaylistItems.bind(api),
      changePlaylistDetails: api.changePlaylistDetails.bind(api),
    };
  }),
);

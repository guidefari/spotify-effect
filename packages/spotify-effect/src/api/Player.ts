import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type {
  CurrentlyPlaying,
  CurrentlyPlayingContext,
  CursorBasedPaging,
  Device,
  PlayHistory,
  QueueObject,
  RepeatState,
} from "../model/SpotifyObjects";
import type {
  DeviceIdOptions,
  GetCurrentlyPlayingTrackOptions,
  GetPlaybackInfoOptions,
  GetRecentlyPlayedTracksOptions,
  PlayOptions,
  TransferPlaybackOptions,
} from "../model/SpotifyOptions";
import {
  GetCurrentlyPlayingTrackResponseSchema,
  GetMyDevicesResponseSchema,
  GetPlaybackInfoResponseSchema,
  GetQueueResponseSchema,
  GetRecentlyPlayedTracksResponseSchema,
} from "../model/SpotifyResponseSchemas";
import { Player } from "../services/Player";
import { SpotifyRequest, type SpotifyRequestOptions, type SpotifyRequestService } from "../services/SpotifyRequest";

const buildQuery = (options?: Record<string, unknown>): SpotifyRequestOptions | undefined => {
  if (options === undefined) return undefined;
  const query: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        query[key] = value.join(",");
      } else {
        query[key] = value as string | number | boolean;
      }
    }
  }
  return Object.keys(query).length > 0 ? { query } : undefined;
};

export class PlayerApi {
  private readonly request: SpotifyRequestService;

  public constructor(request: SpotifyRequestService) {
    this.request = request;
  }

  public getPlaybackInfo(
    options?: GetPlaybackInfoOptions,
  ): Effect.Effect<CurrentlyPlayingContext, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      "/me/player",
      GetPlaybackInfoResponseSchema,
      buildQuery(options),
    );
  }

  public getMyDevices(): Effect.Effect<Device[], SpotifyRequestError> {
    return this.request
      .getJsonWithSchema("/me/player/devices", GetMyDevicesResponseSchema)
      .pipe(Effect.map((r) => r.devices));
  }

  public getCurrentlyPlayingTrack(
    options?: GetCurrentlyPlayingTrackOptions,
  ): Effect.Effect<CurrentlyPlaying, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      "/me/player/currently-playing",
      GetCurrentlyPlayingTrackResponseSchema,
      buildQuery(options),
    );
  }

  public getRecentlyPlayedTracks(
    options?: GetRecentlyPlayedTracksOptions,
  ): Effect.Effect<CursorBasedPaging<PlayHistory>, SpotifyRequestError> {
    return this.request.getJsonWithSchema(
      "/me/player/recently-played",
      GetRecentlyPlayedTracksResponseSchema,
      buildQuery(options),
    );
  }

  public getQueue(): Effect.Effect<QueueObject, SpotifyRequestError> {
    return this.request.getJsonWithSchema("/me/player/queue", GetQueueResponseSchema);
  }

  public transferPlayback(
    deviceId: string,
    options?: TransferPlaybackOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson("/me/player", {
      body: {
        device_ids: [deviceId],
        ...(options?.play !== undefined ? { play: options.play } : null),
      },
    });
  }

  public play(
    options?: PlayOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    if (options === undefined) {
      return this.request.putJson("/me/player/play");
    }

    const { device_id, ...bodyFields } = options;
    const query = device_id !== undefined ? { device_id } : undefined;
    const body = Object.keys(bodyFields).length > 0 ? bodyFields : undefined;

    return this.request.putJson("/me/player/play", {
      ...(query !== undefined ? { query } : null),
      ...(body !== undefined ? { body } : null),
    });
  }

  public pause(
    options?: DeviceIdOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson("/me/player/pause", buildQuery(options));
  }

  public seek(
    positionMs: number,
    options?: DeviceIdOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson("/me/player/seek", {
      query: { position_ms: positionMs, ...options },
    });
  }

  public setRepeat(
    state: RepeatState,
    options?: DeviceIdOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson("/me/player/repeat", {
      query: { state, ...options },
    });
  }

  public setVolume(
    volumePercent: number,
    options?: DeviceIdOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson("/me/player/volume", {
      query: { volume_percent: volumePercent, ...options },
    });
  }

  public setShuffle(
    state: boolean,
    options?: DeviceIdOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.putJson("/me/player/shuffle", {
      query: { state, ...options },
    });
  }

  public skipToNext(
    options?: DeviceIdOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.postJson("/me/player/next", buildQuery(options));
  }

  public skipToPrevious(
    options?: DeviceIdOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.postJson("/me/player/previous", buildQuery(options));
  }

  public addToQueue(
    uri: string,
    options?: DeviceIdOptions,
  ): Effect.Effect<void, SpotifyRequestError> {
    return this.request.postJson("/me/player/queue", {
      query: { uri, ...options },
    });
  }
}

export const layer = Layer.effect(
  Player,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new PlayerApi(request);

    return {
      getPlaybackInfo: api.getPlaybackInfo.bind(api),
      getMyDevices: api.getMyDevices.bind(api),
      getCurrentlyPlayingTrack: api.getCurrentlyPlayingTrack.bind(api),
      getRecentlyPlayedTracks: api.getRecentlyPlayedTracks.bind(api),
      getQueue: api.getQueue.bind(api),
      transferPlayback: api.transferPlayback.bind(api),
      play: api.play.bind(api),
      pause: api.pause.bind(api),
      seek: api.seek.bind(api),
      setRepeat: api.setRepeat.bind(api),
      setVolume: api.setVolume.bind(api),
      setShuffle: api.setShuffle.bind(api),
      skipToNext: api.skipToNext.bind(api),
      skipToPrevious: api.skipToPrevious.bind(api),
      addToQueue: api.addToQueue.bind(api),
    };
  }),
);

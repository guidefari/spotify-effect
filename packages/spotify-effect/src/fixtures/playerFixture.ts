import type {
  CurrentlyPlaying,
  CurrentlyPlayingContext,
  CursorBasedPaging,
  Device,
  PlayHistory,
  QueueObject,
} from "../model/SpotifyObjects";
import { trackFixture } from "./trackFixture";

export const deviceFixture: Device = {
  id: "abc123",
  is_active: true,
  is_private_session: false,
  is_restricted: false,
  name: "My Computer",
  type: "Computer",
  volume_percent: 50,
};

export const currentlyPlayingContextFixture: CurrentlyPlayingContext = {
  device: deviceFixture,
  repeat_state: "off",
  shuffle_state: false,
  context: {
    uri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M",
    href: "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M",
    external_urls: { spotify: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" },
    type: "playlist",
  },
  timestamp: 1234567890,
  progress_ms: 50000,
  is_playing: true,
  item: trackFixture,
  currently_playing_type: "track",
  actions: { disallows: {} },
};

export const currentlyPlayingFixture: CurrentlyPlaying = {
  context: {
    uri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M",
    href: "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M",
    external_urls: { spotify: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" },
    type: "playlist",
  },
  timestamp: 1234567890,
  progress_ms: 50000,
  is_playing: true,
  item: trackFixture,
  currently_playing_type: "track",
  actions: { disallows: {} },
};

export const playHistoryFixture: PlayHistory = {
  track: trackFixture,
  played_at: "2024-01-01T00:00:00.000Z",
  context: null,
};

export const recentlyPlayedFixture: CursorBasedPaging<PlayHistory> = {
  href: "https://api.spotify.com/v1/me/player/recently-played",
  items: [playHistoryFixture],
  limit: 20,
  next: null,
  cursors: { after: "1234567890" },
  total: 1,
};

export const devicesResponseFixture = {
  devices: [deviceFixture],
};

export const queueFixture: QueueObject = {
  currently_playing: trackFixture,
  queue: [trackFixture],
};

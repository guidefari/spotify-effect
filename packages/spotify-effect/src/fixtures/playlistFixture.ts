import type { Playlist, PlaylistItem, SimplifiedPlaylist } from "../model/SpotifyObjects";
import { trackFixture } from "./trackFixture";

const owner = {
  display_name: "Test User",
  external_urls: { spotify: "https://open.spotify.com/user/testuser" },
  href: "https://api.spotify.com/v1/users/testuser",
  id: "testuser",
  type: "user" as const,
  uri: "spotify:user:testuser",
};

export const playlistItemFixture: PlaylistItem = {
  added_at: "2024-01-15T10:30:00Z",
  added_by: owner,
  is_local: false,
  track: trackFixture,
};

export const playlistFixture: Playlist = {
  collaborative: false,
  description: "A test playlist",
  external_urls: { spotify: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" },
  followers: { href: null, total: 1000 },
  href: "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M",
  id: "37i9dQZF1DXcBWIGoYBM5M",
  images: [{ height: 640, url: "https://i.scdn.co/image/ab67706f000000029876", width: 640 }],
  name: "Today's Top Hits",
  owner,
  public: true,
  snapshot_id: "MTY3MjU0OTM1MiwwMDAwMDAwMGQ0MWQ4OT",
  tracks: {
    href: "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks",
    items: [playlistItemFixture],
    limit: 100,
    next: null,
    offset: 0,
    previous: null,
    total: 1,
  },
  type: "playlist",
  uri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M",
};

export const simplifiedPlaylistFixture: SimplifiedPlaylist = {
  collaborative: false,
  description: "A test playlist",
  external_urls: { spotify: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" },
  href: "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M",
  id: "37i9dQZF1DXcBWIGoYBM5M",
  images: [{ height: 640, url: "https://i.scdn.co/image/ab67706f000000029876", width: 640 }],
  name: "Today's Top Hits",
  owner,
  public: true,
  snapshot_id: "MTY3MjU0OTM1MiwwMDAwMDAwMGQ0MWQ4OT",
  tracks: {
    href: "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks",
    total: 50,
  },
  type: "playlist",
  uri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M",
};

export const getMyPlaylistsFixture = {
  href: "https://api.spotify.com/v1/me/playlists",
  items: [simplifiedPlaylistFixture],
  limit: 20,
  next: null,
  offset: 0,
  previous: null,
  total: 1,
};

export const snapshotIdFixture = {
  snapshot_id: "MTY3MjU0OTM1MiwwMDAwMDAwMGQ0MWQ4OT",
};

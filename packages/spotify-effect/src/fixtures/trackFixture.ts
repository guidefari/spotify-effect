import type { Track } from "../model/SpotifyObjects";

export const trackFixture: Track = {
  album: {
    album_type: "album",
    artists: [
      {
        external_urls: {
          spotify: "https://open.spotify.com/artist/2CIMQHirSU0MQqyYHq0eOx",
        },
        href: "https://api.spotify.com/v1/artists/2CIMQHirSU0MQqyYHq0eOx",
        id: "2CIMQHirSU0MQqyYHq0eOx",
        name: "Artist Name",
        type: "artist",
        uri: "spotify:artist:2CIMQHirSU0MQqyYHq0eOx",
      },
    ],
    external_urls: {
      spotify: "https://open.spotify.com/album/2up3OPMp9Tb4dAKM2erWXQ",
    },
    href: "https://api.spotify.com/v1/albums/2up3OPMp9Tb4dAKM2erWXQ",
    id: "2up3OPMp9Tb4dAKM2erWXQ",
    images: [
      {
        height: 640,
        url: "https://i.scdn.co/image/ab67616d0000b273fed522e78ecdc9fba4a0cc07",
        width: 640,
      },
    ],
    name: "Album Name",
    release_date: "2024-01-01",
    release_date_precision: "day",
    total_tracks: 10,
    type: "album",
    uri: "spotify:album:2up3OPMp9Tb4dAKM2erWXQ",
  },
  artists: [
    {
      external_urls: {
        spotify: "https://open.spotify.com/artist/2CIMQHirSU0MQqyYHq0eOx",
      },
      href: "https://api.spotify.com/v1/artists/2CIMQHirSU0MQqyYHq0eOx",
      id: "2CIMQHirSU0MQqyYHq0eOx",
      name: "Artist Name",
      type: "artist",
      uri: "spotify:artist:2CIMQHirSU0MQqyYHq0eOx",
    },
  ],
  disc_number: 1,
  duration_ms: 215773,
  explicit: false,
  external_ids: {
    isrc: "USRC17607839",
  },
  external_urls: {
    spotify: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
  },
  href: "https://api.spotify.com/v1/tracks/3n3Ppam7vgaVa1iaRUc9Lp",
  id: "3n3Ppam7vgaVa1iaRUc9Lp",
  is_local: false,
  name: "Track Name",
  popularity: 64,
  preview_url: "https://p.scdn.co/mp3-preview/example",
  track_number: 1,
  type: "track",
  uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
};

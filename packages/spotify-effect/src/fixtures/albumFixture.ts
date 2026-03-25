import type { Album } from "../model/SpotifyObjects";

export const albumFixture: Album = {
  album_type: "single",
  artists: [
    {
      external_urls: { spotify: "https://open.spotify.com/artist/6y80I9YZi4DOpbaSUlL725" },
      href: "https://api.spotify.com/v1/artists/6y80I9YZi4DOpbaSUlL725",
      id: "6y80I9YZi4DOpbaSUlL725",
      name: "Shlohmo",
      type: "artist",
      uri: "spotify:artist:6y80I9YZi4DOpbaSUlL725",
    },
  ],
  available_markets: ["US", "GB"],
  copyrights: [
    { text: "2011 Friends Of Friends", type: "C" },
    { text: "2011 Friends Of Friends", type: "P" },
  ],
  external_ids: { upc: "0669158522736" },
  external_urls: { spotify: "https://open.spotify.com/album/5PekE7fE5Zjqrfy45vjL8W" },
  genres: [],
  href: "https://api.spotify.com/v1/albums/5PekE7fE5Zjqrfy45vjL8W",
  id: "5PekE7fE5Zjqrfy45vjL8W",
  images: [
    {
      height: 640,
      url: "https://i.scdn.co/image/ab67616d0000b27336bff5380f680853bcc26da6",
      width: 640,
    },
  ],
  label: "Friends Of Friends",
  name: "Places - EP",
  popularity: 10,
  release_date: "2011-03-15",
  release_date_precision: "day",
  total_tracks: 1,
  tracks: {
    href: "https://api.spotify.com/v1/albums/5PekE7fE5Zjqrfy45vjL8W/tracks?offset=0&limit=50",
    items: [
      {
        artists: [
          {
            external_urls: { spotify: "https://open.spotify.com/artist/6y80I9YZi4DOpbaSUlL725" },
            href: "https://api.spotify.com/v1/artists/6y80I9YZi4DOpbaSUlL725",
            id: "6y80I9YZi4DOpbaSUlL725",
            name: "Shlohmo",
            type: "artist",
            uri: "spotify:artist:6y80I9YZi4DOpbaSUlL725",
          },
        ],
        available_markets: ["US", "GB"],
        disc_number: 1,
        duration_ms: 303452,
        explicit: false,
        external_urls: { spotify: "https://open.spotify.com/track/7yVVltOYtUtWQB9UUGdXoR" },
        href: "https://api.spotify.com/v1/tracks/7yVVltOYtUtWQB9UUGdXoR",
        id: "7yVVltOYtUtWQB9UUGdXoR",
        is_local: false,
        name: "Places",
        preview_url: "https://p.scdn.co/mp3-preview/d32f0992b32c9cf57ddf93aed9775e472d414df0",
        track_number: 1,
        type: "track",
        uri: "spotify:track:7yVVltOYtUtWQB9UUGdXoR",
      },
    ],
    limit: 50,
    next: null,
    offset: 0,
    previous: null,
    total: 1,
  },
  type: "album",
  uri: "spotify:album:5PekE7fE5Zjqrfy45vjL8W",
};

export const getAlbumsFixture = { albums: [albumFixture] };

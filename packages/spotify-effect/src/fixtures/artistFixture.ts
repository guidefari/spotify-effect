import type { Artist } from "../model/SpotifyObjects";

export const artistFixture: Artist = {
  external_urls: { spotify: "https://open.spotify.com/artist/5c3GLXai8YOMid29ZEuR9y" },
  followers: { href: null, total: 442801 },
  genres: ["british folk", "folk", "indie folk", "singer-songwriter"],
  href: "https://api.spotify.com/v1/artists/5c3GLXai8YOMid29ZEuR9y",
  id: "5c3GLXai8YOMid29ZEuR9y",
  images: [
    {
      height: 1484,
      url: "https://i.scdn.co/image/d364b498f85ae764cd278fbba9a8ed7f00c3e434",
      width: 1000,
    },
  ],
  name: "Nick Drake",
  popularity: 65,
  type: "artist",
  uri: "spotify:artist:5c3GLXai8YOMid29ZEuR9y",
};

export const getArtistsFixture = { artists: [artistFixture] };

export const getArtistTopTracksFixture = {
  tracks: [
    {
      album: {
        album_type: "album" as const,
        artists: [
          {
            external_urls: { spotify: "https://open.spotify.com/artist/5c3GLXai8YOMid29ZEuR9y" },
            href: "https://api.spotify.com/v1/artists/5c3GLXai8YOMid29ZEuR9y",
            id: "5c3GLXai8YOMid29ZEuR9y",
            name: "Nick Drake",
            type: "artist" as const,
            uri: "spotify:artist:5c3GLXai8YOMid29ZEuR9y",
          },
        ],
        external_urls: { spotify: "https://open.spotify.com/album/4F0Wl68HVKcbj2LBCFM7cB" },
        href: "https://api.spotify.com/v1/albums/4F0Wl68HVKcbj2LBCFM7cB",
        id: "4F0Wl68HVKcbj2LBCFM7cB",
        images: [{ height: 640, url: "https://i.scdn.co/image/ab67616d0000b2738", width: 640 }],
        name: "Pink Moon",
        release_date: "1972-02-25",
        release_date_precision: "day" as const,
        total_tracks: 11,
        type: "album" as const,
        uri: "spotify:album:4F0Wl68HVKcbj2LBCFM7cB",
      },
      artists: [
        {
          external_urls: { spotify: "https://open.spotify.com/artist/5c3GLXai8YOMid29ZEuR9y" },
          href: "https://api.spotify.com/v1/artists/5c3GLXai8YOMid29ZEuR9y",
          id: "5c3GLXai8YOMid29ZEuR9y",
          name: "Nick Drake",
          type: "artist" as const,
          uri: "spotify:artist:5c3GLXai8YOMid29ZEuR9y",
        },
      ],
      disc_number: 1,
      duration_ms: 252000,
      explicit: false,
      external_ids: { isrc: "GBAYE7200103" },
      external_urls: { spotify: "https://open.spotify.com/track/1b75LU7t6dWmB3LqXi7Hpi" },
      href: "https://api.spotify.com/v1/tracks/1b75LU7t6dWmB3LqXi7Hpi",
      id: "1b75LU7t6dWmB3LqXi7Hpi",
      is_local: false,
      name: "Pink Moon",
      popularity: 72,
      preview_url: null,
      track_number: 1,
      type: "track" as const,
      uri: "spotify:track:1b75LU7t6dWmB3LqXi7Hpi",
    },
  ],
};

export const getRelatedArtistsFixture = { artists: [artistFixture] };

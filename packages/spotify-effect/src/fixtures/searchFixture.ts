import type { SearchResponse } from "../model/SpotifyResponses";

export const searchFixture: SearchResponse = {
  artists: {
    href: "https://api.spotify.com/v1/search?query=nick+drake&type=artist&offset=0&limit=20",
    items: [
      {
        external_urls: { spotify: "https://open.spotify.com/artist/5c3GLXai8YOMid29ZEuR9y" },
        followers: { href: null, total: 442801 },
        genres: ["british folk", "folk"],
        href: "https://api.spotify.com/v1/artists/5c3GLXai8YOMid29ZEuR9y",
        id: "5c3GLXai8YOMid29ZEuR9y",
        images: [{ height: 1484, url: "https://i.scdn.co/image/d364b498f85ae764", width: 1000 }],
        name: "Nick Drake",
        popularity: 65,
        type: "artist",
        uri: "spotify:artist:5c3GLXai8YOMid29ZEuR9y",
      },
    ],
    limit: 20,
    next: null,
    offset: 0,
    previous: null,
    total: 1,
  },
};

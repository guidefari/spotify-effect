import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import {
  artistFixture,
  getArtistTopTracksFixture,
  getArtistsFixture,
  getRelatedArtistsFixture,
} from "../fixtures/artistFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { ArtistsApi } from "./Artists";

const makeArtistsWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);
  const artists = new ArtistsApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    }),
  );
  return { artists, ...testClient };
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("ArtistsApi", () => {
  it("gets a single artist", async () => {
    const { artists, layer, requests } = makeArtistsWithTestClient(jsonResponse(artistFixture));
    const result = await Effect.runPromise(
      artists.getArtist("5c3GLXai8YOMid29ZEuR9y").pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(artistFixture);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/artists/5c3GLXai8YOMid29ZEuR9y");
    expect(requests[0]?.headers.authorization).toBe("Bearer token");
  });

  it("gets multiple artists", async () => {
    const { artists, layer, requests } = makeArtistsWithTestClient(jsonResponse(getArtistsFixture));
    const result = await Effect.runPromise(
      artists.getArtists(["abc", "def"]).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(getArtistsFixture.artists);
    expect(requests[0]?.url).toContain("ids=abc%2Cdef");
  });

  it("gets artist albums with options", async () => {
    const pagingFixture = {
      href: "https://api.spotify.com/v1/artists/5c3GLXai8YOMid29ZEuR9y/albums",
      items: [],
      limit: 10,
      next: null,
      offset: 0,
      previous: null,
      total: 0,
    };
    const { artists, layer, requests } = makeArtistsWithTestClient(jsonResponse(pagingFixture));
    const result = await Effect.runPromise(
      artists
        .getArtistAlbums("5c3GLXai8YOMid29ZEuR9y", {
          include_groups: ["album", "single"],
          country: "US",
          limit: 10,
        })
        .pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(pagingFixture);
    expect(requests[0]?.url).toContain("include_groups=album%2Csingle");
    expect(requests[0]?.url).toContain("country=US");
    expect(requests[0]?.url).toContain("limit=10");
  });

  it("gets artist top tracks", async () => {
    const { artists, layer, requests } = makeArtistsWithTestClient(
      jsonResponse(getArtistTopTracksFixture),
    );
    const result = await Effect.runPromise(
      artists.getArtistTopTracks("5c3GLXai8YOMid29ZEuR9y", "US").pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(getArtistTopTracksFixture.tracks);
    expect(requests[0]?.url).toContain("/artists/5c3GLXai8YOMid29ZEuR9y/top-tracks");
    expect(requests[0]?.url).toContain("market=US");
  });

  it("gets related artists", async () => {
    const { artists, layer, requests } = makeArtistsWithTestClient(
      jsonResponse(getRelatedArtistsFixture),
    );
    const result = await Effect.runPromise(
      artists.getRelatedArtists("5c3GLXai8YOMid29ZEuR9y").pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(getRelatedArtistsFixture.artists);
    expect(requests[0]?.url).toContain("/artists/5c3GLXai8YOMid29ZEuR9y/related-artists");
  });
});

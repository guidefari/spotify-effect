import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { albumFixture, getAlbumsFixture } from "../fixtures/albumFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { AlbumsApi } from "./Albums";

const makeAlbumsWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);
  const albums = new AlbumsApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    }),
  );
  return { albums, ...testClient };
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("AlbumsApi", () => {
  it("gets a single album without options", async () => {
    const { albums, layer, requests } = makeAlbumsWithTestClient(jsonResponse(albumFixture));
    const result = await Effect.runPromise(
      albums.getAlbum("5PekE7fE5Zjqrfy45vjL8W").pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(albumFixture);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/albums/5PekE7fE5Zjqrfy45vjL8W");
    expect(requests[0]?.headers.authorization).toBe("Bearer token");
  });

  it("gets a single album with market option", async () => {
    const { albums, layer, requests } = makeAlbumsWithTestClient(jsonResponse(albumFixture));
    const result = await Effect.runPromise(
      albums.getAlbum("5PekE7fE5Zjqrfy45vjL8W", { market: "US" }).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(albumFixture);
    expect(requests[0]?.url).toContain("market=US");
  });

  it("gets multiple albums", async () => {
    const { albums, layer, requests } = makeAlbumsWithTestClient(jsonResponse(getAlbumsFixture));
    const result = await Effect.runPromise(
      albums.getAlbums(["abc", "def"]).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(getAlbumsFixture.albums);
    expect(requests[0]?.url).toContain("ids=abc%2Cdef");
  });

  it("gets album tracks", async () => {
    const tracksPage = albumFixture.tracks;
    const { albums, layer, requests } = makeAlbumsWithTestClient(jsonResponse(tracksPage));
    const result = await Effect.runPromise(
      albums
        .getAlbumTracks("5PekE7fE5Zjqrfy45vjL8W", { limit: 10, offset: 0 })
        .pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(tracksPage);
    expect(requests[0]?.url).toContain("/albums/5PekE7fE5Zjqrfy45vjL8W/tracks");
    expect(requests[0]?.url).toContain("limit=10");
    expect(requests[0]?.url).toContain("offset=0");
  });
});

import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { trackFixture } from "../fixtures/trackFixture";
import { albumFixture } from "../fixtures/albumFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { LibraryApi } from "./Library";

const makeLibraryWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);
  const library = new LibraryApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    }),
  );
  return { library, ...testClient };
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const emptyResponse = () =>
  new Response(null, { status: 200, headers: { "content-type": "application/json" } });

const makePage = (items: unknown[]) => ({
  href: "https://api.spotify.com/v1/me/albums",
  items,
  limit: 20,
  next: null,
  offset: 0,
  previous: null,
  total: items.length,
});

describe("LibraryApi", () => {
  it("gets saved albums", async () => {
    const savedAlbum = { added_at: "2024-01-01T00:00:00Z", album: albumFixture };
    const { library, layer, requests } = makeLibraryWithTestClient(
      jsonResponse(makePage([savedAlbum])),
    );
    const result = await Effect.runPromise(
      library.getSavedAlbums({ limit: 10 }).pipe(Effect.provide(layer)),
    );
    expect(result.items).toHaveLength(1);
    expect(requests[0]?.url).toContain("/me/albums");
    expect(requests[0]?.url).toContain("limit=10");
  });

  it("gets saved tracks", async () => {
    const savedTrack = { added_at: "2024-01-01T00:00:00Z", track: trackFixture };
    const { library, layer, requests } = makeLibraryWithTestClient(
      jsonResponse(makePage([savedTrack])),
    );
    const result = await Effect.runPromise(
      library.getSavedTracks().pipe(Effect.provide(layer)),
    );
    expect(result.items).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me/tracks");
  });

  it("checks if albums are saved", async () => {
    const { library, layer, requests } = makeLibraryWithTestClient(
      jsonResponse([true, false]),
    );
    const result = await Effect.runPromise(
      library.areAlbumsSaved(["id1", "id2"]).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual([true, false]);
    expect(requests[0]?.url).toContain("/me/albums/contains");
    expect(requests[0]?.url).toContain("ids=id1%2Cid2");
  });

  it("checks if tracks are saved", async () => {
    const { library, layer, requests } = makeLibraryWithTestClient(
      jsonResponse([true]),
    );
    const result = await Effect.runPromise(
      library.areTracksSaved(["id1"]).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual([true]);
    expect(requests[0]?.url).toContain("/me/tracks/contains");
  });

  it("saves albums", async () => {
    const { library, layer, requests } = makeLibraryWithTestClient(emptyResponse());
    await Effect.runPromise(
      library.saveAlbums(["id1", "id2"]).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("/me/albums");
    expect(requests[0]?.url).toContain("ids=id1%2Cid2");
  });

  it("saves tracks", async () => {
    const { library, layer, requests } = makeLibraryWithTestClient(emptyResponse());
    await Effect.runPromise(
      library.saveTracks(["id1"]).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("/me/tracks");
  });

  it("removes saved albums", async () => {
    const { library, layer, requests } = makeLibraryWithTestClient(emptyResponse());
    await Effect.runPromise(
      library.removeSavedAlbums(["id1"]).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("DELETE");
    expect(requests[0]?.url).toContain("/me/albums");
  });

  it("removes saved tracks", async () => {
    const { library, layer, requests } = makeLibraryWithTestClient(emptyResponse());
    await Effect.runPromise(
      library.removeSavedTracks(["id1"]).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("DELETE");
    expect(requests[0]?.url).toContain("/me/tracks");
  });

  it("removes saved shows with market", async () => {
    const { library, layer, requests } = makeLibraryWithTestClient(emptyResponse());
    await Effect.runPromise(
      library.removeSavedShows(["show1"], { market: "US" }).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("DELETE");
    expect(requests[0]?.url).toContain("/me/shows");
    expect(requests[0]?.url).toContain("market=US");
  });
});

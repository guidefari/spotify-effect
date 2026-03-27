import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import {
  getMyPlaylistsFixture,
  playlistFixture,
  playlistItemFixture,
  snapshotIdFixture,
} from "../fixtures/playlistFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { PlaylistsApi } from "./Playlists";

const makePlaylistsWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);
  const playlists = new PlaylistsApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    }),
  );
  return { playlists, ...testClient };
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const emptyResponse = () =>
  new Response(null, { status: 200, headers: { "content-type": "application/json" } });

describe("PlaylistsApi", () => {
  it("gets a playlist", async () => {
    const { playlists, layer, requests } = makePlaylistsWithTestClient(
      jsonResponse(playlistFixture),
    );
    const result = await Effect.runPromise(
      playlists.getPlaylist("37i9dQZF1DXcBWIGoYBM5M").pipe(Effect.provide(layer)),
    );
    expect(result.id).toBe("37i9dQZF1DXcBWIGoYBM5M");
    expect(result.name).toBe("Today's Top Hits");
    expect(requests[0]?.url).toBe(
      "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M",
    );
    expect(requests[0]?.method).toBe("GET");
  });

  it("gets a playlist with options", async () => {
    const { playlists, layer, requests } = makePlaylistsWithTestClient(
      jsonResponse(playlistFixture),
    );
    await Effect.runPromise(
      playlists
        .getPlaylist("abc", { market: "US", fields: "name,id" })
        .pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.url).toContain("market=US");
    expect(requests[0]?.url).toContain("fields=name%2Cid");
  });

  it("gets playlist items", async () => {
    const itemsPage = {
      href: "https://api.spotify.com/v1/playlists/abc/tracks",
      items: [playlistItemFixture],
      limit: 20,
      next: null,
      offset: 0,
      previous: null,
      total: 1,
    };
    const { playlists, layer, requests } = makePlaylistsWithTestClient(jsonResponse(itemsPage));
    const result = await Effect.runPromise(
      playlists.getPlaylistItems("abc", { limit: 20, offset: 0 }).pipe(Effect.provide(layer)),
    );
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(requests[0]?.url).toContain("/playlists/abc/tracks");
    expect(requests[0]?.url).toContain("limit=20");
  });

  it("gets current user playlists", async () => {
    const { playlists, layer, requests } = makePlaylistsWithTestClient(
      jsonResponse(getMyPlaylistsFixture),
    );
    const result = await Effect.runPromise(
      playlists.getMyPlaylists({ limit: 10 }).pipe(Effect.provide(layer)),
    );
    expect(result.items).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me/playlists?limit=10");
  });

  it("gets user playlists", async () => {
    const { playlists, layer, requests } = makePlaylistsWithTestClient(
      jsonResponse(getMyPlaylistsFixture),
    );
    const result = await Effect.runPromise(
      playlists.getUserPlaylists("testuser", { limit: 5 }).pipe(Effect.provide(layer)),
    );
    expect(result.items).toHaveLength(1);
    expect(requests[0]?.url).toContain("/users/testuser/playlists");
  });

  it("creates a playlist", async () => {
    const { playlists, layer, requests } = makePlaylistsWithTestClient(
      jsonResponse(playlistFixture),
    );
    const result = await Effect.runPromise(
      playlists
        .createPlaylist("testuser", "New Playlist", { public: false, description: "My new list" })
        .pipe(Effect.provide(layer)),
    );
    expect(result.name).toBe("Today's Top Hits");
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toContain("/users/testuser/playlists");
    const body = JSON.parse(requests[0]?.body ?? "{}");
    expect(body.name).toBe("New Playlist");
    expect(body.public).toBe(false);
    expect(body.description).toBe("My new list");
  });

  it("adds items to a playlist", async () => {
    const { playlists, layer, requests } = makePlaylistsWithTestClient(
      jsonResponse(snapshotIdFixture),
    );
    const uris = ["spotify:track:abc", "spotify:track:def"];
    const result = await Effect.runPromise(
      playlists.addItemsToPlaylist("playlistId", uris, { position: 0 }).pipe(Effect.provide(layer)),
    );
    expect(result.snapshot_id).toBe(snapshotIdFixture.snapshot_id);
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toContain("/playlists/playlistId/tracks");
    const body = JSON.parse(requests[0]?.body ?? "{}");
    expect(body.uris).toEqual(uris);
    expect(body.position).toBe(0);
  });

  it("removes items from a playlist", async () => {
    const { playlists, layer, requests } = makePlaylistsWithTestClient(
      jsonResponse(snapshotIdFixture),
    );
    const uris = ["spotify:track:abc"];
    const result = await Effect.runPromise(
      playlists.removePlaylistItems("playlistId", uris, "snap123").pipe(Effect.provide(layer)),
    );
    expect(result.snapshot_id).toBe(snapshotIdFixture.snapshot_id);
    expect(requests[0]?.method).toBe("DELETE");
    const body = JSON.parse(requests[0]?.body ?? "{}");
    expect(body.tracks).toEqual([{ uri: "spotify:track:abc" }]);
    expect(body.snapshot_id).toBe("snap123");
  });

  it("changes playlist details", async () => {
    const { playlists, layer, requests } = makePlaylistsWithTestClient(emptyResponse());
    await Effect.runPromise(
      playlists
        .changePlaylistDetails("playlistId", { name: "Updated", public: true })
        .pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("/playlists/playlistId");
    const body = JSON.parse(requests[0]?.body ?? "{}");
    expect(body.name).toBe("Updated");
    expect(body.public).toBe(true);
  });
});

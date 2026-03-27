import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { artistFixture } from "../fixtures/artistFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { FollowApi } from "./Follow";

const makeFollowWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);
  const follow = new FollowApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    }),
  );
  return { follow, ...testClient };
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const emptyResponse = () =>
  new Response(null, { status: 200, headers: { "content-type": "application/json" } });

describe("FollowApi", () => {
  it("gets followed artists", async () => {
    const cursorPage = {
      artists: {
        href: "https://api.spotify.com/v1/me/following",
        items: [artistFixture],
        limit: 20,
        next: null,
        cursors: { after: "cursor1" },
        total: 1,
      },
    };
    const { follow, layer, requests } = makeFollowWithTestClient(jsonResponse(cursorPage));
    const result = await Effect.runPromise(
      follow.getFollowedArtists({ limit: 10 }).pipe(Effect.provide(layer)),
    );
    expect(result.items).toHaveLength(1);
    expect(requests[0]?.url).toContain("type=artist");
    expect(requests[0]?.url).toContain("limit=10");
  });

  it("follows artists", async () => {
    const { follow, layer, requests } = makeFollowWithTestClient(emptyResponse());
    await Effect.runPromise(
      follow.followArtists(["artist1", "artist2"]).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("type=artist");
    expect(requests[0]?.url).toContain("ids=artist1%2Cartist2");
  });

  it("unfollows artists", async () => {
    const { follow, layer, requests } = makeFollowWithTestClient(emptyResponse());
    await Effect.runPromise(
      follow.unfollowArtists(["artist1"]).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("DELETE");
    expect(requests[0]?.url).toContain("type=artist");
  });

  it("follows users", async () => {
    const { follow, layer, requests } = makeFollowWithTestClient(emptyResponse());
    await Effect.runPromise(
      follow.followUsers(["user1"]).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("type=user");
  });

  it("unfollows users", async () => {
    const { follow, layer, requests } = makeFollowWithTestClient(emptyResponse());
    await Effect.runPromise(
      follow.unfollowUsers(["user1"]).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("DELETE");
    expect(requests[0]?.url).toContain("type=user");
  });

  it("checks if following artists", async () => {
    const { follow, layer, requests } = makeFollowWithTestClient(jsonResponse([true, false]));
    const result = await Effect.runPromise(
      follow.isFollowingArtists(["a1", "a2"]).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual([true, false]);
    expect(requests[0]?.url).toContain("/me/following/contains");
    expect(requests[0]?.url).toContain("type=artist");
  });

  it("checks if following users", async () => {
    const { follow, layer, requests } = makeFollowWithTestClient(jsonResponse([true]));
    const result = await Effect.runPromise(
      follow.isFollowingUsers(["u1"]).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual([true]);
    expect(requests[0]?.url).toContain("type=user");
  });

  it("follows a playlist", async () => {
    const { follow, layer, requests } = makeFollowWithTestClient(emptyResponse());
    await Effect.runPromise(
      follow.followPlaylist("playlistId", { public: false }).pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("PUT");
    expect(requests[0]?.url).toContain("/playlists/playlistId/followers");
    const body = JSON.parse(requests[0]?.body ?? "{}");
    expect(body.public).toBe(false);
  });

  it("unfollows a playlist", async () => {
    const { follow, layer, requests } = makeFollowWithTestClient(emptyResponse());
    await Effect.runPromise(
      follow.unfollowPlaylist("playlistId").pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.method).toBe("DELETE");
    expect(requests[0]?.url).toContain("/playlists/playlistId/followers");
  });

  it("checks if users follow a playlist", async () => {
    const { follow, layer, requests } = makeFollowWithTestClient(jsonResponse([true, false]));
    const result = await Effect.runPromise(
      follow.areFollowingPlaylist("playlistId", ["u1", "u2"]).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual([true, false]);
    expect(requests[0]?.url).toContain("/playlists/playlistId/followers/contains");
  });
});

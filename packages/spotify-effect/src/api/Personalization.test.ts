import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { artistFixture } from "../fixtures/artistFixture";
import { trackFixture } from "../fixtures/trackFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { PersonalizationApi } from "./Personalization";

const makePersonalizationWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);
  const personalization = new PersonalizationApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    }),
  );
  return { personalization, ...testClient };
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const makePage = (items: unknown[]) => ({
  href: "https://api.spotify.com/v1/me/top/artists",
  items,
  limit: 20,
  next: null,
  offset: 0,
  previous: null,
  total: items.length,
});

describe("PersonalizationApi", () => {
  it("gets top artists", async () => {
    const { personalization, layer, requests } = makePersonalizationWithTestClient(
      jsonResponse(makePage([artistFixture])),
    );
    const result = await Effect.runPromise(
      personalization.getMyTopArtists().pipe(Effect.provide(layer)),
    );
    expect(result.items).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me/top/artists");
  });

  it("gets top artists with options", async () => {
    const { personalization, layer, requests } = makePersonalizationWithTestClient(
      jsonResponse(makePage([artistFixture])),
    );
    await Effect.runPromise(
      personalization
        .getMyTopArtists({ time_range: "long_term", limit: 10 })
        .pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.url).toContain("time_range=long_term");
    expect(requests[0]?.url).toContain("limit=10");
  });

  it("gets top tracks", async () => {
    const { personalization, layer, requests } = makePersonalizationWithTestClient(
      jsonResponse(makePage([trackFixture])),
    );
    const result = await Effect.runPromise(
      personalization.getMyTopTracks().pipe(Effect.provide(layer)),
    );
    expect(result.items).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me/top/tracks");
  });
});

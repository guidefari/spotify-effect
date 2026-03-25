import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { searchFixture } from "../fixtures/searchFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { SearchApi } from "./Search";

const makeSearchWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);
  const search = new SearchApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    }),
  );
  return { search, ...testClient };
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("SearchApi", () => {
  it("searches for artists", async () => {
    const { search, layer, requests } = makeSearchWithTestClient(jsonResponse(searchFixture));
    const result = await Effect.runPromise(
      search.search("nick drake", ["artist"]).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(searchFixture);
    expect(requests[0]?.url).toContain("/search");
    expect(requests[0]?.url).toContain("q=nick+drake");
    expect(requests[0]?.url).toContain("type=artist");
  });

  it("searches with multiple types and options", async () => {
    const { search, layer, requests } = makeSearchWithTestClient(jsonResponse(searchFixture));
    await Effect.runPromise(
      search
        .search("nick drake", ["artist", "track"], { market: "US", limit: 10 })
        .pipe(Effect.provide(layer)),
    );
    expect(requests[0]?.url).toContain("type=artist%2Ctrack");
    expect(requests[0]?.url).toContain("market=US");
    expect(requests[0]?.url).toContain("limit=10");
  });
});

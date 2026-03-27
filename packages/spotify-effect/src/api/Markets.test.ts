import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { MarketsApi } from "./Markets";

const makeMarketsWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);
  const markets = new MarketsApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    }),
  );
  return { markets, ...testClient };
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("MarketsApi", () => {
  it("gets available markets", async () => {
    const { markets, layer, requests } = makeMarketsWithTestClient(
      jsonResponse({ markets: ["US", "GB", "DE"] }),
    );
    const result = await Effect.runPromise(
      markets.getMarkets().pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(["US", "GB", "DE"]);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/markets");
    expect(requests[0]?.method).toBe("GET");
  });
});

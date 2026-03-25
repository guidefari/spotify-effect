import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { categoryFixture, getCategoriesFixture } from "../fixtures/categoryFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { BrowseApi } from "./Browse";

const makeBrowseWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);
  const browse = new BrowseApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    }),
  );
  return { browse, ...testClient };
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("BrowseApi", () => {
  it("gets categories", async () => {
    const { browse, layer, requests } = makeBrowseWithTestClient(
      jsonResponse(getCategoriesFixture),
    );
    const result = await Effect.runPromise(
      browse.getCategories({ limit: 20 }).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(getCategoriesFixture.categories);
    expect(requests[0]?.url).toContain("/browse/categories");
    expect(requests[0]?.url).toContain("limit=20");
  });

  it("gets a single category", async () => {
    const { browse, layer, requests } = makeBrowseWithTestClient(jsonResponse(categoryFixture));
    const result = await Effect.runPromise(
      browse.getCategory("toplists", { country: "US" }).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(categoryFixture);
    expect(requests[0]?.url).toContain("/browse/categories/toplists");
    expect(requests[0]?.url).toContain("country=US");
  });

  it("gets category playlists", async () => {
    const playlistsPaging = {
      playlists: {
        href: "https://api.spotify.com/v1/browse/categories/toplists/playlists",
        items: [],
        limit: 20,
        next: null,
        offset: 0,
        previous: null,
        total: 0,
      },
    };
    const { browse, layer, requests } = makeBrowseWithTestClient(jsonResponse(playlistsPaging));
    const result = await Effect.runPromise(
      browse.getCategoryPlaylists("toplists").pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(playlistsPaging.playlists);
    expect(requests[0]?.url).toContain("/browse/categories/toplists/playlists");
  });

  it("gets new releases", async () => {
    const newReleases = {
      albums: {
        href: "https://api.spotify.com/v1/browse/new-releases",
        items: [],
        limit: 20,
        next: null,
        offset: 0,
        previous: null,
        total: 0,
      },
    };
    const { browse, layer, requests } = makeBrowseWithTestClient(jsonResponse(newReleases));
    const result = await Effect.runPromise(
      browse.getNewReleases({ country: "US" }).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(newReleases.albums);
    expect(requests[0]?.url).toContain("/browse/new-releases");
    expect(requests[0]?.url).toContain("country=US");
  });

  it("gets available genre seeds", async () => {
    const genres = { genres: ["acoustic", "afrobeat", "alt-rock"] };
    const { browse, layer, requests } = makeBrowseWithTestClient(jsonResponse(genres));
    const result = await Effect.runPromise(
      browse.getAvailableGenreSeeds().pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(genres.genres);
    expect(requests[0]?.url).toContain("/recommendations/available-genre-seeds");
  });
});

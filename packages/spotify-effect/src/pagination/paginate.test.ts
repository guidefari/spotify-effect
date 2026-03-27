import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { describe, expect, it } from "vitest";
import type { Paging } from "../model/SpotifyObjects";
import { paginateAll, paginateStream } from "./paginate";

const makePage = <T>(items: T[], offset: number, total: number, limit = 2): Paging<T> => ({
  href: `https://api.spotify.com/v1/test?offset=${offset}&limit=${limit}`,
  items,
  limit,
  next: offset + items.length < total
    ? `https://api.spotify.com/v1/test?offset=${offset + items.length}&limit=${limit}`
    : null,
  offset,
  previous: offset > 0
    ? `https://api.spotify.com/v1/test?offset=${Math.max(0, offset - limit)}&limit=${limit}`
    : null,
  total,
});

describe("paginateAll", () => {
  it("collects a single page when next is null", async () => {
    const fetch = (_offset: number, _limit: number) =>
      Effect.succeed(makePage(["a", "b"], 0, 2));

    const result = await Effect.runPromise(paginateAll(fetch, 2));
    expect(result).toEqual(["a", "b"]);
  });

  it("collects multiple pages", async () => {
    const pages: Paging<string>[] = [
      makePage(["a", "b"], 0, 5),
      makePage(["c", "d"], 2, 5),
      makePage(["e"], 4, 5),
    ];

    const fetch = (offset: number, _limit: number) => {
      const page = pages.find((p) => p.offset === offset);
      return page ? Effect.succeed(page) : Effect.fail("unexpected offset" as const);
    };

    const result = await Effect.runPromise(paginateAll(fetch, 2));
    expect(result).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns empty array for empty results", async () => {
    const fetch = (_offset: number, _limit: number) =>
      Effect.succeed(makePage([], 0, 0));

    const result = await Effect.runPromise(paginateAll(fetch, 20));
    expect(result).toEqual([]);
  });
});

describe("paginateStream", () => {
  it("streams items lazily across pages", async () => {
    let fetchCount = 0;
    const pages: Paging<number>[] = [
      makePage([1, 2], 0, 4),
      makePage([3, 4], 2, 4),
    ];

    const fetch = (offset: number, _limit: number) => {
      fetchCount++;
      const page = pages.find((p) => p.offset === offset);
      return page ? Effect.succeed(page) : Effect.fail("unexpected offset" as const);
    };

    const stream = paginateStream(fetch, 2);
    const first = await Effect.runPromise(
      Stream.runCollect(Stream.take(stream, 2)),
    );
    expect(first).toEqual([1, 2]);
    expect(fetchCount).toBe(1);

    fetchCount = 0;
    const all = await Effect.runPromise(Stream.runCollect(stream));
    expect(all).toEqual([1, 2, 3, 4]);
  });

  it("handles single page stream", async () => {
    const fetch = (_offset: number, _limit: number) =>
      Effect.succeed(makePage(["only"], 0, 1, 20));

    const result = await Effect.runPromise(
      Stream.runCollect(paginateStream(fetch, 20)),
    );
    expect(result).toEqual(["only"]);
  });

  it("handles empty stream", async () => {
    const fetch = (_offset: number, _limit: number) =>
      Effect.succeed(makePage([], 0, 0));

    const result = await Effect.runPromise(
      Stream.runCollect(paginateStream(fetch, 20)),
    );
    expect(result).toEqual([]);
  });
});

import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { describe, expect, it } from "vitest";
import type { CursorBasedPaging, Paging } from "../model/SpotifyObjects";
import { cursorPaginateAll, cursorPaginateStream, paginateAll, paginateStream } from "./paginate";

const makePage = <T>(items: T[], offset: number, total: number, limit = 2): Paging<T> => ({
  href: `https://api.spotify.com/v1/test?offset=${offset}&limit=${limit}`,
  items,
  limit,
  next:
    offset + items.length < total
      ? `https://api.spotify.com/v1/test?offset=${offset + items.length}&limit=${limit}`
      : null,
  offset,
  previous:
    offset > 0
      ? `https://api.spotify.com/v1/test?offset=${Math.max(0, offset - limit)}&limit=${limit}`
      : null,
  total,
});

describe("paginateAll", () => {
  it("collects a single page when next is null", async () => {
    const fetch = (_offset: number, _limit: number) => Effect.succeed(makePage(["a", "b"], 0, 2));

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
    const fetch = (_offset: number, _limit: number) => Effect.succeed(makePage([], 0, 0));

    const result = await Effect.runPromise(paginateAll(fetch, 20));
    expect(result).toEqual([]);
  });
});

describe("paginateStream", () => {
  it("streams items lazily across pages", async () => {
    let fetchCount = 0;
    const pages: Paging<number>[] = [makePage([1, 2], 0, 4), makePage([3, 4], 2, 4)];

    const fetch = (offset: number, _limit: number) => {
      fetchCount++;
      const page = pages.find((p) => p.offset === offset);
      return page ? Effect.succeed(page) : Effect.fail("unexpected offset" as const);
    };

    const stream = paginateStream(fetch, 2);
    const first = await Effect.runPromise(Stream.runCollect(Stream.take(stream, 2)));
    expect(first).toEqual([1, 2]);
    expect(fetchCount).toBe(1);

    fetchCount = 0;
    const all = await Effect.runPromise(Stream.runCollect(stream));
    expect(all).toEqual([1, 2, 3, 4]);
  });

  it("handles single page stream", async () => {
    const fetch = (_offset: number, _limit: number) => Effect.succeed(makePage(["only"], 0, 1, 20));

    const result = await Effect.runPromise(Stream.runCollect(paginateStream(fetch, 20)));
    expect(result).toEqual(["only"]);
  });

  it("handles empty stream", async () => {
    const fetch = (_offset: number, _limit: number) => Effect.succeed(makePage([], 0, 0));

    const result = await Effect.runPromise(Stream.runCollect(paginateStream(fetch, 20)));
    expect(result).toEqual([]);
  });

  it("stops when items are empty even if next is set", async () => {
    let fetchCount = 0;
    const fetch = (offset: number, _limit: number) => {
      fetchCount++;
      if (offset === 0) return Effect.succeed(makePage(["a", "b"], 0, 10));
      return Effect.succeed({
        ...makePage([], offset, 10),
        next: "https://api.spotify.com/v1/test?offset=999",
      });
    };

    const result = await Effect.runPromise(Stream.runCollect(paginateStream(fetch, 2)));
    expect(result).toEqual(["a", "b"]);
    expect(fetchCount).toBe(2);
  });
});

const makeCursorPage = <T>(
  items: T[],
  after: string,
  hasNext: boolean,
  limit = 2,
): CursorBasedPaging<T> => ({
  href: "https://api.spotify.com/v1/test",
  items,
  limit,
  next: hasNext ? "https://api.spotify.com/v1/test?after=next" : null,
  cursors: { after },
});

describe("cursorPaginateAll", () => {
  it("collects a single page when next is null", async () => {
    const fetch = () => Effect.succeed(makeCursorPage(["a", "b"], "cursor1", false));
    const result = await Effect.runPromise(cursorPaginateAll(fetch, 2));
    expect(result).toEqual(["a", "b"]);
  });

  it("collects multiple pages following cursors", async () => {
    const pages: Record<string, CursorBasedPaging<string>> = {
      initial: makeCursorPage(["a", "b"], "cursor1", true),
      cursor1: makeCursorPage(["c", "d"], "cursor2", true),
      cursor2: makeCursorPage(["e"], "cursor3", false),
    };

    const fetch = (opts?: { limit?: number; after?: string }) => {
      const key = opts?.after ?? "initial";
      const page = pages[key];
      return page ? Effect.succeed(page) : Effect.fail("unexpected cursor" as const);
    };

    const result = await Effect.runPromise(cursorPaginateAll(fetch, 2));
    expect(result).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns empty array for empty results", async () => {
    const fetch = () => Effect.succeed(makeCursorPage([], "none", false));
    const result = await Effect.runPromise(cursorPaginateAll(fetch, 20));
    expect(result).toEqual([]);
  });
});

describe("cursorPaginateStream", () => {
  it("streams items lazily across cursor pages", async () => {
    let fetchCount = 0;
    const pages: Record<string, CursorBasedPaging<number>> = {
      initial: makeCursorPage([1, 2], "c1", true),
      c1: makeCursorPage([3, 4], "c2", false),
    };

    const fetch = (opts?: { limit?: number; after?: string }) => {
      fetchCount++;
      const key = opts?.after ?? "initial";
      const page = pages[key];
      return page ? Effect.succeed(page) : Effect.fail("unexpected cursor" as const);
    };

    const stream = cursorPaginateStream(fetch, 2);
    const first = await Effect.runPromise(Stream.runCollect(Stream.take(stream, 2)));
    expect(first).toEqual([1, 2]);
    expect(fetchCount).toBe(1);

    fetchCount = 0;
    const all = await Effect.runPromise(Stream.runCollect(stream));
    expect(all).toEqual([1, 2, 3, 4]);
  });

  it("handles empty cursor stream", async () => {
    const fetch = () => Effect.succeed(makeCursorPage([], "none", false));
    const result = await Effect.runPromise(Stream.runCollect(cursorPaginateStream(fetch, 20)));
    expect(result).toEqual([]);
  });

  it("stops when items are empty even if next is set", async () => {
    let fetchCount = 0;
    const pages: Record<string, CursorBasedPaging<string>> = {
      initial: makeCursorPage(["a", "b"], "c1", true),
    };

    const fetch = (opts?: { limit?: number; after?: string }) => {
      fetchCount++;
      const key = opts?.after ?? "initial";
      const page = pages[key];
      if (page) return Effect.succeed(page);
      return Effect.succeed({
        ...makeCursorPage([], "c2", false),
        next: "https://api.spotify.com/v1/test?after=shouldnot",
      });
    };

    const result = await Effect.runPromise(Stream.runCollect(cursorPaginateStream(fetch, 2)));
    expect(result).toEqual(["a", "b"]);
    expect(fetchCount).toBe(2);
  });
});

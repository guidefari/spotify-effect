import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import type { CursorBasedPaging, Paging } from "../model/SpotifyObjects";

export type PaginatedFetch<T, E, R> = (
  offset: number,
  limit: number,
) => Effect.Effect<Paging<T>, E, R>;

const fetchPageStream = <T, E, R>(
  fetch: PaginatedFetch<T, E, R>,
  offset: number,
  pageSize: number,
): Stream.Stream<T, E, R> =>
  Stream.fromEffect(fetch(offset, pageSize)).pipe(
    Stream.flatMap((page) => {
      const items = Stream.make(...page.items);
      if (page.next === null) return items;
      return Stream.concat(
        items,
        Stream.suspend(() => fetchPageStream(fetch, offset + page.items.length, pageSize)),
      );
    }),
  );

export const paginateStream = <T, E, R>(
  fetch: PaginatedFetch<T, E, R>,
  pageSize = 20,
): Stream.Stream<T, E, R> => fetchPageStream(fetch, 0, pageSize);

export const paginateAll = <T, E, R>(
  fetch: PaginatedFetch<T, E, R>,
  pageSize = 20,
): Effect.Effect<T[], E, R> =>
  Stream.runCollect(paginateStream(fetch, pageSize)) as Effect.Effect<T[], E, R>;

export type CursorPaginatedFetch<T, E, R> = (
  options?: { limit?: number; after?: string },
) => Effect.Effect<CursorBasedPaging<T>, E, R>;

const fetchCursorPageStream = <T, E, R>(
  fetch: CursorPaginatedFetch<T, E, R>,
  after: string | undefined,
  pageSize: number,
): Stream.Stream<T, E, R> =>
  Stream.fromEffect(fetch({ limit: pageSize, ...(after !== undefined ? { after } : null) })).pipe(
    Stream.flatMap((page) => {
      const items = Stream.make(...page.items);
      if (page.next === null) return items;
      return Stream.concat(
        items,
        Stream.suspend(() => fetchCursorPageStream(fetch, page.cursors.after, pageSize)),
      );
    }),
  );

export const cursorPaginateStream = <T, E, R>(
  fetch: CursorPaginatedFetch<T, E, R>,
  pageSize = 20,
): Stream.Stream<T, E, R> => fetchCursorPageStream(fetch, undefined, pageSize);

export const cursorPaginateAll = <T, E, R>(
  fetch: CursorPaginatedFetch<T, E, R>,
  pageSize = 20,
): Effect.Effect<T[], E, R> =>
  Stream.runCollect(cursorPaginateStream(fetch, pageSize)) as Effect.Effect<T[], E, R>;

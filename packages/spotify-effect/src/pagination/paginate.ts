import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import type { Paging } from "../model/SpotifyObjects";

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

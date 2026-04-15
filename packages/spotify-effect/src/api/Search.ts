import * as Layer from "effect/Layer";
import * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { SearchType } from "../model/SpotifyObjects";
import type { SearchOptions } from "../model/SpotifyOptions";
import type { SearchResponse } from "../model/SpotifyResponses";
import { SearchResponseSchema } from "../model/SpotifyResponseSchemas";
import { Search } from "../services/Search";
import {
  SpotifyRequest,
  type SpotifyRequestOptions,
  type SpotifyRequestService,
} from "../services/SpotifyRequest";

export class SearchApi {
  constructor(private readonly request: SpotifyRequestService) {}

  public search(
    query: string,
    types: ReadonlyArray<SearchType>,
    options?: SearchOptions,
  ): Effect.Effect<SearchResponse, SpotifyRequestError> {
    const reqOptions: SpotifyRequestOptions = {
      query: {
        q: query,
        type: types.join(","),
        ...(options?.market === undefined ? null : { market: options.market }),
        ...(options?.limit === undefined ? null : { limit: options.limit }),
        ...(options?.offset === undefined ? null : { offset: options.offset }),
        ...(options?.include_external === undefined
          ? null
          : { include_external: options.include_external }),
      },
    };
    return this.request.getJsonWithSchema("/search", SearchResponseSchema, reqOptions);
  }
}

export const layer = Layer.effect(
  Search,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new SearchApi(request);

    return {
      search: api.search.bind(api),
    };
  }),
);

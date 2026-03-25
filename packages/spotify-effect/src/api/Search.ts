import type * as Effect from "effect/Effect";
import type { HttpClient } from "effect/unstable/http";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { SearchType } from "../model/SpotifyObjects";
import type { SearchOptions } from "../model/SpotifyOptions";
import type { SearchResponse } from "../model/SpotifyResponses";
import { SearchResponseSchema } from "../model/SpotifyResponseSchemas";
import type { SpotifyRequest, SpotifyRequestOptions } from "../services/SpotifyRequest";

export class SearchApi {
  constructor(private readonly request: SpotifyRequest) {}

  public search(
    query: string,
    types: ReadonlyArray<SearchType>,
    options?: SearchOptions,
  ): Effect.Effect<SearchResponse, SpotifyRequestError, HttpClient.HttpClient> {
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

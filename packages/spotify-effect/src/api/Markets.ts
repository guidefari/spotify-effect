import * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import { GetMarketsResponseSchema } from "../model/SpotifyResponseSchemas";
import type { SpotifyRequest } from "../services/SpotifyRequest";
import { HttpClient } from "effect/unstable/http";

export class MarketsApi {
  private readonly request: SpotifyRequest;

  public constructor(request: SpotifyRequest) {
    this.request = request;
  }

  public getMarkets(): Effect.Effect<string[], SpotifyRequestError, HttpClient.HttpClient> {
    return this.request
      .getJsonWithSchema("/markets", GetMarketsResponseSchema)
      .pipe(Effect.map((r) => r.markets));
  }
}

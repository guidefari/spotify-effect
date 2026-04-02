import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import { GetMarketsResponseSchema } from "../model/SpotifyResponseSchemas";
import { Markets } from "../services/Markets";
import { SpotifyRequest, type SpotifyRequestService } from "../services/SpotifyRequest";

export class MarketsApi {
  private readonly request: SpotifyRequestService;

  public constructor(request: SpotifyRequestService) {
    this.request = request;
  }

  public getMarkets(): Effect.Effect<string[], SpotifyRequestError> {
    return this.request
      .getJsonWithSchema("/markets", GetMarketsResponseSchema)
      .pipe(Effect.map((r) => r.markets));
  }
}

export const layer = Layer.effect(
  Markets,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new MarketsApi(request);

    return {
      getMarkets: api.getMarkets.bind(api),
    };
  }),
);

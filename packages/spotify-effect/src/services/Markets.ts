import { ServiceMap } from "effect";
import type * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";

export class Markets extends ServiceMap.Service<
  Markets,
  {
    readonly getMarkets: () => Effect.Effect<string[], SpotifyRequestError>;
  }
>()("spotify-effect/Markets") {}

import type * as Effect from "effect/Effect"
import type { HttpClient } from "effect/unstable/http"
import type { SpotifyRequestError } from "../errors/SpotifyError"
import type { PrivateUser } from "../model/SpotifyObjects"
import type { SpotifyRequest } from "../services/SpotifyRequest"

export class UsersApi {
  constructor(private readonly request: SpotifyRequest) {}

  public getCurrentUserProfile(): Effect.Effect<PrivateUser, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJson<PrivateUser>("/me")
  }
}

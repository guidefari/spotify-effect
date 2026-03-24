import type * as Effect from "effect/Effect";
import type { HttpClient } from "effect/unstable/http";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { PrivateUser, PublicUser } from "../model/SpotifyObjects";
import { PrivateUserSchema, PublicUserSchema } from "../model/SpotifyObjectSchemas";
import type { SpotifyRequest } from "../services/SpotifyRequest";

export class UsersApi {
  constructor(private readonly request: SpotifyRequest) {}

  public getCurrentUserProfile(): Effect.Effect<
    PrivateUser,
    SpotifyRequestError,
    HttpClient.HttpClient
  > {
    return this.request.getJsonWithSchema("/me", PrivateUserSchema);
  }

  public getUser(
    userId: string,
  ): Effect.Effect<PublicUser, SpotifyRequestError, HttpClient.HttpClient> {
    return this.request.getJsonWithSchema(`/users/${userId}`, PublicUserSchema);
  }
}

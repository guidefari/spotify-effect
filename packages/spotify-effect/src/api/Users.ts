import * as Layer from "effect/Layer";
import * as Effect from "effect/Effect";
import type { SpotifyRequestError } from "../errors/SpotifyError";
import type { PrivateUser, PublicUser } from "../model/SpotifyObjects";
import { PrivateUserSchema, PublicUserSchema } from "../model/SpotifyObjectSchemas";
import { Users } from "../services/Users";
import { SpotifyRequest, type SpotifyRequestService } from "../services/SpotifyRequest";

export class UsersApi {
  constructor(private readonly request: SpotifyRequestService) {}

  public getCurrentUserProfile(): Effect.Effect<
    PrivateUser,
    SpotifyRequestError
  > {
    return this.request.getJsonWithSchema("/me", PrivateUserSchema);
  }

  public getUser(
    userId: string,
  ): Effect.Effect<PublicUser, SpotifyRequestError> {
    return this.request.getJsonWithSchema(`/users/${userId}`, PublicUserSchema);
  }
}

export const layer = Layer.effect(
  Users,
  Effect.gen(function* () {
    const request = yield* SpotifyRequest;
    const api = new UsersApi(request);

    return {
      getCurrentUserProfile: api.getCurrentUserProfile.bind(api),
      getUser: api.getUser.bind(api),
    };
  }),
);

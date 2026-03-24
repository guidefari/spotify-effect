import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { currentUserProfileFixture } from "../fixtures/currentUserProfileFixture";
import { publicUserFixture } from "../fixtures/publicUserFixture";
import { makeSpotifyRequest } from "../services/SpotifyRequest";
import { makeTestHttpClient } from "../test/TestHttpClient";
import { UsersApi } from "./Users";

const makeUsersWithTestClient = (response: Response) => {
  const testClient = makeTestHttpClient(() => response);

  const users = new UsersApi(
    makeSpotifyRequest({
      getAccessToken: () => Effect.succeed("token"),
      invalidateAccessToken: () => Effect.void,
    }),
  );

  return { users, ...testClient };
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("UsersApi", () => {
  it("gets the current user profile", async () => {
    const { users, layer, requests } = makeUsersWithTestClient(
      jsonResponse(currentUserProfileFixture),
    );

    const response = await Effect.runPromise(
      users.getCurrentUserProfile().pipe(Effect.provide(layer)),
    );

    expect(response).toEqual(currentUserProfileFixture);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/me");
    expect(requests[0]?.headers.authorization).toBe("Bearer token");
  });

  it("gets a user's profile", async () => {
    const { users, layer, requests } = makeUsersWithTestClient(
      jsonResponse(publicUserFixture),
    );

    const response = await Effect.runPromise(
      users.getUser("griegs").pipe(Effect.provide(layer)),
    );

    expect(response).toEqual(publicUserFixture);
    expect(requests[0]?.url).toBe("https://api.spotify.com/v1/users/griegs");
    expect(requests[0]?.headers.authorization).toBe("Bearer token");
  });
});

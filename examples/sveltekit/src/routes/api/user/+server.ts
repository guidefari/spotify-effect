import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import * as Effect from "effect/Effect";
import { Users } from "@spotify-effect/core";
import { makeAccessTokenLayer } from "$lib/server/spotify";

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (typeof b.accessToken !== "string" || typeof b.userId !== "string") {
    return json({ message: "Missing required fields: accessToken, userId" }, { status: 400 });
  }
  const accessToken = b.accessToken;
  const userId = b.userId;

  try {
    const user = await Effect.runPromise(
      Effect.gen(function* () {
        const users = yield* Users;
        return yield* users.getUser(userId);
      }).pipe(Effect.provide(makeAccessTokenLayer(accessToken))),
    );
    return json(user);
  } catch (err) {
    return json(err, { status: 500 });
  }
};

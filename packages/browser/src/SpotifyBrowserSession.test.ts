import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import {
  createPkceCodeChallenge,
  createPkceCodeVerifier,
  makeSpotifyBrowserSession,
  readAuthorizationCallback,
} from "./SpotifyBrowserSession";

const makeStorage = (): Storage => {
  const map = new Map<string, string>();

  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.get(key) ?? null;
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
};

describe("SpotifyBrowserSession", () => {
  it("stores and restores pkce state and tokens", () => {
    const sessionStorage = makeStorage();
    const localStorage = makeStorage();
    const historyCalls: string[] = [];
    const session = makeSpotifyBrowserSession({
      sessionStorage,
      localStorage,
      history: {
        replaceState: (_data, _unused, url) => {
          historyCalls.push(String(url));
        },
      } as History,
    });

    session.setPkceState({
      verifier: "verifier",
      clientId: "client-id",
      redirectUri: "http://127.0.0.1:3012/",
      state: "state",
    });
    session.setTokens({
      accessToken: "token",
      refreshToken: "refresh-token",
      accessTokenExpiresAt: 123,
    });

    expect(session.getPkceState()).toEqual({
      verifier: "verifier",
      clientId: "client-id",
      redirectUri: "http://127.0.0.1:3012/",
      state: "state",
    });
    expect(session.getTokens()).toEqual({
      accessToken: "token",
      refreshToken: "refresh-token",
      accessTokenExpiresAt: 123,
    });

    session.clearCallbackParams(new URL("http://127.0.0.1:3012/?code=abc&state=state"));
    expect(historyCalls).toEqual(["http://127.0.0.1:3012/"]);
  });

  it("reads callback params from a url", () => {
    expect(
      readAuthorizationCallback(
        new URL("http://127.0.0.1:3012/?code=abc&state=state&error=access_denied"),
      ),
    ).toEqual({
      code: "abc",
      state: "state",
      error: "access_denied",
    });
  });

  it("creates a pkce verifier and challenge", async () => {
    const verifier = await Effect.runPromise(createPkceCodeVerifier());
    const challenge = await Effect.runPromise(createPkceCodeChallenge(verifier));

    expect(verifier.length).toBeGreaterThan(20);
    expect(challenge.length).toBeGreaterThan(20);
    expect(challenge).not.toBe(verifier);
  });
});

import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import { makeSpotifyLayer } from "../makeSpotifyLayer";
import type { SpotifyCredentials, SpotifyApiOptions } from "../services/SpotifyConfig";
import type { AuthorizationScope } from "../model/SpotifyAuthorization";
import { getAuthorizationUrl } from "../utils/getAuthorizationUrl";
import {
  createPkceCodeChallenge,
  createPkceCodeVerifier,
  type SpotifyBrowserSession,
} from "./SpotifyBrowserSession";

const browserHttpClientLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  Layer.succeed(HttpClient.TracerPropagationEnabled, false),
);

export const makeSpotifyBrowserLayer = (
  options: SpotifyApiOptions = {},
  credentials: SpotifyCredentials = {},
) => makeSpotifyLayer({ ...options, httpClientLayer: browserHttpClientLayer }, credentials);

export const startPkceLogin = (options: {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scopes: ReadonlyArray<AuthorizationScope>;
  readonly session: SpotifyBrowserSession;
}): Effect.Effect<string> =>
  Effect.gen(function* () {
    const verifier = yield* createPkceCodeVerifier();
    const challenge = yield* createPkceCodeChallenge(verifier);

    const url = getAuthorizationUrl(options.clientId, options.redirectUri, "code", {
      scope: options.scopes,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    options.session.setPkceState({
      verifier,
      clientId: options.clientId,
      redirectUri: options.redirectUri,
    });

    return url;
  });

export {
  createPkceCodeChallenge,
  createPkceCodeVerifier,
  makeSpotifyBrowserSession,
  readAuthorizationCallback,
} from "./SpotifyBrowserSession";
export { getAuthorizationUrl } from "../utils/getAuthorizationUrl";
export type {
  BrowserAuthorizationCallback,
  BrowserPkceState,
  BrowserRefreshableTokens,
  SpotifyBrowserSession,
} from "./SpotifyBrowserSession";
export type { GetAuthorizationUrlOptions, PKCEExtensionOptions } from "../utils/getAuthorizationUrl";
export type { SpotifyApiOptions, SpotifyCredentials } from "../services/SpotifyConfig";
export type { AuthorizationScope } from "../model/SpotifyAuthorization";

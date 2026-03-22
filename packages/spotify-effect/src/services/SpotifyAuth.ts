import * as Effect from "effect/Effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import { TOKEN_URL } from "../constants";
import {
  SpotifyConfigurationError,
  makeSpotifyHttpError,
  mapHttpClientError,
  type SpotifyRequestError,
} from "../errors/SpotifyError";
import type {
  GetRefreshableUserTokensResponse,
  GetRefreshedAccessTokenResponse,
  GetTemporaryAppTokensResponse,
} from "../model/SpotifyAuthorization";

interface SpotifyApiErrorBody {
  readonly error?: string;
  readonly error_description?: string;
}

export interface SpotifyAuth {
  getRefreshableUserTokens(
    code: string,
  ): Effect.Effect<GetRefreshableUserTokensResponse, SpotifyRequestError, HttpClient.HttpClient>;
  getRefreshableUserTokensWithPkce(options: {
    readonly clientId: string;
    readonly code: string;
    readonly codeVerifier: string;
  }): Effect.Effect<GetRefreshableUserTokensResponse, SpotifyRequestError, HttpClient.HttpClient>;
  getRefreshedAccessToken(
    refreshToken: string,
  ): Effect.Effect<GetRefreshedAccessTokenResponse, SpotifyRequestError, HttpClient.HttpClient>;
  getTemporaryAppTokens(): Effect.Effect<
    GetTemporaryAppTokensResponse,
    SpotifyRequestError,
    HttpClient.HttpClient
  >;
}

const encodeClientCredentials = (value: string): string => {
  const btoaFn = Reflect.get(globalThis, "btoa");

  if (typeof btoaFn === "function") {
    return btoaFn(value);
  }

  const bufferCtor = Reflect.get(globalThis, "Buffer");

  if (
    typeof bufferCtor === "function" &&
    "from" in bufferCtor &&
    typeof bufferCtor.from === "function"
  ) {
    return bufferCtor.from(value).toString("base64");
  }

  throw new Error("Base64 encoding is not available in this runtime");
};

const parseJson = (value: string): unknown => {
  if (value.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const getApiMessage = (body: unknown): string | undefined => {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const record = body as SpotifyApiErrorBody;

  return record.error_description ?? record.error;
};

const getRequiredConfig = (options: {
  readonly clientId: string;
  readonly clientSecret: string;
}) =>
  Effect.gen(function* () {
    if (options.clientId.length === 0 || options.clientSecret.length === 0) {
      return yield* Effect.fail(
        new SpotifyConfigurationError({
          message: "clientId and clientSecret are required for this auth flow",
        }),
      )
    }

    const authorization = yield* Effect.try({
      try: () => `Basic ${encodeClientCredentials(`${options.clientId}:${options.clientSecret}`)}`,
      catch: (cause) =>
        new SpotifyConfigurationError({
          message: cause instanceof Error ? cause.message : "Failed to encode client credentials",
        }),
    })

    return {
      authorization,
    }
  })

const getRefreshConfig = (options: {
  readonly clientId: string;
  readonly clientSecret: string;
}) =>
  Effect.gen(function* () {
    if (options.clientSecret.length > 0) {
      const config = yield* getRequiredConfig(options)

      return {
        authorization: config.authorization,
        body: {} as Readonly<Record<string, string>>,
      }
    }

    if (options.clientId.length === 0) {
      return yield* Effect.fail(
        new SpotifyConfigurationError({
          message: "clientId is required for refresh token exchange",
        }),
      )
    }

    return {
      authorization: undefined,
      body: {
        client_id: options.clientId,
      },
    }
  })

const requestToken = <A>(options: {
  readonly body: Readonly<Record<string, string>>
  readonly authorization?: string
}): Effect.Effect<A, SpotifyRequestError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const response = yield* HttpClient.post(TOKEN_URL, {
      headers: {
        ...(options.authorization === undefined ? null : { Authorization: options.authorization }),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: HttpClientRequest.bodyUrlParams(options.body)(HttpClientRequest.empty).body,
    }).pipe(Effect.mapError(mapHttpClientError))

    if (response.status < 200 || response.status >= 300) {
      const text = yield* response.text.pipe(Effect.mapError(mapHttpClientError))
      const body = parseJson(text)
      const apiMessage = getApiMessage(body)

      return yield* Effect.fail(
        makeSpotifyHttpError({
          status: response.status,
          method: response.request.method,
          url: response.request.url,
          ...(body === undefined ? null : { body }),
          ...(apiMessage === undefined ? null : { apiMessage }),
        }),
      )
    }

    return yield* response.json.pipe(
      Effect.mapError(mapHttpClientError),
      Effect.map((body) => body as A),
    )
  })

export const makeSpotifyAuth = (options: {
  readonly clientId: string;
  readonly redirectUri?: string;
  readonly clientSecret: string;
}): SpotifyAuth => ({
  getRefreshableUserTokens: (code) =>
    Effect.gen(function* () {
      if (options.redirectUri === undefined || options.redirectUri.length === 0) {
        return yield* Effect.fail(
          new SpotifyConfigurationError({
            message: "redirectUri is required for authorization code exchange",
          }),
        )
      }

      const config = yield* getRequiredConfig(options)

      return yield* requestToken<GetRefreshableUserTokensResponse>({
        authorization: config.authorization,
        body: {
          code,
          grant_type: "authorization_code",
          redirect_uri: options.redirectUri,
        },
      })
    }),
  getRefreshableUserTokensWithPkce: ({ clientId, code, codeVerifier }) =>
    Effect.gen(function* () {
      if (options.redirectUri === undefined || options.redirectUri.length === 0) {
        return yield* Effect.fail(
          new SpotifyConfigurationError({
            message: "redirectUri is required for PKCE authorization code exchange",
          }),
        )
      }

      return yield* requestToken<GetRefreshableUserTokensResponse>({
        body: {
          client_id: clientId,
          code,
          code_verifier: codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: options.redirectUri,
        },
      })
    }),
  getRefreshedAccessToken: (refreshToken) =>
    Effect.gen(function* () {
      const config = yield* getRefreshConfig(options)

      return yield* requestToken<GetRefreshedAccessTokenResponse>({
        body: {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          ...config.body,
        },
        ...(config.authorization === undefined ? null : { authorization: config.authorization }),
      })
    }),
  getTemporaryAppTokens: () =>
    Effect.gen(function* () {
      const config = yield* getRequiredConfig(options)

      return yield* requestToken<GetTemporaryAppTokensResponse>({
        authorization: config.authorization,
        body: {
          grant_type: "client_credentials",
        },
      })
    }),
});

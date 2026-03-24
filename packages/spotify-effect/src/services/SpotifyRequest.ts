import * as Effect from "effect/Effect";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import { HttpClient, type HttpClientResponse } from "effect/unstable/http";
import {
  SpotifyHttpError,
  SpotifyParseError,
  SpotifyRateLimitError,
  isRetryableError,
  makeSpotifyHttpError,
  mapHttpClientError,
  type SpotifyRequestError,
} from "../errors/SpotifyError";
import { decodeSpotifyApiErrorBody } from "../model/SpotifyErrorSchemas";

const spotifyApiBaseUrl = "https://api.spotify.com/v1";

type QueryValue = string | number | boolean | ReadonlyArray<string | number | boolean> | undefined;
type DecodableSchema<A> = Schema.Top & { readonly Type: A; readonly DecodingServices: never };

export interface SpotifyRequestOptions {
  readonly query?: Readonly<Record<string, QueryValue>>;
}

export interface SpotifyRetryConfig {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
}

const defaultRetryConfig: Required<SpotifyRetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export interface SpotifyRequest {
  getJson<A>(
    path: string,
    options?: SpotifyRequestOptions,
  ): Effect.Effect<A, SpotifyRequestError, HttpClient.HttpClient>;
  getJsonWithSchema<A>(
    path: string,
    schema: DecodableSchema<A>,
    options?: SpotifyRequestOptions,
  ): Effect.Effect<A, SpotifyRequestError, HttpClient.HttpClient>;
}

export interface AccessTokenResolver {
  getAccessToken(): Effect.Effect<string, SpotifyRequestError, HttpClient.HttpClient>;
  invalidateAccessToken(): Effect.Effect<void>;
}

const buildUrl = (path: string): string =>
  new URL(path.startsWith("/") ? path.slice(1) : path, `${spotifyApiBaseUrl}/`).toString();

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

const decodeSuccessResponse = <A>(
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<A, SpotifyRequestError> =>
  Effect.gen(function* () {
    const body = yield* response.json.pipe(Effect.mapError(mapHttpClientError));

    return body as A;
  });

const decodeSuccessResponseWithSchema = <A>(
  response: HttpClientResponse.HttpClientResponse,
  schema: DecodableSchema<A>,
): Effect.Effect<A, SpotifyRequestError> =>
  Effect.gen(function* () {
    const body = yield* response.json.pipe(Effect.mapError(mapHttpClientError));

    return yield* Effect.try({
      try: () => Schema.decodeUnknownSync(schema)(body),
      catch: (cause) =>
        new SpotifyParseError({
          cause,
          method: response.request.method,
          url: response.request.url,
          description: "Failed to decode Spotify API response",
        }),
    });
  });

const decodeFailureResponse = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<never, SpotifyRequestError> =>
  Effect.gen(function* () {
    const text = yield* response.text.pipe(Effect.mapError(mapHttpClientError));
    const body = parseJson(text);
    const decodedError = decodeSpotifyApiErrorBody(body);

    return yield* makeSpotifyHttpError({
      status: response.status,
      method: response.request.method,
      url: response.request.url,
      ...(decodedError.body === undefined ? null : { body: decodedError.body }),
      ...(decodedError.message === undefined ? null : { apiMessage: decodedError.message }),
    });
  });

const sendRequest = (
  accessToken: string,
  path: string,
  options?: SpotifyRequestOptions,
): Effect.Effect<
  HttpClientResponse.HttpClientResponse,
  SpotifyRequestError,
  HttpClient.HttpClient
> =>
  HttpClient.get(buildUrl(path), {
    acceptJson: true,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    urlParams: options?.query,
  }).pipe(Effect.mapError(mapHttpClientError));

const annotateResponse = (response: HttpClientResponse.HttpClientResponse): Effect.Effect<void> =>
  Effect.annotateCurrentSpan({
    "spotify.http.status_code": response.status,
    "spotify.http.method": response.request.method,
    "spotify.http.url": response.request.url,
    ...(response.status === 429 && response.headers["retry-after"] !== undefined
      ? { "spotify.http.retry_after": response.headers["retry-after"] }
      : null),
  });

type DecodeFn<A> = (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<A, SpotifyRequestError>;

const executeRequest = <A>(
  accessToken: string,
  path: string,
  decode: DecodeFn<A>,
  options?: SpotifyRequestOptions,
): Effect.Effect<A, SpotifyRequestError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const response = yield* sendRequest(accessToken, path, options);
    yield* annotateResponse(response);

    if (response.status >= 200 && response.status < 300) {
      return yield* decode(response);
    }

    if (response.status === 429) {
      const retryAfter = response.headers["retry-after"];
      const retryAfterSeconds = retryAfter !== undefined ? Number.parseInt(retryAfter, 10) : 0;

      yield* Effect.sleep(`${retryAfterSeconds} seconds`);

      return yield* new SpotifyHttpError({
        status: response.status,
        method: response.request.method,
        url: response.request.url,
        description: "Rate limit exceeded",
      });
    }

    return yield* decodeFailureResponse(response);
  });

const withRetry = <A, E extends SpotifyRequestError, R>(
  effect: Effect.Effect<A, E, R>,
  retryConfig: Required<SpotifyRetryConfig>,
  attemptRef: Ref.Ref<number>,
): Effect.Effect<A, E | SpotifyRateLimitError, R> =>
  Effect.gen(function* () {
    let lastError: E | undefined;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      yield* Ref.set(attemptRef, attempt);
      yield* Effect.annotateCurrentSpan({ "spotify.retry.attempt": attempt });

      const result = yield* effect.pipe(
        Effect.matchEffect({
          onFailure: (error) => Effect.succeed({ _tag: "Error" as const, error }),
          onSuccess: (value) => Effect.succeed({ _tag: "Success" as const, value }),
        })
      );

      if (result._tag === "Success") {
        return result.value;
      }

      lastError = result.error;

      if (!isRetryableError(result.error)) {
        return yield* Effect.fail(result.error);
      }

      if (attempt < retryConfig.maxRetries) {
        const delayMs = Math.min(
          retryConfig.baseDelayMs * Math.pow(2, attempt),
          retryConfig.maxDelayMs
        );
        yield* Effect.sleep(`${delayMs} millis`);
      }
    }

    yield* Effect.annotateCurrentSpan({ "spotify.retry.exhausted": true });

    if (lastError?._tag === "SpotifyHttpError" && lastError.status === 429) {
      return yield* new SpotifyRateLimitError({
        method: lastError.method,
        url: lastError.url,
        retryAfterSeconds: 0,
      });
    }

    return yield* Effect.fail(lastError!);
  });

const makeRequestWithAuthRetry = <A>(
  accessTokenResolver: AccessTokenResolver,
  path: string,
  decode: DecodeFn<A>,
  retryConfig: Required<SpotifyRetryConfig>,
  options?: SpotifyRequestOptions,
): Effect.Effect<A, SpotifyRequestError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const attemptRef = yield* Ref.make(0);

    const tryWithToken = (token: string) =>
      withRetry(executeRequest(token, path, decode, options), retryConfig, attemptRef);

    const accessToken = yield* accessTokenResolver.getAccessToken();

    const result = yield* tryWithToken(accessToken).pipe(
      Effect.matchEffect({
        onFailure: (error) => Effect.succeed({ _tag: "Error" as const, error }),
        onSuccess: (value) => Effect.succeed({ _tag: "Success" as const, value }),
      })
    );

    if (result._tag === "Error") {
      if (result.error._tag === "SpotifyHttpError" && result.error.status === 401) {
        yield* Effect.annotateCurrentSpan({ "spotify.auth.retry_on_unauthorized": true });
        yield* Effect.withSpan(
          accessTokenResolver.invalidateAccessToken(),
          "spotify.auth.invalidate",
        );

        const freshToken = yield* accessTokenResolver.getAccessToken();
        return yield* tryWithToken(freshToken);
      }
      return yield* Effect.fail(result.error);
    }

    return result.value;
  });

export const makeSpotifyRequest = (
  accessTokenResolver: AccessTokenResolver,
  retryConfig?: SpotifyRetryConfig,
): SpotifyRequest => {
  const config: Required<SpotifyRetryConfig> = {
    ...defaultRetryConfig,
    ...retryConfig,
  };

  return {
    getJson: <A>(path: string, options?: SpotifyRequestOptions) =>
      Effect.withSpan(
        makeRequestWithAuthRetry(
          accessTokenResolver,
          path,
          decodeSuccessResponse<A>,
          config,
          options,
        ),
        `spotify.request ${path}`,
        {
          attributes: {
            "spotify.request.path": path,
            "spotify.request.has_query": options?.query !== undefined,
          },
        },
      ),
    getJsonWithSchema: <A>(path: string, schema: DecodableSchema<A>, options?: SpotifyRequestOptions) =>
      Effect.withSpan(
        makeRequestWithAuthRetry(
          accessTokenResolver,
          path,
          (response) => decodeSuccessResponseWithSchema(response, schema),
          config,
          options,
        ),
        `spotify.request ${path}`,
        {
          attributes: {
            "spotify.request.path": path,
            "spotify.request.has_query": options?.query !== undefined,
            "spotify.request.uses_schema": true,
          },
        },
      ),
  };
};

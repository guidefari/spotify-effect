import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpClient, type HttpClientResponse } from "effect/unstable/http";
import {
  SpotifyParseError,
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

export const makeSpotifyRequest = (accessTokenResolver: AccessTokenResolver): SpotifyRequest => ({
  getJson: <A>(path: string, options?: SpotifyRequestOptions) =>
    Effect.withSpan(
      Effect.gen(function* () {
        const accessToken = yield* accessTokenResolver.getAccessToken();
        const response = yield* sendRequest(accessToken, path, options);
        yield* annotateResponse(response);

        if (response.status >= 200 && response.status < 300) {
          return yield* decodeSuccessResponse<A>(response);
        }

        if (response.status === 401) {
          yield* Effect.annotateCurrentSpan({ "spotify.auth.retry_on_unauthorized": true });
          yield* Effect.withSpan(
            accessTokenResolver.invalidateAccessToken(),
            "spotify.auth.invalidate",
          );

          const retriedAccessToken = yield* accessTokenResolver.getAccessToken();
          const retriedResponse = yield* sendRequest(retriedAccessToken, path, options);
          yield* annotateResponse(retriedResponse);

          if (retriedResponse.status >= 200 && retriedResponse.status < 300) {
            return yield* decodeSuccessResponse<A>(retriedResponse);
          }

          return yield* decodeFailureResponse(retriedResponse);
        }

        return yield* decodeFailureResponse(response);
      }),
      `spotify.request ${path}`,
      {
        attributes: {
          "spotify.request.path": path,
          "spotify.request.has_query": options?.query !== undefined,
        },
      },
    ),
  getJsonWithSchema: <A>(
    path: string,
    schema: DecodableSchema<A>,
    options?: SpotifyRequestOptions,
  ) =>
    Effect.withSpan(
      Effect.gen(function* () {
        const accessToken = yield* accessTokenResolver.getAccessToken();
        const response = yield* sendRequest(accessToken, path, options);
        yield* annotateResponse(response);

        if (response.status >= 200 && response.status < 300) {
          return yield* decodeSuccessResponseWithSchema(response, schema);
        }

        if (response.status === 401) {
          yield* Effect.annotateCurrentSpan({ "spotify.auth.retry_on_unauthorized": true });
          yield* Effect.withSpan(
            accessTokenResolver.invalidateAccessToken(),
            "spotify.auth.invalidate",
          );

          const retriedAccessToken = yield* accessTokenResolver.getAccessToken();
          const retriedResponse = yield* sendRequest(retriedAccessToken, path, options);
          yield* annotateResponse(retriedResponse);

          if (retriedResponse.status >= 200 && retriedResponse.status < 300) {
            return yield* decodeSuccessResponseWithSchema(retriedResponse, schema);
          }

          return yield* decodeFailureResponse(retriedResponse);
        }

        return yield* decodeFailureResponse(response);
      }),
      `spotify.request ${path}`,
      {
        attributes: {
          "spotify.request.path": path,
          "spotify.request.has_query": options?.query !== undefined,
          "spotify.request.uses_schema": true,
        },
      },
    ),
});

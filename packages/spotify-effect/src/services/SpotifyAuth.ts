import * as Effect from "effect/Effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";
import {
  SpotifyConfigurationError,
  makeSpotifyHttpError,
  mapHttpClientError,
  type SpotifyRequestError,
} from "../errors/SpotifyError";
import type { GetTemporaryAppTokensResponse } from "../model/SpotifyAuthorization";

const spotifyTokenUrl = "https://accounts.spotify.com/api/token";

interface SpotifyApiErrorBody {
  readonly error?: string;
  readonly error_description?: string;
}

export interface SpotifyAuth {
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

export const makeSpotifyAuth = (options: {
  readonly clientId: string;
  readonly clientSecret: string;
}): SpotifyAuth => ({
  getTemporaryAppTokens: () =>
    Effect.gen(function* () {
      if (options.clientId.length === 0 || options.clientSecret.length === 0) {
        return yield* Effect.fail(
          new SpotifyConfigurationError({
            message: "clientId and clientSecret are required for client credentials auth",
          }),
        );
      }

      const authorization = yield* Effect.try({
        try: () => `Basic ${encodeClientCredentials(`${options.clientId}:${options.clientSecret}`)}`,
        catch: (cause) =>
          new SpotifyConfigurationError({
            message: cause instanceof Error ? cause.message : "Failed to encode client credentials",
          }),
      });

      const response = yield* HttpClient.post(spotifyTokenUrl, {
        headers: {
          Authorization: authorization,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: HttpClientRequest.bodyUrlParams({
          grant_type: "client_credentials",
        })(HttpClientRequest.empty).body,
      }).pipe(Effect.mapError(mapHttpClientError));

      if (response.status < 200 || response.status >= 300) {
        const text = yield* response.text.pipe(Effect.mapError(mapHttpClientError));
        const body = parseJson(text);
        const apiMessage = getApiMessage(body);

        return yield* Effect.fail(
          makeSpotifyHttpError({
            status: response.status,
            method: response.request.method,
            url: response.request.url,
            ...(body === undefined ? null : { body }),
            ...(apiMessage === undefined ? null : { apiMessage }),
          }),
        );
      }

      return yield* response.json.pipe(
        Effect.mapError(mapHttpClientError),
        Effect.map((body) => body as GetTemporaryAppTokensResponse),
      );
    }),
});

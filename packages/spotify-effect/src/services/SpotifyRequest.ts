import * as Effect from "effect/Effect"
import {
  FetchHttpClient,
  HttpClient,
  HttpClientResponse,
} from "effect/unstable/http"
import { mapHttpClientError, type SpotifyRequestError } from "../errors/SpotifyError"

const spotifyApiBaseUrl = "https://api.spotify.com/v1"

type QueryValue =
  | string
  | number
  | boolean
  | ReadonlyArray<string | number | boolean>
  | undefined

export interface SpotifyRequestOptions {
  readonly query?: Readonly<Record<string, QueryValue>>
}

export interface SpotifyRequest {
  getJson<A>(
    path: string,
    options?: SpotifyRequestOptions,
  ): Effect.Effect<A, SpotifyRequestError>
}

export interface AccessTokenResolver {
  getAccessToken(): string
}

const buildUrl = (path: string): string =>
  new URL(path.startsWith("/") ? path.slice(1) : path, `${spotifyApiBaseUrl}/`).toString()

export const makeSpotifyRequest = (
  accessTokenResolver: AccessTokenResolver,
): SpotifyRequest => ({
  getJson: <A>(path: string, options?: SpotifyRequestOptions) =>
    HttpClient.get(buildUrl(path), {
      acceptJson: true,
      headers: {
        Authorization: `Bearer ${accessTokenResolver.getAccessToken()}`,
      },
      urlParams: options?.query,
    }).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap((response) => response.json),
      Effect.map((body) => body as A),
      Effect.mapError(mapHttpClientError),
      Effect.provide(FetchHttpClient.layer),
    ),
})

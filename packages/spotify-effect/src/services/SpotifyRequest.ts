import * as Effect from "effect/Effect"
import {
  FetchHttpClient,
  HttpClient,
  type HttpClientResponse,
} from "effect/unstable/http"
import {
  makeSpotifyHttpError,
  mapHttpClientError,
  type SpotifyRequestError,
} from "../errors/SpotifyError"

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

interface SpotifyApiErrorBody {
  readonly error?: {
    readonly message?: string
  }
  readonly message?: string
}

const buildUrl = (path: string): string =>
  new URL(path.startsWith("/") ? path.slice(1) : path, `${spotifyApiBaseUrl}/`).toString()

const parseJson = (value: string): unknown => {
  if (value.length === 0) {
    return undefined
  }

  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const getApiMessage = (body: unknown): string | undefined => {
  if (!isRecord(body)) {
    return undefined
  }

  const directMessage = body.message

  if (typeof directMessage === "string") {
    return directMessage
  }

  const nestedError = body.error

  if (!isRecord(nestedError)) {
    return undefined
  }

  return typeof nestedError.message === "string" ? nestedError.message : undefined
}

const decodeSuccessResponse = <A>(
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<A, SpotifyRequestError> =>
  Effect.gen(function*() {
    const body = yield* response.json.pipe(Effect.mapError(mapHttpClientError))

    return body as A
  })

const decodeFailureResponse = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<never, SpotifyRequestError> =>
  Effect.gen(function*() {
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
  })

export const makeSpotifyRequest = (
  accessTokenResolver: AccessTokenResolver,
): SpotifyRequest => ({
  getJson: <A>(path: string, options?: SpotifyRequestOptions) =>
    Effect.gen(function*() {
      const response = yield* HttpClient.get(buildUrl(path), {
        acceptJson: true,
        headers: {
          Authorization: `Bearer ${accessTokenResolver.getAccessToken()}`,
        },
        urlParams: options?.query,
      }).pipe(Effect.mapError(mapHttpClientError))

      if (response.status >= 200 && response.status < 300) {
        return yield* decodeSuccessResponse<A>(response)
      }

      return yield* decodeFailureResponse(response)
    }).pipe(Effect.provide(FetchHttpClient.layer)),
})

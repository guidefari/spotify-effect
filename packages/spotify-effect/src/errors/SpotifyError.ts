import * as Data from "effect/Data"
import * as HttpClientError from "effect/unstable/http/HttpClientError"

export class SpotifyTransportError extends Data.TaggedError("SpotifyTransportError")<{
  readonly cause: unknown
  readonly method: string
  readonly url: string
  readonly description?: string
}> {}

export class SpotifyHttpError extends Data.TaggedError("SpotifyHttpError")<{
  readonly status: number
  readonly method: string
  readonly url: string
  readonly description?: string
}> {}

export class SpotifyParseError extends Data.TaggedError("SpotifyParseError")<{
  readonly cause: unknown
  readonly method: string
  readonly url: string
  readonly description?: string
}> {}

export type SpotifyRequestError =
  | SpotifyTransportError
  | SpotifyHttpError
  | SpotifyParseError

export const mapHttpClientError = (
  error: HttpClientError.HttpClientError,
): SpotifyRequestError => {
  const reason = error.reason

  switch (reason._tag) {
    case "StatusCodeError":
      return new SpotifyHttpError({
        status: reason.response.status,
        method: reason.request.method,
        url: reason.request.url,
        ...(reason.description === undefined
          ? null
          : { description: reason.description }),
      })
    case "DecodeError":
    case "EmptyBodyError":
      return new SpotifyParseError({
        cause: reason.cause,
        method: reason.request.method,
        url: reason.request.url,
        ...(reason.description === undefined
          ? null
          : { description: reason.description }),
      })
    default:
      return new SpotifyTransportError({
        cause: reason.cause,
        method: reason.request.method,
        url: reason.request.url,
        ...(reason.description === undefined
          ? null
          : { description: reason.description }),
      })
  }
}

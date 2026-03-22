import * as Clock from "effect/Clock"
import * as Effect from "effect/Effect"
import * as SynchronizedRef from "effect/SynchronizedRef"
import type { HttpClient } from "effect/unstable/http"
import { SpotifyConfigurationError, type SpotifyRequestError } from "../errors/SpotifyError"
import type {
  GetRefreshableUserTokensResponse,
  GetRefreshedAccessTokenResponse,
  GetTemporaryAppTokensResponse,
} from "../model/SpotifyAuthorization"
import type { SpotifyAuth } from "./SpotifyAuth"

export interface SpotifySessionOptions {
  readonly accessToken?: string
  readonly accessTokenExpiresAt?: number
  readonly refreshToken?: string
}

interface SpotifySessionState {
  readonly accessToken: string
  readonly accessTokenExpiresAt?: number
  readonly refreshToken?: string
  readonly temporaryAppTokens?: GetTemporaryAppTokensResponse
  readonly temporaryAppTokenExpiresAt?: number
}

export interface SpotifySession {
  readonly getAccessToken: (options: {
    readonly auth: SpotifyAuth
    readonly canUseClientCredentials: boolean
  }) => Effect.Effect<string, SpotifyRequestError, HttpClient.HttpClient>
  readonly getTemporaryAppTokens: (auth: SpotifyAuth) => Effect.Effect<
    GetTemporaryAppTokensResponse,
    SpotifyRequestError,
    HttpClient.HttpClient
  >
  readonly setAccessToken: (accessToken: string) => Effect.Effect<void>
  readonly invalidateAccessToken: () => Effect.Effect<void>
  readonly setRefreshableUserTokens: (
    tokens: GetRefreshableUserTokensResponse,
  ) => Effect.Effect<void>
  readonly updateRefreshedAccessToken: (
    refreshToken: string,
    tokens: GetRefreshedAccessTokenResponse,
  ) => Effect.Effect<void>
  readonly getStoredAccessToken: () => string
  readonly getStoredAccessTokenExpiresAt: () => number | undefined
  readonly getStoredRefreshToken: () => string | undefined
}

const initialState = (options: SpotifySessionOptions): SpotifySessionState => ({
  accessToken: options.accessToken ?? "",
  ...(options.accessTokenExpiresAt === undefined
    ? null
    : { accessTokenExpiresAt: options.accessTokenExpiresAt }),
  ...(options.refreshToken === undefined ? null : { refreshToken: options.refreshToken }),
})

const hasUnexpiredToken = (now: number, expiresAt: number | undefined, token: string): boolean =>
  token.length > 0 && (expiresAt === undefined || now < expiresAt)

const expiresAtFromNow = (now: number, expiresInSeconds: number): number => now + expiresInSeconds * 1000

const getCurrentTimeMillis = (): Effect.Effect<number> =>
  Clock.clockWith((clock) => Effect.sync(() => clock.currentTimeMillisUnsafe()))

export const makeSpotifySession = (options: SpotifySessionOptions = {}): SpotifySession => {
  const stateRef = SynchronizedRef.makeUnsafe(initialState(options))

  const setAccessTokenState = (accessToken: string): Effect.Effect<void> =>
    SynchronizedRef.modify(stateRef, (state) => [
      undefined,
      {
        ...state,
        accessToken,
        ...(state.refreshToken === undefined ? null : { refreshToken: state.refreshToken }),
        ...(state.temporaryAppTokens === undefined
          ? null
          : { temporaryAppTokens: state.temporaryAppTokens }),
        ...(state.temporaryAppTokenExpiresAt === undefined
          ? null
          : { temporaryAppTokenExpiresAt: state.temporaryAppTokenExpiresAt }),
      },
    ])

  const invalidateAccessToken = (): Effect.Effect<void> =>
    SynchronizedRef.modify(stateRef, (state) => [
      undefined,
      {
        ...(state.refreshToken === undefined ? null : { refreshToken: state.refreshToken }),
        ...(state.temporaryAppTokens === undefined
          ? null
          : { temporaryAppTokens: state.temporaryAppTokens }),
        ...(state.temporaryAppTokenExpiresAt === undefined
          ? null
          : { temporaryAppTokenExpiresAt: state.temporaryAppTokenExpiresAt }),
        accessToken: "",
      },
    ])

  return {
    getAccessToken: ({ auth, canUseClientCredentials }) =>
      SynchronizedRef.modifyEffect(stateRef, (state) =>
        Effect.gen(function* () {
          const now = yield* getCurrentTimeMillis()

          if (hasUnexpiredToken(now, state.accessTokenExpiresAt, state.accessToken)) {
            return [state.accessToken, state] as const
          }

          if (state.refreshToken !== undefined && state.refreshToken.length > 0) {
            const refreshed = yield* auth.getRefreshedAccessToken(state.refreshToken)
            const nextState: SpotifySessionState = {
              ...state,
              accessToken: refreshed.access_token,
              accessTokenExpiresAt: expiresAtFromNow(now, refreshed.expires_in),
            }

            return [refreshed.access_token, nextState] as const
          }

          if (canUseClientCredentials) {
            if (
              state.temporaryAppTokens !== undefined &&
              state.temporaryAppTokenExpiresAt !== undefined &&
              now < state.temporaryAppTokenExpiresAt
            ) {
              return [state.temporaryAppTokens.access_token, state] as const
            }

            const tokens = yield* auth.getTemporaryAppTokens()
            const nextState: SpotifySessionState = {
              ...state,
              temporaryAppTokens: tokens,
              temporaryAppTokenExpiresAt: expiresAtFromNow(now, tokens.expires_in),
            }

            return [tokens.access_token, nextState] as const
          }

          return yield* new SpotifyConfigurationError({
            message: "Provide an access token or configure clientId and clientSecret",
          })
        }),
      ),
    getTemporaryAppTokens: (auth) =>
      SynchronizedRef.modifyEffect(stateRef, (state) =>
        Effect.gen(function* () {
          const now = yield* getCurrentTimeMillis()

          if (
            state.temporaryAppTokens !== undefined &&
            state.temporaryAppTokenExpiresAt !== undefined &&
            now < state.temporaryAppTokenExpiresAt
          ) {
            return [state.temporaryAppTokens, state] as const
          }

          const tokens = yield* auth.getTemporaryAppTokens()
          const nextState: SpotifySessionState = {
            ...state,
            temporaryAppTokens: tokens,
            temporaryAppTokenExpiresAt: expiresAtFromNow(now, tokens.expires_in),
          }

          return [tokens, nextState] as const
        }),
      ),
    setAccessToken: setAccessTokenState,
    invalidateAccessToken,
    setRefreshableUserTokens: (tokens) =>
      Effect.gen(function* () {
        const now = yield* getCurrentTimeMillis()

        yield* SynchronizedRef.set(stateRef, {
          ...SynchronizedRef.getUnsafe(stateRef),
          accessToken: tokens.access_token,
          accessTokenExpiresAt: expiresAtFromNow(now, tokens.expires_in),
          refreshToken: tokens.refresh_token,
        })
      }),
    updateRefreshedAccessToken: (refreshToken, tokens) =>
      Effect.gen(function* () {
        const now = yield* getCurrentTimeMillis()

        yield* SynchronizedRef.set(stateRef, {
          ...SynchronizedRef.getUnsafe(stateRef),
          accessToken: tokens.access_token,
          accessTokenExpiresAt: expiresAtFromNow(now, tokens.expires_in),
          refreshToken,
        })
      }),
    getStoredAccessToken: () => SynchronizedRef.getUnsafe(stateRef).accessToken,
    getStoredAccessTokenExpiresAt: () => SynchronizedRef.getUnsafe(stateRef).accessTokenExpiresAt,
    getStoredRefreshToken: () => SynchronizedRef.getUnsafe(stateRef).refreshToken,
  }
}

import * as Effect from "effect/Effect";
import { makeSpotifyLayer, type SpotifyApiOptions, type SpotifyCredentials } from "spotify-effect";

export const makeAccessTokenLayer = (accessToken: string) =>
  makeSpotifyLayer({}, { accessToken });

export const makeConfiguredSpotifyLayer = (
  options: SpotifyApiOptions,
  credentials: SpotifyCredentials = {},
) => makeSpotifyLayer(options, credentials);

export const provideSpotify = <A, E>(
  effect: Effect.Effect<A, E>,
  options: SpotifyApiOptions,
  credentials: SpotifyCredentials = {},
): Effect.Effect<A, E> => Effect.provide(effect, makeConfiguredSpotifyLayer(options, credentials));

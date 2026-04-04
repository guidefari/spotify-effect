# Upstream Parity Tracking

Tracks which `spotify-web-api-ts` tests have been ported to `@spotify-effect/core` and verified for behavioral parity.

## TracksApi

| Upstream Test               | Ported | Our Test       | Notes                                         |
| --------------------------- | ------ | -------------- | --------------------------------------------- |
| getAudioAnalysisForTrack    | No     | —              | Needs endpoint implementation (#17)           |
| getAudioFeaturesForTrack    | No     | —              | Needs endpoint implementation (#17)           |
| getAudioFeaturesForTracks   | No     | —              | Needs endpoint implementation (#17)           |
| getTrack (without options)  | Yes    | Tracks.test.ts | URL, auth header, response shape verified     |
| getTrack (with options)     | Yes    | Tracks.test.ts | market query param verified                   |
| getTracks (without options) | Yes    | Tracks.test.ts | ids query param, response unwrapping verified |
| getTracks (with options)    | Yes    | Tracks.test.ts | ids + market query params verified            |

## UsersApi

| Upstream Test | Ported | Our Test      | Notes                                                |
| ------------- | ------ | ------------- | ---------------------------------------------------- |
| getMe         | Yes    | Users.test.ts | URL, auth header, response shape verified            |
| getUser       | Yes    | Users.test.ts | URL path param, auth header, response shape verified |

## SpotifyWebApi (main facade)

| Upstream Test                             | Ported | Our Test                                    | Notes                                                                       |
| ----------------------------------------- | ------ | ------------------------------------------- | --------------------------------------------------------------------------- |
| construct with options                    | Yes    | SpotifyWebApi.test.ts                       | clientId, clientSecret, redirectUri, accessToken                            |
| get/set access token                      | Yes    | SpotifyWebApi.test.ts                       |                                                                             |
| getAuthorizationCodeUrl (without options) | Yes    | SpotifyWebApi.test.ts                       |                                                                             |
| getAuthorizationCodeUrl (with options)    | Yes    | SpotifyWebApi.test.ts                       | state param ordering differs (ours appends, upstream prepends) — both valid |
| getAuthorizationCodePKCEUrl               | Yes    | SpotifyWebApi.test.ts                       |                                                                             |
| getTemporaryAuthorizationUrl              | Yes    | SpotifyWebApi.test.ts                       |                                                                             |
| getTokenWithAuthenticateCode              | Yes    | SpotifyWebApi.test.ts                       | request body verified                                                       |
| getTokenWithAuthenticateCodePKCE          | Yes    | SpotifyWebApi.test.ts                       | request body, no Basic auth header verified                                 |
| getRefreshedAccessToken                   | Yes    | SpotifyAuth.test.ts                         | request body verified                                                       |
| getTemporaryAppTokens                     | Yes    | SpotifyWebApi.test.ts + SpotifyAuth.test.ts | Basic auth header, body verified                                            |

## Summary

- **Ported**: 14/17 upstream test cases
- **Not ported (blocked on #17)**: 3 (audio analysis + audio features endpoints)
- **Additional tests** beyond upstream: retry/rate-limit handling, token refresh flows, client credentials caching, error mapping, PKCE flow

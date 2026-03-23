import * as Effect4 from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Data from 'effect/Data';
import { FetchHttpClient, HttpClient, HttpClientRequest } from 'effect/unstable/http';
import * as Clock from 'effect/Clock';
import * as SynchronizedRef from 'effect/SynchronizedRef';

var ExternalURLSchema = Schema.Record(Schema.String, Schema.String);
var FollowersSchema = Schema.Struct({
  href: Schema.NullOr(Schema.String),
  total: Schema.Number
});
var ExplicitContentSchema = Schema.Struct({
  filter_enabled: Schema.Boolean,
  filter_locked: Schema.Boolean
});
var SpotifyImageSchema = Schema.Struct({
  height: Schema.NullOr(Schema.Number),
  url: Schema.String,
  width: Schema.NullOr(Schema.Number)
});
var SimplifiedArtistSchema = Schema.Struct({
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  name: Schema.String,
  type: Schema.Literal("artist"),
  uri: Schema.String
});
var SimplifiedAlbumSchema = Schema.Struct({
  album_group: Schema.optionalKey(
    Schema.Union([
      Schema.Literal("album"),
      Schema.Literal("single"),
      Schema.Literal("compilation"),
      Schema.Literal("appears_on")
    ])
  ),
  album_type: Schema.Union([
    Schema.Literal("album"),
    Schema.Literal("ALBUM"),
    Schema.Literal("single"),
    Schema.Literal("SINGLE"),
    Schema.Literal("compilation"),
    Schema.Literal("COMPILATION")
  ]),
  artists: Schema.mutable(Schema.Array(SimplifiedArtistSchema)),
  available_markets: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.String))),
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  name: Schema.String,
  release_date: Schema.String,
  release_date_precision: Schema.Union([
    Schema.Literal("year"),
    Schema.Literal("month"),
    Schema.Literal("day")
  ]),
  total_tracks: Schema.Number,
  type: Schema.Literal("album"),
  uri: Schema.String
});
var TrackSchema = Schema.Struct({
  album: SimplifiedAlbumSchema,
  artists: Schema.mutable(Schema.Array(SimplifiedArtistSchema)),
  available_markets: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.String))),
  disc_number: Schema.Number,
  duration_ms: Schema.Number,
  episode: Schema.optionalKey(Schema.Boolean),
  explicit: Schema.Boolean,
  external_ids: Schema.Record(Schema.String, Schema.String),
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  is_playable: Schema.optionalKey(Schema.Boolean),
  name: Schema.String,
  popularity: Schema.Number,
  preview_url: Schema.NullOr(Schema.String),
  track: Schema.optionalKey(Schema.Boolean),
  track_number: Schema.Number,
  type: Schema.Literal("track"),
  uri: Schema.String,
  is_local: Schema.Boolean
});
var PrivateUserSchema = Schema.Struct({
  birthdate: Schema.optionalKey(Schema.String),
  country: Schema.optionalKey(Schema.String),
  display_name: Schema.NullOr(Schema.String),
  email: Schema.optionalKey(Schema.String),
  explicit_content: Schema.optionalKey(ExplicitContentSchema),
  external_urls: ExternalURLSchema,
  followers: FollowersSchema,
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  product: Schema.optionalKey(Schema.String),
  type: Schema.Literal("user"),
  uri: Schema.String
});
var GetTracksResponseSchema = Schema.Struct({
  tracks: Schema.mutable(Schema.Array(TrackSchema))
});
var withMarketQuery = (options) => options?.market === void 0 ? void 0 : { query: { market: options.market } };
var withTrackIdsQuery = (trackIds, options) => ({
  query: {
    ids: trackIds.join(","),
    ...options?.market === void 0 ? null : { market: options.market }
  }
});
var TracksApi = class {
  constructor(request) {
    this.request = request;
  }
  getTrack(trackId, options) {
    return this.request.getJsonWithSchema(
      `/tracks/${trackId}`,
      TrackSchema,
      withMarketQuery(options)
    );
  }
  getTracks(trackIds, options) {
    return this.request.getJsonWithSchema("/tracks", GetTracksResponseSchema, withTrackIdsQuery(trackIds, options)).pipe(Effect4.map((response) => response.tracks));
  }
};
var UsersApi = class {
  constructor(request) {
    this.request = request;
  }
  getCurrentUserProfile() {
    return this.request.getJsonWithSchema("/me", PrivateUserSchema);
  }
};
var SpotifyTransportError = class extends Data.TaggedError("SpotifyTransportError") {
};
var SpotifyHttpError = class extends Data.TaggedError("SpotifyHttpError") {
};
var SpotifyParseError = class extends Data.TaggedError("SpotifyParseError") {
};
var SpotifyConfigurationError = class extends Data.TaggedError("SpotifyConfigurationError") {
};
var makeSpotifyHttpError = (details) => new SpotifyHttpError({
  status: details.status,
  method: details.method,
  url: details.url,
  ...details.apiMessage === void 0 ? null : { apiMessage: details.apiMessage },
  ...details.body === void 0 ? null : { body: details.body },
  ...details.description === void 0 ? null : { description: details.description }
});
var mapHttpClientError = (error) => {
  const reason = error.reason;
  switch (reason._tag) {
    case "StatusCodeError":
      return makeSpotifyHttpError({
        status: reason.response.status,
        method: reason.request.method,
        url: reason.request.url,
        ...reason.description === void 0 ? null : { description: reason.description }
      });
    case "DecodeError":
    case "EmptyBodyError":
      return new SpotifyParseError({
        cause: reason.cause,
        method: reason.request.method,
        url: reason.request.url,
        ...reason.description === void 0 ? null : { description: reason.description }
      });
    default:
      return new SpotifyTransportError({
        cause: reason.cause,
        method: reason.request.method,
        url: reason.request.url,
        ...reason.description === void 0 ? null : { description: reason.description }
      });
  }
};
var BASE_ACCOUNTS_URL = "https://accounts.spotify.com";
var AUTHORIZE_URL = `${BASE_ACCOUNTS_URL}/authorize`;
var TOKEN_URL = `${BASE_ACCOUNTS_URL}/api/token`;
var defaultStorageKeys = {
  pkceVerifier: "spotify-effect:pkce-verifier",
  clientId: "spotify-effect:client-id",
  redirectUri: "spotify-effect:redirect-uri",
  authState: "spotify-effect:auth-state",
  tokens: "spotify-effect:tokens"
};
var readStoredValue = (sessionStorage, localStorage, key) => sessionStorage.getItem(key) ?? localStorage.getItem(key) ?? "";
var storeValue = (sessionStorage, localStorage, key, value) => {
  sessionStorage.setItem(key, value);
  localStorage.setItem(key, value);
};
var toBase64Url = (value) => {
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
var createPkceCodeVerifier = () => Effect4.sync(() => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
});
var createPkceCodeChallenge = (verifier) => Effect4.promise(async () => {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toBase64Url(new Uint8Array(digest));
});
var makeSpotifyBrowserSession = (options) => ({
  getPkceState: () => {
    const verifier = readStoredValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.pkceVerifier
    );
    const clientId = readStoredValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.clientId
    );
    const redirectUri = readStoredValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.redirectUri
    );
    const state = readStoredValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.authState
    );
    if (verifier.length === 0 || clientId.length === 0 || redirectUri.length === 0) {
      return void 0;
    }
    return {
      verifier,
      clientId,
      redirectUri,
      ...state.length === 0 ? null : { state }
    };
  },
  setPkceState: (state) => {
    storeValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.pkceVerifier,
      state.verifier
    );
    storeValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.clientId,
      state.clientId
    );
    storeValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.redirectUri,
      state.redirectUri
    );
    storeValue(
      options.sessionStorage,
      options.localStorage,
      defaultStorageKeys.authState,
      state.state ?? ""
    );
  },
  getTokens: () => {
    const raw = options.localStorage.getItem(defaultStorageKeys.tokens);
    if (raw === null) {
      return void 0;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return void 0;
    }
  },
  setTokens: (tokens) => {
    options.localStorage.setItem(defaultStorageKeys.tokens, JSON.stringify(tokens));
  },
  clearCallbackParams: (url) => {
    options.history.replaceState({}, "", `${url.origin}${url.pathname}`);
  }
});
var SpotifyApiErrorBodySchema = Schema.Struct({
  error: Schema.Struct({
    status: Schema.Number,
    message: Schema.String
  })
});
var SpotifyAccountsErrorBodySchema = Schema.Struct({
  error: Schema.String,
  error_description: Schema.optionalKey(Schema.String)
});
var decodeSpotifyApiErrorBody = (body) => {
  try {
    const decoded = Schema.decodeUnknownSync(SpotifyApiErrorBodySchema)(body);
    return {
      message: decoded.error.message,
      body: decoded
    };
  } catch {
    return {
      ...body === void 0 ? null : { body }
    };
  }
};
var decodeSpotifyAccountsErrorBody = (body) => {
  try {
    const decoded = Schema.decodeUnknownSync(SpotifyAccountsErrorBodySchema)(body);
    return {
      message: decoded.error_description ?? decoded.error,
      body: decoded
    };
  } catch {
    return {
      ...body === void 0 ? null : { body }
    };
  }
};
var GetRefreshableUserTokensResponseSchema = Schema.Struct({
  access_token: Schema.String,
  token_type: Schema.Literal("Bearer"),
  scope: Schema.optionalKey(Schema.String),
  expires_in: Schema.Number,
  refresh_token: Schema.String
});
var GetRefreshedAccessTokenResponseSchema = Schema.Struct({
  access_token: Schema.String,
  token_type: Schema.Literal("Bearer"),
  expires_in: Schema.Number,
  scope: Schema.optionalKey(Schema.String)
});
var GetTemporaryAppTokensResponseSchema = Schema.Struct({
  access_token: Schema.String,
  token_type: Schema.Literal("Bearer"),
  expires_in: Schema.Number,
  scope: Schema.optionalKey(Schema.String)
});
var encodeClientCredentials = (value) => {
  const btoaFn = Reflect.get(globalThis, "btoa");
  if (typeof btoaFn === "function") {
    return btoaFn(value);
  }
  const bufferCtor = Reflect.get(globalThis, "Buffer");
  if (typeof bufferCtor === "function" && "from" in bufferCtor && typeof bufferCtor.from === "function") {
    return bufferCtor.from(value).toString("base64");
  }
  throw new Error("Base64 encoding is not available in this runtime");
};
var parseJson = (value) => {
  if (value.length === 0) {
    return void 0;
  }
  try {
    return JSON.parse(value);
  } catch {
    return void 0;
  }
};
var getRequiredConfig = (options) => Effect4.gen(function* () {
  if (options.clientId.length === 0 || options.clientSecret.length === 0) {
    return yield* new SpotifyConfigurationError({
      message: "clientId and clientSecret are required for this auth flow"
    });
  }
  const authorization = yield* Effect4.try({
    try: () => `Basic ${encodeClientCredentials(`${options.clientId}:${options.clientSecret}`)}`,
    catch: (cause) => new SpotifyConfigurationError({
      message: cause instanceof Error ? cause.message : "Failed to encode client credentials"
    })
  });
  return {
    authorization
  };
});
var getRefreshConfig = (options) => Effect4.gen(function* () {
  if (options.clientSecret.length > 0) {
    const config = yield* getRequiredConfig(options);
    return {
      authorization: config.authorization,
      body: {}
    };
  }
  if (options.clientId.length === 0) {
    return yield* new SpotifyConfigurationError({
      message: "clientId is required for refresh token exchange"
    });
  }
  return {
    authorization: void 0,
    body: {
      client_id: options.clientId
    }
  };
});
var requestToken = (options) => Effect4.withSpan(
  Effect4.gen(function* () {
    yield* Effect4.annotateCurrentSpan({
      "spotify.auth.grant_type": options.body.grant_type,
      "spotify.auth.uses_client_secret": options.authorization !== void 0
    });
    const response = yield* HttpClient.post(TOKEN_URL, {
      headers: {
        ...options.authorization === void 0 ? null : { Authorization: options.authorization },
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: HttpClientRequest.bodyUrlParams(options.body)(HttpClientRequest.empty).body
    }).pipe(Effect4.mapError(mapHttpClientError));
    yield* Effect4.annotateCurrentSpan({
      "spotify.http.status_code": response.status,
      "spotify.http.url": response.request.url
    });
    if (response.status < 200 || response.status >= 300) {
      const text = yield* response.text.pipe(Effect4.mapError(mapHttpClientError));
      const body = parseJson(text);
      const decodedError = decodeSpotifyAccountsErrorBody(body);
      return yield* makeSpotifyHttpError({
        status: response.status,
        method: response.request.method,
        url: response.request.url,
        ...decodedError.body === void 0 ? null : { body: decodedError.body },
        ...decodedError.message === void 0 ? null : { apiMessage: decodedError.message }
      });
    }
    return yield* response.json.pipe(
      Effect4.mapError(mapHttpClientError),
      Effect4.flatMap(
        (body) => Effect4.try({
          try: () => Schema.decodeUnknownSync(options.schema)(body),
          catch: (cause) => new SpotifyConfigurationError({
            message: cause instanceof Error ? cause.message : "Failed to decode token response"
          })
        })
      )
    );
  }),
  "spotify.auth.token"
);
var makeSpotifyAuth = (options) => ({
  getRefreshableUserTokens: (code) => Effect4.gen(function* () {
    if (options.redirectUri === void 0 || options.redirectUri.length === 0) {
      return yield* new SpotifyConfigurationError({
        message: "redirectUri is required for authorization code exchange"
      });
    }
    const config = yield* getRequiredConfig(options);
    return yield* requestToken({
      authorization: config.authorization,
      schema: GetRefreshableUserTokensResponseSchema,
      body: {
        code,
        grant_type: "authorization_code",
        redirect_uri: options.redirectUri
      }
    });
  }),
  getRefreshableUserTokensWithPkce: ({ clientId, code, codeVerifier }) => Effect4.gen(function* () {
    if (options.redirectUri === void 0 || options.redirectUri.length === 0) {
      return yield* new SpotifyConfigurationError({
        message: "redirectUri is required for PKCE authorization code exchange"
      });
    }
    return yield* requestToken({
      schema: GetRefreshableUserTokensResponseSchema,
      body: {
        client_id: clientId,
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: options.redirectUri
      }
    });
  }),
  getRefreshedAccessToken: (refreshToken) => Effect4.gen(function* () {
    const config = yield* getRefreshConfig(options);
    return yield* requestToken({
      schema: GetRefreshedAccessTokenResponseSchema,
      body: {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        ...config.body
      },
      ...config.authorization === void 0 ? null : { authorization: config.authorization }
    });
  }),
  getTemporaryAppTokens: () => Effect4.gen(function* () {
    const config = yield* getRequiredConfig(options);
    return yield* requestToken({
      authorization: config.authorization,
      schema: GetTemporaryAppTokensResponseSchema,
      body: {
        grant_type: "client_credentials"
      }
    });
  })
});
var spotifyApiBaseUrl = "https://api.spotify.com/v1";
var buildUrl = (path) => new URL(path.startsWith("/") ? path.slice(1) : path, `${spotifyApiBaseUrl}/`).toString();
var parseJson2 = (value) => {
  if (value.length === 0) {
    return void 0;
  }
  try {
    return JSON.parse(value);
  } catch {
    return void 0;
  }
};
var decodeSuccessResponse = (response) => Effect4.gen(function* () {
  const body = yield* response.json.pipe(Effect4.mapError(mapHttpClientError));
  return body;
});
var decodeSuccessResponseWithSchema = (response, schema) => Effect4.gen(function* () {
  const body = yield* response.json.pipe(Effect4.mapError(mapHttpClientError));
  return yield* Effect4.try({
    try: () => Schema.decodeUnknownSync(schema)(body),
    catch: (cause) => new SpotifyParseError({
      cause,
      method: response.request.method,
      url: response.request.url,
      description: "Failed to decode Spotify API response"
    })
  });
});
var decodeFailureResponse = (response) => Effect4.gen(function* () {
  const text = yield* response.text.pipe(Effect4.mapError(mapHttpClientError));
  const body = parseJson2(text);
  const decodedError = decodeSpotifyApiErrorBody(body);
  return yield* makeSpotifyHttpError({
    status: response.status,
    method: response.request.method,
    url: response.request.url,
    ...decodedError.body === void 0 ? null : { body: decodedError.body },
    ...decodedError.message === void 0 ? null : { apiMessage: decodedError.message }
  });
});
var sendRequest = (accessToken, path, options) => HttpClient.get(buildUrl(path), {
  acceptJson: true,
  headers: {
    Authorization: `Bearer ${accessToken}`
  },
  urlParams: options?.query
}).pipe(Effect4.mapError(mapHttpClientError));
var annotateResponse = (response) => Effect4.annotateCurrentSpan({
  "spotify.http.status_code": response.status,
  "spotify.http.method": response.request.method,
  "spotify.http.url": response.request.url,
  ...response.status === 429 && response.headers["retry-after"] !== void 0 ? { "spotify.http.retry_after": response.headers["retry-after"] } : null
});
var makeSpotifyRequest = (accessTokenResolver) => ({
  getJson: (path, options) => Effect4.withSpan(
    Effect4.gen(function* () {
      const accessToken = yield* accessTokenResolver.getAccessToken();
      const response = yield* sendRequest(accessToken, path, options);
      yield* annotateResponse(response);
      if (response.status >= 200 && response.status < 300) {
        return yield* decodeSuccessResponse(response);
      }
      if (response.status === 401) {
        yield* Effect4.annotateCurrentSpan({ "spotify.auth.retry_on_unauthorized": true });
        yield* Effect4.withSpan(
          accessTokenResolver.invalidateAccessToken(),
          "spotify.auth.invalidate"
        );
        const retriedAccessToken = yield* accessTokenResolver.getAccessToken();
        const retriedResponse = yield* sendRequest(retriedAccessToken, path, options);
        yield* annotateResponse(retriedResponse);
        if (retriedResponse.status >= 200 && retriedResponse.status < 300) {
          return yield* decodeSuccessResponse(retriedResponse);
        }
        return yield* decodeFailureResponse(retriedResponse);
      }
      return yield* decodeFailureResponse(response);
    }),
    `spotify.request ${path}`,
    {
      attributes: {
        "spotify.request.path": path,
        "spotify.request.has_query": options?.query !== void 0
      }
    }
  ),
  getJsonWithSchema: (path, schema, options) => Effect4.withSpan(
    Effect4.gen(function* () {
      const accessToken = yield* accessTokenResolver.getAccessToken();
      const response = yield* sendRequest(accessToken, path, options);
      yield* annotateResponse(response);
      if (response.status >= 200 && response.status < 300) {
        return yield* decodeSuccessResponseWithSchema(response, schema);
      }
      if (response.status === 401) {
        yield* Effect4.annotateCurrentSpan({ "spotify.auth.retry_on_unauthorized": true });
        yield* Effect4.withSpan(
          accessTokenResolver.invalidateAccessToken(),
          "spotify.auth.invalidate"
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
        "spotify.request.has_query": options?.query !== void 0,
        "spotify.request.uses_schema": true
      }
    }
  )
});
var initialState = (options) => ({
  accessToken: options.accessToken ?? "",
  ...options.accessTokenExpiresAt === void 0 ? null : { accessTokenExpiresAt: options.accessTokenExpiresAt },
  ...options.refreshToken === void 0 ? null : { refreshToken: options.refreshToken }
});
var hasUnexpiredToken = (now, expiresAt, token) => token.length > 0 && (expiresAt === void 0 || now < expiresAt);
var expiresAtFromNow = (now, expiresInSeconds) => now + expiresInSeconds * 1e3;
var getCurrentTimeMillis = () => Clock.clockWith((clock) => Effect4.sync(() => clock.currentTimeMillisUnsafe()));
var makeSpotifySession = (options = {}) => {
  const stateRef = SynchronizedRef.makeUnsafe(initialState(options));
  const setAccessTokenState = (accessToken) => SynchronizedRef.modify(stateRef, (state) => [
    void 0,
    {
      ...state,
      accessToken,
      ...state.refreshToken === void 0 ? null : { refreshToken: state.refreshToken },
      ...state.temporaryAppTokens === void 0 ? null : { temporaryAppTokens: state.temporaryAppTokens },
      ...state.temporaryAppTokenExpiresAt === void 0 ? null : { temporaryAppTokenExpiresAt: state.temporaryAppTokenExpiresAt }
    }
  ]);
  const invalidateAccessToken = () => SynchronizedRef.modify(stateRef, (state) => [
    void 0,
    {
      ...state.refreshToken === void 0 ? null : { refreshToken: state.refreshToken },
      ...state.temporaryAppTokens === void 0 ? null : { temporaryAppTokens: state.temporaryAppTokens },
      ...state.temporaryAppTokenExpiresAt === void 0 ? null : { temporaryAppTokenExpiresAt: state.temporaryAppTokenExpiresAt },
      accessToken: ""
    }
  ]);
  return {
    getAccessToken: ({ auth, canUseClientCredentials }) => SynchronizedRef.modifyEffect(
      stateRef,
      (state) => Effect4.gen(function* () {
        const now = yield* getCurrentTimeMillis();
        if (hasUnexpiredToken(now, state.accessTokenExpiresAt, state.accessToken)) {
          return [state.accessToken, state];
        }
        if (state.refreshToken !== void 0 && state.refreshToken.length > 0) {
          const refreshed = yield* auth.getRefreshedAccessToken(state.refreshToken);
          const nextState = {
            ...state,
            accessToken: refreshed.access_token,
            accessTokenExpiresAt: expiresAtFromNow(now, refreshed.expires_in)
          };
          return [refreshed.access_token, nextState];
        }
        if (canUseClientCredentials) {
          if (state.temporaryAppTokens !== void 0 && state.temporaryAppTokenExpiresAt !== void 0 && now < state.temporaryAppTokenExpiresAt) {
            return [state.temporaryAppTokens.access_token, state];
          }
          const tokens = yield* auth.getTemporaryAppTokens();
          const nextState = {
            ...state,
            temporaryAppTokens: tokens,
            temporaryAppTokenExpiresAt: expiresAtFromNow(now, tokens.expires_in)
          };
          return [tokens.access_token, nextState];
        }
        return yield* new SpotifyConfigurationError({
          message: "Provide an access token or configure clientId and clientSecret"
        });
      })
    ),
    getTemporaryAppTokens: (auth) => SynchronizedRef.modifyEffect(
      stateRef,
      (state) => Effect4.gen(function* () {
        const now = yield* getCurrentTimeMillis();
        if (state.temporaryAppTokens !== void 0 && state.temporaryAppTokenExpiresAt !== void 0 && now < state.temporaryAppTokenExpiresAt) {
          return [state.temporaryAppTokens, state];
        }
        const tokens = yield* auth.getTemporaryAppTokens();
        const nextState = {
          ...state,
          temporaryAppTokens: tokens,
          temporaryAppTokenExpiresAt: expiresAtFromNow(now, tokens.expires_in)
        };
        return [tokens, nextState];
      })
    ),
    setAccessToken: setAccessTokenState,
    invalidateAccessToken,
    setRefreshableUserTokens: (tokens) => Effect4.gen(function* () {
      const now = yield* getCurrentTimeMillis();
      yield* SynchronizedRef.set(stateRef, {
        ...SynchronizedRef.getUnsafe(stateRef),
        accessToken: tokens.access_token,
        accessTokenExpiresAt: expiresAtFromNow(now, tokens.expires_in),
        refreshToken: tokens.refresh_token
      });
    }),
    updateRefreshedAccessToken: (refreshToken, tokens) => Effect4.gen(function* () {
      const now = yield* getCurrentTimeMillis();
      yield* SynchronizedRef.set(stateRef, {
        ...SynchronizedRef.getUnsafe(stateRef),
        accessToken: tokens.access_token,
        accessTokenExpiresAt: expiresAtFromNow(now, tokens.expires_in),
        refreshToken
      });
    }),
    getStoredAccessToken: () => SynchronizedRef.getUnsafe(stateRef).accessToken,
    getStoredAccessTokenExpiresAt: () => SynchronizedRef.getUnsafe(stateRef).accessTokenExpiresAt,
    getStoredRefreshToken: () => SynchronizedRef.getUnsafe(stateRef).refreshToken
  };
};
var hasPkceOptions = (options) => options !== void 0 && "code_challenge" in options;
var getAuthorizationUrl = (clientId, redirectUri, responseType, options) => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType
  });
  if (options?.state !== void 0) {
    params.set("state", options.state);
  }
  if (options?.show_dialog !== void 0) {
    params.set("show_dialog", String(options.show_dialog));
  }
  if (options?.scope !== void 0) {
    params.set("scope", options.scope.join(" "));
  }
  if (hasPkceOptions(options)) {
    params.set("code_challenge", options.code_challenge);
    params.set("code_challenge_method", options.code_challenge_method);
  }
  return `${AUTHORIZE_URL}?${params.toString()}`;
};
var isConfigured = (value) => value.length > 0;
var SpotifyWebApi = class {
  _clientId;
  _clientSecret;
  _redirectUri;
  provideHttpClient;
  appAuth;
  session;
  tracks;
  users;
  constructor(options = {}, credentials) {
    this._clientId = options.clientId ?? "";
    this._clientSecret = options.clientSecret ?? "";
    this._redirectUri = options.redirectUri ?? "";
    this.appAuth = makeSpotifyAuth({
      clientId: this._clientId,
      clientSecret: this._clientSecret,
      redirectUri: this._redirectUri
    });
    this.session = makeSpotifySession(credentials);
    const layer = options.httpClientLayer ?? FetchHttpClient.layer;
    this.provideHttpClient = (effect) => Effect4.provide(effect, layer);
    const rawTracks = new TracksApi(
      makeSpotifyRequest({
        getAccessToken: () => this.session.getAccessToken({
          auth: this.appAuth,
          canUseClientCredentials: isConfigured(this._clientId) && isConfigured(this._clientSecret)
        }),
        invalidateAccessToken: () => this.session.invalidateAccessToken()
      })
    );
    const rawUsers = new UsersApi(
      makeSpotifyRequest({
        getAccessToken: () => this.session.getAccessToken({
          auth: this.appAuth,
          canUseClientCredentials: isConfigured(this._clientId) && isConfigured(this._clientSecret)
        }),
        invalidateAccessToken: () => this.session.invalidateAccessToken()
      })
    );
    this.tracks = {
      getTrack: (trackId, opts) => this.provideHttpClient(rawTracks.getTrack(trackId, opts)),
      getTracks: (trackIds, opts) => this.provideHttpClient(rawTracks.getTracks(trackIds, opts))
    };
    this.users = {
      getCurrentUserProfile: () => this.provideHttpClient(rawUsers.getCurrentUserProfile())
    };
  }
  getTemporaryAppTokens() {
    return this.provideHttpClient(this.session.getTemporaryAppTokens(this.appAuth));
  }
  getAuthorizationCodeUrl(options) {
    return getAuthorizationUrl(this.clientId, this.redirectUri, "code", options);
  }
  getAuthorizationCodePKCEUrl(clientId, options) {
    return getAuthorizationUrl(clientId, this.redirectUri, "code", options);
  }
  getTemporaryAuthorizationUrl(options) {
    return getAuthorizationUrl(this.clientId, this.redirectUri, "token", options);
  }
  getTokenWithAuthenticateCode(code) {
    return this.provideHttpClient(
      this.appAuth.getRefreshableUserTokens(code).pipe(Effect4.tap((tokens) => this.session.setRefreshableUserTokens(tokens)))
    );
  }
  getTokenWithAuthenticateCodePKCE(code, codeVerifier, clientId) {
    return this.provideHttpClient(
      this.appAuth.getRefreshableUserTokensWithPkce({
        clientId,
        code,
        codeVerifier
      }).pipe(Effect4.tap((tokens) => this.session.setRefreshableUserTokens(tokens)))
    );
  }
  getRefreshedAccessToken(refreshToken) {
    return this.provideHttpClient(
      this.appAuth.getRefreshedAccessToken(refreshToken).pipe(
        Effect4.tap((tokens) => this.session.updateRefreshedAccessToken(refreshToken, tokens))
      )
    );
  }
  getAccessToken() {
    return this.session.getStoredAccessToken();
  }
  setAccessToken(accessToken) {
    Effect4.runSync(this.session.setAccessToken(accessToken));
  }
  setRefreshableUserTokens(tokens) {
    Effect4.runSync(this.session.setRefreshableUserTokens(tokens));
  }
  getAccessTokenExpiresAt() {
    return this.session.getStoredAccessTokenExpiresAt();
  }
  getRefreshToken() {
    return this.session.getStoredRefreshToken();
  }
  get clientId() {
    return this._clientId;
  }
  get clientSecret() {
    return this._clientSecret;
  }
  get redirectUri() {
    return this._redirectUri;
  }
};

export { SpotifyWebApi as S, createPkceCodeChallenge as a, createPkceCodeVerifier as c, makeSpotifyBrowserSession as m };
//# sourceMappingURL=index2-D5GVHfyz.js.map

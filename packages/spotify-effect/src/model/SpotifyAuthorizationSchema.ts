import * as Schema from "effect/Schema"

export const GetRefreshableUserTokensResponseSchema = Schema.Struct({
  access_token: Schema.String,
  token_type: Schema.Literal("Bearer"),
  scope: Schema.optionalKey(Schema.String),
  expires_in: Schema.Number,
  refresh_token: Schema.String,
})

export const GetRefreshedAccessTokenResponseSchema = Schema.Struct({
  access_token: Schema.String,
  token_type: Schema.Literal("Bearer"),
  expires_in: Schema.Number,
  scope: Schema.optionalKey(Schema.String),
})

export const GetTemporaryAppTokensResponseSchema = Schema.Struct({
  access_token: Schema.String,
  token_type: Schema.Literal("Bearer"),
  expires_in: Schema.Number,
  scope: Schema.optionalKey(Schema.String),
})

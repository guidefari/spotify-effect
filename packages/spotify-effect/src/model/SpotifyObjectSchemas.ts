import * as Schema from "effect/Schema"

const ExternalURLSchema = Schema.Record(Schema.String, Schema.String)

const FollowersSchema = Schema.Struct({
  href: Schema.NullOr(Schema.String),
  total: Schema.Number,
})

const ExplicitContentSchema = Schema.Struct({
  filter_enabled: Schema.Boolean,
  filter_locked: Schema.Boolean,
})

const SpotifyImageSchema = Schema.Struct({
  height: Schema.NullOr(Schema.Number),
  url: Schema.String,
  width: Schema.NullOr(Schema.Number),
})

export const PrivateUserSchema = Schema.Struct({
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
  uri: Schema.String,
})

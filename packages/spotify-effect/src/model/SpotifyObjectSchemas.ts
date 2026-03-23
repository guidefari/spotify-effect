import * as Schema from "effect/Schema";

const ExternalURLSchema = Schema.Record(Schema.String, Schema.String);

const FollowersSchema = Schema.Struct({
  href: Schema.NullOr(Schema.String),
  total: Schema.Number,
});

const ExplicitContentSchema = Schema.Struct({
  filter_enabled: Schema.Boolean,
  filter_locked: Schema.Boolean,
});

const SpotifyImageSchema = Schema.Struct({
  height: Schema.NullOr(Schema.Number),
  url: Schema.String,
  width: Schema.NullOr(Schema.Number),
});

const SimplifiedArtistSchema = Schema.Struct({
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  name: Schema.String,
  type: Schema.Literal("artist"),
  uri: Schema.String,
});

const SimplifiedAlbumSchema = Schema.Struct({
  album_group: Schema.optionalKey(
    Schema.Union([
      Schema.Literal("album"),
      Schema.Literal("single"),
      Schema.Literal("compilation"),
      Schema.Literal("appears_on"),
    ]),
  ),
  album_type: Schema.Union([
    Schema.Literal("album"),
    Schema.Literal("ALBUM"),
    Schema.Literal("single"),
    Schema.Literal("SINGLE"),
    Schema.Literal("compilation"),
    Schema.Literal("COMPILATION"),
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
    Schema.Literal("day"),
  ]),
  total_tracks: Schema.Number,
  type: Schema.Literal("album"),
  uri: Schema.String,
});

export const TrackSchema = Schema.Struct({
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
  is_local: Schema.Boolean,
});

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
});

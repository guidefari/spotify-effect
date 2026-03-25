import * as Schema from "effect/Schema";

const ExternalURLSchema = Schema.Record(Schema.String, Schema.String);
const ExternalIDSchema = Schema.Record(Schema.String, Schema.String);

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

const RestrictionsSchema = Schema.Struct({
  reason: Schema.String,
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
  restrictions: Schema.optionalKey(RestrictionsSchema),
  total_tracks: Schema.Number,
  type: Schema.Literal("album"),
  uri: Schema.String,
});

const CopyrightSchema = Schema.Struct({
  text: Schema.String,
  type: Schema.Union([Schema.Literal("C"), Schema.Literal("P")]),
});

const SimplifiedTrackSchema = Schema.Struct({
  artists: Schema.mutable(Schema.Array(SimplifiedArtistSchema)),
  available_markets: Schema.mutable(Schema.Array(Schema.String)),
  disc_number: Schema.Number,
  duration_ms: Schema.Number,
  explicit: Schema.Boolean,
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  is_playable: Schema.optionalKey(Schema.Boolean),
  restrictions: Schema.optionalKey(RestrictionsSchema),
  name: Schema.String,
  preview_url: Schema.String,
  track_number: Schema.Number,
  type: Schema.Literal("track"),
  uri: Schema.String,
  is_local: Schema.Boolean,
});

const makePagingSchema = <A>(itemSchema: Schema.Schema<A>) =>
  Schema.Struct({
    href: Schema.String,
    items: Schema.mutable(Schema.Array(itemSchema)),
    limit: Schema.Number,
    next: Schema.NullOr(Schema.String),
    offset: Schema.Number,
    previous: Schema.NullOr(Schema.String),
    total: Schema.Number,
  });

export const TrackSchema = Schema.Struct({
  album: SimplifiedAlbumSchema,
  artists: Schema.mutable(Schema.Array(SimplifiedArtistSchema)),
  available_markets: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.String))),
  disc_number: Schema.Number,
  duration_ms: Schema.Number,
  episode: Schema.optionalKey(Schema.Boolean),
  explicit: Schema.Boolean,
  external_ids: ExternalIDSchema,
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

export const PublicUserSchema = Schema.Struct({
  display_name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  external_urls: ExternalURLSchema,
  followers: Schema.optionalKey(FollowersSchema),
  href: Schema.String,
  id: Schema.String,
  images: Schema.optionalKey(Schema.mutable(Schema.Array(SpotifyImageSchema))),
  type: Schema.Literal("user"),
  uri: Schema.String,
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

export const AlbumSchema = Schema.Struct({
  album_type: Schema.Union([
    Schema.Literal("album"),
    Schema.Literal("single"),
    Schema.Literal("compilation"),
  ]),
  artists: Schema.mutable(Schema.Array(SimplifiedArtistSchema)),
  available_markets: Schema.mutable(Schema.Array(Schema.String)),
  copyrights: Schema.mutable(Schema.Array(CopyrightSchema)),
  external_ids: ExternalIDSchema,
  external_urls: ExternalURLSchema,
  genres: Schema.mutable(Schema.Array(Schema.String)),
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  label: Schema.String,
  name: Schema.String,
  popularity: Schema.Number,
  release_date: Schema.String,
  release_date_precision: Schema.Union([
    Schema.Literal("year"),
    Schema.Literal("month"),
    Schema.Literal("day"),
  ]),
  restrictions: Schema.optionalKey(RestrictionsSchema),
  total_tracks: Schema.Number,
  tracks: makePagingSchema(SimplifiedTrackSchema),
  type: Schema.Literal("album"),
  uri: Schema.String,
});

export const ArtistSchema = Schema.Struct({
  external_urls: ExternalURLSchema,
  followers: FollowersSchema,
  genres: Schema.mutable(Schema.Array(Schema.String)),
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  name: Schema.String,
  popularity: Schema.Number,
  type: Schema.Literal("artist"),
  uri: Schema.String,
});

export const CategorySchema = Schema.Struct({
  href: Schema.String,
  icons: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  id: Schema.String,
  name: Schema.String,
});

const TracksRefSchema = Schema.Struct({
  href: Schema.String,
  total: Schema.Number,
});

export const SimplifiedPlaylistSchema = Schema.Struct({
  collaborative: Schema.Boolean,
  description: Schema.NullOr(Schema.String),
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  name: Schema.String,
  owner: PublicUserSchema,
  primary_color: Schema.optionalKey(Schema.NullOr(Schema.String)),
  public: Schema.NullOr(Schema.Boolean),
  snapshot_id: Schema.String,
  tracks: TracksRefSchema,
  type: Schema.Literal("playlist"),
  uri: Schema.String,
});

export { makePagingSchema };
export { SimplifiedAlbumSchema };

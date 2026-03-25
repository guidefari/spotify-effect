import * as Schema from "effect/Schema";
import {
  AlbumSchema,
  ArtistSchema,
  CategorySchema,
  SimplifiedAlbumSchema,
  SimplifiedPlaylistSchema,
  TrackSchema,
  makePagingSchema,
} from "./SpotifyObjectSchemas";

export const GetTracksResponseSchema = Schema.Struct({
  tracks: Schema.mutable(Schema.Array(TrackSchema)),
});

export const GetAlbumsResponseSchema = Schema.Struct({
  albums: Schema.mutable(Schema.Array(Schema.NullOr(AlbumSchema))),
});

export const GetAlbumTracksResponseSchema = makePagingSchema(
  Schema.Struct({
    artists: Schema.mutable(
      Schema.Array(
        Schema.Struct({
          external_urls: Schema.Record(Schema.String, Schema.String),
          href: Schema.String,
          id: Schema.String,
          name: Schema.String,
          type: Schema.Literal("artist"),
          uri: Schema.String,
        }),
      ),
    ),
    available_markets: Schema.mutable(Schema.Array(Schema.String)),
    disc_number: Schema.Number,
    duration_ms: Schema.Number,
    explicit: Schema.Boolean,
    external_urls: Schema.Record(Schema.String, Schema.String),
    href: Schema.String,
    id: Schema.String,
    is_playable: Schema.optionalKey(Schema.Boolean),
    name: Schema.String,
    preview_url: Schema.String,
    track_number: Schema.Number,
    type: Schema.Literal("track"),
    uri: Schema.String,
    is_local: Schema.Boolean,
  }),
);

export const GetArtistsResponseSchema = Schema.Struct({
  artists: Schema.mutable(Schema.Array(ArtistSchema)),
});

export const GetArtistAlbumsResponseSchema = makePagingSchema(SimplifiedAlbumSchema);

export const GetArtistTopTracksResponseSchema = Schema.Struct({
  tracks: Schema.mutable(Schema.Array(TrackSchema)),
});

export const GetRelatedArtistsResponseSchema = Schema.Struct({
  artists: Schema.mutable(Schema.Array(ArtistSchema)),
});

export const GetCategoriesResponseSchema = Schema.Struct({
  categories: makePagingSchema(CategorySchema),
});

export const GetCategoryPlaylistsResponseSchema = Schema.Struct({
  playlists: makePagingSchema(SimplifiedPlaylistSchema),
});

export const GetFeaturedPlaylistsResponseSchema = Schema.Struct({
  message: Schema.String,
  playlists: makePagingSchema(SimplifiedPlaylistSchema),
});

export const GetNewReleasesResponseSchema = Schema.Struct({
  albums: makePagingSchema(SimplifiedAlbumSchema),
});

export const GetAvailableGenreSeedsResponseSchema = Schema.Struct({
  genres: Schema.mutable(Schema.Array(Schema.String)),
});

export const SearchResponseSchema = Schema.Struct({
  albums: Schema.optionalKey(makePagingSchema(SimplifiedAlbumSchema)),
  artists: Schema.optionalKey(makePagingSchema(ArtistSchema)),
  tracks: Schema.optionalKey(makePagingSchema(TrackSchema)),
  playlists: Schema.optionalKey(makePagingSchema(SimplifiedPlaylistSchema)),
});

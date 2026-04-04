# WIP: Issue #17 — Expand Resource Modules

Tracking progress on implementing read-only catalog endpoints.

## Completed

- [x] **Schemas** — Added `AlbumSchema`, `ArtistSchema`, `CategorySchema`, `SimplifiedPlaylistSchema`, `makePagingSchema`, and all response schemas
- [x] **AlbumsApi** — `getAlbum`, `getAlbums`, `getAlbumTracks` + tests + fixtures
- [x] **ArtistsApi** — `getArtist`, `getArtists`, `getArtistAlbums`, `getArtistTopTracks`, `getRelatedArtists` + tests + fixtures
- [x] **BrowseApi** — `getCategories`, `getCategory`, `getCategoryPlaylists`, `getFeaturedPlaylists`, `getNewReleases`, `getAvailableGenreSeeds` + tests + fixtures
- [x] **SearchApi** — `search` with typed results + tests + fixtures

## In Progress

- [x] Wire all APIs into `SpotifyWebApi` facade + `index.ts` exports
- [x] Add SvelteKit example pages (album, artist, search) with tracing and sidenav
- [x] Typecheck, test, commit

## Completed Today

- **SvelteKit Example Enhancement**
  - Added grouped sidenav: Auth (home), Catalog (album, artist, track, user), Search
  - Created `/album` page - lookup by ID/URL/URI with album art, artist, release year
  - Created `/artist` page - lookup with image, followers, genres, popularity
  - Created `/search` page - multi-type search with visual results
  - Added API endpoints: `/api/album`, `/api/artist`, `/api/search` with tracing
- **Type Fixes**
  - Fixed `makePagingSchema` generic constraint
  - Fixed `SimplifiedPlaylist.primary_color` to be optional (matches Spotify API)
  - Removed `as any` from `SpotifyRequest.ts` per codebase standards

## Deferred (needs POST/PUT/DELETE support)

- [ ] **PlaylistsApi** — read-only GET endpoints could be done now, mutations need new SpotifyRequest methods
- [ ] **PlayerApi** — all methods require user-scoped mutations

## Design Decisions

- Started with read-only catalog endpoints per issue guidance
- Used `makePagingSchema` helper to DRY up paging response validation
- Kept fixtures compact (trimmed available_markets arrays) since we only need schema validation
- `SearchApi.search` returns full `SearchResponse` — callers access `.artists`, `.tracks` etc.
- `BrowseApi` methods unwrap wrapper objects (e.g., returns `categories` paging directly)

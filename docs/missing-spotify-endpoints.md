# Missing Spotify API Endpoints

This document tracks which Spotify Web API endpoints are missing from the package.

## Overview

The package has good coverage of core music features (tracks, albums, artists, playlists, player, search) but is missing several newer Spotify API additions and some modern API patterns.

## Missing by Category

### 1. Recommendations

Status: Types exist, no endpoint

Missing endpoint:
- GET /recommendations - Get track recommendations based on seeds

Already have:
- GetRecommendationsOptions type
- GetRecommendationsResponse type
- getAvailableGenreSeeds() method

Implementation: Add getRecommendations() method to BrowseApi

### 2. Shows and Episodes

Status: Types exist, most endpoints missing

Missing catalog endpoints:
- GET /shows/{id} - Get a podcast show
- GET /shows - Get several shows
- GET /shows/{id}/episodes - Get show episodes
- GET /episodes/{id} - Get an episode
- GET /episodes - Get several episodes

Missing library endpoints:
- GET /me/shows - Get saved shows
- PUT /me/shows - Save shows
- GET /me/shows/contains - Check saved shows
- GET /me/episodes - Get saved episodes
- PUT /me/episodes - Save episodes
- DELETE /me/episodes - Remove saved episodes
- GET /me/episodes/contains - Check saved episodes

Already have:
- Show, Episode, SimplifiedShow, SimplifiedEpisode types
- SavedShow type
- removeSavedShows() method

Implementation: Add ShowsApi and EpisodesApi classes

### 3. Audiobooks and Chapters

Status: Completely absent

Missing all endpoints:
- GET /audiobooks/{id}
- GET /audiobooks
- GET /audiobooks/{id}/chapters
- GET /me/audiobooks
- PUT /me/audiobooks
- DELETE /me/audiobooks
- GET /me/audiobooks/contains
- GET /chapters/{id}
- GET /chapters

Implementation: Need all types, schemas, and API classes

### 4. Generic Library Endpoints

Status: Using deprecated type-specific endpoints

Modern API (missing):
- PUT /me/library - Save items (unified)
- DELETE /me/library - Remove items (unified)
- GET /me/library/contains - Check saved items (unified)

Current (deprecated):
- saveAlbums() uses PUT /me/albums
- saveTracks() uses PUT /me/tracks
- removeSavedShows() uses DELETE /me/shows

Implementation: Add generic methods to LibraryApi

### 5. Playlist Enhancements

Missing operations:
- PUT /playlists/{id}/items - Update/reorder items
- GET /playlists/{id}/images - Get cover image
- PUT /playlists/{id}/images - Upload cover image

Deprecated paths (should migrate):
- Current: /playlists/{id}/tracks
- Preferred: /playlists/{id}/items

Already have option types defined but unused:
- RemovePlaylistItemsByPositionOptions
- ReorderPlaylistItemsOptions

### 6. Search Schema Issues

Problem: Types support shows/episodes but schema does not

Current:
- SearchType includes show and episode
- SearchResponse type includes shows/episodes
- SearchResponseSchema only decodes albums, artists, tracks, playlists

Missing:
- Add shows and episodes to SearchResponseSchema
- Add audiobook to SearchType and SearchResponseSchema

### 7. Player Enhancements

Minor gaps:
- CurrentlyPlayingContext.item should support Episode
- additional_types parameter support

## Priority Ranking

### P0 (Immediate Value, Low Effort)

1. GET /recommendations - Types exist, commonly used
2. GET /shows/{id} - Podcast support, types exist
3. GET /shows/{id}/episodes - Natural companion
4. GET /episodes/{id} - Episode details

### P1 (High Value, Medium Effort)

1. /me/shows library operations
2. /me/episodes library operations
3. PUT /playlists/{id}/items for reordering
4. Playlist cover image endpoints

### P2 (Modern API Patterns)

1. Generic /me/library endpoints
2. Migrate playlist paths from /tracks to /items
3. POST /me/playlists for creation

### P3 (New Features)

1. Audiobooks support
2. Chapters support

## Recommendation

Start with GET /recommendations - it has the highest ROI since all supporting infrastructure already exists and it is a commonly requested feature.

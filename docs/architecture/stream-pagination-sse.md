# Stream Pagination with SSE

## Overview

The SvelteKit example app includes a stream pagination demo that uses Server-Sent Events (SSE) to incrementally deliver paginated Spotify data to the frontend. Instead of buffering the entire response before sending, the server streams track data and running statistics as each page arrives from the Spotify API.

## How it works

### Server (`/api/stream-pagination`)

A single Effect stream pipeline handles both track delivery and stats aggregation in one pass:

1. `paginateStream(fetch, 50)` lazily fetches saved tracks from Spotify (always page size 50)
2. `Stream.take` caps the total if a `maxTracks` limit is set
3. `Stream.grouped(50)` re-chunks individual items into page-sized batches
4. `Stream.mapAccum` carries a running stats accumulator, emitting both track data and updated stats per batch
5. `Stream.runForEach` bridges each batch into SSE events on a `ReadableStream`

The endpoint accepts:

```json
{
  "accessToken": "...",
  "maxTracks": 200       // number or "unlimited"
}
```

### SSE event protocol

```
event: tracks
data: {"tracks":[{name, artist, album, addedAt},...], "page": 1}

event: stats
data: {"topArtists":[{name, count},...], "totalTracksProcessed": 50}

event: done
data: {}

event: error
data: {"message": "..."}
```

Each Spotify API page produces one `tracks` event and one `stats` event. `done` fires when the stream completes. `error` fires if something fails — partial data already rendered stays visible.

### Client (`/stream-pagination`)

Uses `fetch` with a `ReadableStream` reader (not `EventSource`, since we need POST). SSE events are parsed from the response body and state is updated incrementally via Svelte 5 runes.

Features:
- Tracks render as each page arrives
- Top artist stats update live after each page
- Configurable max tracks (number input or unlimited checkbox)
- Cancel button aborts the stream mid-flight

## Related

- [Stream Pagination with SSE](/guides/stream-pagination/) — User-facing documentation in the docs site

## Files

| File | Role |
|------|------|
| `packages/spotify-effect/src/pagination/paginate.ts` | Stream pagination utilities |
| `packages/spotify-effect/src/pagination/paginate.test.ts` | Tests for pagination |
| `examples/sveltekit/src/routes/api/stream-pagination/+server.ts` | SSE streaming endpoint |
| `examples/sveltekit/src/routes/stream-pagination/+page.svelte` | Incremental UI with cancel support |

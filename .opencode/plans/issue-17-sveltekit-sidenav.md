# Plan: Issue #17 - SvelteKit Sidenav & New API Pages

## Current State

- APIs are implemented: Albums, Artists, Browse, Search
- APIs are wired into `SpotifyWebApi` facade
- Exports are added to `index.ts`
- SvelteKit example exists with track/user pages
- **BUT: Type errors in core package** - `DecodableSchema` constraint incompatible with `makePagingSchema`

## Goal

Add SvelteKit example pages for album, artist, and search with:

1. Fix type errors in core package first
2. New API endpoints for album/artist/search
3. Page components with tracing
4. Ergonomic sidenav that groups requests

---

## Implementation Plan

### Phase 0: Fix Type Errors in Core Package

#### Problem

The `DecodableSchema<A>` type at `SpotifyRequest.ts:19` requires `{ readonly DecodingServices: never }`, but `makePagingSchema` returns schemas without this constraint.

#### Solution

Update `makePagingSchema` return type to satisfy the constraint:

```typescript
const makePagingSchema = <A, I>(itemSchema: Schema.Schema<A, I, never>) =>
  Schema.Struct({...}) satisfies Schema.Top & { readonly Type: {...}; readonly DecodingServices: never };
```

Or use `Schema.satisfies` equivalent.

Alternative: Change `DecodableSchema` to allow `any` for `DecodingServices`:

```typescript
type DecodableSchema<A> = Schema.Top & { readonly Type: A; readonly DecodingServices: any };
```

#### Files to fix:

1. `SpotifyRequest.ts` - Fix DecodableSchema constraint
2. `SpotifyObjectSchemas.ts:95` - Generic type requires 1 argument

### Phase 1: API Endpoints (3 files)

### Phase 1: API Endpoints (3 files)

#### `/examples/sveltekit/src/routes/api/album/+server.ts`

- Copy pattern from track endpoint
- Use `spotify.albums.getAlbum(albumId)`
- Add tracing span: `"sveltekit.api.album"`

#### `/examples/sveltekit/src/routes/api/artist/+server.ts`

- Copy pattern from track endpoint
- Use `spotify.artists.getArtist(artistId)`
- Add tracing span: `"sveltekit.api.artist"`

#### `/examples/sveltekit/src/routes/api/search/+server.ts`

- Accept query, types array
- Use `spotify.search.search(query, types)`
- Add tracing span: `"sveltekit.api.search"`

### Phase 2: Page Components (3 files)

#### `/examples/sveltekit/src/routes/album/+page.svelte`

- Similar structure to track page
- Parse album ID from URL/URI
- Show album details: name, artist, release date, tracks, images
- Support "Open in Spotify" link

#### `/examples/sveltekit/src/routes/artist/+page.svelte`

- Parse artist ID from URL/URI
- Show artist details: name, genres, popularity, images, followers
- Show top tracks (optional: could add separate endpoint)
- Support "Open in Spotify" link

#### `/examples/sveltekit/src/routes/search/+page.svelte`

- Search input with type selector (artists, albums, tracks)
- Show results grouped by type
- Limit results per type
- Show truncated JSON with toggle

### Phase 3: Sidenav Groups

Update `/examples/sveltekit/src/routes/+layout.svelte`:

```typescript
const navGroups = [
  {
    label: "Auth",
    links: [{ href: "/", label: "home" }],
  },
  {
    label: "Catalog",
    links: [
      { href: "/album", label: "album" },
      { href: "/artist", label: "artist" },
      { href: "/track", label: "track" },
      { href: "/user", label: "user" },
    ],
  },
  {
    label: "Search",
    links: [{ href: "/search", label: "search" }],
  },
];
```

Visual grouping with labels in the sidenav.

### Phase 4: Validation

1. TypeScript typecheck: `bun run typecheck`
2. Lint: `bun run lint`
3. Tests: `bun run test`
4. Build: `bun run build` (which includes format check)

Or run full pipeline: `bun run pc`

---

## Design Decisions

- **Grouping**: Auth, Catalog (entities), Search (cross-cutting)
- **Consistency**: All pages follow same structure as track/user
- **Tracing**: All API endpoints use `runTraced()`
- **Error Handling**: Same pattern as existing endpoints
- **UX**: Keep input parsing (URL/URI extraction) for better UX

---

## Estimated Effort

- API endpoints: 15 min
- Page components: 45 min
- Sidenav refactor: 20 min
- Testing/validation: 15 min

**Total: ~1.5 hours**

Ready to implement when you approve.

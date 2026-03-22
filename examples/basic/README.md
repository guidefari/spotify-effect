# Basic Example

Interactive Effect-based CLI for testing `spotify-effect` manually.

Run it from the workspace root with:

```sh
bun run example:basic
```

You can also pass values directly:

```sh
bun run example:basic -- --access-token <spotify-token> <track-id>
```

Or use client credentials for public catalog reads:

```sh
bun run example:basic -- --client-id <spotify-client-id> --client-secret <spotify-client-secret> <track-id>
```

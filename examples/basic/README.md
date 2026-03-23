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

The examples can opt in to tracing with `SPOTIFY_EFFECT_TRACE=1`.

To turn on tracing for this example right now:

```sh
SPOTIFY_EFFECT_TRACE=1 bun run example:basic -- --access-token <spotify-token> <track-id>
```

To export to the local collector instead of console spans:

```sh
SPOTIFY_EFFECT_TRACE=1 OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318 bun run example:basic -- --access-token <spotify-token> <track-id>
```

For more background, see `markdown/otel.md`.

# OTel Collector Example

This folder gives you a minimal local collector + Jaeger setup for `spotify-effect` examples.

## Start the stack

From `examples/otel/`:

```sh
docker compose up -d
```

Or from the repo root:

```sh
docker compose -f examples/otel/docker-compose.yml up -d
```

Then open Jaeger at:

```text
http://localhost:16686
```

## Run the examples with tracing

### Basic example

```sh
SPOTIFY_EFFECT_TRACE=1 OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318 bun run example:basic -- --access-token <token> <track-id>
```

### Browser example

```sh
SPOTIFY_EFFECT_TRACE=1 OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318 bun run example:browser
```

The examples will auto-append `/v1/traces` to `OTEL_EXPORTER_OTLP_ENDPOINT` when needed.

The collector is exposed on host port `14318` to avoid collisions with anything already using `4318` locally.

If traces still do not appear in Jaeger, check collector logs:

```sh
docker compose logs -f otel-collector
```

This setup also enables the collector `debug` exporter, so you should see incoming spans in the collector logs even before checking Jaeger.

## Notes

- If `OTEL_EXPORTER_OTLP_ENDPOINT` is not set, the examples fall back to console span export.
- The browser example traces the local Bun server side of the flow.

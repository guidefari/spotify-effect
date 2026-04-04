# @spotify-effect/otel-node

## 0.2.0

### Minor Changes

- e220cdf: Split Node OpenTelemetry support into `@spotify-effect/otel-node`

  **Breaking change for `@spotify-effect/core`:** `makeSpotifyNodeTelemetryLayer`, `getOtlpTraceExporterUrl`, and `SpotifyNodeTelemetryOptions` are no longer exported from `@spotify-effect/core`. The core package now depends only on `effect`.

  **Migration:** Import from `@spotify-effect/otel-node` instead:

  ```ts
  // Before
  import {
    makeSpotifyNodeTelemetryLayer,
    getOtlpTraceExporterUrl,
  } from "@spotify-effect/core";

  // After
  import {
    makeNodeTelemetryLayer,
    getOtlpTraceExporterUrl,
  } from "@spotify-effect/otel-node";
  ```

  `makeNodeTelemetryLayer` accepts a `serviceName` string and an optional `options` object with a `batch` boolean to select between `SimpleSpanProcessor` (default) and `BatchSpanProcessor`. It reads `OTEL_EXPORTER_OTLP_ENDPOINT` from the environment automatically.

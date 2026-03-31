import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import * as Effect from "effect/Effect";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { afterEach, describe, expect, it } from "vitest";
import { SpotifyWebApi } from "./SpotifyWebApi";
import { trackFixture } from "./fixtures/trackFixture";
import { makeSpotifyNodeTelemetryLayer } from "./telemetry/SpotifyNodeTelemetry";
import { makeTestHttpClient } from "./test/TestHttpClient";

describe("OpenTelemetry integration", () => {
  const exporter = new InMemorySpanExporter();

  const telemetryLayer = makeSpotifyNodeTelemetryLayer({
    serviceName: "otel-test",
    serviceVersion: "0.0.0",
    exporter,
  });

  const runtime = ManagedRuntime.make(telemetryLayer);

  afterEach(() => {
    exporter.reset();
  });

  it("produces spans for spotify API requests", async () => {
    const { layer } = makeTestHttpClient(
      () =>
        new Response(JSON.stringify(trackFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    const spotify = new SpotifyWebApi({ httpClientLayer: layer }, { accessToken: "token" });

    await runtime.runPromise(Effect.withSpan(spotify.tracks.getTrack("foo"), "test.root"));

    const spans = exporter.getFinishedSpans();
    const spanNames = spans.map((s) => s.name);

    expect(spanNames).toContain("test.root");
    expect(spanNames).toContain("spotify.request GET /tracks/foo");
    expect(spans.length).toBeGreaterThanOrEqual(2);
  });

  it("annotates request spans with spotify HTTP attributes", async () => {
    const { layer } = makeTestHttpClient(
      () =>
        new Response(JSON.stringify(trackFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    const spotify = new SpotifyWebApi({ httpClientLayer: layer }, { accessToken: "token" });

    await runtime.runPromise(spotify.tracks.getTrack("foo"));

    const spans = exporter.getFinishedSpans();
    const requestSpan = spans.find((s) => s.name === "spotify.request GET /tracks/foo");

    expect(requestSpan).toBeDefined();
    expect(requestSpan!.attributes["spotify.request.path"]).toBe("/tracks/foo");
    expect(requestSpan!.attributes["spotify.http.status_code"]).toBe(200);
  });

  it("annotates auth spans with grant type", async () => {
    const { layer } = makeTestHttpClient(
      () =>
        new Response(
          JSON.stringify({
            access_token: "new-token",
            token_type: "Bearer",
            expires_in: 3600,
            scope: "",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    );

    const spotify = new SpotifyWebApi({
      clientId: "id",
      clientSecret: "secret",
      httpClientLayer: layer,
    });

    await runtime.runPromise(spotify.getTemporaryAppTokens());

    const spans = exporter.getFinishedSpans();
    const authSpan = spans.find((s) => s.name === "spotify.auth.token");

    expect(authSpan).toBeDefined();
    expect(authSpan!.attributes["spotify.auth.grant_type"]).toBe("client_credentials");
  });

  it("nests library spans under a consumer root span", async () => {
    const { layer } = makeTestHttpClient(
      () =>
        new Response(JSON.stringify(trackFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    const spotify = new SpotifyWebApi({ httpClientLayer: layer }, { accessToken: "token" });

    await runtime.runPromise(Effect.withSpan(spotify.tracks.getTrack("foo"), "app.root"));

    const spans = exporter.getFinishedSpans();
    const rootSpan = spans.find((s) => s.name === "app.root");
    const requestSpan = spans.find((s) => s.name === "spotify.request GET /tracks/foo");

    expect(rootSpan).toBeDefined();
    expect(requestSpan).toBeDefined();
    expect(requestSpan!.parentSpanContext?.spanId).toBe(rootSpan!.spanContext().spanId);
  });

  it("produces no spans when no telemetry layer is provided", async () => {
    const { layer } = makeTestHttpClient(
      () =>
        new Response(JSON.stringify(trackFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    const spotify = new SpotifyWebApi({ httpClientLayer: layer }, { accessToken: "token" });

    await Effect.runPromise(Effect.withSpan(spotify.tracks.getTrack("foo"), "test.root"));

    expect(exporter.getFinishedSpans()).toHaveLength(0);
  });
});

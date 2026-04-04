import { Effect, ManagedRuntime } from "effect";
import { makeSpotifyLayer, SpotifyAuth, SpotifySession, Tracks, Users } from "@spotify-effect/core";
import { makeNodeTelemetryLayer } from "@spotify-effect/otel-node";

const appEntry = new URL("./app.ts", import.meta.url);
const htmlEntry = new URL("./index.html", import.meta.url);
const pkceEntry = new URL("../../../docs/auth/pkce.md", import.meta.url);
const packageEntry = new URL("../../../packages/spotify-effect/src/index.ts", import.meta.url);
const browserPackageEntry = new URL("../../../packages/browser/src/index.ts", import.meta.url);

const isTracingEnabled = () => process.env.SPOTIFY_EFFECT_TRACE === "1";
const telemetryRuntime = isTracingEnabled()
  ? ManagedRuntime.make(makeNodeTelemetryLayer("spotify-effect-example-browser"))
  : undefined;

const buildClientBundle = async () => {
  const result = await Bun.build({
    entrypoints: [appEntry.pathname],
    target: "browser",
    format: "esm",
    minify: false,
    alias: {
      "@spotify-effect/browser": browserPackageEntry.pathname,
      "@spotify-effect/core": packageEntry.pathname,
    },
  });

  if (!result.success) {
    throw new Error(result.logs.map((log) => log.message).join("\n"));
  }

  return await result.outputs[0].text();
};

let clientBundlePromise = buildClientBundle();

const getClientBundle = async () => {
  try {
    return await clientBundlePromise;
  } catch (error) {
    clientBundlePromise = buildClientBundle();
    throw error;
  }
};

const requestedPort = Number(process.env.PORT ?? "3013");

const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const json = (body, init) =>
  Response.json(body, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "cache-control": "no-store",
    },
  });

const runEffect = async (effect) => {
  try {
    const traced = Effect.withSpan(effect, "spotify-effect.example.browser.request");
    const result = telemetryRuntime !== undefined
      ? await telemetryRuntime.runPromise(traced)
      : await Effect.runPromise(traced);
    return json(result);
  } catch (error) {
    return json(error, { status: 500 });
  }
};

const startServer = (port) => Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(Bun.file(htmlEntry), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/app.js") {
      return new Response(await getClientBundle(), {
        headers: { "content-type": "application/javascript; charset=utf-8" },
      });
    }

    if (url.pathname === "/pkce") {
      return new Response(Bun.file(pkceEntry), {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      });
    }

    if (url.pathname === "/api/ping" && request.method === "GET") {
      return runEffect(
        Effect.succeed({
          ok: true,
          service: "spotify-effect-example-browser",
          timestamp: new Date().toISOString(),
        }),
      );
    }

    if (url.pathname === "/api/pkce/exchange" && request.method === "POST") {
      const body = await readJson(request);

      if (
        body === null ||
        typeof body.clientId !== "string" ||
        typeof body.redirectUri !== "string" ||
        typeof body.code !== "string" ||
        typeof body.codeVerifier !== "string"
      ) {
        return json({ message: "Invalid PKCE exchange request body" }, { status: 400 });
      }

      return runEffect(
        Effect.gen(function* () {
          const auth = yield* SpotifyAuth;

          return yield* auth.getRefreshableUserTokensWithPkce({
            clientId: body.clientId,
            code: body.code,
            codeVerifier: body.codeVerifier,
          });
        }).pipe(
          Effect.provide(
            makeSpotifyLayer({
              clientId: body.clientId,
              redirectUri: body.redirectUri,
            }),
          ),
        ),
      );
    }

    if (url.pathname === "/api/profile" && request.method === "POST") {
      const body = await readJson(request);

      if (
        body === null ||
        typeof body.clientId !== "string" ||
        typeof body.redirectUri !== "string" ||
        typeof body.accessToken !== "string" ||
        typeof body.refreshToken !== "string" ||
        typeof body.accessTokenExpiresAt !== "number"
      ) {
        return json({ message: "Invalid profile request body" }, { status: 400 });
      }

      const spotifyLayer = makeSpotifyLayer(
        {
          clientId: body.clientId,
          redirectUri: body.redirectUri,
        },
        {
          accessToken: body.accessToken,
          accessTokenExpiresAt: body.accessTokenExpiresAt,
          refreshToken: body.refreshToken,
        },
      );

      return runEffect(
        Effect.gen(function* () {
          const users = yield* Users;
          const session = yield* SpotifySession;
          const profile = yield* users.getCurrentUserProfile();

          return {
            profile,
            credentials: {
              accessToken: session.getStoredAccessToken(),
              accessTokenExpiresAt: session.getStoredAccessTokenExpiresAt(),
              refreshToken: session.getStoredRefreshToken(),
            },
          };
        }).pipe(Effect.provide(spotifyLayer)),
      );
    }

    if (url.pathname === "/api/track" && request.method === "POST") {
      const body = await readJson(request);

      if (
        body === null ||
        typeof body.accessToken !== "string" ||
        typeof body.trackId !== "string"
      ) {
        return json({ message: "Invalid track request body" }, { status: 400 });
      }

      return runEffect(
        Effect.gen(function* () {
          const tracks = yield* Tracks;

          return yield* tracks.getTrack(body.trackId);
        }).pipe(Effect.provide(makeSpotifyLayer({}, { accessToken: body.accessToken }))),
      );
    }

    return new Response("Not found", { status: 404 });
  },
});

let server;

try {
  server = startServer(Number.isFinite(requestedPort) ? requestedPort : 3013);
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes("EADDRINUSE")) {
    throw error;
  }

  server = startServer(0);
}

console.log(`spotify-effect browser example: http://127.0.0.1:${server.port}`);
console.log(
  `tracing: ${telemetryRuntime !== undefined ? `enabled → ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}` : "disabled"}`,
);

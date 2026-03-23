import { Effect } from "effect"
import { SpotifyWebApi } from "spotify-effect"
import { makeNodeTelemetryLayer } from "../../shared/nodeTelemetry"

const appEntry = new URL("./app.ts", import.meta.url)
const htmlEntry = new URL("./index.html", import.meta.url)
const pkceEntry = new URL("../../../markdown/pkce.md", import.meta.url)
const packageEntry = new URL("../../../packages/spotify-effect/src/index.ts", import.meta.url)

const telemetryLayer = makeNodeTelemetryLayer("spotify-effect-example-browser")

const buildClientBundle = async () => {
  const result = await Bun.build({
    entrypoints: [appEntry.pathname],
    target: "browser",
    format: "esm",
    minify: false,
    alias: {
      "spotify-effect": packageEntry.pathname,
    },
  })

  if (!result.success) {
    throw new Error(result.logs.map((log) => log.message).join("\n"))
  }

  return await result.outputs[0].text()
}

let clientBundlePromise = buildClientBundle()

const getClientBundle = async () => {
  try {
    return await clientBundlePromise
  } catch (error) {
    clientBundlePromise = buildClientBundle()
    throw error
  }
}

const requestedPort = Number(process.env.PORT ?? "3012")

const readJson = async (request) => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

const json = (body, init) =>
  Response.json(body, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "cache-control": "no-store",
    },
  })

const runEffect = async (effect) => {
  try {
    const traced = Effect.withSpan(effect, "spotify-effect.example.browser.request")
    const provided = telemetryLayer !== undefined ? Effect.provide(traced, telemetryLayer) : traced
    const result = await Effect.runPromise(provided)
    return json(result)
  } catch (error) {
    return json(error, { status: 500 })
  }
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number.isFinite(requestedPort) ? requestedPort : 3012,
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === "/") {
      return new Response(Bun.file(htmlEntry), {
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    }

    if (url.pathname === "/app.js") {
      return new Response(await getClientBundle(), {
        headers: { "content-type": "application/javascript; charset=utf-8" },
      })
    }

    if (url.pathname === "/pkce") {
      return new Response(Bun.file(pkceEntry), {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      })
    }

    if (url.pathname === "/api/ping" && request.method === "GET") {
      return runEffect(
        Effect.succeed({
          ok: true,
          service: "spotify-effect-example-browser",
          timestamp: new Date().toISOString(),
        }),
      )
    }

    if (url.pathname === "/api/pkce/exchange" && request.method === "POST") {
      const body = await readJson(request)

      if (
        body === null ||
        typeof body.clientId !== "string" ||
        typeof body.redirectUri !== "string" ||
        typeof body.code !== "string" ||
        typeof body.codeVerifier !== "string"
      ) {
        return json({ message: "Invalid PKCE exchange request body" }, { status: 400 })
      }

      const spotify = new SpotifyWebApi({
        clientId: body.clientId,
        redirectUri: body.redirectUri,
      })

      return runEffect(spotify.getTokenWithAuthenticateCodePKCE(body.code, body.codeVerifier, body.clientId))
    }

    if (url.pathname === "/api/profile" && request.method === "POST") {
      const body = await readJson(request)

      if (
        body === null ||
        typeof body.clientId !== "string" ||
        typeof body.redirectUri !== "string" ||
        typeof body.accessToken !== "string" ||
        typeof body.refreshToken !== "string" ||
        typeof body.accessTokenExpiresAt !== "number"
      ) {
        return json({ message: "Invalid profile request body" }, { status: 400 })
      }

      const spotify = new SpotifyWebApi(
        {
          clientId: body.clientId,
          redirectUri: body.redirectUri,
        },
        {
          accessToken: body.accessToken,
          accessTokenExpiresAt: body.accessTokenExpiresAt,
          refreshToken: body.refreshToken,
        },
      )

      return runEffect(
        spotify.users.getCurrentUserProfile().pipe(
          Effect.map((profile) => ({
            profile,
            credentials: {
              accessToken: spotify.getAccessToken(),
              accessTokenExpiresAt: spotify.getAccessTokenExpiresAt(),
              refreshToken: spotify.getRefreshToken(),
            },
          })),
        ),
      )
    }

    if (url.pathname === "/api/track" && request.method === "POST") {
      const body = await readJson(request)

      if (
        body === null ||
        typeof body.accessToken !== "string" ||
        typeof body.trackId !== "string"
      ) {
        return json({ message: "Invalid track request body" }, { status: 400 })
      }

      const spotify = new SpotifyWebApi({}, { accessToken: body.accessToken })

      return runEffect(spotify.tracks.getTrack(body.trackId))
    }

    return new Response("Not found", { status: 404 })
  },
})

console.log(`spotify-effect browser example: http://127.0.0.1:${server.port}`)
console.log(`tracing: ${telemetryLayer !== undefined ? `enabled → ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}` : "disabled"}`)

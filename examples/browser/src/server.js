const appEntry = new URL("./app.ts", import.meta.url)
const htmlEntry = new URL("./index.html", import.meta.url)
const pkceEntry = new URL("../../../markdown/pkce.md", import.meta.url)

const bundleClient = async () => {
  const result = await Bun.build({
    entrypoints: [appEntry.pathname],
    target: "browser",
    format: "esm",
    minify: false,
  })

  if (!result.success) {
    throw new Error(result.logs.map((log) => log.message).join("\n"))
  }

  return await result.outputs[0].text()
}

const server = Bun.serve({
  port: 3012,
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === "/") {
      return new Response(Bun.file(htmlEntry), {
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    }

    if (url.pathname === "/app.js") {
      return new Response(await bundleClient(), {
        headers: { "content-type": "application/javascript; charset=utf-8" },
      })
    }

    if (url.pathname === "/pkce") {
      return new Response(Bun.file(pkceEntry), {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      })
    }

    return new Response("Not found", { status: 404 })
  },
})

console.log(`spotify-effect browser example: http://localhost:${server.port}`)

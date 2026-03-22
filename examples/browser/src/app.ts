import * as Effect from "effect/Effect"
import { SpotifyWebApi } from "spotify-effect"

const accessTokenInput = document.querySelector<HTMLTextAreaElement>("#access-token")
const trackIdInput = document.querySelector<HTMLInputElement>("#track-id")
const fetchButton = document.querySelector<HTMLButtonElement>("#fetch-track")
const output = document.querySelector<HTMLElement>("#output")
const status = document.querySelector<HTMLElement>("#status")

const setStatus = (message: string): void => {
  if (status !== null) {
    status.textContent = message
  }
}

const setOutput = (value: unknown): void => {
  if (output !== null) {
    output.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2)
  }
}

const formatError = (error: unknown): unknown => {
  if (typeof error !== "object" || error === null) {
    return error
  }

  const record = error as Record<string, unknown>

  if (record._tag === "SpotifyHttpError") {
    return {
      _tag: record._tag,
      status: record.status,
      method: record.method,
      url: record.url,
      apiMessage: record.apiMessage,
      body: record.body,
    }
  }

  return record
}

fetchButton?.addEventListener("click", async () => {
  const accessToken = accessTokenInput?.value.trim() ?? ""
  const trackId = trackIdInput?.value.trim() ?? ""

  if (accessToken.length === 0 || trackId.length === 0) {
    setStatus("Provide both an access token and a track ID.")
    return
  }

  fetchButton.disabled = true
  setStatus("Fetching track...")

  try {
    const spotify = new SpotifyWebApi({}, { accessToken })
    const track = await Effect.runPromise(spotify.tracks.getTrack(trackId))
    setOutput(track)
    setStatus("Track fetched successfully.")
  } catch (error) {
    setOutput(formatError(error))
    setStatus("Request failed.")
  } finally {
    fetchButton.disabled = false
  }
})

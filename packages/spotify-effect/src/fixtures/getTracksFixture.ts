import { trackFixture } from "./trackFixture"

export const getTracksFixture = {
  tracks: [
    trackFixture,
    {
      ...trackFixture,
      id: "4ZcGbQ5dOKX6rJk4yvza9R",
      name: "Track Name Two",
      uri: "spotify:track:4ZcGbQ5dOKX6rJk4yvza9R",
      href: "https://api.spotify.com/v1/tracks/4ZcGbQ5dOKX6rJk4yvza9R",
      external_urls: {
        spotify: "https://open.spotify.com/track/4ZcGbQ5dOKX6rJk4yvza9R",
      },
    },
  ],
}

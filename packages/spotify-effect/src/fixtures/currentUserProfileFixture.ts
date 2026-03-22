import type { PrivateUser } from "../model/SpotifyObjects"

export const currentUserProfileFixture: PrivateUser = {
  country: "ZA",
  display_name: "Guide Fari",
  email: "guide@example.com",
  explicit_content: {
    filter_enabled: false,
    filter_locked: false,
  },
  external_urls: {
    spotify: "https://open.spotify.com/user/guidefari",
  },
  followers: {
    href: null,
    total: 12,
  },
  href: "https://api.spotify.com/v1/users/guidefari",
  id: "guidefari",
  images: [],
  product: "premium",
  type: "user",
  uri: "spotify:user:guidefari",
}

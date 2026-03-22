# Browser Example

Small browser playground for manual testing.

Current capabilities:

- paste an access token
- fetch a track by ID in the browser using `spotify-effect`

Planned for issue `#12`:

- PKCE auth URL generation
- callback handling
- code exchange and refreshable user tokens

Run it from the workspace root with:

```sh
bun run example:browser
```

Then open the printed local URL.

For background on PKCE and Spotify's browser-safe auth flow, see `markdown/pkce.md`.

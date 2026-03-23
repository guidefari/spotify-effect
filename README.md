- See notes in `/markdown`

# Learning resources

- [Intro To Effect, Part 1: What Is Effect?](https://ybogomolov.me/01-effect-intro)
- [Effect Introduction](https://github.com/antoine-coulon/effect-introduction)
- [generic batching & retries](https://gist.github.com/mikearnaldi/4a13fe6f51b28ad0b07fd7bbe3f4c49a) - some examples by Michael, could be helpful. **update: it was helpful!**

# Observability

- Request and auth flows now emit Effect tracing spans at the shared boundaries.
- The examples can opt in to local tracing via `SPOTIFY_EFFECT_TRACE=1`.
- For Effect v4 beta, most old `@effect/platform` functionality lives directly in `effect`, while OpenTelemetry integration still sits outside the core package story and is easiest to demonstrate through the examples right now.
- For local setup notes and collector ideas, see `markdown/otel.md`.
- For a ready-to-run collector stack, see `examples/otel/`.

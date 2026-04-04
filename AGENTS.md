# Agent Notes

- A local copy of `spotify-web-api-ts` is available at `/Users/guidefari/source/oss/spotify-web-api-ts`.
- When checking parity against the upstream project, prefer reading that local checkout instead of fetching from GitHub when possible.
- The release pipeline handles npm publishing. Never attempt to publish packages locally from this repo.

## Type Safety

- **NEVER** use `as any` or other type assertions. Always prefer strong, explicit types.
- Type assertions bypass TypeScript's type safety and defeat the purpose of using TypeScript.
- If you encounter a type error, fix it properly rather than suppressing it with `as any`.

import * as Effect from "effect/Effect"

const program = Effect.sync(() => {
  return 10
})

export const re10 = Effect.runSync(program)

import * as Effect from "@effect/io/Effect"

const program = Effect.sync(() => {
  return 10
})

export const re10 = Effect.runSync(program)

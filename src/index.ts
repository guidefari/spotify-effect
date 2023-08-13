import * as Effect from "@effect/io/Effect"

const program = Effect.sync(() => {
  return 10
})

// New push adds to the same PR - that's so cool!

export const re10 = Effect.runSync(program)

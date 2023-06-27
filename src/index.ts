import * as Effect from "@effect/io/Effect"

const program = Effect.sync(() => {
  return 10
})
 
export default Effect.runSync(program)

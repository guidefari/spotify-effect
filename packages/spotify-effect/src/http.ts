import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

const HttpErrorSchema = Schema.Struct({
  _tag: Schema.Literal("HttpError"),
  message: Schema.String,
})
export type HttpError = typeof HttpErrorSchema.Type

export const get = <T>(url: string) =>
  Effect.tryPromise({
    try: () =>
      fetch(url).then((res) =>
        res.status === 200 ? (res.json() as Promise<T>) : Promise.reject()
      ),
    catch: (): HttpError => ({
      _tag: "HttpError",
      message: `Failed to fetch${url}`,
    }),
  })

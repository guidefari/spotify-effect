import * as Effect from "@effect/io/Effect"
import { identity, pipe } from "@effect/data/Function"
import * as Schema from "@effect/schema/Schema"


const HttpError_ = Schema.struct({ _tag: Schema.literal("HttpError") })
export interface HttpError extends Schema.To<typeof HttpError_> {}
export const HttpError: Schema.Schema<HttpError> = Schema.to(HttpError_)

export const get = <T>(url: string) =>
  Effect.tryCatchPromise(
    () => fetch(url).then((res) => res.status === 200 ? res.json() as T : Promise.reject()),
    () => identity<HttpError>({ _tag: "HttpError" })
  )
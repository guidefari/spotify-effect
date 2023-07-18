import * as Effect from "@effect/io/Effect"
import { identity, pipe } from "@effect/data/Function"
import * as Schema from "@effect/schema/Schema"


const HttpErrorSchema = Schema.struct({ _tag: Schema.literal("HttpError"), message: Schema.string })
export interface HttpError extends Schema.To<typeof HttpErrorSchema> {}

export const get = <T>(url: string) =>
  Effect.tryCatchPromise(
    () => fetch(url).then((res) => res.status === 200 ? res.json() as T : Promise.reject()),
    () => identity<HttpError>({ _tag: "HttpError", message: `Failed to fetch${url}` })
  )
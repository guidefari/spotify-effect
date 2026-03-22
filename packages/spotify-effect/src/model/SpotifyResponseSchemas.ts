import * as Schema from "effect/Schema"
import { TrackSchema } from "./SpotifyObjectSchemas"

export const GetTracksResponseSchema = Schema.Struct({
  tracks: Schema.mutable(Schema.Array(TrackSchema)),
})

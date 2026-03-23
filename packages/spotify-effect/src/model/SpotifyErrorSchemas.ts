import * as Schema from "effect/Schema";

export const SpotifyApiErrorBodySchema = Schema.Struct({
  error: Schema.Struct({
    status: Schema.Number,
    message: Schema.String,
  }),
});

export const SpotifyAccountsErrorBodySchema = Schema.Struct({
  error: Schema.String,
  error_description: Schema.optionalKey(Schema.String),
});

export const decodeSpotifyApiErrorBody = (
  body: unknown,
): { readonly message?: string; readonly body?: unknown } => {
  try {
    const decoded = Schema.decodeUnknownSync(SpotifyApiErrorBodySchema)(body);

    return {
      message: decoded.error.message,
      body: decoded,
    };
  } catch {
    return {
      ...(body === undefined ? null : { body }),
    };
  }
};

export const decodeSpotifyAccountsErrorBody = (
  body: unknown,
): { readonly message?: string; readonly body?: unknown } => {
  try {
    const decoded = Schema.decodeUnknownSync(SpotifyAccountsErrorBodySchema)(body);

    return {
      message: decoded.error_description ?? decoded.error,
      body: decoded,
    };
  } catch {
    return {
      ...(body === undefined ? null : { body }),
    };
  }
};

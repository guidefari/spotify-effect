import * as Data from "effect/Data";
import { Console, Effect } from "effect";
import { SpotifyWebApi } from "spotify-effect";
import { makeNodeTelemetryLayer } from "../../shared/nodeTelemetry";

const usage = [
  "spotify-effect basic example",
  "",
  "Usage:",
  "  bun run example:basic -- --access-token <token> <track-id>",
  "  bun run example:basic -- --client-id <id> --client-secret <secret> <track-id>",
  "",
  "If you omit required values, the script will prompt for them.",
].join("\n");

type AuthMode =
  | {
      readonly _tag: "AccessToken";
      readonly accessToken: string;
    }
  | {
      readonly _tag: "ClientCredentials";
      readonly clientId: string;
      readonly clientSecret: string;
    };

interface Inputs {
  authMode: AuthMode;
  trackId: string;
}

class ExampleInputError extends Data.TaggedError("ExampleInputError")<{
  readonly message: string;
}> {}

const formatError = (error: unknown): string => {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error && error.message.length > 0) {
    const record = error as Error & Record<string, unknown>;

    if (record._tag === "SpotifyHttpError") {
      const details = {
        _tag: record._tag,
        status: record.status,
        method: record.method,
        url: record.url,
        apiMessage: record.apiMessage,
        body: record.body,
      };

      return JSON.stringify(details, null, 2);
    }

    if (record._tag === "SpotifyTransportError" || record._tag === "SpotifyParseError") {
      return JSON.stringify(
        {
          _tag: record._tag,
          method: record.method,
          url: record.url,
          description: record.description,
          cause: record.cause,
        },
        null,
        2,
      );
    }

    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error, null, 2);
  }

  return String(error);
};

const parseInputs = (args: ReadonlyArray<string>): Partial<Inputs> => {
  let accessToken: string | undefined;
  let clientId: string | undefined;
  let clientSecret: string | undefined;
  let trackId: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === "--access-token") {
      accessToken = args[index + 1];
      index += 1;
      continue;
    }

    if (current === "--client-id") {
      clientId = args[index + 1];
      index += 1;
      continue;
    }

    if (current === "--client-secret") {
      clientSecret = args[index + 1];
      index += 1;
      continue;
    }

    if (current === "--help" || current === "-h") {
      continue;
    }

    if (trackId === undefined) {
      trackId = current;
    }
  }

  const result: Partial<Inputs> = {};

  if (accessToken !== undefined) {
    result.authMode = { _tag: "AccessToken", accessToken };
  } else if (clientId !== undefined || clientSecret !== undefined) {
    result.authMode = {
      _tag: "ClientCredentials",
      clientId: clientId ?? "",
      clientSecret: clientSecret ?? "",
    };
  }

  if (trackId !== undefined) {
    result.trackId = trackId;
  }

  return result;
};

const promptForValue = (label: string): Effect.Effect<string, ExampleInputError> =>
  Effect.try({
    try: () => {
      const promptFn = Reflect.get(globalThis, "prompt");

      if (typeof promptFn !== "function") {
        throw new ExampleInputError({
          message: "Interactive prompts are not available in this runtime",
        });
      }

      const value = promptFn(`${label}:`);

      if (value === null || value.trim().length === 0) {
        throw new ExampleInputError({ message: `${label} is required` });
      }

      return value.trim();
    },
    catch: (cause) =>
      cause instanceof ExampleInputError
        ? cause
        : new ExampleInputError({ message: `Failed to read ${label}` }),
  });

const resolveAuthMode = (parsed: Partial<Inputs>): Effect.Effect<AuthMode, ExampleInputError> =>
  Effect.gen(function* () {
    if (parsed.authMode?._tag === "AccessToken") {
      return parsed.authMode;
    }

    if (parsed.authMode?._tag === "ClientCredentials") {
      const clientId =
        parsed.authMode.clientId.length > 0
          ? parsed.authMode.clientId
          : yield* promptForValue("Spotify client id");
      const clientSecret =
        parsed.authMode.clientSecret.length > 0
          ? parsed.authMode.clientSecret
          : yield* promptForValue("Spotify client secret");

      return {
        _tag: "ClientCredentials" as const,
        clientId,
        clientSecret,
      };
    }

    const mode = yield* promptForValue("Authentication mode (access-token/client-credentials)");

    if (mode === "access-token") {
      return {
        _tag: "AccessToken" as const,
        accessToken: yield* promptForValue("Spotify access token"),
      };
    }

    if (mode === "client-credentials") {
      return {
        _tag: "ClientCredentials" as const,
        clientId: yield* promptForValue("Spotify client id"),
        clientSecret: yield* promptForValue("Spotify client secret"),
      };
    }

    return yield* new ExampleInputError({
      message: "Authentication mode must be access-token or client-credentials",
    });
  });

const resolveInputs = (args: ReadonlyArray<string>): Effect.Effect<Inputs, ExampleInputError> => {
  if (args.includes("--help") || args.includes("-h")) {
    return Effect.fail(new ExampleInputError({ message: usage }));
  }

  const parsed = parseInputs(args);

  return Effect.all({
    authMode: resolveAuthMode(parsed),
    trackId:
      parsed.trackId === undefined
        ? promptForValue("Spotify track id")
        : Effect.succeed(parsed.trackId),
  });
};

const program = resolveInputs(process.argv.slice(2)).pipe(
  Effect.flatMap((inputs) => {
    const spotify =
      inputs.authMode._tag === "AccessToken"
        ? new SpotifyWebApi({}, { accessToken: inputs.authMode.accessToken })
        : new SpotifyWebApi({
            clientId: inputs.authMode.clientId,
            clientSecret: inputs.authMode.clientSecret,
          });

    return spotify.tracks
      .getTrack(inputs.trackId)
      .pipe(Effect.flatMap((track) => Console.log(JSON.stringify(track, null, 2))));
  }),
  Effect.matchEffect({
    onFailure: (error: unknown) => Console.error(formatError(error)),
    onSuccess: () => Effect.void,
  }),
);

const telemetryLayer = makeNodeTelemetryLayer("spotify-effect-example-basic");
const traced = Effect.withSpan(program, "spotify-effect.example.basic");
const provided = telemetryLayer !== undefined ? Effect.provide(traced, telemetryLayer) : traced;
Effect.runPromise(provided);

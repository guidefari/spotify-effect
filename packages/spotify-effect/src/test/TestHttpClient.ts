import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";

export interface RequestCapture {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
}

export const makeTestHttpClient = (
  handler: (request: HttpClientRequest.HttpClientRequest) => Response,
): {
  readonly layer: Layer.Layer<HttpClient.HttpClient>;
  readonly requests: Array<RequestCapture>;
} => {
  const requests: Array<RequestCapture> = [];

  const layer = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url, _signal) => {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === "string") {
          headers[key] = value;
        }
      }

      requests.push({
        url: url.toString(),
        method: request.method,
        headers,
      });

      const response = handler(request);
      return Effect.succeed(HttpClientResponse.fromWeb(request, response));
    }),
  );

  return { layer, requests };
};

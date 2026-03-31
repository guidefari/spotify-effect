import * as NodeSdk from "@effect/opentelemetry/NodeSdk";
import type * as Resource from "@effect/opentelemetry/Resource";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ConsoleSpanExporter, SimpleSpanProcessor, type SpanExporter } from "@opentelemetry/sdk-trace-base";
import * as Layer from "effect/Layer";

export interface SpotifyNodeTelemetryOptions {
  readonly serviceName?: string;
  readonly serviceVersion?: string;
  readonly exporterUrl?: string;
  readonly exporter?: SpanExporter;
}

export const getOtlpTraceExporterUrl = (baseUrl?: string): string | undefined => {
  if (baseUrl === undefined || baseUrl.length === 0) {
    return undefined;
  }

  return baseUrl.endsWith("/v1/traces") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/v1/traces`;
};

export const makeSpotifyNodeTelemetryLayer = (
  options: SpotifyNodeTelemetryOptions = {},
): Layer.Layer<Resource.Resource> => {
  const exporter = options.exporter
    ?? (options.exporterUrl === undefined
      ? new ConsoleSpanExporter()
      : new OTLPTraceExporter({ url: options.exporterUrl }));

  return NodeSdk.layer(() => ({
    resource: {
      serviceName: options.serviceName ?? "spotify-effect",
      serviceVersion: options.serviceVersion ?? "0.1.0",
    },
    spanProcessor: new SimpleSpanProcessor(exporter),
  }));
};

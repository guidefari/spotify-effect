import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import type * as Layer from "effect/Layer"
import type * as Resource from "@effect/opentelemetry/Resource"

const isTracingEnabled = (): boolean => process.env.SPOTIFY_EFFECT_TRACE === "1"

const getTraceExporterUrl = (): string | undefined => {
  const baseUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT

  if (baseUrl === undefined || baseUrl.length === 0) {
    return undefined
  }

  return baseUrl.endsWith("/v1/traces") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/v1/traces`
}

export const makeNodeTelemetryLayer = (
  serviceName: string,
  options?: { batch?: boolean },
): Layer.Layer<Resource.Resource> | undefined => {
  if (!isTracingEnabled()) {
    return undefined
  }

  const exporterUrl = getTraceExporterUrl()
  const exporter =
    exporterUrl === undefined
      ? new ConsoleSpanExporter()
      : new OTLPTraceExporter({ url: exporterUrl })

  const processor =
    options?.batch === true
      ? new BatchSpanProcessor(exporter)
      : new SimpleSpanProcessor(exporter)

  return NodeSdk.layer(() => ({
    resource: {
      serviceName,
      serviceVersion: "0.1.0",
    },
    spanProcessor: processor,
  }))
}

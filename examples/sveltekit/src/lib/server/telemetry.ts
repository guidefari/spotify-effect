import * as NodeSdk from "@effect/opentelemetry/NodeSdk";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
	ConsoleSpanExporter,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Resource from "@effect/opentelemetry/Resource";

const isTracingEnabled = (): boolean => process.env.SPOTIFY_EFFECT_TRACE === "1";

const getTraceExporterUrl = (): string | undefined => {
	const baseUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

	if (baseUrl === undefined || baseUrl.length === 0) {
		return undefined;
	}

	return baseUrl.endsWith("/v1/traces") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/v1/traces`;
};

const telemetryLayer: Layer.Layer<Resource.Resource> | undefined = (() => {
	if (!isTracingEnabled()) {
		return undefined;
	}

	const exporterUrl = getTraceExporterUrl();
	const exporter =
		exporterUrl === undefined
			? new ConsoleSpanExporter()
			: new OTLPTraceExporter({ url: exporterUrl });

	const processor = new SimpleSpanProcessor(exporter);

	return NodeSdk.layer(() => ({
		resource: {
			serviceName: "spotify-effect-example-sveltekit",
			serviceVersion: "0.1.0",
		},
		spanProcessor: processor,
	}));
})();

export const runTraced = <A, E>(
	effect: Effect.Effect<A, E>,
	spanName: string,
): Promise<A> => {
	const traced = Effect.withSpan(effect, spanName);
	const provided = telemetryLayer !== undefined ? Effect.provide(traced, telemetryLayer) : traced;
	return Effect.runPromise(provided);
};

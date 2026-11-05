/**
 * Shared API types — mirrors the backend error envelope contract
 * (docs/architecture/backend.md). Do not hand-write endpoint types here:
 * once the API grows, types are generated from the OpenAPI schema
 * (docs/architecture/frontend.md).
 */

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export interface HealthStatus {
  status: "ok" | "degraded";
  database: boolean;
}

export interface ApiRootResponse {
  name: string;
  version: string;
  request_id: string;
  endpoints: Record<string, string>;
}

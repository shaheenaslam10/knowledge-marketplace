/**
 * Auth domain types (mirror the backend contract — docs/architecture/api.md).
 * The OpenAPI schema at /api/schema/ is the source of truth; keep in sync.
 */

export interface UserRoles {
  student: boolean;
  verified: boolean;
  staff: boolean;
  support: boolean;
  admin: boolean;
  /** Reserved slot — Phase 3 registers the expert approval provider. */
  expert: boolean;
}

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  timezone: string;
  locale: string;
  email_verified: boolean;
  roles: UserRoles;
}

export interface MeResponse {
  user: SessionUser;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface RegisterResponse {
  user: SessionUser;
  verification_required: boolean;
  detail: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: SessionUser;
}

export interface DetailResponse {
  detail: string;
}

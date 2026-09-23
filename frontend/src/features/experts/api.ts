import { API_URL_BROWSER } from "@/lib/config";
import { apiFetch } from "@/lib/api/client";
import type { ApplicationStatus, ExpertApplication, PublicExpert, StudentProfile, TaxonomyTerm } from "./types";

/**
 * Profiles/experts API surface (Phase 3). Auth flows over httpOnly cookies;
 * file uploads are multipart FormData (apiFetch leaves the boundary alone).
 */

export interface DirectoryPage {
  results: PublicExpert[];
  next?: string | null;
  previous?: string | null;
}

export interface ApplicationPayload {
  display_name: string;
  headline: string;
  bio: string;
  expertise_summary: string;
  experience_years: number;
  qualifications?: string;
  languages?: string;
  timezone?: string;
  availability_note?: string;
  subject_ids?: number[];
  skill_ids?: number[];
  certified_18_plus: boolean;
  integrity_acknowledged: boolean;
  credential_ids?: string[];
}

export const expertsApi = {
  directory: (params: Record<string, string> = {}, baseUrl = API_URL_BROWSER) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch<DirectoryPage>({ path: `/api/v1/experts${query ? `?${query}` : ""}`, baseUrl });
  },

  publicExpert: (slug: string, baseUrl = API_URL_BROWSER) =>
    apiFetch<PublicExpert>({ path: `/api/v1/experts/${encodeURIComponent(slug)}`, baseUrl }),

  applyInfo: (baseUrl = API_URL_BROWSER) =>
    apiFetch<{
      requirements: {
        credential: { max_mb: number; extensions: string[]; minimum_files: number };
        attestations: string[];
        requires_verified_email: boolean;
        upload_path: string;
        review_sla: string;
      };
      taxonomy: TaxonomyTerm[];
    }>({ path: "/api/v1/experts/apply-info", baseUrl }),

  myApplication: (baseUrl = API_URL_BROWSER) =>
    apiFetch<{ application: ExpertApplication | null; status: ApplicationStatus }>({
      path: "/api/v1/me/expert-application",
      baseUrl,
    }),

  saveApplication: (
    payload: Partial<ApplicationPayload>,
    mode: "create" | "patch",
    baseUrl = API_URL_BROWSER,
  ) =>
    apiFetch<{ application: ExpertApplication; status: ApplicationStatus }>({
      path: "/api/v1/me/expert-application",
      baseUrl,
      method: mode === "create" ? "POST" : "PATCH",
      body: JSON.stringify(payload),
    }),

  submitApplication: (baseUrl = API_URL_BROWSER) =>
    apiFetch<{ detail: string; status: ApplicationStatus }>({
      path: "/api/v1/me/expert-application/submit",
      baseUrl,
      method: "POST",
    }),

  myExpertProfile: (baseUrl = API_URL_BROWSER) =>
    apiFetch<PublicExpert>({ path: "/api/v1/me/expert-profile", baseUrl }),

  updateExpertProfile: (payload: Partial<ApplicationPayload> & { availability?: string; is_public?: boolean }, baseUrl = API_URL_BROWSER) =>
    apiFetch<PublicExpert>({
      path: "/api/v1/me/expert-profile",
      baseUrl,
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};

export const profilesApi = {
  studentProfile: (baseUrl = API_URL_BROWSER) =>
    apiFetch<{ profile: StudentProfile | null }>({ path: "/api/v1/me/student-profile", baseUrl }),

  saveStudentProfile: (
    payload: { display_name?: string; bio?: string; interest_ids?: number[] },
    baseUrl = API_URL_BROWSER,
  ) =>
    apiFetch<{ profile: StudentProfile }>({
      path: "/api/v1/me/student-profile",
      baseUrl,
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  taxonomy: (kind?: string, baseUrl = API_URL_BROWSER) => {
    const query = kind ? `?kind=${encodeURIComponent(kind)}` : "";
    return apiFetch<{ terms: TaxonomyTerm[] }>({ path: `/api/v1/taxonomy/terms${query}`, baseUrl });
  },
};

/** Uploads one file; returns the attachment id for owner objects to reference. */
export async function uploadFile(
  file: File,
  purpose: "credential" | "avatar" | "request_brief",
  baseUrl = API_URL_BROWSER,
): Promise<{ id: string; original_name: string }> {
  const form = new FormData();
  form.append("purpose", purpose);
  form.append("file", file);
  const response = await apiFetch<{ attachment: { id: string; original_name: string } }>({
    path: "/api/v1/files",
    baseUrl,
    method: "POST",
    body: form,
  });
  return response.attachment;
}

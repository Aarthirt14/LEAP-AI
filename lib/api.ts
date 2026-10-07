import { demoRole, demoResponse, DemoRequestError } from "./demo-session";
export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type DemoConfig = {
  enabled: boolean;
  roles: Record<string, string>;
  password?: string;
};

export type Beneficiary = {
  id: number;
  user_id: number | null;
  name: string;
  age: number | null;
  gender: string | null;
  district: string;
  state: string;
  preferred_language: string;
  digital_literacy: string | null;
  consent_given: boolean;
  version: number;
};

export type QualificationEligibilityFacts = {
  previous_nsqf_level: number | null;
  relevant_experience_years: number | null;
  certificates: ("NTC" | "NAC" | "CITS" | "NTC_2_YEAR")[] | null;
};

export type Profile = {
  eligibility_facts?: Record<string, QualificationEligibilityFacts> | null;
  id: number;
  beneficiary_id: number;
  education_level: string | null;
  current_occupation: string | null;
  family_occupation: string | null;
  employment_preference: string | null;
  aspiration_text: string | null;
  mobility_km: number | null;
  relocation_willingness: boolean | null;
  available_hours_start: string | null;
  available_hours_end: string | null;
  capital_available: number | string | null;
  current_income_band: string | null;
  physical_constraints: string | null;
  family_responsibilities: string | null;
  profile_completion_percentage: number;
};

export type Skill = {
  id: number;
  skill_id: number;
  experience_years: number;
  proficiency_level: string | null;
  source: string;
  formal_certificate: boolean;
  verified: boolean;
  skill_name: string | null;
};

export type Pathway = {
  id: number;
  type: "FASTEST" | "ASPIRATIONAL" | "ALTERNATIVE" | string;
  title: string;
  description: string;
  score: number;
  confidence: "GREEN" | "AMBER" | "RED" | string;
  recommended_route: string;
  status: string;
  review_status?: string | null;
  pending_human_review?: boolean;
  rpl_status: string;
  constraints: Array<{ constraint_type: string; severity: string; effect: string; penalty: number }>;
  evidence: Array<{ evidence_type: string; label: string; value: string; verification_status: string; source_type?: string; source_reference?: string | null }>;
  required_interventions: string[];
  score_breakdown: {
    skill_fit: number;
    aspiration_fit: number;
    eligibility: number;
    opportunity: number;
    mobility: number;
    training_burden: number;
    outcome_evidence: number;
  };
};

export type InterviewPreview = { preview_token: string; answers: Array<{ id: number; key: string; question: string; transcript: string; text: string; value: string | number | boolean | null; warning: string | null }> };
export type InterviewSession = { id: number; language: string; status: string; answers: Array<{ question_key: string; transcript: string; corrected_text: string | null }> };
export type Outcome = { id: number; pathway_id: number; followup_day: number; training_started: boolean; training_completed: boolean; certified: boolean; employment_status: string; verification_status: string; created_at: string };

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_RELAY === "true"
  ? "/leap-api"
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const ACCESS_KEY = "leap_access_token";
const REFRESH_KEY = "leap_refresh_token";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function saveTokens(tokens: TokenPair) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const role = demoRole();
  if (role) {
    try { return demoResponse(role, path, options.method) as T; }
    catch (error) { if (error instanceof DemoRequestError) throw new ApiError(error.message, error.status, "DEMO_READ_ONLY"); throw error; }
  }
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
  } catch {
    throw new ApiError("Unable to reach LEAP. The service may be temporarily unavailable. Please wait a moment and try again.", 0, "NETWORK_ERROR");
  }

  const body: any = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.error?.message || body?.detail;
    const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((item: {loc?: string[]; msg?: string}) => `${item.loc?.slice(1).join(" ") || "Field"}: ${item.msg || "Invalid value"}`).join("; ") : "Something went wrong.";
    const code = body?.error?.code;
    throw new ApiError(message, response.status, code);
  }
  return body as T;
}

export const api = {
  health: () => request<{ status: string; database: string }>("/health"),
  register: (payload: { email: string; password: string; phone?: string }) =>
    request<TokenPair>("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<TokenPair>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request<{ id: number; email: string; role: string }>("/api/auth/me"),
  demoConfig: () => request<DemoConfig>("/api/auth/demo-config"),
  myBeneficiary: () => request<Beneficiary>("/api/beneficiaries/me"),
  beneficiary: (id: number) => request<Beneficiary>(`/api/beneficiaries/${id}`),
  createBeneficiary: (payload: Record<string, unknown>) =>
    request<Beneficiary>("/api/beneficiaries", { method: "POST", body: JSON.stringify(payload) }),
  profile: (id: number) => request<Profile>(`/api/beneficiaries/${id}/profile`),
  skills: (id: number) => request<Skill[]>(`/api/beneficiaries/${id}/skills`),
  addSkill: (id: number, payload: Record<string, unknown>) =>
    request<Skill>(`/api/beneficiaries/${id}/skills`, { method: "POST", body: JSON.stringify(payload) }),
  startInterview: (beneficiaryId: number, language: string) =>
    request<InterviewSession>("/api/interviews", { method: "POST", body: JSON.stringify({ beneficiary_id: beneficiaryId, language, resume_existing: true }) }),
  activeInterview: (beneficiaryId: number) => request<InterviewSession | null>(`/api/interviews/active/${beneficiaryId}`),
  addInterviewAnswer: (sessionId: number, payload: Record<string, unknown>) =>
    request(`/api/interviews/${sessionId}/answers`, { method: "POST", body: JSON.stringify(payload) }),
  interviewAssistanceConfig: () => request<{enabled:boolean}>("/api/interviews/assistance/config"),
  suggestInterviewAnswer: (sessionId: number, answerId: number) => request<{status:"suggestion"|"needs_confirmation"|"unavailable"; normalized_text:string|null; source_text:string}>(`/api/interviews/${sessionId}/answers/${answerId}/suggestion`, {method:"POST", signal:AbortSignal.timeout(20000), body:JSON.stringify({consent:true})}),
  previewInterview: (id: number) => request<InterviewPreview>(`/api/interviews/${id}/preview`),
  correctInterviewAnswer: (id: number, answerId: number, text: string) => request(`/api/interviews/${id}/answers/${answerId}`, { method: "PATCH", body: JSON.stringify({ corrected_text: text }) }),
  completeInterview: (sessionId: number, token: string) => request(`/api/interviews/${sessionId}/complete`, { method: "POST", body: JSON.stringify({ confirmed: true, preview_token: token }) }),
  updateProfile: (id: number, payload: Record<string, unknown>) => request<Profile>(`/api/beneficiaries/${id}/profile`, {method: "PATCH", body: JSON.stringify(payload)}),
  recordOutcome: (payload: Record<string, unknown>) => request<Outcome>("/api/outcomes", {method:"POST",body:JSON.stringify(payload)}),
  outcomes: (id: number) => request<Outcome[]>(`/api/beneficiaries/${id}/outcomes`),
  generatePathways: (beneficiaryId: number) =>
    request<Pathway[]>(`/api/beneficiaries/${beneficiaryId}/generate-pathways`, { method: "POST" }),
  pathways: (beneficiaryId: number) => request<Pathway[]>(`/api/beneficiaries/${beneficiaryId}/pathways`),
  pathway: (id: number) => request<Pathway>(`/api/pathways/${id}`),
  fieldWorkerTasks: () => request<{ interviews_due: number; followups_due: number; human_review_cases: number; rpl_verification_cases: number }>("/api/field-worker/tasks"),
  fieldWorkerBeneficiaries: (page = 1) => request<Array<{ id: number; name: string; district: string; preferred_language: string }>>(`/api/field-worker/beneficiaries?page=${page}`),
  reviewQueue: (page = 1, status = "") => request<{ items: Array<{ id: number; beneficiary_id: number; pathway_id: number | null; reason_code: string; reason_description: string; status: string; review_notes?: string | null }>; total: number }>(`/api/reviews?page=${page}${status ? `&status=${encodeURIComponent(status)}` : ""}`),
  reviewAction: (id: number, action: "approve" | "edit" | "reject" | "resolve", notes: string) => request(`/api/reviews/${id}/${action}`, { method: "POST", body: JSON.stringify({ notes, resolution: action }) }),
  officerSummary: () => request<Record<string, number>>("/api/dashboard/summary"),
  officerFunnel: () => request<Record<string, number>>("/api/dashboard/funnel"),
  adminDiagnostics: () => request<Record<string, number | string>>("/api/admin/diagnostics"),
};

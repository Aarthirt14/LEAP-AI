export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
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

export type Profile = {
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
  rpl_status: string;
  constraints: Array<{ constraint_type: string; severity: string; effect: string; penalty: number }>;
  evidence: Array<{ evidence_type: string; label: string; value: string; verification_status: string }>;
  required_interventions: string[];
};

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const ACCESS_KEY = "leap_access_token";
const REFRESH_KEY = "leap_refresh_token";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function saveTokens(tokens: TokenPair) {
  window.localStorage.setItem(ACCESS_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
  } catch {
    throw new ApiError("LEAP AI could not reach the server. Check that the backend is running.", 0, "NETWORK_ERROR");
  }

  const body: any = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message || body?.detail || "Something went wrong.";
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
  myBeneficiary: () => request<Beneficiary>("/api/beneficiaries/me"),
  createBeneficiary: (payload: Record<string, unknown>) =>
    request<Beneficiary>("/api/beneficiaries", { method: "POST", body: JSON.stringify(payload) }),
  profile: (id: number) => request<Profile>(`/api/beneficiaries/${id}/profile`),
  skills: (id: number) => request<Skill[]>(`/api/beneficiaries/${id}/skills`),
  addSkill: (id: number, payload: Record<string, unknown>) =>
    request<Skill>(`/api/beneficiaries/${id}/skills`, { method: "POST", body: JSON.stringify(payload) }),
  startInterview: (beneficiaryId: number, language: string) =>
    request<{ id: number }>("/api/interviews", { method: "POST", body: JSON.stringify({ beneficiary_id: beneficiaryId, language }) }),
  addInterviewAnswer: (sessionId: number, payload: Record<string, unknown>) =>
    request(`/api/interviews/${sessionId}/answers`, { method: "POST", body: JSON.stringify(payload) }),
  completeInterview: (sessionId: number) =>
    request(`/api/interviews/${sessionId}/complete`, { method: "POST" }),
  generatePathways: (beneficiaryId: number) =>
    request<Pathway[]>(`/api/beneficiaries/${beneficiaryId}/generate-pathways`, { method: "POST" }),
  pathways: (beneficiaryId: number) => request<Pathway[]>(`/api/beneficiaries/${beneficiaryId}/pathways`),
  pathway: (id: number) => request<Pathway>(`/api/pathways/${id}`),
};
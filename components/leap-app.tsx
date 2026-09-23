"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Headphones,
  Loader2,
  LogOut,
  Menu,
  Mic,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Wifi,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast, Toaster } from "sonner";
import {
  ApiError,
  api,
  Beneficiary,
  clearTokens,
  getAccessToken,
  Pathway,
  Profile,
  saveTokens,
  Skill,
} from "@/lib/api";
import {
  getStoredLocale,
  getVoiceLocale,
  languageOptions,
  normalizeLocale,
  setStoredLocale,
  t,
  type Locale,
  LANGUAGE_STORAGE_KEY,
} from "@/lib/i18n";

type AppState = {
  loading: boolean;
  signedIn: boolean;
  beneficiary: Beneficiary | null;
  role: string | null;
  locale: Locale;
};

type InterviewQuestion = {
  key: string;
  title: string;
  hint: string;
  placeholder: string;
};

const questions: InterviewQuestion[] = [
  { key: "education_level", title: "What is the highest class or qualification you completed?", hint: "This helps us check training eligibility.", placeholder: "For example: 10th Standard" },
  { key: "current_occupation", title: "What work do you already know how to do?", hint: "Informal experience counts too.", placeholder: "For example: tailoring, electrical work, food preparation" },
  { key: "experience_years", title: "How long have you been doing that work?", hint: "A rough number is enough.", placeholder: "For example: 4 years" },
  { key: "family_occupation", title: "What kind of work does your family usually do?", hint: "We use this as context, not as a limit on your choices.", placeholder: "For example: farming, tailoring, daily wage work" },
  { key: "aspiration_text", title: "What kind of work would you genuinely like to do next?", hint: "Say what you want, even if it is different from your current work.", placeholder: "For example: I want to work in solar installation" },
  { key: "employment_preference", title: "Would you prefer a job, self-employment, or either?", hint: "This changes which routes are practical.", placeholder: "Job / self-employment / either" },
  { key: "mobility_km", title: "How far can you travel regularly for work or training?", hint: "Distance is used as a real constraint.", placeholder: "For example: 8 km" },
  { key: "capital_available", title: "How much could you safely invest if self-employment is an option?", hint: "You can say zero. We do not assume you can invest.", placeholder: "For example: 3000" },
  { key: "family_responsibilities", title: "Are there hours or responsibilities we should plan around?", hint: "This helps avoid unrealistic recommendations.", placeholder: "For example: I am free after 10 AM" },
  { key: "physical_constraints", title: "Is there anything that could make work or training difficult?", hint: "Only share what you are comfortable sharing.", placeholder: "For example: cannot stand for long hours" },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#163d69] text-white">
        <Route size={21} strokeWidth={2.2} />
      </div>
      <div>
        <div className="text-[15px] font-semibold tracking-[-0.02em] text-[#163d69]">LEAP AI</div>
        <div className="hidden text-[12px] text-[#334155] sm:block">Livelihood pathways that fit real lives</div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1e293b]">{children}</div>;
}

function Shell({ state, onLogout, onSelectLocale, children }: { state: AppState; onLogout: () => void; onSelectLocale: (value: Locale) => void; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const locale = state.locale;
  const nav = state.role === "FIELD_WORKER"
    ? [
        { label: t("nav.workspace", locale), href: "/field-worker" },
        { label: t("nav.beneficiaries", locale), href: "/field-worker" },
        { label: t("nav.assessments", locale), href: "/interview" },
        { label: t("nav.followups", locale), href: "/field-worker" },
      ]
    : state.role === "DISTRICT_OFFICER"
      ? [
          { label: t("nav.overview", locale), href: "/officer" },
          { label: t("nav.skillDemand", locale), href: "/officer" },
          { label: t("nav.mismatch", locale), href: "/officer" },
          { label: t("nav.outcomes", locale), href: "/officer" },
        ]
      : state.role === "FACILITATOR"
        ? [
            { label: t("nav.review", locale), href: "/review" },
            { label: t("nav.resolved", locale), href: "/review" },
          ]
        : state.role === "ADMIN"
          ? [
              { label: t("nav.overview", locale), href: "/admin" },
              { label: t("nav.review", locale), href: "/review" },
            ]
      : [
          { label: t("nav.home", locale), href: "/" },
          { label: t("nav.profile", locale), href: "/profile" },
          { label: t("nav.pathways", locale), href: "/pathways" },
          { label: t("nav.progress", locale), href: "/profile" },
        ];

  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#163d69]">
      <header className="sticky top-0 z-40 border-b border-[#dfe7f1] bg-white/90 shadow-[0_4px_20px_rgba(22,61,105,.06)] backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-5 sm:px-7">
          <button onClick={() => go("/")} aria-label="Go to home"><Logo /></button>
          <nav className="hidden items-center gap-1 md:flex">
            {state.signedIn && nav.map((item) => (
              <button key={item.href} onClick={() => go(item.href)} className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${pathname === item.href ? "bg-[#e7eefb] text-[#163d69] shadow-[inset_0_-2px_0_#2f66d0]" : "text-[#41526d] hover:bg-[#f1f5fb] hover:text-[#163d69]"}`}>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-full border border-[#dfe7f1] bg-[#f7f9fc] p-1 sm:flex">
              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSelectLocale(option.value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${state.locale === option.value ? "bg-[#163d69] text-white" : "text-[#41526d]"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {state.signedIn ? (
              <Button variant="ghost" onClick={onLogout} className="hidden sm:inline-flex"><LogOut className="mr-2" size={16} /> {t("nav.signOut", locale)}</Button>
            ) : (
              <Button onClick={() => go("/auth")}>{t("nav.signIn", locale)}</Button>
            )}
            {state.signedIn && state.beneficiary && (
              <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Open navigation">
                {menuOpen ? <X /> : <Menu />}
              </Button>
            )}
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-[#dfe7f1] bg-white px-5 py-3 md:hidden">
            {nav.map((item) => <button key={item.href} onClick={() => go(item.href)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#374357] hover:bg-[#f3f5f7]">{item.label}</button>)}
            <button onClick={onLogout} className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#8b2f28] hover:bg-[#fff2f0]">{t("nav.signOut", locale)}</button>
          </div>
        )}
      </header>
      {children}
      <Toaster richColors position="top-right" />
    </div>
  );
}

export function LeapApp() {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<number | null>(null);
  const [state, setState] = useState<AppState>({ loading: true, signedIn: false, beneficiary: null, role: null, locale: "en" });
  const [languageReady, setLanguageReady] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  });

  const setLocale = (nextLocale: Locale) => {
    setStoredLocale(nextLocale);
    setState((prev) => ({ ...prev, locale: nextLocale }));
    setLanguageReady(false);
    const validPath = ["/", "/auth", "/onboarding", "/interview", "/profile", "/pathways", "/pathway", "/field-worker", "/review", "/officer", "/admin"];
    if (validPath.includes(pathname)) {
      router.refresh();
    }
  };

  const refreshSession = async () => {
    if (!getAccessToken()) {
      setState({ loading: false, signedIn: false, beneficiary: null, role: null, locale: getStoredLocale() });
      return;
    }
    try {
      const user = await api.me();
      let beneficiary: Beneficiary | null = null;
      if (user.role === "BENEFICIARY") {
        try {
          beneficiary = await api.myBeneficiary();
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) throw error;
        }
      }
      const locale = beneficiary?.preferred_language ? normalizeLocale(beneficiary.preferred_language) : getStoredLocale();
      setStoredLocale(locale);
      setState({ loading: false, signedIn: true, beneficiary, role: user.role, locale });
    } catch {
      clearTokens();
      setState({ loading: false, signedIn: false, beneficiary: null, role: null, locale: getStoredLocale() });
    }
  };

  useEffect(() => {
    const storedLocale = getStoredLocale();
    setState((prev) => ({ ...prev, locale: storedLocale }));
    void refreshSession();
  }, []);
  useEffect(() => {
    if (pathname !== "/field-worker") {
      setSelectedBeneficiaryId(null);
      return;
    }
    const value = new URLSearchParams(window.location.search).get("beneficiary");
    setSelectedBeneficiaryId(value ? Number(value) || null : null);
  }, [pathname]);

  const logout = () => {
    clearTokens();
    setState({ loading: false, signedIn: false, beneficiary: null, role: null, locale: getStoredLocale() });
    router.push("/");
  };

  if (languageReady && !state.loading) return <LanguageScreen onSelect={(next) => { setLocale(next); }} />;
  if (state.loading) return <LoadingScreen locale={state.locale} />;

  let content: ReactNode;
  if (pathname === "/auth") content = <AuthScreen onReady={refreshSession} locale={state.locale} />;
  else if (pathname === "/onboarding") content = <Onboarding onCreated={refreshSession} locale={state.locale} />;
  else if (pathname === "/interview") content = <RequireBeneficiary state={state}><Interview beneficiary={state.beneficiary!} locale={state.locale} /></RequireBeneficiary>;
  else if (pathname === "/profile") content = <RequireBeneficiary state={state}><ProfileScreen beneficiary={state.beneficiary!} locale={state.locale} /></RequireBeneficiary>;
  else if (pathname === "/pathways") content = <RequireBeneficiary state={state}><PathwaysScreen beneficiary={state.beneficiary!} locale={state.locale} /></RequireBeneficiary>;
  else if (pathname === "/pathway") content = <RequireBeneficiary state={state}><PathwayScreen locale={state.locale} /></RequireBeneficiary>;
  else if (pathname === "/field-worker") content = <RequireRole role="FIELD_WORKER" state={state}>{selectedBeneficiaryId ? <FieldWorkerBeneficiaryView beneficiaryId={selectedBeneficiaryId} locale={state.locale} /> : <FieldWorkerDashboard locale={state.locale} />}</RequireRole>;
  else if (pathname === "/review") content = <RequireRole role="FACILITATOR" state={state}><ReviewDashboard locale={state.locale} /></RequireRole>;
  else if (pathname === "/officer") content = <RequireRole role="DISTRICT_OFFICER" state={state}><OfficerDashboard locale={state.locale} /></RequireRole>;
  else if (pathname === "/admin") content = <RequireRole role="ADMIN" state={state}><AdminDashboard locale={state.locale} /></RequireRole>;
  else if (state.signedIn && state.role === "BENEFICIARY") content = <BeneficiaryDashboard locale={state.locale} />;
  else if (state.signedIn && state.role === "FIELD_WORKER") content = <FieldWorkerDashboard locale={state.locale} />;
  else if (state.signedIn && state.role === "DISTRICT_OFFICER") content = <OfficerDashboard locale={state.locale} />;
  else content = <Landing state={state} />;

  return <Shell state={state} onLogout={logout} onSelectLocale={setLocale}>{content}</Shell>;
}

function LoadingScreen({ locale }: { locale: Locale }) {
  return <div className="grid min-h-screen place-items-center bg-[#f7f8fa]"><div className="flex items-center gap-3 text-sm font-medium text-[#536175]"><Loader2 className="animate-spin" size={18} /> {t("common.loading", locale)}</div></div>;
}

function RequireBeneficiary({ state, children }: { state: AppState; children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!state.signedIn) router.replace("/auth");
    else if (!state.beneficiary) router.replace("/onboarding");
  }, [state, router]);
  if (!state.signedIn || !state.beneficiary) return <LoadingScreen locale={state.locale} />;
  return <>{children}</>;
}

function LanguageScreen({ onSelect }: { onSelect: (value: Locale) => void }) {
  return (
    <main className="mx-auto grid min-h-screen max-w-[760px] place-items-center px-5 py-12 sm:px-7">
      <div className="w-full rounded-[28px] border border-[#dfe7f1] bg-white p-6 shadow-[0_20px_60px_rgba(22,61,105,.08)] sm:p-8">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#e7eefb] text-[#163d69]"><Route size={22} /></div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#41526d]">LEAP AI</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0f172a]">{t("language.choose", "en")}</h1>
          <p className="mt-3 text-sm leading-6 text-[#41526d]">{t("language.subtitle", "en")}</p>
        </div>
        <div className="grid gap-3">
          {languageOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className="flex items-center justify-between rounded-2xl border border-[#dfe7f1] bg-[#f7f9fc] px-5 py-4 text-left text-lg font-semibold text-[#163d69] transition hover:border-[#2f66d0] hover:bg-[#edf3ff]"
            >
              <span>{option.label}</span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

function RequireRole({ state, role, children }: { state: AppState; role: string; children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!state.signedIn) router.replace("/auth");
    else if (state.role !== role) router.replace(state.role === "FIELD_WORKER" ? "/field-worker" : state.role === "FACILITATOR" ? "/review" : state.role === "DISTRICT_OFFICER" ? "/officer" : state.role === "ADMIN" ? "/admin" : "/");
  }, [state, role, router]);
  if (!state.signedIn || state.role !== role) return <LoadingScreen locale={state.locale} />;
  return <>{children}</>;
}

function BeneficiaryDashboard({ locale }: { locale: Locale }) {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-[1120px] px-5 py-10 sm:px-7 sm:py-14">
      <div className="rounded-[28px] border border-[#dfe7f1] bg-[#edf4fd] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#41526d]">{t("dashboard.welcome", locale)}</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#163d69]">{t("common.welcome", locale)}</h1>
            <p className="mt-2 text-base text-[#41526d]">{t("dashboard.sub", locale)}</p>
          </div>
          <Button onClick={() => router.push("/interview")}>{t("dashboard.continue", locale)}</Button>
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card className="border-[#cbd5e1] bg-white"><CardContent className="p-5"><div className="text-sm font-semibold text-[#41526d]">{t("dashboard.nextStep", locale)}</div><div className="mt-3 font-semibold text-[#163d69]">Complete your profile</div><Button className="mt-4" variant="outline" onClick={() => router.push("/profile")}>{t("common.reviewProfile", locale)}</Button></CardContent></Card>
        <Card className="border-[#cbd5e1] bg-[#eefaf5]"><CardContent className="p-5"><div className="text-sm font-semibold text-[#41526d]">{t("dashboard.profile", locale)}</div><div className="mt-3 font-semibold text-[#163d69]">72% complete</div><p className="mt-2 text-sm text-[#41526d]">Current skills and pathways are ready for review.</p></CardContent></Card>
        <Card className="border-[#cbd5e1] bg-[#f3f0ff]"><CardContent className="p-5"><div className="text-sm font-semibold text-[#41526d]">{t("dashboard.pathways", locale)}</div><div className="mt-3 font-semibold text-[#163d69]">3 recommended options</div><Button className="mt-4" variant="outline" onClick={() => router.push("/pathways")}>{t("common.pathways", locale)}</Button></CardContent></Card>
      </div>
    </main>
  );
}

function FieldWorkerDashboard({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<{ interviews_due: number; followups_due: number; human_review_cases: number; rpl_verification_cases: number } | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Array<{ id: number; name: string; district: string; preferred_language: string }>>([]);
  useEffect(() => { void Promise.all([api.fieldWorkerTasks(), api.fieldWorkerBeneficiaries()]).then(([taskData, rows]) => { setTasks(taskData); setBeneficiaries(rows); }).catch(() => undefined); }, []);
  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-7">
      <div className="rounded-[26px] border border-[#dfe7f1] bg-[#183c66] p-6 text-white shadow-[0_18px_45px_rgba(14,24,42,.18)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#dfe7f1]">FIELD WORKER</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{t("worker.title", locale)}</h1>
          </div>
          <Button onClick={() => router.push("/profile")}>{t("worker.addBeneficiary", locale)}</Button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[t("worker.summaryAssigned", locale), t("worker.assessmentsPending", locale), t("worker.followUpsDue", locale), t("worker.reviewsNeeded", locale)].map((item, index) => (
          <Card key={item} className="border-[#cbd5e1] bg-white">
            <CardContent className="p-5">
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#41526d]">{item}</div>
              <div className="mt-3 text-3xl font-semibold text-[#163d69]">{tasks ? [beneficiaries.length, tasks.interviews_due, tasks.followups_due, tasks.human_review_cases][index] : "-"}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-[#dfe7f1] bg-white p-5">
        <div className="text-sm font-semibold text-[#163d69]">Beneficiary worklist</div>
        <div className="mt-3 divide-y divide-[#edf1f6]">{beneficiaries.map((beneficiary) => <button key={beneficiary.id} type="button" onClick={() => router.push(`/field-worker?beneficiary=${beneficiary.id}`)} className="flex w-full items-center justify-between py-3 text-left text-sm"><span className="font-semibold text-[#163d69]">{beneficiary.name}</span><span className="text-[#536175]">{beneficiary.district} · {beneficiary.preferred_language}</span></button>)}</div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => router.push("/interview")}>{t("worker.startAssessment", locale)}</Button>
        <Button variant="outline" onClick={() => router.push("/profile")}>{t("worker.reviewProfile", locale)}</Button>
        <Button variant="outline" onClick={() => router.push("/pathways")}>{t("worker.viewPathways", locale)}</Button>
      </div>
    </main>
  );
}

function OfficerDashboard({ locale }: { locale: Locale }) {
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [funnel, setFunnel] = useState<Record<string, number> | null>(null);
  useEffect(() => { void Promise.all([api.officerSummary(), api.officerFunnel()]).then(([summaryData, funnelData]) => { setSummary(summaryData); setFunnel(funnelData); }).catch(() => undefined); }, []);
  return (
    <main className="mx-auto max-w-[1280px] px-5 py-10 sm:px-7">
      <div className="rounded-[26px] border border-[#dfe7f1] bg-[#163d69] p-6 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#dfe7f1]">DISTRICT OFFICER</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{t("officer.title", locale)}</h1>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          [t("officer.metrics.assessed", locale), summary?.beneficiaries_profiled ?? "-"],
          [t("officer.metrics.profiles", locale), funnel?.profiled ?? "-"],
          [t("officer.metrics.pathways", locale), funnel?.recommended ?? "-"],
          [t("officer.metrics.training", locale), funnel?.enrolled ?? "-"],
          [t("officer.metrics.outcomes90", locale), summary?.positive_90_day_count ?? "-"],
          [t("officer.metrics.active180", locale), summary?.active_180_day_count ?? "-"],
        ].map(([label, value]) => (
          <Card key={String(label)} className="border-[#cbd5e1] bg-white">
            <CardContent className="p-5">
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#41526d]">{String(label)}</div>
              <div className="mt-3 text-3xl font-semibold text-[#163d69]">{String(value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-[#dfe7f1] bg-[#f7f9fc] p-5 text-sm text-[#41526d]">{t("officer.notEnough", locale)}</div>
    </main>
  );
}

function ReviewDashboard({ locale }: { locale: Locale }) {
  const [reviews, setReviews] = useState<Array<{ id: number; beneficiary_id: number; reason_code: string; reason_description: string; status: string }>>([]);
  const loadReviews = () => { void api.reviewQueue().then((data) => setReviews(data.items)).catch(() => undefined); };
  useEffect(loadReviews, []);
  const act = (id: number, action: "approve" | "edit" | "reject" | "resolve") => { void api.reviewAction(id, action).then(loadReviews).catch(() => undefined); };
  return <main className="mx-auto max-w-[1120px] px-5 py-10 sm:px-7"><div className="rounded-[26px] border border-[#dfe7f1] bg-[#4a327d] p-6 text-white"><div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#eee8ff]">FACILITATOR</div><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Review Queue</h1><p className="mt-2 text-sm text-[#eee8ff]">Inspect low-confidence recommendations before they reach a beneficiary.</p></div><div className="mt-6 space-y-3">{reviews.length ? reviews.map((review) => <Card key={review.id} className="border-[#dfe7f1]"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><div className="text-sm font-semibold text-[#163d69]">Case #{review.id} · Beneficiary {review.beneficiary_id}</div><p className="mt-2 text-sm leading-6 text-[#536175]">{review.reason_description}</p></div><Badge className="bg-[#fee2e2] text-[#991b1b]">{review.status}</Badge></div><div className="mt-4 flex gap-2"><Button size="sm" onClick={() => act(review.id, "approve")}>Approve</Button><Button size="sm" variant="outline" onClick={() => act(review.id, "edit")}>Edit</Button><Button size="sm" variant="outline" onClick={() => act(review.id, "reject")}>Reject</Button><Button size="sm" variant="outline" onClick={() => act(review.id, "resolve")}>Resolve</Button></div></CardContent></Card>) : <div className="rounded-2xl border border-[#dfe7f1] bg-white p-6 text-sm text-[#536175]">No open review cases.</div>}</div></main>;
}

function AdminDashboard({ locale }: { locale: Locale }) {
  const [diagnostics, setDiagnostics] = useState<Record<string, number | string> | null>(null);
  useEffect(() => { void api.adminDiagnostics().then(setDiagnostics).catch(() => undefined); }, []);
  return <main className="mx-auto max-w-[1120px] px-5 py-10 sm:px-7"><div className="rounded-[26px] border border-[#dfe7f1] bg-[#26364a] p-6 text-white"><div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#dfe7f1]">ADMIN</div><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">System access</h1></div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{diagnostics && Object.entries(diagnostics).map(([label, value]) => <Card key={label} className="border-[#cbd5e1]"><CardContent className="p-5"><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#536175]">{label.replaceAll("_", " ")}</div><div className="mt-3 text-2xl font-semibold text-[#163d69]">{String(value)}</div></CardContent></Card>)}</div></main>;
}

function Landing({ state }: { state: AppState }) {
  const router = useRouter();
  const locale = state.locale;
  const nextHref = state.signedIn ? (state.beneficiary ? "/interview" : "/onboarding") : "/auth";
  return (
    <main>
      <section className="border-b border-[#e7ebf0] bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 sm:px-7 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-24">
          <div>
            <Badge className="mb-5 bg-[#dbeafe] text-[#1e40af] hover:bg-[#dbeafe]">{t("home.badge", locale)}</Badge>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#0f172a] sm:text-6xl">{t("home.title", locale)}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#1e293b]">{t("home.subtitle", locale)}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => router.push(nextHref)} className="h-12 px-5">{t("home.start", locale)} <ArrowRight className="ml-2" size={18} /></Button>
              {state.signedIn && state.beneficiary && <Button size="lg" variant="outline" onClick={() => router.push("/pathways")} className="h-12 px-5">{t("home.pathways", locale)}</Button>}
            </div>
          </div>
          <div className="rounded-[28px] border border-[#cbd5e1] bg-[#f8fafc] p-5 sm:p-7">
            <div className="rounded-[22px] bg-white p-6 shadow-[0_14px_45px_rgba(26,40,60,.07)]">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#dbeafe] text-[#1e3a8a]"><Mic size={20} /></div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#065f46]"><span className="h-2 w-2 rounded-full bg-[#059669]" /> {t("common.listening", locale)}</div>
              </div>
              <div className="mt-8 text-sm font-medium text-[#334155]">{t("home.ask", locale)}</div>
              <div className="mt-2 text-2xl font-semibold leading-9 tracking-[-0.02em] text-[#0f172a]">“{t("home.options", locale)}”</div>
              <div className="mt-7 rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] p-4 text-[15px] leading-7 font-medium text-[#1e293b]">{t("home.storyCopy", locale)}</div>
              <div className="mt-6 flex flex-wrap gap-2">
                {[t("home.skillExample", locale), t("common.years", locale), t("home.aspiration", locale)].map((item) => <span key={item} className="rounded-full bg-[#e2e8f0] px-3 py-1.5 text-xs font-semibold text-[#1e3a8a]">{item}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-7">
        <SectionLabel>{t("home.howItWorks", locale)}</SectionLabel>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [Headphones, t("home.story", locale), t("home.storyCopy", locale)],
            [Target, t("home.options", locale), t("home.optionsCopy", locale)],
            [ShieldCheck, t("home.fit", locale), t("home.fitCopy", locale)],
          ].map(([Icon, title, copy]) => {
            const Comp = Icon as typeof Headphones;
            return <Card key={String(title)} className="border-[#cbd5e1] shadow-none"><CardContent className="p-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e2e8f0] text-[#1e3a8a]"><Comp size={19} /></div><h2 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-[#0f172a]">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-[#334155]">{String(copy)}</p></CardContent></Card>;
          })}
        </div>
      </section>
    </main>
  );
}

function AuthScreen({ onReady, locale }: { onReady: () => Promise<void>; locale: Locale }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoConfig, setDemoConfig] = useState<{ enabled: boolean; roles: Record<string, string>; password?: string }>({ enabled: false, roles: {} });

  useEffect(() => {
    void api.demoConfig().then(setDemoConfig).catch(() => setDemoConfig({ enabled: false, roles: {} }));
  }, []);

  const applyDemo = (role: string) => {
    setMode("login");
    setEmail(demoConfig.roles[role] || "");
    setPassword(demoConfig.password || "");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const tokens = mode === "login" ? await api.login({ email, password }) : await api.register({ email, password, phone: phone || undefined });
      saveTokens(tokens);
      await onReady();
      const user = await api.me();
      if (user.role === "FIELD_WORKER") router.push("/field-worker");
      else if (user.role === "FACILITATOR") router.push("/review");
      else if (user.role === "DISTRICT_OFFICER") router.push("/officer");
      else if (user.role === "ADMIN") router.push("/admin");
      else {
        try { await api.myBeneficiary(); router.push("/"); }
        catch (error) { if (error instanceof ApiError && error.status === 404) router.push("/onboarding"); else throw error; }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto grid max-w-[1100px] gap-10 px-5 py-12 sm:px-7 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-20">
      <div className="hidden lg:block">
        <SectionLabel>{t("auth.signIn", locale)}</SectionLabel>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#0f172a]">Your profile should come from your story, not from a pre-filled template.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-[#1e293b]">Create an account, tell LEAP what you actually know and want, and let the recommendation engine build pathways from your own inputs.</p>
      </div>
      <Card className="mx-auto w-full max-w-[520px] border-[#cbd5e1] shadow-[0_20px_60px_rgba(26,40,60,.08)]">
        <CardContent className="p-6 sm:p-8">
          <div className="flex gap-1 rounded-xl bg-[#e2e8f0] p-1">
            <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-white text-[#0f172a] shadow-sm" : "text-[#334155]"}`} onClick={() => setMode("login")}>Sign in</button>
            <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${mode === "register" ? "bg-white text-[#0f172a] shadow-sm" : "text-[#334155]"}`} onClick={() => setMode("register")}>Create account</button>
          </div>
          <h2 className="mt-7 text-2xl font-semibold tracking-[-0.03em] text-[#0f172a]">{mode === "login" ? t("auth.welcomeBack", locale) : t("auth.createAccount", locale)}</h2>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label={t("auth.email", locale)}><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@example.com" /></Field>
            {mode === "register" && <Field label={t("auth.phone", locale)}><input value={phone} onChange={(e) => setPhone(e.target.value)} className="field" placeholder={t("auth.mobile", locale)} /></Field>}
            <Field label={t("auth.password", locale)}><input required minLength={10} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" placeholder={t("auth.atLeast10", locale)} /></Field>
            <Button disabled={busy} className="h-11 w-full">{busy && <Loader2 className="mr-2 animate-spin" size={16} />}{mode === "login" ? t("auth.signIn", locale) : t("auth.create", locale)}</Button>
          </form>
          {demoConfig.enabled && mode === "login" && (
            <div className="mt-7 border-t border-[#dfe7f1] pt-5">
              <div className="text-sm font-semibold text-[#163d69]">Explore LEAP AI</div>
              <p className="mt-1 text-xs leading-5 text-[#536175]">Local presentation accounts only. Select a role to fill the login form.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {["BENEFICIARY", "FIELD_WORKER", "FACILITATOR", "DISTRICT_OFFICER", "ADMIN"].map((role) => (
                  <button key={role} type="button" onClick={() => applyDemo(role)} className="rounded-xl border border-[#cbd5e1] bg-[#f7f9fc] px-3 py-2.5 text-left text-xs font-semibold text-[#163d69] hover:border-[#2f66d0] hover:bg-[#edf4fd]">
                    Try as {role === "FIELD_WORKER" ? "Field Worker" : role === "DISTRICT_OFFICER" ? "District Officer" : role[0] + role.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-[#0f172a]">{label}</span>{children}</label>;
}

function Onboarding({ onCreated, locale }: { onCreated: () => Promise<void>; locale: Locale }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", age: "", gender: "", district: "", preferred_language: "Tamil", digital_literacy: "LOW", consent_given: true });
  const update = (key: string, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createBeneficiary({ ...form, age: form.age ? Number(form.age) : null, state: "Tamil Nadu" });
      await onCreated();
      router.push("/interview");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your profile.");
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-[900px] px-5 py-12 sm:px-7">
      <SectionLabel>{t("onboarding.startHere", locale)}</SectionLabel>
      <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#0f172a] sm:text-4xl">{t("onboarding.title", locale)}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[#1e293b]">{t("onboarding.subtitle", locale)}</p>
      <Card className="mt-8 border-[#cbd5e1] shadow-none"><CardContent className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        <form onSubmit={submit} className="contents">
          <Field label={t("onboarding.name", locale)}><input required value={form.name} onChange={(e) => update("name", e.target.value)} className="field" placeholder={t("onboarding.name", locale)} /></Field>
          <Field label={t("onboarding.age", locale)}><input type="number" min="14" max="100" value={form.age} onChange={(e) => update("age", e.target.value)} className="field" placeholder={t("onboarding.age", locale)} /></Field>
          <Field label={t("onboarding.gender", locale)}><input value={form.gender} onChange={(e) => update("gender", e.target.value)} className="field" /></Field>
          <Field label={t("onboarding.district", locale)}><input required value={form.district} onChange={(e) => update("district", e.target.value)} className="field" placeholder="Madurai" /></Field>
          <Field label={t("onboarding.language", locale)}><select value={form.preferred_language} onChange={(e) => update("preferred_language", e.target.value)} className="field"><option>Tamil</option><option>Hindi</option><option>English</option></select></Field>
          <Field label={t("onboarding.digital", locale)}><select value={form.digital_literacy} onChange={(e) => update("digital_literacy", e.target.value)} className="field"><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></Field>
          <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-4 text-sm leading-6 text-[#1e293b]"><input type="checkbox" checked={form.consent_given} onChange={(e) => update("consent_given", e.target.checked)} className="mt-1" /><span className="font-medium">{t("onboarding.consent", locale)}</span></label>
          <div className="sm:col-span-2 flex justify-end"><Button disabled={busy || !form.consent_given} size="lg">{busy && <Loader2 className="mr-2 animate-spin" size={16} />}{t("onboarding.button", locale)} <ArrowRight className="ml-2" size={17} /></Button></div>
        </form>
      </CardContent></Card>
    </main>
  );
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const localizedQuestionTitles: Record<Locale, Record<string, string>> = {
  en: Object.fromEntries(questions.map((question) => [question.key, question.title])),
  ta: {
    education_level: "நீங்கள் முடித்த அதிகபட்ச வகுப்பு அல்லது தகுதி என்ன?",
    current_occupation: "உங்களுக்கு ஏற்கனவே தெரிந்த வேலை என்ன?",
    experience_years: "அந்த வேலையை எவ்வளவு காலமாக செய்து வருகிறீர்கள்?",
    family_occupation: "உங்கள் குடும்பம் பொதுவாக என்ன வேலை செய்கிறது?",
    aspiration_text: "அடுத்து நீங்கள் உண்மையாக செய்ய விரும்பும் வேலை என்ன?",
    employment_preference: "வேலை, சுயதொழில் அல்லது இரண்டில் ஏதாவது ஒன்றை விரும்புகிறீர்களா?",
    mobility_km: "வேலை அல்லது பயிற்சிக்காக தொடர்ந்து எவ்வளவு தூரம் செல்ல முடியும்?",
    capital_available: "சுயதொழிலுக்கு பாதுகாப்பாக எவ்வளவு முதலீடு செய்ய முடியும்?",
    family_responsibilities: "எந்த நேரங்கள் அல்லது பொறுப்புகளை திட்டமிட வேண்டும்?",
    physical_constraints: "வேலை அல்லது பயிற்சியை கடினமாக்கும் ஏதேனும் உள்ளதா?",
  },
  hi: {
    education_level: "आपने कौन सी सबसे ऊँची कक्षा या योग्यता पूरी की है?",
    current_occupation: "आप कौन सा काम पहले से करना जानते हैं?",
    experience_years: "आप यह काम कितने समय से कर रहे हैं?",
    family_occupation: "आपका परिवार आम तौर पर किस तरह का काम करता है?",
    aspiration_text: "आप आगे सच में किस तरह का काम करना चाहते हैं?",
    employment_preference: "आप नौकरी, स्वरोजगार या दोनों में से क्या पसंद करेंगे?",
    mobility_km: "काम या प्रशिक्षण के लिए आप नियमित रूप से कितनी दूर जा सकते हैं?",
    capital_available: "स्वरोजगार के लिए आप सुरक्षित रूप से कितना निवेश कर सकते हैं?",
    family_responsibilities: "कौन से समय या जिम्मेदारियों को ध्यान में रखना चाहिए?",
    physical_constraints: "क्या कोई चीज काम या प्रशिक्षण को कठिन बना सकती है?",
  },
};

function Interview({ beneficiary, locale }: { beneficiary: Beneficiary; locale: Locale }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const question = questions[index];
  const progress = Math.round(((index + 1) / questions.length) * 100);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const startListening = () => {
    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      toast.info("Voice input is not available in this browser. You can type your answer instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = getVoiceLocale(locale);
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) transcript += event.results[i][0].transcript;
      setAnswer(transcript.trim());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); toast.error("Voice input stopped. You can continue by typing."); };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const saveAnswer = async () => {
    if (!answer.trim()) { toast.error("Add an answer before continuing."); return; }
    setBusy(true);
    try {
      let activeSession = sessionId;
      if (!activeSession) {
        const session = await api.startInterview(beneficiary.id, beneficiary.preferred_language);
        activeSession = session.id;
        setSessionId(activeSession);
      }
      await api.addInterviewAnswer(activeSession, {
        question_key: question.key,
        question_text: question.title,
        transcript: answer.trim(),
        language: beneficiary.preferred_language,
        speech_confidence: listening ? 0.82 : null,
        extraction_confidence: 0.9,
      });
      const nextAnswers = { ...answers, [question.key]: answer.trim() };
      setAnswers(nextAnswers);
      setAnswer("");
      if (index < questions.length - 1) {
        setIndex((value) => value + 1);
        return;
      }
      await api.completeInterview(activeSession);
      const skillName = nextAnswers.current_occupation?.trim();
      const years = Number((nextAnswers.experience_years || "0").match(/[\d.]+/)?.[0] || 0);
      if (skillName) {
        try {
          await api.addSkill(beneficiary.id, {
            name: skillName,
            sector: skillName,
            experience_years: years,
            proficiency_level: years >= 3 ? "INTERMEDIATE" : "BEGINNER",
            source: "SELF_REPORTED",
            formal_certificate: false,
            verified: false,
          });
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 409) throw error;
        }
      }
      await api.generatePathways(beneficiary.id);
      toast.success("Your livelihood profile is ready.");
      router.push("/pathways");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your answer.");
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-[1040px] px-5 py-10 sm:px-7 sm:py-14">
      <div className="flex items-center justify-between gap-4">
        <div><SectionLabel>{t("interview.progressLabel", locale)}</SectionLabel><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#0f172a]">{t("interview.title", locale)}</h1></div>
        <div className="hidden text-right sm:block"><div className="text-sm font-semibold text-[#1e293b]">{t("interview.progressLabel", locale)} {index + 1} {t("interview.of", locale)} {questions.length}</div><div className="mt-1 text-xs font-medium text-[#334155]">{progress}% complete</div></div>
      </div>
      <Progress value={progress} className="mt-6 h-1.5" />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border-[#cbd5e1] shadow-[0_18px_50px_rgba(26,40,60,.07)]"><CardContent className="p-6 sm:p-9">
          <div className="text-sm font-semibold text-[#1e3a8a]">{t("interview.question", locale)}</div>
          <h2 className="mt-2 text-2xl font-semibold leading-9 tracking-[-0.025em] text-[#0f172a] sm:text-3xl">{localizedQuestionTitles[locale][question.key] || question.title}</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-[#1e293b]">{t("interview.helper", locale)}</p>
          <div className="mt-7">
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} placeholder={question.placeholder} className="resize-none rounded-2xl border-[#cbd5e1] bg-white p-4 text-base leading-7 font-medium text-[#0f172a]" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={listening ? stopListening : startListening} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${listening ? "border-[#059669] bg-[#ecfdf5] text-[#065f46]" : "border-[#cbd5e1] bg-white text-[#0f172a] hover:bg-[#f8fafc]"}`}>
                <Mic size={17} /> {listening ? t("common.listening", locale) : t("interview.voice", locale)}
              </button>
              <Button disabled={busy || !answer.trim()} onClick={saveAnswer}>{busy && <Loader2 className="mr-2 animate-spin" size={16} />}{index === questions.length - 1 ? t("interview.build", locale) : t("interview.save", locale)}<ChevronRight className="ml-1" size={17} /></Button>
            </div>
          </div>
        </CardContent></Card>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#cbd5e1] bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]"><ShieldCheck size={17} /> {t("interview.useThis", locale)}</div>
            <p className="mt-3 text-sm leading-6 text-[#1e293b]">{t("interview.useThisCopy", locale)}</p>
          </div>
          <div className="rounded-2xl border border-[#cbd5e1] bg-[#f1f5f9] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]"><Wifi size={17} /> {t("interview.voiceOptional", locale)}</div>
            <p className="mt-3 text-sm leading-6 text-[#1e293b]">{t("interview.voiceOptionalCopy", locale)}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ProfileScreen({ beneficiary, locale }: { beneficiary: Beneficiary; locale: Locale }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([api.profile(beneficiary.id), api.skills(beneficiary.id)])
      .then(([profileData, skillsData]) => { setProfile(profileData); setSkills(skillsData); })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load your profile."))
      .finally(() => setLoading(false));
  }, [beneficiary.id]);

  if (loading) return <PageLoader text="Loading your livelihood profile…" />;
  if (!profile) return <EmptyState title="Your profile is not ready yet" copy="Complete the assessment first so LEAP can build your livelihood profile." action="Start assessment" onAction={() => router.push("/interview")} />;

  const details = [
    ["Education", profile.education_level || "Not provided"],
    ["Current work", profile.current_occupation || "Not provided"],
    ["Goal", profile.aspiration_text || "Not provided"],
    ["Work preference", profile.employment_preference || "Not provided"],
    ["Travel range", profile.mobility_km != null ? `${profile.mobility_km} km` : "Not provided"],
    ["Available capital", profile.capital_available != null ? `₹${profile.capital_available}` : "Not provided"],
    ["Family responsibilities", profile.family_responsibilities || "Not provided"],
    ["Physical constraints", profile.physical_constraints || "None noted"],
  ];

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-10 sm:px-7 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><SectionLabel>Your livelihood profile</SectionLabel><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#163d69]">What LEAP understood about you</h1><p className="mt-3 text-base text-[#41526d]">A living picture of your experience, responsibilities and direction.</p></div>
        <div className="flex items-center gap-3 rounded-2xl bg-[#e7eefb] px-4 py-3"><div className="score-ring h-16 w-16" style={{ "--score": profile.profile_completion_percentage } as React.CSSProperties}><span className="relative z-10 text-sm font-bold text-[#163d69]">{Math.round(profile.profile_completion_percentage)}%</span></div><div><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#41526d]">Profile</div><div className="font-semibold text-[#163d69]">Completeness</div></div></div>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="border-[#c7d8ee] bg-[#edf4fd] shadow-none"><CardContent className="p-6 sm:p-7"><div className="flex items-center gap-2 font-semibold text-[#163d69]"><BriefcaseBusiness size={18} /> Current experience</div><div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">{details.slice(0, 6).map(([label, value]) => <div key={label}><div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#41526d]">{label}</div><div className="mt-1.5 text-[15px] font-semibold leading-6 text-[#163d69]">{value}</div></div>)}</div></CardContent></Card>
        <div className="space-y-5"><Card className="border-[#d2d2f6] bg-[#f0f0ff] shadow-none"><CardContent className="p-6 sm:p-7"><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5b5bd6]">What you want to become</div><blockquote className="mt-4 text-2xl font-semibold leading-9 tracking-[-0.025em] text-[#303078]">“{profile.aspiration_text || "Your next chapter will take shape here."}”</blockquote><div className="mt-4 text-sm font-medium text-[#4b4b9e]">Your aspiration is considered separately from your current experience.</div></CardContent></Card><Card className="border-[#c5e4d9] bg-[#edf9f3] shadow-none"><CardContent className="p-6 sm:p-7"><div className="flex items-center gap-2 font-semibold text-[#176b58]"><BriefcaseBusiness size={18} /> Skills and experience</div><div className="mt-5 flex flex-wrap gap-2">{skills.length ? skills.map((skill) => <span key={skill.id} className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#176b58] shadow-sm">{skill.skill_name || "Skill"} · {skill.experience_years}y{skill.verified ? " · verified" : ""}</span>) : <p className="text-sm leading-6 font-medium text-[#176b58]">Your experience will appear here after assessment.</p>}</div></CardContent></Card></div>
      </div>
      <div className="mt-6 grid gap-4 rounded-2xl border border-[#c5e4d9] bg-[#eaf8f1] p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1f8a70]">What you know</div><div className="mt-1 font-semibold text-[#176b58]">Experience, skills and real constraints</div></div><div className="hidden text-2xl text-[#5b5bd6] sm:block">↔</div><div><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5b5bd6]">What you want</div><div className="mt-1 font-semibold text-[#303078]">Aspiration and possibility</div></div><p className="text-sm font-semibold text-[#163d69] sm:col-span-3">Your past does not decide your future. Both matter.</p></div>
      <div className="mt-6 flex justify-end"><Button onClick={() => router.push("/pathways")}>See my pathways <ArrowRight className="ml-2" size={17} /></Button></div>
    </main>
  );
}

function PathwaysScreen({ beneficiary, locale }: { beneficiary: Beneficiary; locale: Locale }) {
  const router = useRouter();
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const load = async (generate = false) => {
    try {
      const data = generate ? await api.generatePathways(beneficiary.id) : await api.pathways(beneficiary.id);
      if (!data.length && !generate) return load(true);
      setPathways(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load pathways.");
    } finally { setLoading(false); setRegenerating(false); }
  };

  useEffect(() => { void load(false); }, [beneficiary.id]);

  if (loading) return <PageLoader text="Building pathways from your profile…" />;
  return (
    <main className="mx-auto max-w-[1120px] px-5 py-10 sm:px-7 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><SectionLabel>Your recommendations</SectionLabel><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#163d69]">Paths that fit your situation</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[#41526d]">Scores are calculated from your profile, current skills, eligibility, local training access and practical constraints.</p></div>
        <Button variant="outline" disabled={regenerating} onClick={() => { setRegenerating(true); void load(true); }}>{regenerating && <Loader2 className="mr-2 animate-spin" size={16} />}Recalculate</Button>
      </div>
      {pathways.length === 0 ? <div className="mt-10"><EmptyState title="No valid pathways found yet" copy="Your profile may need more evidence, or the local qualification data may not have a valid match yet." action="Review profile" onAction={() => router.push("/profile")} /></div> : (
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {pathways.map((pathway, i) => <PathwayCard key={pathway.id} pathway={pathway} rank={i + 1} onOpen={() => router.push(`/pathway?id=${pathway.id}`)} />)}
        </div>
      )}
      <div className="mt-8 rounded-2xl border border-[#cbd5e1] bg-white p-5 text-sm leading-6 text-[#1e293b]"><span className="font-semibold text-[#0f172a]">Why this is different from a chatbot answer:</span> the backend excludes invalid qualifications, checks constraints, applies one scoring model, and sends low-confidence cases for human review.</div>
    </main>
  );
}

function PathwayCard({ pathway, rank, onOpen }: { pathway: Pathway; rank: number; onOpen: () => void }) {
  const confidenceStyle = pathway.confidence === "GREEN" ? "bg-[#d1fae5] text-[#065f46]" : pathway.confidence === "RED" ? "bg-[#fee2e2] text-[#991b1b]" : "bg-[#fef3c7] text-[#92400e]";
  return (
    <Card className={`group border shadow-none transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(30,45,65,.1)] ${rank === 1 ? "border-[#b9d0f0] bg-[#edf4fd] lg:-mt-3" : rank === 2 ? "border-[#d2d2f6] bg-[#f0f0ff]" : "border-[#c5e4d9] bg-[#edf9f3]"}`}>
      <CardContent className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#dbeafe] text-sm font-semibold text-[#1e3a8a]">{rank}</div><Badge className={confidenceStyle}>{pathway.confidence.toLowerCase()} confidence</Badge></div>
        <div className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#334155]">{pathway.type.replaceAll("_", " ")}</div>
        <h2 className="mt-2 text-xl font-semibold leading-7 tracking-[-0.025em] text-[#0f172a]">{pathway.title}</h2>
        <div className="mt-5 flex items-center gap-4"><div className="score-ring h-20 w-20" style={{ "--score": pathway.score } as React.CSSProperties}><span className="relative z-10 text-2xl font-bold text-[#163d69]">{Math.round(pathway.score)}</span></div><div><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#41526d]">Fit score</div><div className="mt-1 text-sm font-semibold text-[#163d69]">{humanize(pathway.confidence)} confidence</div></div></div>
        <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-[#e2e8f0] px-3 py-1.5 text-xs font-semibold text-[#0f172a]">{routeLabel(pathway.recommended_route)}</span>{pathway.constraints.slice(0, 1).map((constraint) => <span key={constraint.constraint_type} className="rounded-full bg-[#fef3c7] px-3 py-1.5 text-xs font-semibold text-[#92400e]">{humanize(constraint.constraint_type)}</span>)}</div>
        <button onClick={onOpen} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#1d4ed8]">See why this fits <ChevronRight size={16} className="transition group-hover:translate-x-0.5" /></button>
      </CardContent>
    </Card>
  );
}

function PathwayScreen({ locale }: { locale: Locale }) {
  const search = useSearchParams();
  const router = useRouter();
  const id = Number(search.get("id"));
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    void api.pathway(id).then(setPathway).catch((error) => toast.error(error instanceof Error ? error.message : "Could not load this pathway.")).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader text="Loading pathway details…" />;
  if (!pathway) return <EmptyState title="Pathway not found" copy="Return to your recommendations and choose a pathway again." action="Back to pathways" onAction={() => router.push("/pathways")} />;

  return (
    <main className="mx-auto max-w-[980px] px-5 py-10 sm:px-7 sm:py-14">
      <button onClick={() => router.push("/pathways")} className="mb-7 text-sm font-semibold text-[#1e3a8a]">← Back to pathways</button>
      <div className="grid gap-7 lg:grid-cols-[1fr_300px]">
        <div>
          <SectionLabel>{pathway.type.replaceAll("_", " ")}</SectionLabel>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#0f172a]">{pathway.title}</h1>
          <p className="mt-4 text-base leading-7 text-[#1e293b]">{pathway.description}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <InfoBlock icon={BadgeCheck} title="Recommended route" value={routeLabel(pathway.recommended_route)} />
            <InfoBlock icon={ShieldCheck} title="Confidence" value={`${humanize(pathway.confidence)} confidence`} />
          </div>
          <div className="mt-8 border-t border-[#cbd5e1] pt-8">
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0f172a]">Why this pathway fits</h2>

            {/* Subsection 1: What already works in your favour */}
            <div className="mt-6">
              <h3 className="text-base font-semibold text-[#0f172a] flex items-center gap-2">
                <BadgeCheck className="text-[#059669]" size={19} /> What already works in your favour
              </h3>
              <div className="mt-3 space-y-3">
                {pathway.evidence.filter((e) => ["SKILL", "ASPIRATION", "ELIGIBILITY", "OPPORTUNITY"].includes(e.evidence_type)).map((item, index) => (
                  <div key={`favour-${index}`} className="rounded-xl border border-[#cbd5e1] bg-white p-4">
                    <div className="font-semibold text-[#0f172a]">{item.label}</div>
                    <div className="mt-1 text-sm font-medium text-[#1e293b]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subsection 2: What you may need */}
            <div className="mt-7">
              <h3 className="text-base font-semibold text-[#0f172a] flex items-center gap-2">
                <BriefcaseBusiness className="text-[#2563eb]" size={19} /> What you may need
              </h3>
              <div className="mt-3 space-y-3">
                {pathway.evidence.filter((e) => e.evidence_type === "RPL").map((item, index) => (
                  <div key={`need-${index}`} className="rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-4">
                    <div className="font-semibold text-[#0f172a]">{item.label}</div>
                    <div className="mt-1 text-sm font-medium text-[#1e293b]">{item.value}</div>
                  </div>
                ))}
                <div className="rounded-xl border border-[#cbd5e1] bg-white p-4">
                  <div className="font-semibold text-[#0f172a]">Recommended Route</div>
                  <div className="mt-1 text-sm font-medium text-[#1e293b]">{routeLabel(pathway.recommended_route)}</div>
                </div>
              </div>
            </div>

            {/* Subsection 3: Things to plan around */}
            <div className="mt-7">
              <h3 className="text-base font-semibold text-[#0f172a] flex items-center gap-2">
                <CircleAlert className="text-[#d97706]" size={19} /> Things to plan around
              </h3>
              <div className="mt-3 space-y-3">
                {pathway.evidence.filter((e) => ["CONSTRAINT", "MOBILITY"].includes(e.evidence_type)).map((item, index) => (
                  <div key={`plan-${index}`} className="flex gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4">
                    <CircleAlert className="mt-0.5 shrink-0 text-[#92400e]" size={18} />
                    <div>
                      <div className="font-semibold text-[#78350f]">{item.label}</div>
                      <div className="mt-1 text-sm font-medium text-[#92400e]">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subsection 4: How this score was calculated */}
            <div className="mt-7">
              <h3 className="text-base font-semibold text-[#0f172a] flex items-center gap-2">
                <Sparkles className="text-[#7c3aed]" size={19} /> How this score was calculated
              </h3>
              <div className="mt-3 rounded-xl border border-[#cbd5e1] bg-white p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#334155]">Overall Fit Score</span>
                  <span className="font-bold text-[#1e3a8a] text-lg">{Math.round(pathway.score)} / 100</span>
                </div>
                <div className="text-xs text-[#334155] leading-5">
                  Calculated deterministically from skill evidence, aspiration alignment, minimum qualification eligibility, local training accessibility, mobility constraints, and historical outcome verification.
                </div>
                {pathway.evidence.some((e) => e.evidence_type === "OUTCOME_EVIDENCE") ? (
                  <div className="rounded-lg bg-[#ecfdf5] p-3 text-xs font-semibold text-[#065f46]">
                    ✓ Includes verified historical 90-day employment outcome evidence
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#f1f5f9] p-3 text-xs font-medium text-[#334155]">
                    Note: Outcome evidence component uses neutral baseline score (historical sample size below minimum threshold).
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <aside>
          <div className="sticky top-24 rounded-2xl bg-[#1e3a8a] p-6 text-white">
            <div className="text-sm font-medium text-[#bfdbfe]">Overall fit</div><div className="mt-1 text-5xl font-semibold tracking-[-0.05em]">{Math.round(pathway.score)}</div><div className="mt-6 border-t border-white/20 pt-5 text-sm leading-6 text-[#e0e7ff]">This score is recalculated from stored evidence. It is not a fixed display value.</div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function InfoBlock({ icon: Icon, title, value }: { icon: typeof Sparkles; title: string; value: string }) {
  return <div className="rounded-2xl border border-[#cbd5e1] bg-white p-5"><div className="flex items-center gap-2 text-sm font-semibold text-[#334155]"><Icon size={17} /> {title}</div><div className="mt-2 font-bold text-[#0f172a]">{value}</div></div>;
}

function PageLoader({ text }: { text: string }) {
  return <main className="mx-auto grid min-h-[60vh] max-w-[900px] place-items-center px-5"><div className="flex items-center gap-3 text-sm font-semibold text-[#0f172a]"><Loader2 size={18} className="animate-spin" /> {text}</div></main>;
}

function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action: string; onAction: () => void }) {
  return <main className="mx-auto grid min-h-[60vh] max-w-[760px] place-items-center px-5"><div className="w-full rounded-2xl border border-[#cbd5e1] bg-white p-8 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#dbeafe] text-[#1e3a8a]"><ClipboardList size={20} /></div><h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#0f172a]">{title}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 font-medium text-[#1e293b]">{copy}</p><Button className="mt-6" onClick={onAction}>{action}</Button></div></main>;
}

function humanize(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function routeLabel(value: string) {
  const labels: Record<string, string> = {
    RPL: "RPL assessment",
    RPL_OR_BRIDGE: "RPL or bridge training",
    BRIDGE_TRAINING: "Bridge training",
    FULL_TRAINING: "Full training",
    NOT_APPLICABLE: "Direct pathway",
  };
  return labels[value] || humanize(value);
}

function FieldWorkerBeneficiaryView({ beneficiaryId, locale }: { beneficiaryId: number; locale: Locale }) {
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  useEffect(() => { void api.beneficiary(beneficiaryId).then(setBeneficiary).catch(() => undefined); }, [beneficiaryId]);
  if (!beneficiary) return <LoadingScreen locale={locale} />;
  return <ProfileScreen beneficiary={beneficiary} locale={locale} />;
}
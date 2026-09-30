"use client";

import { FormEvent, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
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
import { LandingPage } from "@/components/leap/landing";
import { PageHeading, Panel, Notice, PendingReview, EvidenceRow, words } from "@/components/leap/primitives";
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
  InterviewPreview,
  Outcome,
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
 return <div className="brand"><span className="brand-icon"><Route size={23}/></span><div><strong>LEAP AI</strong><small>Livelihood pathways</small></div></div>;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
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
          { label: t("nav.progress", locale), href: "/progress" },
        ];

  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

  return (
    <div className="leap-shell min-h-screen">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="leap-header sticky top-0 z-40">
        <div className="leap-header-inner">
          <button onClick={() => go("/")} aria-label="Go to home"><Logo /></button>
          <nav className="hidden items-center gap-1 md:flex">
            {state.signedIn && nav.filter((item,index,rows)=>rows.findIndex(row=>row.href===item.href)===index).map((item) => (
              <button key={`${item.label}-${item.href}`} onClick={() => go(item.href)} className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${pathname === item.href ? "bg-[#EEF3FA] text-[#071A3D] shadow-[inset_0_-2px_0_#087647]" : "text-[#41526d] hover:bg-[#f1f5fb] hover:text-[#071A3D]"}`}>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <select aria-label="Language" className="language-select" value={locale} onChange={e=>onSelectLocale(e.target.value as Locale)}>{languageOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
            {state.signedIn ? (
              <Button variant="ghost" onClick={onLogout} className="hidden sm:inline-flex"><LogOut className="mr-2" size={16} /> {t("nav.signOut", locale)}</Button>
            ) : (
              <Button onClick={() => go("/auth")}>{t("nav.signIn", locale)}</Button>
            )}
            {state.signedIn && (
              <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Open navigation" aria-expanded={menuOpen}>
                {menuOpen ? <X /> : <Menu />}
              </Button>
            )}
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-[#DDE3E5] bg-white px-5 py-3 md:hidden">
            {nav.filter((item,index,rows)=>rows.findIndex(row=>row.href===item.href)===index).map((item) => <button key={`${item.label}-${item.href}`} onClick={() => go(item.href)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#374357] hover:bg-[#f3f5f7]">{item.label}</button>)}
            <button onClick={onLogout} className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#8b2f28] hover:bg-[#fff2f0]">{t("nav.signOut", locale)}</button>
          </div>
        )}
      </header>
      <div id="main-content" tabIndex={-1}>{children}</div>
      <Toaster richColors position="top-right" />
    </div>
  );
}

export function LeapApp() { return <Suspense fallback={<LoadingScreen locale="en"/>}><LeapAppInner/></Suspense>; }

function LeapAppInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sessionError, setSessionError] = useState("");
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
    const validPath = ["/", "/auth", "/onboarding", "/interview", "/profile", "/pathways", "/pathway", "/progress", "/field-worker", "/review", "/officer", "/admin"];
    if (validPath.includes(pathname)) {
      router.refresh();
    }
  };

  const refreshSession = async () => {
    setSessionError("");
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
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) {
        setSessionError(error instanceof Error ? error.message : "Could not reconnect.");
        setState(prev=>({...prev,loading:false}));
        return;
      }
      clearTokens();
      setState({ loading: false, signedIn: false, beneficiary: null, role: null, locale: getStoredLocale() });
    }
  };

  useEffect(() => { document.documentElement.lang = state.locale; }, [state.locale]);
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
    const value = searchParams.get("beneficiary");
    setSelectedBeneficiaryId(value ? Number(value) || null : null);
  }, [pathname, searchParams]);

  const logout = () => {
    clearTokens();
    setState({ loading: false, signedIn: false, beneficiary: null, role: null, locale: getStoredLocale() });
    router.push("/");
  };

  if (sessionError) return <main className="mx-auto max-w-2xl px-5 py-20"><PageHeading eyebrow="Connection interrupted" title="Let’s reconnect" description={sessionError}/><Button onClick={()=>void refreshSession()}>Try again</Button></main>;
  if (languageReady && !state.loading) return <LanguageScreen onSelect={(next) => { setLocale(next); }} />;
  if (state.loading) return <LoadingScreen locale={state.locale} />;

  let content: ReactNode;
  if (pathname === "/auth") content = <AuthScreen onReady={refreshSession} locale={state.locale} />;
  else if (pathname === "/onboarding") content = <Onboarding onCreated={refreshSession} locale={state.locale} />;
  else if (pathname === "/interview") content = <RequireBeneficiary state={state}><Interview beneficiary={state.beneficiary!} locale={state.locale} /></RequireBeneficiary>;
  else if (pathname === "/profile") content = <RequireBeneficiary state={state}><ProfileScreen beneficiary={state.beneficiary!} locale={state.locale} /></RequireBeneficiary>;
  else if (pathname === "/pathways") content = <RequireBeneficiary state={state}><PathwaysScreen beneficiary={state.beneficiary!} locale={state.locale} /></RequireBeneficiary>;
  else if (pathname === "/pathway") content = <RequireBeneficiary state={state}><PathwayScreen locale={state.locale} /></RequireBeneficiary>;
  else if (pathname === "/progress") content = <RequireBeneficiary state={state}><ProgressScreen beneficiary={state.beneficiary!} locale={state.locale} /></RequireBeneficiary>;
  else if (pathname === "/field-worker") content = <RequireRole role="FIELD_WORKER" state={state}>{searchParams.get("new") === "1" ? <Onboarding locale={state.locale} onCreated={async()=>{}} afterCreated={id=>router.push(`/field-worker?beneficiary=${id}&view=interview`)}/> : selectedBeneficiaryId ? <FieldWorkerBeneficiaryView beneficiaryId={selectedBeneficiaryId} locale={state.locale} /> : <FieldWorkerDashboard locale={state.locale} />}</RequireRole>;
  else if (pathname === "/review") content = <RequireRole role="FACILITATOR" state={state}><ReviewDashboard locale={state.locale} /></RequireRole>;
  else if (pathname === "/officer") content = <RequireRole role="DISTRICT_OFFICER" state={state}><OfficerDashboard locale={state.locale} /></RequireRole>;
  else if (pathname === "/admin") content = <RequireRole role="ADMIN" state={state}><AdminDashboard locale={state.locale} /></RequireRole>;
  else if (state.signedIn && state.role === "BENEFICIARY") content = <BeneficiaryDashboard locale={state.locale} beneficiary={state.beneficiary} />;
  else if (state.signedIn && state.role === "FIELD_WORKER") content = <FieldWorkerDashboard locale={state.locale} />;
  else if (state.signedIn && state.role === "DISTRICT_OFFICER") content = <OfficerDashboard locale={state.locale} />;
  else if (state.signedIn && state.role === "FACILITATOR") content = <ReviewDashboard locale={state.locale} />;
  else if (state.signedIn && state.role === "ADMIN") content = <AdminDashboard locale={state.locale} />;
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
    else if (state.role !== "BENEFICIARY") router.replace(state.role === "FIELD_WORKER" ? "/field-worker" : state.role === "FACILITATOR" ? "/review" : state.role === "DISTRICT_OFFICER" ? "/officer" : "/admin");
    else if (!state.beneficiary) router.replace("/onboarding");
  }, [state, router]);
  if (!state.signedIn || !state.beneficiary) return <LoadingScreen locale={state.locale} />;
  return <>{children}</>;
}

function LanguageScreen({ onSelect }: { onSelect: (value: Locale) => void }) {
  return (
    <main className="mx-auto grid min-h-screen max-w-[760px] place-items-center px-5 py-12 sm:px-7">
      <div className="w-full rounded-[28px] border border-[#DDE3E5] bg-white p-6 shadow-[0_20px_60px_rgba(22,61,105,.08)] sm:p-8">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#EEF3FA] text-[#071A3D]"><Route size={22} /></div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#41526d]">LEAP AI</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#071A3D]">{t("language.choose", "en")}</h1>
          <p className="mt-3 text-sm leading-6 text-[#41526d]">{t("language.subtitle", "en")}</p>
        </div>
        <div className="grid gap-3">
          {languageOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className="flex items-center justify-between rounded-2xl border border-[#DDE3E5] bg-[#FAFAF7] px-5 py-4 text-left text-lg font-semibold text-[#071A3D] transition hover:border-[#087647] hover:bg-[#edf3ff]"
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

function BeneficiaryDashboard({ locale, beneficiary }: { locale: Locale; beneficiary: Beneficiary | null }) {
  const router = useRouter();
  const [facts, setFacts] = useState<{ completion: number | null; count: number | null }>({completion:null,count:null});
  useEffect(() => { if (beneficiary) void Promise.all([api.profile(beneficiary.id),api.pathways(beneficiary.id)]).then(([p,rows]) => setFacts({completion:p.profile_completion_percentage,count:rows.filter(p => p.confidence !== "RED" || p.review_status === "APPROVED").length})).catch(e => toast.error(e.message)); },[beneficiary]);
  return (
    <main className="mx-auto max-w-[1120px] px-5 py-10 sm:px-7 sm:py-14">
      <div className="rounded-[28px] border border-[#DDE3E5] bg-[#EEF3FA] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#41526d]">{t("dashboard.welcome", locale)}</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#071A3D]">{t("common.welcome", locale)}</h1>
            <p className="mt-2 text-base text-[#41526d]">{t("dashboard.sub", locale)}</p>
          </div>
          <Button onClick={() => router.push("/interview")}>{t("dashboard.continue", locale)}</Button>
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card className="border-[#DDE3E5] bg-white"><CardContent className="p-5"><div className="text-sm font-semibold text-[#41526d]">{t("dashboard.nextStep", locale)}</div><div className="mt-3 font-semibold text-[#071A3D]">Complete your profile</div><Button className="mt-4" variant="outline" onClick={() => router.push("/profile")}>{t("common.reviewProfile", locale)}</Button></CardContent></Card>
        <Card className="border-[#DDE3E5] bg-[#eefaf5]"><CardContent className="p-5"><div className="text-sm font-semibold text-[#41526d]">{t("dashboard.profile", locale)}</div><div className="mt-3 font-semibold text-[#071A3D]">{facts.completion === null ? "Not provided" : `${Math.round(facts.completion)}% complete`}</div><p className="mt-2 text-sm text-[#41526d]">Review your recorded information and any details still needing confirmation.</p></CardContent></Card>
        <Card className="border-[#DDE3E5] bg-[#FFF1E6]"><CardContent className="p-5"><div className="text-sm font-semibold text-[#41526d]">{t("dashboard.pathways", locale)}</div><div className="mt-3 font-semibold text-[#071A3D]">{facts.count === null ? "Not provided" : `${facts.count} options ready to explore`}</div><Button className="mt-4" variant="outline" onClick={() => router.push("/pathways")}>{t("common.pathways", locale)}</Button></CardContent></Card>
      </div>
    </main>
  );
}

function FieldWorkerDashboard({ locale }: { locale: Locale }) {
 const router=useRouter();const [tasks,setTasks]=useState<Awaited<ReturnType<typeof api.fieldWorkerTasks>>|null>(null);const [people,setPeople]=useState<Awaited<ReturnType<typeof api.fieldWorkerBeneficiaries>>>([]);const [query,setQuery]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(true);const [page,setPage]=useState(1);
 const load=()=>{setError("");setLoading(true);void Promise.all([api.fieldWorkerTasks(),api.fieldWorkerBeneficiaries(page)]).then(([t,p])=>{setTasks(t);setPeople(p);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));};useEffect(load,[page]);
 const visible=people.filter(p=>`${p.name} ${p.district}`.toLowerCase().includes(query.toLowerCase()));
 return <main className="mx-auto max-w-[1200px] px-5 py-12"><PageHeading eyebrow="Field worker workspace" title="Make the next step easier" description="Open a beneficiary record to assess, review or follow up." action={<Button onClick={()=>router.push('/field-worker?new=1')}>Add beneficiary<ArrowRight size={17}/></Button>}/>
 {error&&<Notice tone="warning">{error}<Button variant="outline" onClick={load}>Try again</Button></Notice>}
 <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Needs assessment',tasks?.interviews_due],['Needs follow-up',tasks?.followups_due],['Human review',tasks?.human_review_cases],['RPL verification',tasks?.rpl_verification_cases]].map(([label,value])=><Panel key={label}><p className="text-sm text-slate-600">{label}</p><p className="mt-3 text-4xl font-semibold">{value ?? '—'}</p></Panel>)}</div>
 <Panel><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-semibold">Beneficiary worklist</h2><input className="field sm:max-w-xs" aria-label="Search this page by name or district" placeholder="Search name or district" value={query} onChange={e=>setQuery(e.target.value)}/></div>
 {loading?<PageLoader text="Loading records…"/>:!visible.length?<p className="py-8 text-sm text-slate-600">No matching records on this page.</p>:<div className="mt-5 divide-y">{visible.map(p=><button key={p.id} onClick={()=>router.push(`/field-worker?beneficiary=${p.id}`)} className="flex w-full flex-wrap items-center justify-between gap-4 py-5 text-left"><div><strong>{p.name}</strong><p className="mt-1 text-sm text-slate-600">{p.district} · {p.preferred_language}</p></div><span className="text-link">Open record <ArrowRight size={16}/></span></button>)}</div>}
 <div className="mt-5 flex items-center justify-between gap-3"><Button variant="outline" disabled={page===1||loading} onClick={()=>setPage(p=>p-1)}>Previous</Button><span className="text-xs text-slate-600">Page {page}</span><Button variant="outline" disabled={people.length<50||loading} onClick={()=>setPage(p=>p+1)}>Next</Button></div></Panel>
 </main>;
}

function OfficerDashboard({ locale }: { locale: Locale }) {
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [funnel, setFunnel] = useState<Record<string, number> | null>(null);
  useEffect(() => { void Promise.all([api.officerSummary(), api.officerFunnel()]).then(([summaryData, funnelData]) => { setSummary(summaryData); setFunnel(funnelData); }).catch((error) => toast.error(error instanceof Error ? error.message : "Could not load this page.")); }, []);
  return (
    <main className="mx-auto max-w-[1280px] px-5 py-10 sm:px-7">
      <div className="rounded-[26px] border border-[#DDE3E5] bg-[#071A3D] p-6 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#DDE3E5]">DISTRICT OFFICER</div>
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
          <Card key={String(label)} className="border-[#DDE3E5] bg-white">
            <CardContent className="p-5">
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#41526d]">{String(label)}</div>
              <div className="mt-3 text-3xl font-semibold text-[#071A3D]">{String(value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8"><Notice tone="warning">These are aggregate recorded counts across the available dataset. They may include self-reported outcomes and pathways awaiting review. They are not verified placement rates or district-filtered statistics.</Notice><Panel className="mt-6"><h2 className="text-xl font-semibold">Recorded training milestones</h2><div className="mt-5 grid gap-6 sm:grid-cols-3">{[["Training started",funnel?.enrolled],["Training completed",funnel?.completed],["Certification reported",funnel?.certified]].map(([label,value])=><div key={String(label)}><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-semibold">{value ?? "—"}</p></div>)}</div><p className="mt-5 text-sm text-slate-600">A missing value means data could not be loaded. A zero means no matching record was returned.</p></Panel></div>
    </main>
  );
}

function ReviewDashboard({ locale }: { locale: Locale }) {
 const [reviews,setReviews]=useState<Awaited<ReturnType<typeof api.reviewQueue>>["items"]>([]);
 const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [notes,setNotes]=useState<Record<number,string>>({});const [busy,setBusy]=useState<number|null>(null);const [selected,setSelected]=useState<Pathway|null>(null);
 const load=()=>{setError("");void api.reviewQueue().then(d=>setReviews(d.items)).catch(e=>setError(e.message)).finally(()=>setLoading(false));};useEffect(load,[]);
 const act=async(id:number,action:"approve"|"edit"|"reject"|"resolve")=>{if(!notes[id]?.trim())return;setBusy(id);try{await api.reviewAction(id,action,notes[id]);load();toast.success("Review saved");}catch(e){toast.error(e instanceof Error?e.message:"Could not save review");}finally{setBusy(null);}};
 return <main className="mx-auto max-w-[1120px] px-5 py-12"><PageHeading eyebrow="Facilitator workspace" title="A closer look at uncertain cases" description="Review the evidence, record what you checked, and help the beneficiary make an informed decision."/>
 {error?<Notice tone="warning">{error}<Button onClick={load}>Try again</Button></Notice>:loading?<PageLoader text="Loading review cases…"/>:<div className="space-y-5">{!reviews.length&&<Panel>No review cases recorded.</Panel>}{reviews.map(r=><Panel key={r.id}><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold">Case {r.id} · Beneficiary {r.beneficiary_id}</h2><span className="text-sm text-slate-600">{humanize(r.status)}</span></div><p className="mt-4 text-sm leading-7 text-slate-600">{humanize(r.reason_description)}</p>{r.pathway_id&&<Button className="mt-3" variant="outline" onClick={()=>{void api.pathway(r.pathway_id!).then(setSelected).catch(e=>toast.error(e.message));}}>Inspect pathway evidence</Button>}<label className="mt-5 block text-sm font-semibold">Review notes<textarea className="field mt-2 min-h-24 py-3" value={notes[r.id]||""} onChange={e=>setNotes({...notes,[r.id]:e.target.value})} placeholder="What did you verify? What should happen next?"/></label><div className="mt-4 flex flex-wrap gap-3">{([['approve','Approve after review'],['edit','Save review notes'],['reject','Reject'],['resolve','Close case']] as const).map(([action,label])=><Button key={action} disabled={busy===r.id||!notes[r.id]?.trim()} variant={action==='approve'?'default':'outline'} onClick={()=>act(r.id,action)}>{label}</Button>)}</div><p className="mt-3 text-xs text-slate-600">Only approval releases a RED pathway for progression. Closing a case does not approve it.</p></Panel>)}</div>}
 {selected&&<section className="mt-8"><PageHeading eyebrow="Pathway evidence" title={selected.title} action={<Button variant="outline" onClick={()=>setSelected(null)}>Close evidence</Button>}/><Panel>{selected.evidence.map((e,i)=><EvidenceRow key={i} label={e.label} value={e.source_type==='SYNTHETIC'&&e.evidence_type==='OPPORTUNITY'?'Availability not verified':e.value} verified={e.verification_status==='VERIFIED'}/>)}</Panel></section>}
 </main>;
}


function AdminDashboard({ locale }: { locale: Locale }) {
  const [diagnostics, setDiagnostics] = useState<Record<string, number | string> | null>(null);
  useEffect(() => { void api.adminDiagnostics().then(setDiagnostics).catch((error) => toast.error(error instanceof Error ? error.message : "Could not load this page.")); }, []);
  return <main className="mx-auto max-w-[1120px] px-5 py-10 sm:px-7"><div className="rounded-[26px] border border-[#DDE3E5] bg-[#26364a] p-6 text-white"><div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#DDE3E5]">ADMIN</div><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">System access</h1></div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{diagnostics && Object.entries(diagnostics).map(([label, value]) => <Card key={label} className="border-[#DDE3E5]"><CardContent className="p-5"><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#536175]">{label.replaceAll("_", " ")}</div><div className="mt-3 text-2xl font-semibold text-[#071A3D]">{String(value)}</div></CardContent></Card>)}</div></main>;
}

function Landing({ state }: { state: AppState }) {
 return <LandingPage locale={state.locale} startHref={state.signedIn ? (state.beneficiary ? "/interview" : "/onboarding") : "/auth"}/>;
}

function AuthScreen({ onReady, locale }: { onReady: () => Promise<void>; locale: Locale }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="rounded-2xl bg-[#EAF8F1] p-8 lg:p-12">
        <SectionLabel>{t("auth.signIn", locale)}</SectionLabel>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#071A3D]">A little about you. A clearer next step.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-[#1e293b]">Keep your experience, aspirations and next steps together. Your assessment starts with your own answers, and you can review them before continuing.</p>
      </div>
      <Card className="mx-auto w-full max-w-[520px] border-[#DDE3E5] shadow-[0_20px_60px_rgba(26,40,60,.08)]">
        <CardContent className="p-6 sm:p-8">
          <div className="flex gap-1 rounded-xl bg-[#e2e8f0] p-1">
            <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-white text-[#071A3D] shadow-sm" : "text-[#334155]"}`} onClick={() => setMode("login")}>Sign in</button>
            <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${mode === "register" ? "bg-white text-[#071A3D] shadow-sm" : "text-[#334155]"}`} onClick={() => setMode("register")}>Create account</button>
          </div>
          <h2 className="mt-7 text-2xl font-semibold tracking-[-0.03em] text-[#071A3D]">{mode === "login" ? t("auth.welcomeBack", locale) : t("auth.createAccount", locale)}</h2>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label={t("auth.email", locale)}><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@example.com" /></Field>
            {mode === "register" && <Field label={t("auth.phone", locale)}><input value={phone} onChange={(e) => setPhone(e.target.value)} className="field" placeholder={t("auth.mobile", locale)} /></Field>}
            <Field label={t("auth.password", locale)}><input required minLength={mode === "register" ? 10 : undefined} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="field" placeholder={t("auth.atLeast10", locale)} /></Field>
            <button type="button" className="text-link" aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword ? "Hide password" : "Show password"}</button>
            <Button disabled={busy} className="h-11 w-full">{busy && <Loader2 className="mr-2 animate-spin" size={16} />}{mode === "login" ? t("auth.signIn", locale) : t("auth.create", locale)}</Button>
          </form>
          {demoConfig.enabled && mode === "login" && (
            <div className="mt-7 border-t border-[#DDE3E5] pt-5">
              <div className="text-sm font-semibold text-[#071A3D]">Explore LEAP AI</div>
              <p className="mt-1 text-xs leading-5 text-[#536175]">Local presentation accounts only. Select a role to fill the login form.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {["BENEFICIARY", "FIELD_WORKER", "FACILITATOR", "DISTRICT_OFFICER", "ADMIN"].map((role) => (
                  <button key={role} type="button" onClick={() => applyDemo(role)} className="rounded-xl border border-[#DDE3E5] bg-[#FAFAF7] px-3 py-2.5 text-left text-xs font-semibold text-[#071A3D] hover:border-[#087647] hover:bg-[#EEF3FA]">
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
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-[#071A3D]">{label}</span>{children}</label>;
}

function Onboarding({ onCreated, locale, afterCreated }: { onCreated: () => Promise<void>; locale: Locale; afterCreated?: (id:number)=>void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", age: "", gender: "", district: "", state: "", preferred_language: locale === "ta" ? "Tamil" : locale === "hi" ? "Hindi" : "English", digital_literacy: "LOW", consent_given: false });
  const update = (key: string, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await api.createBeneficiary({ ...form, age: form.age ? Number(form.age) : null });
      await onCreated();
      if (afterCreated) afterCreated(created.id); else router.push("/interview");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your profile.");
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-[900px] px-5 py-12 sm:px-7">
      <SectionLabel>{t("onboarding.startHere", locale)}</SectionLabel>
      <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#071A3D] sm:text-4xl">{t("onboarding.title", locale)}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[#1e293b]">{t("onboarding.subtitle", locale)}</p>
      <Card className="mt-8 border-[#DDE3E5] shadow-none"><CardContent className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        <form onSubmit={submit} className="contents">
          <Field label={t("onboarding.name", locale)}><input required value={form.name} onChange={(e) => update("name", e.target.value)} className="field" placeholder={t("onboarding.name", locale)} /></Field>
          <Field label={t("onboarding.age", locale)}><input type="number" min="14" max="100" value={form.age} onChange={(e) => update("age", e.target.value)} className="field" placeholder={t("onboarding.age", locale)} /></Field>
          <Field label={t("onboarding.gender", locale)}><input value={form.gender} onChange={(e) => update("gender", e.target.value)} className="field" /></Field>
          <Field label={t("onboarding.district", locale)}><input required value={form.district} onChange={(e) => update("district", e.target.value)} className="field" placeholder={t("onboarding.district", locale)} /></Field>
          <Field label={words(locale,"State / Union territory","மாநிலம் / யூனியன் பிரதேசம்","राज्य / केंद्र शासित प्रदेश")}><input required value={form.state} onChange={(e) => update("state", e.target.value)} className="field" /></Field>
          <Field label={t("onboarding.language", locale)}><select value={form.preferred_language} onChange={(e) => update("preferred_language", e.target.value)} className="field"><option>Tamil</option><option>Hindi</option><option>English</option></select></Field>
          <Field label={t("onboarding.digital", locale)}><select value={form.digital_literacy} onChange={(e) => update("digital_literacy", e.target.value)} className="field"><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select></Field>
          <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-[#DDE3E5] bg-[#FAFAF7] p-4 text-sm leading-6 text-[#1e293b]"><input type="checkbox" checked={form.consent_given} onChange={(e) => update("consent_given", e.target.checked)} className="mt-1" /><span className="font-medium">{t("onboarding.consent", locale)}</span></label>
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

function Interview({ beneficiary, locale, onFinished }: { beneficiary: Beneficiary; locale: Locale; onFinished?:()=>void }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [readyToReview, setReadyToReview] = useState(false);
  const [preview, setPreview] = useState<InterviewPreview | null>(null);
  const [editing, setEditing] = useState<Record<number, string>>({});
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const question = questions[index];
  const progress = Math.round((index / questions.length) * 100);

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
    try { recognition.start(); } catch { setListening(false); toast.error("Microphone unavailable. Please type your answer."); }
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
        question_text: localizedQuestionTitles[locale][question.key] || question.title,
        transcript: answer.trim(),
        language: locale === "ta" ? "Tamil" : locale === "hi" ? "Hindi" : "English",
        speech_confidence: null,
        extraction_confidence: null,
      });
      const nextAnswers = { ...answers, [question.key]: answer.trim() };
      setAnswers(nextAnswers);
      setAnswer("");
      if (index < questions.length - 1) {
        setIndex((value) => value + 1);
        return;
      }
      setReadyToReview(true);
      setPreview(await api.previewInterview(activeSession));
      return;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your answer.");
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!preview || !sessionId) return;
    setBusy(true);
    try {
      await api.completeInterview(sessionId, preview.preview_token);
      const occupation = preview.answers.find(a => a.key === "current_occupation")?.value;
      const years = preview.answers.find(a => a.key === "experience_years")?.value;
      if (typeof occupation === "string" && typeof years === "number") await api.addSkill(beneficiary.id, { name: occupation, sector: occupation, experience_years: years, source: "SELF_REPORTED", verified: false });
      await api.generatePathways(beneficiary.id);
      if (onFinished) onFinished(); else router.push("/pathways");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not finalize your profile."); }
    finally { setBusy(false); }
  };
  const correct = async (id: number) => {
    if (!sessionId) return;
    setBusy(true);
    try {
      await api.correctInterviewAnswer(sessionId, id, editing[id]);
      setPreview(await api.previewInterview(sessionId));
      setEditing(prev => { const next = {...prev}; delete next[id]; return next; });
    } catch(e) { toast.error(e instanceof Error ? e.message : "Could not save correction."); }
    finally { setBusy(false); }
  };
  if (readyToReview && !preview) return <main className="mx-auto max-w-3xl px-5 py-12"><PageHeading eyebrow="Assessment" title="Your draft answers are saved" description="Load the extracted values to review them. Your profile has not been finalized."/><Button disabled={busy} onClick={()=>{if(sessionId){setBusy(true);void api.previewInterview(sessionId).then(setPreview).catch(e=>toast.error(e.message)).finally(()=>setBusy(false));}}}>Review my answers</Button></main>;
  if (preview) return <main className="mx-auto max-w-[900px] px-5 py-12">
    <SectionLabel>{words(locale,"Review your answers","உங்கள் பதில்களைச் சரிபார்க்கவும்","अपने उत्तरों की समीक्षा करें")}</SectionLabel><h1 className="text-3xl font-semibold">{words(locale,"We understood:","நாங்கள் புரிந்துகொண்டது:","हमने यह समझा:")}</h1>
    <p className="mt-3 text-base">{words(locale,"Confirm or correct these values before they become your livelihood profile. Your confirmation records self-reported information; it does not certify it.","உங்கள் வாழ்வாதார சுயவிவரத்தில் சேர்க்கும் முன் இந்த விவரங்களை உறுதிப்படுத்தவும் அல்லது திருத்தவும். இது உங்கள் தகவலைப் பதிவு செய்கிறது; சான்றளிக்காது.","अपनी आजीविका प्रोफ़ाइल में जोड़ने से पहले इन विवरणों की पुष्टि करें या सुधारें। यह आपकी बताई जानकारी दर्ज करता है, प्रमाणित नहीं करता।")}</p>
    <div className="mt-8 space-y-4">{preview.answers.map(a => <Card key={a.id}><CardContent className="p-5">
      <h2 className="font-semibold">{localizedQuestionTitles[locale][a.key] || a.question}</h2>
      <p className="mt-2 text-sm text-slate-600">{words(locale,"Your answer:","உங்கள் பதில்:","आपका उत्तर:")} {a.transcript}</p>
      {editing[a.id] !== undefined ? <div className="mt-3 flex flex-wrap gap-2"><input className="field" aria-label={a.question} value={editing[a.id]} onChange={e => setEditing({...editing,[a.id]:e.target.value})}/><Button disabled={busy} onClick={() => correct(a.id)}>{words(locale,"Save correction","திருத்தத்தைச் சேமிக்கவும்","सुधार सहेजें")}</Button></div> : <div className="mt-3 flex items-center justify-between gap-4"><strong>{a.value === null ? words(locale,"Needs confirmation","உறுதிப்படுத்த வேண்டும்","पुष्टि आवश्यक है") : String(a.value)}</strong><Button disabled={busy} variant="outline" onClick={() => setEditing({...editing,[a.id]:a.text})}>{words(locale,"Edit","திருத்து","संपादित करें")}</Button></div>}
      {a.warning && <p className="mt-2 text-sm text-amber-900">{a.warning}</p>}
    </CardContent></Card>)}</div>
    <Button className="mt-6" disabled={busy || Object.keys(editing).length > 0} onClick={confirm}>{busy ? words(locale,"Saving…","சேமிக்கிறது…","सहेजा जा रहा है…") : words(locale,"Confirm and create my profile","உறுதிப்படுத்தி சுயவிவரத்தை உருவாக்கவும்","पुष्टि करें और मेरी प्रोफ़ाइल बनाएं")}</Button>
  </main>;

  return (
    <main className="mx-auto max-w-[1040px] px-5 py-10 sm:px-7 sm:py-14">
      <div className="flex items-center justify-between gap-4">
        <div><SectionLabel>{t("interview.progressLabel", locale)}</SectionLabel><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#071A3D]">{t("interview.title", locale)}</h1></div>
        <div className="hidden text-right sm:block"><div className="text-sm font-semibold text-[#1e293b]">{t("interview.progressLabel", locale)} {index + 1} {t("interview.of", locale)} {questions.length}</div><div className="mt-1 text-xs font-medium text-[#334155]">{progress}% complete</div></div>
      </div>
      <Progress value={progress} className="mt-6 h-1.5" />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border-[#DDE3E5] shadow-[0_18px_50px_rgba(26,40,60,.07)]"><CardContent className="p-6 sm:p-9">
          <div className={`interview-mic ${listening ? "active" : ""}`}><Mic size={32}/></div>
          <div className="text-sm font-semibold text-[#087647]">{t("interview.question", locale)}</div>
          <h2 className="mt-2 text-2xl font-semibold leading-9 tracking-[-0.025em] text-[#071A3D] sm:text-3xl">{localizedQuestionTitles[locale][question.key] || question.title}</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-[#1e293b]">{t("interview.helper", locale)}</p>
          <div className="mt-7">
            <Textarea aria-label={localizedQuestionTitles[locale][question.key]} value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} placeholder={question.placeholder} className="resize-none rounded-2xl border-[#DDE3E5] bg-white p-4 text-base leading-7 font-medium text-[#071A3D]" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button type="button" disabled={busy} aria-pressed={listening} onClick={listening ? stopListening : startListening} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${listening ? "border-[#059669] bg-[#ecfdf5] text-[#065f46]" : "border-[#DDE3E5] bg-white text-[#071A3D] hover:bg-[#FAFAF7]"}`}>
                <Mic size={17} /> {listening ? t("common.listening", locale) : t("interview.voice", locale)}
              </button>
              <Button disabled={busy || listening || !answer.trim()} onClick={saveAnswer}>{busy && <Loader2 className="mr-2 animate-spin" size={16} />}{index === questions.length - 1 ? t("interview.build", locale) : t("interview.save", locale)}<ChevronRight className="ml-1" size={17} /></Button>
            </div>
          </div>
        </CardContent></Card>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#DDE3E5] bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#071A3D]"><ShieldCheck size={17} /> {t("interview.useThis", locale)}</div>
            <p className="mt-3 text-sm leading-6 text-[#1e293b]">{t("interview.useThisCopy", locale)}</p>
          </div>
          <div className="rounded-2xl border border-[#DDE3E5] bg-[#f1f5f9] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#071A3D]"><Wifi size={17} /> {t("interview.voiceOptional", locale)}</div>
            <p className="mt-3 text-sm leading-6 text-[#1e293b]">{t("interview.voiceOptionalCopy", locale)}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ProfileScreen({ beneficiary, locale, onAssess, onPathways }: { beneficiary: Beneficiary; locale: Locale; onAssess?:()=>void; onPathways?:()=>void }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillDraft,setSkillDraft] = useState({name:"",sector:"",years:""});
  const [skillBusy,setSkillBusy] = useState(false);
  const saveSkill = async (event: FormEvent) => {event.preventDefault();setSkillBusy(true);try {await api.addSkill(beneficiary.id,{name:skillDraft.name.trim(),sector:skillDraft.sector.trim(),experience_years:Number(skillDraft.years),source:"SELF_REPORTED",verified:false});setSkills(await api.skills(beneficiary.id));setSkillDraft({name:"",sector:"",years:""});toast.success("Experience saved. Recalculate pathways when you are ready.");} catch(e){toast.error(e instanceof Error?e.message:"Could not save skill");}finally{setSkillBusy(false);}};
  const [editProfile,setEditProfile] = useState(false);
  const [saving,setSaving] = useState(false);
  const saveProfile = async () => { if (!profile) return; setSaving(true); try { const {id,beneficiary_id,profile_completion_percentage,...data}=profile; setProfile(await api.updateProfile(beneficiary.id,data)); setEditProfile(false); toast.success("Profile updated"); } catch(e) {toast.error(e instanceof Error?e.message:"Could not save");} finally {setSaving(false);} };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([api.profile(beneficiary.id), api.skills(beneficiary.id)])
      .then(([profileData, skillsData]) => { setProfile(profileData); setSkills(skillsData); })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Could not load your profile."))
      .finally(() => setLoading(false));
  }, [beneficiary.id]);

  if (loading) return <PageLoader text="Loading your livelihood profile…" />;
  if (!profile) return <EmptyState title="Your profile is not ready yet" copy="Complete the assessment first so LEAP can build your livelihood profile." action="Start assessment" onAction={onAssess || (() => router.push("/interview"))} />;

  if (editProfile) return <main className="mx-auto max-w-[900px] px-5 py-12"><PageHeading eyebrow="Your profile" title="Keep your story up to date"/><Panel><form onSubmit={e=>{e.preventDefault();void saveProfile();}} className="grid gap-5 sm:grid-cols-2">{(["education_level","current_occupation","aspiration_text","employment_preference","family_responsibilities","physical_constraints"] as const).map(key=><Field key={key} label={humanize(key)}><input className="field" value={profile[key] || ""} onChange={e=>setProfile({...profile,[key]:e.target.value})}/></Field>)}<Field label="Travel range (km)"><input className="field" type="number" min="0" step="any" value={profile.mobility_km ?? ""} onChange={e=>setProfile({...profile,mobility_km:e.target.value===""?null:Number(e.target.value)})}/></Field><Field label="Available capital"><input className="field" type="number" min="0" value={profile.capital_available ?? ""} onChange={e=>setProfile({...profile,capital_available:e.target.value===""?null:e.target.value})}/></Field><div className="flex flex-wrap gap-3 sm:col-span-2"><Button disabled={saving}>Save changes</Button><Button type="button" variant="outline" disabled={saving} onClick={()=>{setEditProfile(false);void api.profile(beneficiary.id).then(setProfile);}}>Cancel</Button></div></form></Panel></main>;

  const details = [
    ["Education", profile.education_level || "Not provided"],
    ["Current work", profile.current_occupation || "Not provided"],
    ["Goal", profile.aspiration_text || "Not provided"],
    ["Work preference", profile.employment_preference || "Not provided"],
    ["Travel range", profile.mobility_km != null ? `${profile.mobility_km} km` : "Not provided"],
    ["Available capital", profile.capital_available != null ? `₹${profile.capital_available}` : "Not provided"],
    ["Family responsibilities", profile.family_responsibilities || "Not provided"],
    ["Physical constraints", profile.physical_constraints || "Not provided"],
  ];

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-10 sm:px-7 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><SectionLabel>Your livelihood profile</SectionLabel><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#071A3D]">What LEAP understood about you</h1><p className="mt-3 text-base text-[#41526d]">A living picture of your experience, responsibilities and direction.</p></div>
        <div className="flex items-center gap-3 rounded-2xl bg-[#EEF3FA] px-4 py-3"><div className="score-ring h-16 w-16" style={{ "--score": profile.profile_completion_percentage } as React.CSSProperties}><span className="relative z-10 text-sm font-bold text-[#071A3D]">{Math.round(profile.profile_completion_percentage)}%</span></div><div><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#41526d]">Profile</div><div className="font-semibold text-[#071A3D]">Completeness</div></div></div>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="border-[#c7d8ee] bg-[#EEF3FA] shadow-none"><CardContent className="p-6 sm:p-7"><div className="flex items-center gap-2 font-semibold text-[#071A3D]"><BriefcaseBusiness size={18} /> Current experience</div><div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">{details.map(([label, value]) => <div key={label}><div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#41526d]">{label}</div><div className="mt-1.5 text-[15px] font-semibold leading-6 text-[#071A3D]">{value}</div></div>)}</div></CardContent></Card>
        <div className="space-y-5"><Card className="border-[#E9DBCE] bg-[#FFF1E6] shadow-none"><CardContent className="p-6 sm:p-7"><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#995421]">What you want to become</div><blockquote className="mt-4 text-2xl font-semibold leading-9 tracking-[-0.025em] text-[#713F1E]">“{profile.aspiration_text || "Your next chapter will take shape here."}”</blockquote><div className="mt-4 text-sm font-medium text-[#795E4B]">Your aspiration is considered separately from your current experience.</div></CardContent></Card><Card className="border-[#c5e4d9] bg-[#edf9f3] shadow-none"><CardContent className="p-6 sm:p-7"><div className="flex items-center gap-2 font-semibold text-[#176b58]"><BriefcaseBusiness size={18} /> Skills and experience</div><div className="mt-5 flex flex-wrap gap-2">{skills.length ? skills.map((skill) => <span key={skill.id} className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#176b58] shadow-sm">{skill.skill_name || "Skill"} · {skill.experience_years}y{skill.verified ? " · verified" : ""}</span>) : <p className="text-sm leading-6 font-medium text-[#176b58]">Your experience will appear here after assessment.</p>}</div></CardContent></Card></div>
      </div>
      <div className="mt-6 grid gap-4 rounded-2xl border border-[#c5e4d9] bg-[#eaf8f1] p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1f8a70]">What you know</div><div className="mt-1 font-semibold text-[#176b58]">Experience, skills and real constraints</div></div><div className="hidden text-2xl text-[#995421] sm:block">↔</div><div><div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#995421]">What you want</div><div className="mt-1 font-semibold text-[#713F1E]">Aspiration and possibility</div></div><p className="text-sm font-semibold text-[#071A3D] sm:col-span-3">Your past does not decide your future. Both matter.</p></div>
      <Panel className="mt-6"><h2 className="text-xl font-semibold">Add or update your experience</h2><p className="mt-2 text-sm text-slate-600">Informal work counts. These details are recorded as self-reported, and may support an RPL discussion.</p><form onSubmit={saveSkill} className="mt-5 grid items-end gap-4 sm:grid-cols-3"><Field label="Skill or work"><input required className="field" value={skillDraft.name} onChange={e=>setSkillDraft({...skillDraft,name:e.target.value})}/></Field><Field label="Sector"><input required className="field" value={skillDraft.sector} onChange={e=>setSkillDraft({...skillDraft,sector:e.target.value})}/></Field><Field label="Years of experience"><input required type="number" min="0" step="0.1" className="field" value={skillDraft.years} onChange={e=>setSkillDraft({...skillDraft,years:e.target.value})}/></Field><Button disabled={skillBusy || !skillDraft.name.trim() || !skillDraft.sector.trim()}>Save experience</Button></form></Panel>
      <div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="outline" onClick={()=>setEditProfile(true)}>Edit my profile</Button><Button onClick={onPathways || (() => router.push("/pathways"))}>See my pathways <ArrowRight className="ml-2" size={17} /></Button></div>
    </main>
  );
}

function PathwaysScreen({ beneficiary, locale, onOpen }: { beneficiary: Beneficiary; locale: Locale; onOpen?:(id:number)=>void }) {
  const router = useRouter();
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const load = async (generate = false) => {
    try {
      const data = generate ? await api.generatePathways(beneficiary.id) : await api.pathways(beneficiary.id);

      setPathways(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load pathways.");
    } finally { setLoading(false); setRegenerating(false); }
  };

  useEffect(() => { void load(false); }, [beneficiary.id]);

  if (loading) return <PageLoader text="Loading your pathways…" />;
  return (
    <main className="mx-auto max-w-[1120px] px-5 py-10 sm:px-7 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><SectionLabel>Your recommendations</SectionLabel><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#071A3D]">Paths that fit your situation</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[#41526d]">Scores are calculated from your profile, current skills, eligibility, local training access and practical constraints.</p></div>
        <Button variant="outline" disabled={regenerating} onClick={() => { setRegenerating(true); void load(true); }}>{regenerating && <Loader2 className="mr-2 animate-spin" size={16} />}Recalculate</Button>
      </div>
      {pathways.length === 0 ? <div className="mt-10"><EmptyState title="No valid pathways found yet" copy="Your profile may need more evidence, or the local qualification data may not have a valid match yet." action="Review profile" onAction={() => router.push("/profile")} /></div> : (
        <div className="mt-8 pathway-list">
          {pathways.map((pathway, i) => <PathwayCard key={pathway.id} pathway={pathway} rank={i + 1} onOpen={() => onOpen ? onOpen(pathway.id) : router.push(`/pathway?id=${pathway.id}`)} />)}
        </div>
      )}
      <div className="mt-8 rounded-2xl border border-[#DDE3E5] bg-white p-5 text-sm leading-6 text-[#1e293b]"><span className="font-semibold text-[#071A3D]">How these options are assessed:</span> LEAP compares your experience, aspirations and constraints using consistent rules. Missing information is shown for confirmation, and low-confidence cases need human review.</div>
    </main>
  );
}

function PathwayCard({ pathway, rank, onOpen }: { pathway: Pathway; rank: number; onOpen: () => void }) {
  const pending = pathway.pending_human_review || (pathway.confidence === "RED" && pathway.review_status !== "APPROVED");
  return <article className="pathway-row"><div><p className="rank-label">Option {rank} · {routeLabel(pathway.recommended_route)}</p><h2>{pathway.title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{pathway.description}</p>
    <div className="mt-4">{pathway.evidence.filter(e=>["SKILL","ASPIRATION"].includes(e.evidence_type)).slice(0,2).map((e,i)=><EvidenceRow key={i} label={e.label} value={e.value} verified={e.verification_status === "VERIFIED"}/>)}</div>
    {pending && <PendingReview pathway={pathway}/>}</div>
    <div className="pathway-side"><div><p className="text-xs text-slate-600">Fit based on your profile</p><div className="pathway-fit">{Math.round(pathway.score)}<small> / 100</small></div><p className={`confidence-line ${pathway.confidence.toLowerCase()}`}>{confidenceLabel(pathway.confidence)}</p><p className="mt-3 text-xs leading-6 text-slate-600">{confidenceMessage(pathway)}</p></div><Button variant="outline" onClick={onOpen}>{pending ? "View review evidence" : "See why this fits"}<ArrowRight size={16}/></Button></div>
  </article>;
}


function PathwayScreenInner({ locale }: { locale: Locale }) {
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
  const scoreBreakdown = pathway.score_breakdown || {};

  return (
    <main className="mx-auto max-w-[980px] px-5 py-10 sm:px-7 sm:py-14">
      <button onClick={() => router.push(search.get("beneficiary") ? `/field-worker?beneficiary=${search.get("beneficiary")}&view=pathways` : "/pathways")} className="mb-7 text-sm font-semibold text-[#087647]">← Back to pathways</button>
      <div className="mb-6"><PendingReview pathway={pathway} locale={locale}/></div>
      <div className="grid gap-7 lg:grid-cols-[1fr_300px]">
        <div>
          <SectionLabel>{pathway.pending_human_review || (pathway.confidence === "RED" && pathway.review_status !== "APPROVED") ? "Pending human review" : pathway.type.replaceAll("_", " ")}</SectionLabel>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#071A3D]">{pathway.title}</h1>
          <p className="mt-4 text-base leading-7 text-[#1e293b]">{pathway.description}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <InfoBlock icon={BadgeCheck} title="Recommended route" value={routeLabel(pathway.recommended_route)} />
            <InfoBlock icon={ShieldCheck} title="Confidence" value={confidenceMessage(pathway)} />
          </div>
          <div className="mt-6"><Panel><h2 className="text-xl font-semibold">What still needs confirmation</h2>{pathway.evidence.filter(e=>e.evidence_type === "CONFIDENCE").map((e,i)=><EvidenceRow key={i} label={e.label} value={e.value}/>)}<EvidenceRow label="Training availability" value={pathway.evidence.find(e=>e.evidence_type === "OPPORTUNITY" && e.verification_status === "VERIFIED" && e.source_type !== "SYNTHETIC")?.value || "Availability not verified"}/></Panel></div>
          <div className="mt-8 border-t border-[#DDE3E5] pt-8">
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#071A3D]">Why this pathway fits</h2>

            {/* Subsection 1: What already works in your favour */}
            <div className="mt-6">
              <h3 className="text-base font-semibold text-[#071A3D] flex items-center gap-2">
                <BadgeCheck className="text-[#059669]" size={19} /> What already works in your favour
              </h3>
              <div className="mt-3 space-y-3">
                {pathway.evidence.filter((e) => ["SKILL", "ASPIRATION", "ELIGIBILITY", "OPPORTUNITY"].includes(e.evidence_type)).map((item, index) => (
                  <div key={`favour-${index}`} className="rounded-xl border border-[#DDE3E5] bg-white p-4">
                    <div className="font-semibold text-[#071A3D]">{item.label}</div>
                    <div className="mt-1 text-sm font-medium text-[#1e293b]">{item.evidence_type === "OPPORTUNITY" && (item.verification_status !== "VERIFIED" || item.source_type === "SYNTHETIC") ? "Availability not verified" : item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subsection 2: What you may need */}
            <div className="mt-7">
              <h3 className="text-base font-semibold text-[#071A3D] flex items-center gap-2">
                <BriefcaseBusiness className="text-[#087647]" size={19} /> What you may need
              </h3>
              <div className="mt-3 space-y-3">
                {pathway.evidence.filter((e) => e.evidence_type === "RPL").map((item, index) => (
                  <div key={`need-${index}`} className="rounded-xl border border-[#DDE3E5] bg-[#FAFAF7] p-4">
                    <div className="font-semibold text-[#071A3D]">{item.label}</div>
                    <div className="mt-1 text-sm font-medium text-[#1e293b]">{item.evidence_type === "OPPORTUNITY" && (item.verification_status !== "VERIFIED" || item.source_type === "SYNTHETIC") ? "Availability not verified" : item.value}</div>
                  </div>
                ))}
                <div className="rounded-xl border border-[#DDE3E5] bg-white p-4">
                  <div className="font-semibold text-[#071A3D]">Recommended Route</div>
                  <div className="mt-1 text-sm font-medium text-[#1e293b]">{routeLabel(pathway.recommended_route)}</div>
                </div>
              </div>
            </div>

            {/* Subsection 3: Things to plan around */}
            <div className="mt-7">
              <h3 className="text-base font-semibold text-[#071A3D] flex items-center gap-2">
                <CircleAlert className="text-[#d97706]" size={19} /> Things to plan around
              </h3>
              <div className="mt-3 space-y-3">
                {pathway.evidence.filter((e) => ["CONSTRAINT", "MOBILITY"].includes(e.evidence_type)).map((item, index) => (
                  <div key={`plan-${index}`} className="flex gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4">
                    <CircleAlert className="mt-0.5 shrink-0 text-[#92400e]" size={18} />
                    <div>
                      <div className="font-semibold text-[#78350f]">{item.label}</div>
                      <div className="mt-1 text-sm font-medium text-[#92400e]">{item.evidence_type === "OPPORTUNITY" && (item.verification_status !== "VERIFIED" || item.source_type === "SYNTHETIC") ? "Availability not verified" : item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subsection 4: How this score was calculated */}
            <div className="mt-7">
              <h3 className="text-base font-semibold text-[#071A3D] flex items-center gap-2">
                <Sparkles className="text-[#995421]" size={19} /> How this score was calculated
              </h3>
              <div className="mt-3 rounded-xl border border-[#DDE3E5] bg-white p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#334155]">Overall fit</span>
                  <span className="font-bold text-[#087647] text-lg">{Math.round(pathway.score)}%</span>
                </div>
                <div className="space-y-3 pt-2">
                  {Object.entries(scoreBreakdown).map(([key, value]) => <div key={key}><div className="mb-1 flex justify-between text-xs font-semibold text-[#334155]"><span>{scoreLabel(key)}</span><span>{Math.round(value * 100)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#e2e8f0]"><div className="h-full rounded-full bg-[#087647]" style={{ width: `${Math.round(value * 100)}%` }} /></div></div>)}
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
                    Not enough verified outcome data yet. This factor will become more useful as more verified follow-ups are recorded.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <aside>
          <div className="mb-5 leap-panel"><h2 className="text-lg font-semibold">Your next three steps</h2><ol className="mt-4 list-decimal space-y-4 pl-5 text-sm text-slate-600"><li>Review your recorded skills and circumstances.</li><li>{pathway.confidence === "RED" ? "Ask a facilitator to review the missing or uncertain evidence." : "Confirm eligibility, local training and any RPL assessment with a provider."}</li><li>Discuss the practical requirements before choosing your pathway.</li></ol><p className="mt-5 text-xs text-slate-600">Prepare any work examples or existing certificates you wish to share. RPL potential is not certification.</p><Button variant="outline" className="mt-5" onClick={()=>window.print()}>Print my next steps</Button></div>
          <div className="sticky top-24 rounded-2xl bg-[#087647] p-6 text-white">
            <div className="text-sm font-medium text-[#bfdbfe]">Overall fit</div><div className="mt-1 text-5xl font-semibold tracking-[-0.05em]">{Math.round(pathway.score)}%</div><div className="mt-6 border-t border-white/20 pt-5 text-sm leading-6 text-[#e0e7ff]">{confidenceMessage(pathway)}</div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function PathwayScreen({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<PageLoader text="Loading pathway details…" />}>
      <PathwayScreenInner locale={locale} />
    </Suspense>
  );
}

function ProgressScreen({ beneficiary, locale }: { beneficiary: Beneficiary; locale: Locale }) {
  const [rows,setRows] = useState<Outcome[] | null>(null);
  const [pathways,setPathways] = useState<Pathway[]>([]);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [recording,setRecording] = useState(false);
  const [draft,setDraft] = useState({pathway_id:"",followup_day:"30",employment_status:"UNKNOWN",training_started:false,training_completed:false,certified:false,support_required:""});
  const load = () => {setError("");void Promise.all([api.outcomes(beneficiary.id),api.pathways(beneficiary.id)]).then(([outcomes,options])=>{setRows(outcomes);setPathways(options);}).catch(e=>setError(e.message));};
  useEffect(load,[beneficiary.id]);
  const eligible = pathways.filter(p=>!p.pending_human_review && (p.confidence!=="RED" || p.review_status==="APPROVED"));
  const save = async(e:FormEvent)=>{e.preventDefault();setBusy(true);try {await api.recordOutcome({...draft,beneficiary_id:beneficiary.id,pathway_id:Number(draft.pathway_id),followup_day:Number(draft.followup_day),verification_status:"USER_REPORTED"});setRecording(false);load();toast.success("Follow-up recorded as self-reported.");}catch(e){toast.error(e instanceof Error?e.message:"Could not save update");}finally{setBusy(false);}};
  return <main className="mx-auto max-w-[1100px] px-5 py-12"><PageHeading eyebrow={words(locale,"Your livelihood journey","உங்கள் வாழ்வாதாரப் பயணம்","आपकी आजीविका यात्रा")} title={words(locale,"Progress and follow-up","முன்னேற்றம் மற்றும் தொடர் கண்காணிப்பு","प्रगति और फ़ॉलो-अप")} description="Record what actually happened and the support you need next." action={<Button disabled={!eligible.length || !!error || rows===null} onClick={()=>setRecording(v=>!v)}>{recording?"Close form":"Record an update"}</Button>}/>
    {error ? <Notice tone="warning">{error}<Button onClick={load}>Try again</Button></Notice> : rows === null ? <PageLoader text="Loading follow-ups…"/> : <>
    {recording && <Panel className="mb-8"><h2 className="text-xl font-semibold">Tell us how things are going</h2><p className="mt-2 text-sm text-slate-600">Choose the pathway you pursued. Recording an outcome does not certify or verify it.</p><form onSubmit={save} className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="Pathway"><select required className="field" value={draft.pathway_id} onChange={e=>setDraft({...draft,pathway_id:e.target.value})}><option value="">Choose a pathway</option>{eligible.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></Field><Field label="Follow-up point"><select className="field" value={draft.followup_day} onChange={e=>setDraft({...draft,followup_day:e.target.value})}>{[30,90,180].map(day=><option key={day} value={day}>Day {day}</option>)}</select></Field><Field label="Current work situation"><select className="field" value={draft.employment_status} onChange={e=>setDraft({...draft,employment_status:e.target.value})}>{["UNKNOWN","EMPLOYED","SELF_EMPLOYED","SEARCHING","TRAINING","DROPPED_OUT","INACTIVE"].map(v=><option key={v} value={v}>{humanize(v)}</option>)}</select></Field><Field label="What support would help? (optional)"><input className="field" value={draft.support_required} onChange={e=>setDraft({...draft,support_required:e.target.value})}/></Field><div className="flex flex-wrap gap-5 sm:col-span-2">{([['training_started','I started training'],['training_completed','I completed training'],['certified','I received a certificate']] as const).map(([key,label])=><label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.checked})}/>{label}</label>)}</div><div className="sm:col-span-2"><Button disabled={busy || !draft.pathway_id || rows.some(r=>r.pathway_id===Number(draft.pathway_id)&&r.followup_day===Number(draft.followup_day))}>Save follow-up</Button>{rows.some(r=>r.pathway_id===Number(draft.pathway_id)&&r.followup_day===Number(draft.followup_day))&&<p className="mt-2 text-sm">This follow-up point is already recorded.</p>}</div></form></Panel>}
    {!eligible.length && <Notice tone="warning">An assessed pathway must be available before you can record progression. Options pending human review cannot be used yet.</Notice>}
    <div className="mt-8 grid gap-4 md:grid-cols-3">{[30,90,180].map(day => <Panel key={day}><SectionLabel>Day {day}</SectionLabel><h2 className="text-xl font-semibold">{day===30?"Early check-in":day===90?"Livelihood follow-up":"Longer-term outcome"}</h2><div className="mt-4 space-y-5">{rows.filter(r=>r.followup_day===day).length ? rows.filter(r=>r.followup_day===day).map(r => <div key={r.id}><strong>{pathways.find(p=>p.id===r.pathway_id)?.title || `Pathway ${r.pathway_id}`}</strong><p className="mt-2">{humanize(r.employment_status)}</p><p className="mt-2 text-sm text-slate-600">{humanize(r.verification_status)} · {new Date(r.created_at).toLocaleDateString(locale)}</p><p className="mt-2 text-sm text-slate-600">{r.training_completed?"Training completion reported":r.training_started?"Training start reported":"No training milestone reported"}{r.certified?" · Certificate reported":""}</p></div>) : <p className="text-sm text-slate-600">No update recorded</p>}</div></Panel>)}</div>
    {!rows.length && <p className="mt-6 text-sm text-slate-600">No follow-up data yet. Your recorded updates will appear here.</p>}</>}
  </main>;
}

function InfoBlock({ icon: Icon, title, value }: { icon: typeof Sparkles; title: string; value: string }) {
  return <div className="rounded-2xl border border-[#DDE3E5] bg-white p-5"><div className="flex items-center gap-2 text-sm font-semibold text-[#334155]"><Icon size={17} /> {title}</div><div className="mt-2 font-bold text-[#071A3D]">{value}</div></div>;
}

function PageLoader({ text }: { text: string }) {
  return <main className="mx-auto grid min-h-[60vh] max-w-[900px] place-items-center px-5"><div className="flex items-center gap-3 text-sm font-semibold text-[#071A3D]"><Loader2 size={18} className="animate-spin" /> {text}</div></main>;
}

function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action: string; onAction: () => void }) {
  return <main className="mx-auto grid min-h-[60vh] max-w-[760px] place-items-center px-5"><div className="w-full rounded-2xl border border-[#DDE3E5] bg-white p-8 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#EAF8F1] text-[#087647]"><ClipboardList size={20} /></div><h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#071A3D]">{title}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 font-medium text-[#1e293b]">{copy}</p><Button className="mt-6" onClick={onAction}>{action}</Button></div></main>;
}

function humanize(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function confidenceLabel(value: string) {
  return value === "GREEN" ? "Ready to explore" : value === "RED" ? "Needs facilitator review" : "Some details need confirmation";
}

function confidenceMessage(pathway: Pathway) {
  if (pathway.confidence === "GREEN") return "Ready to discuss. Confirm local availability before committing.";
  if (pathway.confidence === "RED") return pathway.review_status === "APPROVED" ? "Reviewed by a facilitator. Discuss your next step before deciding." : "Pending human review. Do not enrol or make commitments from this pathway yet.";
  const hasUnknownAccess = pathway.evidence.some((item) => item.evidence_type === "OPPORTUNITY" && item.verification_status !== "VERIFIED");
  return hasUnknownAccess ? "Training availability is not verified. Confirm the details before making plans." : "Some profile evidence still needs confirmation.";
}

function scoreLabel(value: string) {
  const labels: Record<string, string> = {
    skill_fit: "Skill fit",
    aspiration_fit: "Aspiration fit",
    eligibility: "Eligibility",
    opportunity: "Opportunity",
    mobility: "Mobility",
    training_burden: "Training burden",
    outcome_evidence: "Outcome evidence",
  };
  return labels[value] || humanize(value);
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
  const router=useRouter();const search=useSearchParams();const view=search.get('view') || 'profile';
  const [beneficiary,setBeneficiary]=useState<Beneficiary|null>(null);const [error,setError]=useState("");
  useEffect(()=>{setBeneficiary(null);setError("");void api.beneficiary(beneficiaryId).then(setBeneficiary).catch(e=>setError(e.message));},[beneficiaryId]);
  if(error)return <main className="mx-auto max-w-3xl px-5 py-12"><Notice tone="warning">{error}</Notice></main>;
  if(!beneficiary)return <LoadingScreen locale={locale}/>;
  const base=`/field-worker?beneficiary=${beneficiaryId}`;
  return <><div className="mx-auto max-w-[1100px] px-5 pt-7"><Button variant="ghost" onClick={()=>router.push('/field-worker')}>← Worklist</Button><p className="mt-3 font-semibold">{beneficiary.name}</p><div className="mt-3 flex flex-wrap gap-2">{[['profile','Profile'],['interview','Assessment'],['pathways','Pathways'],['progress','Follow-up']].map(([key,label])=><Button key={key} variant={view===key?'default':'outline'} onClick={()=>router.push(`${base}&view=${key}`)}>{label}</Button>)}</div></div>
  {view==='interview'?<Interview key={beneficiaryId} beneficiary={beneficiary} locale={locale} onFinished={()=>router.push(`${base}&view=pathways`)}/>:view==='pathways'?<PathwaysScreen beneficiary={beneficiary} locale={locale} onOpen={id=>router.push(`${base}&view=pathway&id=${id}`)}/>:view==='pathway'?<PathwayScreen locale={locale}/>:view==='progress'?<ProgressScreen beneficiary={beneficiary} locale={locale}/>:<ProfileScreen beneficiary={beneficiary} locale={locale} onAssess={()=>router.push(`${base}&view=interview`)} onPathways={()=>router.push(`${base}&view=pathways`)}/>}</>;
}

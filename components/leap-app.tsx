"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Headphones,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Mic,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
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

type AppState = {
  loading: boolean;
  signedIn: boolean;
  beneficiary: Beneficiary | null;
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
        <div className="hidden text-[12px] text-[#6f7c8f] sm:block">Livelihood pathways that fit real lives</div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#49627f]">{children}</div>;
}

function Shell({ state, onLogout, children }: { state: AppState; onLogout: () => void; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = [
    { label: "Home", href: "/" },
    { label: "Assessment", href: "/interview" },
    { label: "Profile", href: "/profile" },
    { label: "Pathways", href: "/pathways" },
  ];

  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#172033]">
      <header className="sticky top-0 z-40 border-b border-[#e5e9ef] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-5 sm:px-7">
          <button onClick={() => go("/")} aria-label="Go to home"><Logo /></button>
          <nav className="hidden items-center gap-1 md:flex">
            {state.signedIn && state.beneficiary && nav.map((item) => (
              <button key={item.href} onClick={() => go(item.href)} className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${pathname === item.href ? "bg-[#edf3f8] text-[#163d69]" : "text-[#5e6a7d] hover:bg-[#f3f5f7] hover:text-[#172033]"}`}>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {state.signedIn ? (
              <Button variant="ghost" onClick={onLogout} className="hidden sm:inline-flex"><LogOut className="mr-2" size={16} /> Sign out</Button>
            ) : (
              <Button onClick={() => go("/auth")}>Sign in</Button>
            )}
            {state.signedIn && state.beneficiary && (
              <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Open navigation">
                {menuOpen ? <X /> : <Menu />}
              </Button>
            )}
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-[#edf0f4] bg-white px-5 py-3 md:hidden">
            {nav.map((item) => <button key={item.href} onClick={() => go(item.href)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#374357] hover:bg-[#f3f5f7]">{item.label}</button>)}
            <button onClick={onLogout} className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#8b2f28] hover:bg-[#fff2f0]">Sign out</button>
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
  const [state, setState] = useState<AppState>({ loading: true, signedIn: false, beneficiary: null });

  const refreshSession = async () => {
    if (!getAccessToken()) {
      setState({ loading: false, signedIn: false, beneficiary: null });
      return;
    }
    try {
      await api.me();
      let beneficiary: Beneficiary | null = null;
      try {
        beneficiary = await api.myBeneficiary();
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) throw error;
      }
      setState({ loading: false, signedIn: true, beneficiary });
    } catch {
      clearTokens();
      setState({ loading: false, signedIn: false, beneficiary: null });
    }
  };

  useEffect(() => { void refreshSession(); }, []);

  const logout = () => {
    clearTokens();
    setState({ loading: false, signedIn: false, beneficiary: null });
    router.push("/");
  };

  if (state.loading) return <LoadingScreen />;

  let content: ReactNode;
  if (pathname === "/auth") content = <AuthScreen onReady={refreshSession} />;
  else if (pathname === "/onboarding") content = <Onboarding onCreated={refreshSession} />;
  else if (pathname === "/interview") content = <RequireBeneficiary state={state}><Interview beneficiary={state.beneficiary!} /></RequireBeneficiary>;
  else if (pathname === "/profile") content = <RequireBeneficiary state={state}><ProfileScreen beneficiary={state.beneficiary!} /></RequireBeneficiary>;
  else if (pathname === "/pathways") content = <RequireBeneficiary state={state}><PathwaysScreen beneficiary={state.beneficiary!} /></RequireBeneficiary>;
  else if (pathname === "/pathway") content = <RequireBeneficiary state={state}><PathwayScreen /></RequireBeneficiary>;
  else content = <Landing state={state} />;

  return <Shell state={state} onLogout={logout}>{content}</Shell>;
}

function LoadingScreen() {
  return <div className="grid min-h-screen place-items-center bg-[#f7f8fa]"><div className="flex items-center gap-3 text-sm font-medium text-[#536175]"><Loader2 className="animate-spin" size={18} /> Opening LEAP AI…</div></div>;
}

function RequireBeneficiary({ state, children }: { state: AppState; children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!state.signedIn) router.replace("/auth");
    else if (!state.beneficiary) router.replace("/onboarding");
  }, [state, router]);
  if (!state.signedIn || !state.beneficiary) return <LoadingScreen />;
  return <>{children}</>;
}

function Landing({ state }: { state: AppState }) {
  const router = useRouter();
  const nextHref = state.signedIn ? (state.beneficiary ? "/interview" : "/onboarding") : "/auth";
  return (
    <main>
      <section className="border-b border-[#e7ebf0] bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 sm:px-7 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-24">
          <div>
            <Badge className="mb-5 bg-[#edf5f1] text-[#2b6b57] hover:bg-[#edf5f1]">Voice-first livelihood guidance</Badge>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#172033] sm:text-6xl">Start with what you know. Build toward what you want.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#667386]">LEAP AI listens to your experience, goals and real-life limits, then maps them to practical livelihood pathways you can understand and act on.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => router.push(nextHref)} className="h-12 px-5">Start assessment <ArrowRight className="ml-2" size={18} /></Button>
              {state.signedIn && state.beneficiary && <Button size="lg" variant="outline" onClick={() => router.push("/pathways")} className="h-12 px-5">View my pathways</Button>}
            </div>
          </div>
          <div className="rounded-[28px] border border-[#e2e7ec] bg-[#f8fafb] p-5 sm:p-7">
            <div className="rounded-[22px] bg-white p-6 shadow-[0_14px_45px_rgba(26,40,60,.07)]">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#eaf2f8] text-[#163d69]"><Mic size={20} /></div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#43806d]"><span className="h-2 w-2 rounded-full bg-[#4c9a7d]" /> Listening can be paused anytime</div>
              </div>
              <div className="mt-8 text-sm text-[#7a8493]">LEAP AI asks</div>
              <div className="mt-2 text-2xl font-medium leading-9 tracking-[-0.02em]">“What work do you already know how to do?”</div>
              <div className="mt-7 rounded-2xl border border-[#e3e7eb] bg-[#fbfcfd] p-4 text-[15px] leading-7 text-[#48566a]">I have been helping with tailoring work for four years, but I want to learn solar installation.</div>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Tailoring experience', '4 years', 'Solar aspiration'].map((item) => <span key={item} className="rounded-full bg-[#eef4f8] px-3 py-1.5 text-xs font-medium text-[#365875]">{item}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1240px] px-5 py-14 sm:px-7">
        <SectionLabel>How it works</SectionLabel>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [Headphones, "Tell us your story", "Speak or type in simple language. Your informal experience matters."],
            [Target, "See realistic options", "LEAP checks aspiration, eligibility, distance, training access and existing skills."],
            [ShieldCheck, "Know why a path fits", "Every recommendation comes with reasons. Uncertain cases can be reviewed by a person."],
          ].map(([Icon, title, copy]) => {
            const Comp = Icon as typeof Headphones;
            return <Card key={String(title)} className="border-[#e2e7ec] shadow-none"><CardContent className="p-6"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef3f7] text-[#214d76]"><Comp size={19} /></div><h2 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-[#6a7688]">{String(copy)}</p></CardContent></Card>;
          })}
        </div>
      </section>
    </main>
  );
}

function AuthScreen({ onReady }: { onReady: () => Promise<void> }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const tokens = mode === "login" ? await api.login({ email, password }) : await api.register({ email, password, phone: phone || undefined });
      saveTokens(tokens);
      await onReady();
      try {
        await api.myBeneficiary();
        router.push("/");
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) router.push("/onboarding");
        else throw error;
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
        <SectionLabel>Your account</SectionLabel>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">Your profile should come from your story, not from a pre-filled template.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-[#687588]">Create an account, tell LEAP what you actually know and want, and let the recommendation engine build pathways from your own inputs.</p>
      </div>
      <Card className="mx-auto w-full max-w-[520px] border-[#e1e6eb] shadow-[0_20px_60px_rgba(26,40,60,.08)]">
        <CardContent className="p-6 sm:p-8">
          <div className="flex gap-1 rounded-xl bg-[#f1f3f5] p-1">
            <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === "login" ? "bg-white text-[#172033] shadow-sm" : "text-[#697588]"}`} onClick={() => setMode("login")}>Sign in</button>
            <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === "register" ? "bg-white text-[#172033] shadow-sm" : "text-[#697588]"}`} onClick={() => setMode("register")}>Create account</button>
          </div>
          <h2 className="mt-7 text-2xl font-semibold tracking-[-0.03em]">{mode === "login" ? "Welcome back" : "Create your LEAP account"}</h2>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@example.com" /></Field>
            {mode === "register" && <Field label="Phone (optional)"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="field" placeholder="Mobile number" /></Field>}
            <Field label="Password"><input required minLength={10} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" placeholder="At least 10 characters" /></Field>
            <Button disabled={busy} className="h-11 w-full">{busy && <Loader2 className="mr-2 animate-spin" size={16} />}{mode === "login" ? "Sign in" : "Create account"}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-[#354154]">{label}</span>{children}</label>;
}

function Onboarding({ onCreated }: { onCreated: () => Promise<void> }) {
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
      <SectionLabel>Start here</SectionLabel>
      <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">A few basics before we talk about work.</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[#697588]">These details help LEAP make recommendations that are relevant to your location and preferred language.</p>
      <Card className="mt-8 border-[#e1e6eb] shadow-none"><CardContent className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        <form onSubmit={submit} className="contents">
          <Field label="Name"><input required value={form.name} onChange={(e) => update("name", e.target.value)} className="field" placeholder="Your name" /></Field>
          <Field label="Age"><input type="number" min="14" max="100" value={form.age} onChange={(e) => update("age", e.target.value)} className="field" placeholder="Age" /></Field>
          <Field label="Gender (optional)"><input value={form.gender} onChange={(e) => update("gender", e.target.value)} className="field" placeholder="Optional" /></Field>
          <Field label="District"><input required value={form.district} onChange={(e) => update("district", e.target.value)} className="field" placeholder="For example: Madurai" /></Field>
          <Field label="Preferred language"><select value={form.preferred_language} onChange={(e) => update("preferred_language", e.target.value)} className="field"><option>Tamil</option><option>Hindi</option><option>English</option></select></Field>
          <Field label="Comfort with smartphones"><select value={form.digital_literacy} onChange={(e) => update("digital_literacy", e.target.value)} className="field"><option value="LOW">I need simple guidance</option><option value="MEDIUM">I can use basic apps</option><option value="HIGH">I am comfortable with apps</option></select></Field>
          <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-[#e1e6eb] bg-[#fafbfc] p-4 text-sm leading-6 text-[#536175]"><input type="checkbox" checked={form.consent_given} onChange={(e) => update("consent_given", e.target.checked)} className="mt-1" /><span>I agree to let LEAP store my answers so it can build and explain my livelihood profile.</span></label>
          <div className="sm:col-span-2 flex justify-end"><Button disabled={busy || !form.consent_given} size="lg">{busy && <Loader2 className="mr-2 animate-spin" size={16} />}Continue to assessment <ArrowRight className="ml-2" size={17} /></Button></div>
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

function Interview({ beneficiary }: { beneficiary: Beneficiary }) {
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
    recognition.lang = beneficiary.preferred_language === "Tamil" ? "ta-IN" : beneficiary.preferred_language === "Hindi" ? "hi-IN" : "en-IN";
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
        <div><SectionLabel>Livelihood assessment</SectionLabel><h1 className="text-3xl font-semibold tracking-[-0.035em]">Tell us about your work, in your own words.</h1></div>
        <div className="hidden text-right sm:block"><div className="text-sm font-medium text-[#566276]">Question {index + 1} of {questions.length}</div><div className="mt-1 text-xs text-[#8a93a1]">{progress}% complete</div></div>
      </div>
      <Progress value={progress} className="mt-6 h-1.5" />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border-[#e0e5ea] shadow-[0_18px_50px_rgba(26,40,60,.07)]"><CardContent className="p-6 sm:p-9">
          <div className="text-sm font-medium text-[#6f7b8d]">LEAP asks</div>
          <h2 className="mt-2 text-2xl font-medium leading-9 tracking-[-0.025em] sm:text-3xl">{question.title}</h2>
          <p className="mt-3 text-sm leading-6 text-[#768294]">{question.hint}</p>
          <div className="mt-7">
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} placeholder={question.placeholder} className="resize-none rounded-2xl border-[#dbe1e7] bg-[#fcfdfe] p-4 text-base leading-7" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={listening ? stopListening : startListening} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${listening ? "border-[#b9dccc] bg-[#edf8f3] text-[#28634f]" : "border-[#dbe1e7] bg-white text-[#405066] hover:bg-[#f7f9fa]"}`}>
                <Mic size={17} /> {listening ? "Listening… tap to stop" : "Answer by voice"}
              </button>
              <Button disabled={busy || !answer.trim()} onClick={saveAnswer}>{busy && <Loader2 className="mr-2 animate-spin" size={16} />}{index === questions.length - 1 ? "Build my pathways" : "Save and continue"}<ChevronRight className="ml-1" size={17} /></Button>
            </div>
          </div>
        </CardContent></Card>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#dfe5ea] bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#314259]"><ShieldCheck size={17} /> How LEAP uses this</div>
            <p className="mt-3 text-sm leading-6 text-[#6c7889]">Your answers become profile evidence. The final pathway ranking comes from the rule-based scoring engine, not from a chatbot guessing a career.</p>
          </div>
          <div className="rounded-2xl border border-[#dfe5ea] bg-[#f3f7fa] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#314259]"><Wifi size={17} /> Voice is optional</div>
            <p className="mt-3 text-sm leading-6 text-[#6c7889]">If speech input is unavailable, type naturally. The same backend workflow stores and evaluates your answer.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ProfileScreen({ beneficiary }: { beneficiary: Beneficiary }) {
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
  ];

  return (
    <main className="mx-auto max-w-[1100px] px-5 py-10 sm:px-7 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><SectionLabel>Your livelihood profile</SectionLabel><h1 className="text-3xl font-semibold tracking-[-0.035em]">What LEAP understood about you</h1><p className="mt-3 text-base text-[#6b7789]">This profile comes from your saved assessment answers.</p></div>
        <div className="min-w-[220px]"><div className="mb-2 flex justify-between text-sm"><span className="text-[#687588]">Profile completeness</span><span className="font-semibold">{Math.round(profile.profile_completion_percentage)}%</span></div><Progress value={profile.profile_completion_percentage} /></div>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="border-[#e1e6eb] shadow-none"><CardContent className="p-6 sm:p-7"><div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">{details.map(([label, value]) => <div key={label}><div className="text-xs font-medium uppercase tracking-[0.08em] text-[#8993a0]">{label}</div><div className="mt-1.5 text-[15px] font-medium leading-6 text-[#273449]">{value}</div></div>)}</div></CardContent></Card>
        <Card className="border-[#e1e6eb] shadow-none"><CardContent className="p-6 sm:p-7"><div className="flex items-center gap-2 font-semibold"><BriefcaseBusiness size={18} /> Skills and experience</div><div className="mt-5 space-y-3">{skills.length ? skills.map((skill) => <div key={skill.id} className="rounded-xl border border-[#e4e8ec] bg-[#fbfcfd] p-4"><div className="font-medium">{skill.skill_name || "Skill"}</div><div className="mt-1 text-sm text-[#707b8b]">{skill.experience_years} years · {skill.verified ? "Verified evidence" : "Self-reported"}</div></div>) : <p className="text-sm leading-6 text-[#707b8b]">No skills have been added yet.</p>}</div></CardContent></Card>
      </div>
      <div className="mt-6 flex justify-end"><Button onClick={() => router.push("/pathways")}>See my pathways <ArrowRight className="ml-2" size={17} /></Button></div>
    </main>
  );
}

function PathwaysScreen({ beneficiary }: { beneficiary: Beneficiary }) {
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
        <div><SectionLabel>Your recommendations</SectionLabel><h1 className="text-3xl font-semibold tracking-[-0.035em]">Paths that fit your situation</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[#697588]">Scores are calculated from your profile, current skills, eligibility, local training access and practical constraints.</p></div>
        <Button variant="outline" disabled={regenerating} onClick={() => { setRegenerating(true); void load(true); }}>{regenerating && <Loader2 className="mr-2 animate-spin" size={16} />}Recalculate</Button>
      </div>
      {pathways.length === 0 ? <div className="mt-10"><EmptyState title="No valid pathways found yet" copy="Your profile may need more evidence, or the local qualification data may not have a valid match yet." action="Review profile" onAction={() => router.push("/profile")} /></div> : (
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {pathways.map((pathway, i) => <PathwayCard key={pathway.id} pathway={pathway} rank={i + 1} onOpen={() => router.push(`/pathway?id=${pathway.id}`)} />)}
        </div>
      )}
      <div className="mt-8 rounded-2xl border border-[#dfe5ea] bg-white p-5 text-sm leading-6 text-[#677487]"><span className="font-semibold text-[#334259]">Why this is different from a chatbot answer:</span> the backend excludes invalid qualifications, checks constraints, applies one scoring model, and sends low-confidence cases for human review.</div>
    </main>
  );
}

function PathwayCard({ pathway, rank, onOpen }: { pathway: Pathway; rank: number; onOpen: () => void }) {
  const confidenceStyle = pathway.confidence === "GREEN" ? "bg-[#eaf5ef] text-[#2c6a55]" : pathway.confidence === "RED" ? "bg-[#fff0ee] text-[#9b372e]" : "bg-[#fff5df] text-[#86601b]";
  return (
    <Card className="group border-[#e0e5ea] shadow-none transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(30,45,65,.08)]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#eef3f7] text-sm font-semibold text-[#214b72]">{rank}</div><Badge className={confidenceStyle}>{pathway.confidence.toLowerCase()} confidence</Badge></div>
        <div className="mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-[#798595]">{pathway.type.replaceAll("_", " ")}</div>
        <h2 className="mt-2 text-xl font-semibold leading-7 tracking-[-0.025em]">{pathway.title}</h2>
        <div className="mt-5 flex items-end gap-2"><span className="text-4xl font-semibold tracking-[-0.04em] text-[#163d69]">{Math.round(pathway.score)}</span><span className="pb-1 text-sm text-[#7c8795]">fit score</span></div>
        <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-[#f1f4f6] px-3 py-1.5 text-xs font-medium text-[#4e5d70]">{routeLabel(pathway.recommended_route)}</span>{pathway.constraints.slice(0, 1).map((constraint) => <span key={constraint.constraint_type} className="rounded-full bg-[#fff4e8] px-3 py-1.5 text-xs font-medium text-[#855a19]">{humanize(constraint.constraint_type)}</span>)}</div>
        <button onClick={onOpen} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#174b8a]">See why this fits <ChevronRight size={16} className="transition group-hover:translate-x-0.5" /></button>
      </CardContent>
    </Card>
  );
}

function PathwayScreen() {
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
      <button onClick={() => router.push("/pathways")} className="mb-7 text-sm font-medium text-[#506078]">← Back to pathways</button>
      <div className="grid gap-7 lg:grid-cols-[1fr_300px]">
        <div>
          <SectionLabel>{pathway.type.replaceAll("_", " ")}</SectionLabel>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">{pathway.title}</h1>
          <p className="mt-4 text-base leading-7 text-[#697588]">{pathway.description}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <InfoBlock icon={BadgeCheck} title="Recommended route" value={routeLabel(pathway.recommended_route)} />
            <InfoBlock icon={ShieldCheck} title="Confidence" value={`${humanize(pathway.confidence)} confidence`} />
          </div>
          <div className="mt-8">
            <h2 className="text-lg font-semibold">What LEAP used</h2>
            <div className="mt-4 space-y-3">{pathway.evidence.length ? pathway.evidence.map((item, index) => <div key={`${item.label}-${index}`} className="rounded-xl border border-[#e1e6eb] bg-white p-4"><div className="font-medium">{item.label}</div><div className="mt-1 text-sm text-[#6c7889]">{item.value}</div></div>) : <div className="rounded-xl border border-[#e1e6eb] bg-white p-4 text-sm leading-6 text-[#6c7889]">This pathway was generated from your saved profile, skills, qualification eligibility and available training data.</div>}</div>
          </div>
          {pathway.constraints.length > 0 && <div className="mt-8"><h2 className="text-lg font-semibold">Things to plan around</h2><div className="mt-4 space-y-3">{pathway.constraints.map((item, index) => <div key={`${item.constraint_type}-${index}`} className="flex gap-3 rounded-xl border border-[#eee2cf] bg-[#fffaf2] p-4"><CircleAlert className="mt-0.5 shrink-0 text-[#9a6b1f]" size={18} /><div><div className="font-medium">{humanize(item.constraint_type)}</div><div className="mt-1 text-sm leading-6 text-[#746853]">{item.effect}</div></div></div>)}</div></div>}
        </div>
        <aside>
          <div className="sticky top-24 rounded-2xl bg-[#173f6b] p-6 text-white">
            <div className="text-sm text-[#c6d6e7]">Overall fit</div><div className="mt-1 text-5xl font-semibold tracking-[-0.05em]">{Math.round(pathway.score)}</div><div className="mt-6 border-t border-white/15 pt-5 text-sm leading-6 text-[#d7e2ed]">This score is recalculated from stored evidence. It is not a fixed display value.</div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function InfoBlock({ icon: Icon, title, value }: { icon: typeof Sparkles; title: string; value: string }) {
  return <div className="rounded-2xl border border-[#e1e6eb] bg-white p-5"><div className="flex items-center gap-2 text-sm text-[#738092]"><Icon size={17} /> {title}</div><div className="mt-2 font-semibold text-[#29374b]">{value}</div></div>;
}

function PageLoader({ text }: { text: string }) {
  return <main className="mx-auto grid min-h-[60vh] max-w-[900px] place-items-center px-5"><div className="flex items-center gap-3 text-sm font-medium text-[#5e6b7d]"><Loader2 size={18} className="animate-spin" /> {text}</div></main>;
}

function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action: string; onAction: () => void }) {
  return <main className="mx-auto grid min-h-[60vh] max-w-[760px] place-items-center px-5"><div className="w-full rounded-2xl border border-[#e1e6eb] bg-white p-8 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#eef3f7] text-[#214b72]"><ClipboardList size={20} /></div><h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">{title}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#6b7788]">{copy}</p><Button className="mt-6" onClick={onAction}>{action}</Button></div></main>;
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
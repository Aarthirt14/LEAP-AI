"use client";
import { ArrowRight, UserRound, UsersRound, ClipboardCheck, ChartNoAxesCombined, Settings } from 'lucide-react';
import { demoRoles, type DemoRole } from '@/lib/demo-session';
import type { Locale } from '@/lib/i18n';
import { words } from './primitives';
import { LeapMark } from './logo';
const descriptions = [
  ['Beneficiary', 'Explore a livelihood profile, prior experience, pathway evidence and progress.', UserRound],
  ['Field worker', 'Open a sample worklist and see how assisted assessment and follow-up fit together.', UsersRound],
  ['Facilitator', 'Inspect uncertain pathways and the evidence that needs human review.', ClipboardCheck],
  ['District officer', 'Explore aggregate counts with explicit limits on what they mean.', ChartNoAxesCombined],
  ['Administrator', 'View sample catalogue and review diagnostics without system access.', Settings],
] as const;
export function DemoChooser({onSelect, locale}: {onSelect: (role: DemoRole)=>void; locale: Locale}) {
  return <main className="mx-auto max-w-[1100px] px-5 py-12 sm:px-7">
    <LeapMark className="mb-6 h-16 w-16"/>
    <p className="eyebrow">LEAP AI · {words(locale,'Read-only demo','பார்வைக்கான மாதிரி','केवल देखने का डेमो')}</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#071A3D]">{words(locale,'Five perspectives. One livelihood journey.','ஐந்து பார்வைகள். ஒரு வாழ்வாதாரப் பயணம்.','पाँच नज़रिए। एक आजीविका यात्रा।')}</h1>
    <p className="mt-4 max-w-2xl leading-7 text-[#41526d]">{words(locale,'Choose a role to explore the actual app screens. No email or password needed. All records are fictional, and actions cannot change live data.','உண்மையான செயலித் திரைகளைப் பார்க்க ஒரு பங்கைத் தேர்வுசெய்யுங்கள். மின்னஞ்சல் அல்லது கடவுச்சொல் தேவையில்லை. எல்லாப் பதிவுகளும் கற்பனையானவை; உண்மைத் தரவை மாற்ற முடியாது.','ऐप की स्क्रीन देखने के लिए भूमिका चुनें। ईमेल या पासवर्ड की जरूरत नहीं। सभी रिकॉर्ड काल्पनिक हैं और वास्तविक डेटा नहीं बदलेगा।')}</p>
    <div className="mt-9 grid gap-4 md:grid-cols-2">{demoRoles.map((role,i)=>{
      const [title,description,Icon]=descriptions[i];
      return <button key={role} onClick={()=>onSelect(role)} className="group flex items-start gap-4 rounded-2xl border border-[#dce3ec] bg-white p-6 text-left transition hover:border-[#0FA968] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0FA968]">
        <span className="rounded-xl bg-[#EAF8F1] p-3 text-[#087647]"><Icon size={24}/></span><span className="flex-1"><strong className="text-xl text-[#071A3D]">{title}</strong><span className="mt-2 block leading-6 text-[#41526d]">{description}</span><span className="mt-4 inline-flex items-center gap-2 font-semibold text-[#087647]">Open demo<ArrowRight size={17}/></span></span>
      </button>;
    })}</div>
    <p className="mt-6 text-sm leading-6 text-[#536175]">Sample scores come from the deterministic engine run on synthetic seed data. Availability, certification and outcomes are not verified. Interview submission, approval and saving require a real account.</p>
  </main>;
}

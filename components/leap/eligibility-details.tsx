"use client";

import { useState, type FormEvent } from "react";
import { api, type Profile, type QualificationEligibilityFacts } from "@/lib/api";
import { type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Panel, words } from "./primitives";
import catalogue from "@/data/nqr-reference.json";

const unknown: QualificationEligibilityFacts = { previous_nsqf_level: null, relevant_experience_years: null, certificates: null };
const certificateOptions = ["NTC", "NAC", "CITS", "NTC_2_YEAR"] as const;

export function EligibilityDetails({ profile, locale, onSaved }: { profile: Profile; locale: Locale; onSaved: (profile: Profile) => void }) {
  const [facts, setFacts] = useState(profile.eligibility_facts || {});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const w = (en: string, ta: string, hi: string) => words(locale, en, ta, hi);
  function change(key: string, patch: Partial<QualificationEligibilityFacts>) {
    setFacts(previous => ({ ...previous, [key]: { ...unknown, ...previous[key], ...patch } }));
    setMessage("");
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      onSaved(await api.updateProfile(profile.beneficiary_id, { eligibility_facts: facts }));
      setMessage(w("Saved. Recalculate your pathways to use these details. Admission still requires provider confirmation.", "சேமிக்கப்பட்டது. இந்த விவரங்களைப் பயன்படுத்த பாதைகளை மீண்டும் கணக்கிடவும். சேர்க்கைக்கு பயிற்சி நிறுவனத்தின் உறுதிப்படுத்தல் தேவை.", "सहेजा गया। इन विवरणों के लिए अपने विकल्पों की दोबारा गणना करें। प्रवेश के लिए प्रशिक्षण प्रदाता की पुष्टि आवश्यक है।"));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save eligibility details."); }
    finally { setBusy(false); }
  }
  return <Panel className="mt-6">
    <h2 className="text-xl font-semibold">{w("Qualification entry routes", "தகுதிக்கான நுழைவு வழிகள்", "योग्यता के प्रवेश मार्ग")}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">{w("Optional, self-reported details. Enter only experience and certificates relevant to each qualification. Leave unknown values blank; enter 0 only when you have none. Your education is taken from your profile.", "விருப்பமான, நீங்கள் அளிக்கும் விவரங்கள். ஒவ்வொரு தகுதிக்கும் பொருத்தமான அனுபவம் மற்றும் சான்றிதழ்களை மட்டும் உள்ளிடவும். தெரியாததை காலியாக விடவும்; இல்லாதபோது மட்டும் 0 உள்ளிடவும். கல்வி விவரம் உங்கள் சுயவிவரத்திலிருந்து பெறப்படும்.", "वैकल्पिक, स्वयं बताए गए विवरण। हर योग्यता से संबंधित अनुभव और प्रमाणपत्र ही भरें। अज्ञात जानकारी खाली छोड़ें; अनुभव न होने पर ही 0 भरें। शिक्षा आपके प्रोफ़ाइल से ली जाएगी।")}</p>
    <form onSubmit={save} className="mt-5 space-y-5">
      {catalogue.records.map(record => {
        const key = `NQR:${record.registry_id}`;
        const value = facts[key] || unknown;
        return <fieldset key={key} disabled={busy} className="rounded-xl border border-slate-200 p-4">
          <legend className="px-2 font-semibold">{record.title}</legend>
          <a href={record.source_url} target="_blank" rel="noreferrer" className="text-sm text-emerald-800 underline">NQR {record.registry_id}</a>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">{w("Previous relevant NSQF level", "முந்தைய பொருத்தமான NSQF நிலை", "पिछला संबंधित NSQF स्तर")}
              <select className="field mt-2" value={value.previous_nsqf_level ?? ""} onChange={e => change(key, { previous_nsqf_level: e.target.value === "" ? null : Number(e.target.value) })}>
                <option value="">{w("Unknown", "தெரியவில்லை", "अज्ञात")}</option>
                <option value="0">{w("None", "இல்லை", "कोई नहीं")}</option>
                {Array.from({ length: 15 }, (_, i) => 1 + i * .5).map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">{w("Relevant experience (years)", "பொருத்தமான அனுபவம் (ஆண்டுகள்)", "संबंधित अनुभव (वर्ष)")}
              <input className="field mt-2" type="number" min="0" max="80" step="any" value={value.relevant_experience_years ?? ""} onChange={e => change(key, { relevant_experience_years: e.target.value === "" ? null : Number(e.target.value) })}/>
            </label>
          </div>
          <label className="mt-4 block text-sm font-medium">{w("Relevant certificates", "பொருத்தமான சான்றிதழ்கள்", "संबंधित प्रमाणपत्र")}
            <select className="field mt-2" value={value.certificates === null ? "unknown" : "known"} onChange={e => change(key, { certificates: e.target.value === "unknown" ? null : [] })}>
              <option value="unknown">{w("Unknown / not checked", "தெரியவில்லை / சரிபார்க்கவில்லை", "अज्ञात / जाँच नहीं की")}</option>
              <option value="known">{w("I can report my certificates", "எனது சான்றிதழ்களைத் தெரிவிக்க முடியும்", "मैं अपने प्रमाणपत्र बता सकता/सकती हूँ")}</option>
            </select>
          </label>
          {value.certificates !== null && <div className="mt-3">
            <p className="text-sm text-slate-600">{w("Select all held. Select none if you have none of these certificates. NTC_2_YEAR means a two-year NTC.", "உங்களிடம் உள்ள அனைத்தையும் தேர்ந்தெடுக்கவும். இவை எதுவும் இல்லையெனில் தேர்ந்தெடுக்க வேண்டாம். NTC_2_YEAR என்பது இரண்டு ஆண்டு NTC.", "अपने सभी प्रमाणपत्र चुनें। इनमें से कोई नहीं होने पर कुछ न चुनें। NTC_2_YEAR का अर्थ दो वर्षीय NTC है।")}</p>
            <div className="mt-2 flex flex-wrap gap-4">{certificateOptions.map(cert => <label key={cert} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.certificates!.includes(cert)} onChange={e => change(key, { certificates: e.target.checked ? [...value.certificates!, cert] : value.certificates!.filter(c => c !== cert) })}/>{cert}</label>)}</div>
          </div>}
        </fieldset>;
      })}
      <Button disabled={busy}>{w(busy ? "Saving…" : "Save entry-route details", busy ? "சேமிக்கிறது…" : "நுழைவு வழி விவரங்களைச் சேமி", busy ? "सहेज रहे हैं…" : "प्रवेश मार्ग विवरण सहेजें")}</Button>
      {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
  </Panel>;
}

"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVoiceLocale, type Locale } from "@/lib/i18n";
import { words } from "./primitives";

export function SpokenQuestion({ text, locale, disabled }: { text: string; locale: Locale; disabled: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  const [available, setAvailable] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const language = getVoiceLocale(locale).split("-")[0].toLowerCase();
    const update = () => setAvailable(synth.getVoices().some(v => v.lang.toLowerCase().split(/[-_]/)[0] === language));
    update();
    synth.addEventListener("voiceschanged", update);
    return () => { synth.removeEventListener("voiceschanged", update); synth.cancel(); };
  }, [locale]);
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setFailed(false);
  }, [text, disabled]);
  const speak = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    if (speaking) { setSpeaking(false); return; }
    const lang = getVoiceLocale(locale);
    const voices = synth.getVoices();
    const voice = voices.find(v => v.lang.toLowerCase() === lang.toLowerCase())
      ?? voices.find(v => v.lang.toLowerCase().split(/[-_]/)[0] === lang.split("-")[0].toLowerCase());
    if (!voice) { setAvailable(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = event => { setSpeaking(false); if (event.error !== "canceled" && event.error !== "interrupted") setFailed(true); };
    setFailed(false);
    setSpeaking(true);
    synth.speak(utterance);
  };
  return <div className="mt-4">
    <Button type="button" variant="outline" disabled={disabled || !available} onClick={speak} aria-pressed={speaking}>
      <Volume2 size={17}/>{speaking ? words(locale,"Stop reading","வாசிப்பதை நிறுத்து","पढ़ना रोकें") : words(locale,"Listen to question","கேள்வியைக் கேளுங்கள்","सवाल सुनें")}
    </Button>
    {(!available || failed) && <p role="status" className="mt-2 text-sm text-slate-600">{words(locale,"Audio for this language is unavailable on this device. You can read the question or ask a field worker for help.","இந்தச் சாதனத்தில் இந்த மொழிக்கான ஒலி கிடைக்கவில்லை. கேள்வியைப் படிக்கலாம் அல்லது களப்பணியாளரின் உதவியைப் பெறலாம்.","इस उपकरण पर इस भाषा की आवाज़ उपलब्ध नहीं है। सवाल पढ़ें या क्षेत्र कार्यकर्ता की मदद लें।")}</p>}
  </div>;
}

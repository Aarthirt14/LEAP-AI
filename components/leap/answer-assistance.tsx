"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { words } from "./primitives";

export function AnswerAssistance({ sessionId, answerId, text, locale, disabled, onApply }: {
  sessionId: number; answerId: number; text: string; locale: Locale; disabled: boolean; onApply: (text: string) => void;
}) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const active = useRef(true);
  useEffect(() => {active.current = true; return () => {active.current = false;};}, []);
  const request = async () => {
    if (!consent || busy || disabled) return;
    setBusy(true); setResult(null); setUnavailable(false);
    try {
      const response = await api.suggestInterviewAnswer(sessionId, answerId);
      if (!active.current) return;
      if (response.source_text === text && response.status === "suggestion" && response.normalized_text) setResult(response.normalized_text);
      else setUnavailable(true);
    } catch {if (active.current) setUnavailable(true);}
    finally {if (active.current) setBusy(false);}
  };
  return <details className="mt-4 rounded-xl border border-slate-200 p-4">
    <summary className="cursor-pointer text-sm font-semibold">{words(locale,"Optional AI language help","விருப்ப AI மொழி உதவி","वैकल्पिक AI भाषा सहायता")}</summary>
    <p className="mt-3 text-sm leading-6">{words(locale,"Send this answer to OpenAI to suggest clearer English wording. It can make mistakes. Check the meaning before saving; you can always edit manually.","இந்தப் பதிலைத் தெளிவான ஆங்கிலத்தில் எழுத உதவ OpenAI-க்கு அனுப்பலாம். தவறுகள் இருக்கலாம். சேமிக்கும் முன் பொருளைச் சரிபாருங்கள்; நீங்களே திருத்தலாம்.","स्पष्ट अंग्रेज़ी शब्दों का सुझाव पाने के लिए यह उत्तर OpenAI को भेजें। गलतियाँ हो सकती हैं। सहेजने से पहले अर्थ जाँचें; आप खुद भी सुधार सकते हैं।")}</p>
    <label className="mt-3 flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1" checked={consent} disabled={busy || disabled} onChange={e=>{setConsent(e.target.checked);setResult(null);setUnavailable(false);}}/>{words(locale,"I agree to send this answer for AI language assistance.","AI மொழி உதவிக்காக இந்தப் பதிலை அனுப்ப ஒப்புக்கொள்கிறேன்.","मैं AI भाषा सहायता के लिए यह उत्तर भेजने की सहमति देता/देती हूँ।")}</label>
    <Button className="mt-3 h-auto whitespace-normal" type="button" variant="outline" disabled={!consent || busy || disabled} onClick={request}>{busy?words(locale,"Checking…","சரிபார்க்கிறது…","जाँच जारी…"):words(locale,"Suggest wording","சொற்றொடரைப் பரிந்துரை செய்","शब्दों का सुझाव दें")}</Button>
    <div aria-live="polite">{unavailable && <p className="mt-3 text-sm">{words(locale,"No reliable suggestion is available. Your answer is unchanged. Please edit or confirm it yourself.","நம்பகமான பரிந்துரை கிடைக்கவில்லை. உங்கள் பதில் மாறவில்லை. நீங்களே திருத்தவும் அல்லது உறுதிப்படுத்தவும்.","भरोसेमंद सुझाव उपलब्ध नहीं है। आपका उत्तर बदला नहीं है। कृपया खुद सुधारें या पुष्टि करें।")}</p>}
    {result && <div className="mt-4 space-y-3"><p className="text-sm font-semibold">{words(locale,"AI suggestion — not verified","AI பரிந்துரை — சரிபார்க்கப்படவில்லை","AI सुझाव — सत्यापित नहीं")}</p><p className="break-words" lang="en">{result}</p><Button type="button" className="h-auto whitespace-normal" disabled={disabled} onClick={()=>{onApply(result);setResult(null);}}>{words(locale,"Review this in the editor","திருத்தியில் இதைச் சரிபார்க்கவும்","इसे संपादक में जाँचें")}</Button></div>}</div>
  </details>;
}

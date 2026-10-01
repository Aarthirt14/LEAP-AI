"use client";
import { type ReactNode } from "react";
import { AlertCircle, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { type Pathway } from "@/lib/api";
import { type Locale } from "@/lib/i18n";

export function words(locale: Locale, en: string, ta: string, hi: string) { return locale === "ta" ? ta : locale === "hi" ? hi : en; }
export function PageHeading({eyebrow,title,description,action}:{eyebrow:string;title:string;description?:string;action?:ReactNode}) {
 return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}
export function Panel({children,className=""}:{children:ReactNode;className?:string}) { return <section className={`leap-panel ${className}`}>{children}</section>; }
export function Notice({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"warning"|"success"}) { return <div className={`leap-notice ${tone}`}><AlertCircle size={19} aria-hidden="true"/><div>{children}</div></div>; }
export function PendingReview({pathway,locale="en"}:{pathway:Pathway;locale?:Locale}) {
 if (!(pathway.pending_human_review || (pathway.confidence === "RED" && pathway.review_status !== "APPROVED"))) return null;
 return <Notice tone="warning"><strong>{words(locale,"Pending human review","மனித மதிப்பாய்வு நிலுவையில் உள்ளது","मानवीय समीक्षा लंबित है")}</strong><p>{words(locale,"This is an option to discuss, not a recommendation to act on yet. A facilitator needs to review the evidence before you proceed.","தொடர்வதற்கு முன் உதவியாளர் ஆதாரங்களை மதிப்பாய்வு செய்ய வேண்டும்.","आगे बढ़ने से पहले सहायक को प्रमाणों की समीक्षा करनी होगी।")}</p></Notice>;
}
export function EvidenceRow({label,value,verified=false}:{label:string;value:string;verified?:boolean}) {return <div className="evidence-row"><span className={verified?"evidence-icon verified":"evidence-icon"}>{verified?<Check size={17}/>:<ShieldCheck size={17}/>}</span><div><h3>{label}</h3><p>{value}</p></div></div>;}
export function TextLink({children,onClick}:{children:ReactNode;onClick:()=>void}) {return <button className="text-link" onClick={onClick}>{children}<ArrowRight size={17}/></button>;}

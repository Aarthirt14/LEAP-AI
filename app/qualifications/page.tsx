import Link from "next/link";
import catalogue from "@/data/nqr-reference.json";

// Evaluate expiry/freshness per request, even when the source snapshot is unchanged.
export const dynamic = "force-dynamic";
export const metadata = { title: "Official qualification references | LEAP AI" };

export default function QualificationsPage() {
  const today = new Date().toISOString().slice(0, 10);
  return <main className="mx-auto max-w-5xl px-5 py-12 text-[#071A3D]">
    <Link href="/" className="font-semibold text-[#087647]">← Back to LEAP AI</Link>
    <h1 className="mt-8 text-3xl font-bold">Explore NSQF qualification references</h1>
    <p className="mt-4 max-w-3xl leading-7">These records come from the National Qualifications Register. They describe recognized qualifications and entry routes. A listed qualification does not confirm a nearby training batch, free training, admission or a job.</p>
    <p className="mt-3 text-sm text-slate-600">Manually reviewed source snapshot • English source summaries • Not a live government feed. Check the official entry and ask the provider to confirm the route that applies to you.</p>
    <div className="mt-8 grid gap-6">
      {catalogue.records.map(record => {
        const expired = record.valid_until < today;
        const reviewDue = Date.parse(today) - Date.parse(record.source_checked_on) > 30 * 86400000;
        return <article key={record.registry_id} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <p className="text-sm text-slate-600">{record.sector} · NSQF level {record.nsqf_level} · NQR record {record.registry_id}</p>
          <h2 className="mt-2 text-2xl font-semibold">{record.title}</h2>
          <p className="mt-3 leading-7">{record.summary}</p>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Awarding body</dt><dd>{record.awarding_body}</dd></div>
            <div><dt className="font-semibold">Training duration</dt><dd>{record.duration_hours_min === record.duration_hours_max ? record.duration_hours_min : `${record.duration_hours_min}–${record.duration_hours_max}`} hours</dd></div>
            <div><dt className="font-semibold">Published validity ends</dt><dd>{record.valid_until}{expired ? " — expired in this snapshot" : " — within the recorded validity period"}</dd></div>
            <div><dt className="font-semibold">Source reviewed</dt><dd>{record.source_checked_on}{reviewDue ? " — recheck overdue" : ""}</dd></div>
          </dl>
          {(expired || reviewDue) && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-amber-950">Recheck the official register before relying on this record. This snapshot may have been superseded.</p>}
          <h3 className="mt-6 font-semibold">Alternative entry routes</h3>
          <p className="mt-1 text-sm text-slate-600">These are alternatives, not requirements you must satisfy together. The awarding body or training provider must confirm your eligibility.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">{record.eligibility_routes.map(route => <li key={route}>{route}</li>)}</ul>
          <details className="mt-5 text-sm"><summary className="cursor-pointer font-semibold">Referenced occupational standards</summary><p className="mt-2 leading-6">{record.nos_codes.join(" · ")}</p></details>
          <p className="mt-5 text-sm font-medium">Local provider, seats, fees and batch dates: not verified.</p>
          <a className="mt-5 inline-block rounded-full bg-[#087647] px-5 py-3 font-semibold text-white" href={record.source_url} target="_blank" rel="noopener noreferrer">View official NQR entry ↗</a>
        </article>;
      })}
    </div>
  </main>;
}

import Link from "next/link";
import catalogue from "@/data/nqr-reference.json";
import { CatalogueBrowser } from "@/components/leap/catalogue-browser";
import type { SearchParams } from "@/lib/catalogue-search";

// Evaluate expiry/freshness per request, even when the source snapshot is unchanged.
export const dynamic = "force-dynamic";
export const metadata = { title: "Course and qualification catalogue | LEAP AI" };

export default async function QualificationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  return <main className="mx-auto max-w-5xl px-5 py-12 text-[#071A3D]">
    <Link href="/" className="font-semibold text-[#087647]">← Back to LEAP AI</Link>
    <h1 className="mt-8 text-3xl font-bold">Explore courses and qualifications</h1>
    <p className="mt-4 max-w-3xl leading-7">Find a trade, explore its catalogue entry and see what still needs confirmation before you apply.</p>
    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
      <a href="#reviewed-references" className="py-2 font-semibold text-[#087647] underline">View {catalogue.records.length} source-reviewed entry-route references ↓</a>
      <Link href="/pilot/coimbatore" className="py-2 font-semibold text-[#087647] underline">Coimbatore training contacts →</Link>
    </div>
    <CatalogueBrowser params={params} />
    <section id="reviewed-references" className="mt-12 scroll-mt-6" aria-labelledby="reviewed-title">
    <h2 id="reviewed-title" className="text-2xl font-semibold">Independently reviewed NQR references</h2>
    <p className="mt-3 text-sm leading-6 text-slate-600">These {catalogue.records.length} records have source-reviewed alternative entry routes used by LEAP&apos;s eligibility engine. Review is dated, not a live feed or admission approval. Expiry and review age are checked separately.</p>
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
    </section>
  </main>;
}

import Link from "next/link";
import pilot from "@/data/coimbatore-pilot.json";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coimbatore training contacts | LEAP AI" };

export default function CoimbatorePilotPage() {
  const today = new Date().toISOString().slice(0, 10);
  const age = (Date.parse(today) - Date.parse(pilot.source_checked_on)) / 86400000;
  const reviewDue = age < 0 || age > pilot.review_after_days;
  const closed = pilot.admission_notice.closes_on < today;
  return <main className="mx-auto max-w-5xl px-5 py-10 text-[#071A3D]">
    <Link href="/qualifications" className="font-semibold text-[#087647]">← Course catalogue</Link>
    <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-[#087647]">Coimbatore · Tamil Nadu</p>
    <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Find a training contact near you</h1>
    <p className="mt-4 max-w-3xl leading-7">Start with the district training office or a government ITI. Ask which courses are accepting applications and what documents you need.</p>
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950" role="status">
      <h2 className="font-semibold">No open batches confirmed yet</h2>
      <p className="mt-2 text-sm leading-6">These contacts appear in the official directory. Course availability, seats, fees and start dates still need confirmation. No admission or placement is promised.</p>
      <p className="mt-2 text-sm">Source checked: {pilot.source_checked_on}{reviewDue ? " · Recheck overdue — verify contacts before relying on them." : " · Dated source review; not a live availability feed."}</p>
    </div>
    <section aria-labelledby="contacts" className="mt-9">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="contacts" className="text-2xl font-semibold">Official training contacts</h2>
        <a href={pilot.directory_source} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#087647] underline">View Tamil Nadu DET directory ↗</a>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {pilot.providers.map(provider => <article key={provider.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold">{provider.name}</h3>
          <p className="mt-2 text-sm text-slate-600">Directory listing · admission details unconfirmed</p>
          <a href={`tel:+91${provider.phone}`} className="mt-4 inline-block rounded-full bg-[#087647] px-4 py-2 font-semibold text-white">Call {provider.phone}</a>
        </article>)}
      </div>
    </section>
    <section className="mt-8 rounded-2xl bg-slate-50 p-6" aria-labelledby="ask">
      <h2 id="ask" className="text-xl font-semibold">Before you travel or apply</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
        <li>Ask for the course title, qualification code and awarding body.</li>
        <li>Confirm the application deadline, batch start date, timetable and seats.</li>
        <li>Ask about fees, subsidies, documents, entry routes and accessibility support.</li>
        <li>Get an official notice or written confirmation with a date and contact person.</li>
      </ul>
    </section>
    <section className="mt-8 grid gap-5 sm:grid-cols-2" aria-label="Supporting official sources">
      <article className="rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold">Government ITI admission notice</h2>
        <p className="mt-2 font-medium text-amber-800">{closed ? "Closed" : "Published deadline"}: {pilot.admission_notice.closes_on}</p>
        <p className="mt-2 text-sm leading-6">{pilot.admission_notice.summary}</p>
        <a href={pilot.admission_notice.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#087647] underline">Read district notice ↗</a>
      </article>
      <article className="rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold">Textile training history</h2>
        <p className="mt-2 text-sm font-medium">{pilot.training_history.provider}</p>
        <p className="mt-2 text-sm leading-6">{pilot.training_history.summary}</p>
        <a href={pilot.training_history.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#087647] underline">View Samarth dashboard ↗</a>
      </article>
    </section>
  </main>;
}

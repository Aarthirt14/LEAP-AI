import Link from 'next/link';
import archive from '@/data/catalogue-archive.json';
import { catalogueHref, hasArchiveLevelConflict, searchCatalogue, type SearchParams } from '@/lib/catalogue-search';

export function CatalogueBrowser({ params }: { params: SearchParams }) {
  const results = searchCatalogue(archive.records, params);
  const sectors = [...new Set(archive.records.map(row => row.sector))].sort();
  const levels = [...new Set(archive.records.flatMap(row => 'nsqf_level' in row ? [row.nsqf_level] : []))].sort((a, b) => a - b);
  return <section id="catalogue" aria-labelledby="catalogue-title" className="mt-10 scroll-mt-6">
    <h2 id="catalogue-title" className="text-2xl font-semibold">Find a course or qualification</h2>
    <p className="mt-3 leading-7">Search 1,283 NQR qualification records and 2,366 PM-AJAY course entries. These are separate catalogues with possible overlap, not 3,649 distinct qualifications or available batches.</p>
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      <strong>Awaiting official recheck.</strong> These archived listings were retrieved from the public Saksham repository on 7 October 2026. LEAP could not independently refresh the government sites during import. They support discovery only; they do not establish eligibility, current validity, funding, seats or employment.
      <a href="#source-notes" className="ml-1 font-semibold underline">See source history</a>
    </div>
    <form action="/qualifications#catalogue" method="get" className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
      <label className="sm:col-span-2 lg:col-span-4"><span className="block text-sm font-semibold">Search titles, codes, sectors or awarding bodies</span><input name="q" defaultValue={results.q} maxLength={120} placeholder="Try tailoring, solar or a qualification code" className="field mt-2 w-full" /></label>
      <label><span className="block text-sm font-semibold">Catalogue</span><select name="source" defaultValue={results.source} className="field mt-2 w-full"><option value="">Both catalogues</option><option value="NQR">NQR qualifications</option><option value="PMAJAY">PM-AJAY courses</option></select></label>
      <label><span className="block text-sm font-semibold">Sector</span><select name="sector" defaultValue={results.sector} className="field mt-2 w-full"><option value="">All sectors</option>{sectors.map(sector => <option key={sector}>{sector}</option>)}</select></label>
      <label><span className="block text-sm font-semibold">NSQF level (NQR only)</span><select name="level" defaultValue={results.level} className="field mt-2 w-full"><option value="">Any / not specified</option>{levels.map(level => <option key={level} value={level}>Level {level}</option>)}</select></label>
      <div className="flex items-end gap-4"><button type="submit" className="min-h-11 rounded-lg bg-[#087647] px-5 py-3 font-semibold text-white">Search</button><Link href="/qualifications#catalogue" className="py-3 font-semibold underline">Reset</Link></div>
    </form>
    <p className="mt-5 text-sm text-slate-600" role="status">{results.total.toLocaleString('en-IN')} matching entries · Page {results.page} of {results.pages}</p>
    {results.total === 0 && <div className="mt-5 rounded-xl border border-slate-200 bg-white p-6"><h3 className="font-semibold">No matching entries</h3><p className="mt-2">Try a shorter English source term, remove the sector filter, or clear NSQF level when searching PM-AJAY courses.</p></div>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {results.rows.map(record => <article key={record.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{record.source === 'NQR' ? 'NQR qualification archive' : 'PM-AJAY course archive'}</p>
        <h3 className="mt-2 break-words text-lg font-semibold">{record.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{record.sector}{record.nsqf_level !== undefined ? ` · Archived NSQF level ${record.nsqf_level}` : ''}</p>
        {hasArchiveLevelConflict(record) && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Archive inconsistency: the level field differs from the level segment in its code. Confirm the current level on the official record; neither value has been corrected or verified by LEAP.</p>}
        <dl className="mt-4 space-y-2 text-sm">
          <div><dt className="font-semibold">Published code</dt><dd className="break-words">{record.code}</dd></div>
          {record.awarding_body && <div><dt className="font-semibold">Awarding body in archive</dt><dd>{record.awarding_body}</dd></div>}
          {record.duration_hours != null && record.duration_hours > 0 && <div><dt className="font-semibold">Archived notional hours</dt><dd>{record.duration_hours}</dd></div>}
          {record.course_scope && <div><dt className="font-semibold">Catalogue scope</dt><dd>{record.course_scope}</dd></div>}
          {record.course_group && <div><dt className="font-semibold">Course group</dt><dd>{record.course_group}</dd></div>}
        </dl>
        <p className="mt-4 text-sm text-amber-900">Entry requirements and current validity need review. Local batches, fees and seats are unverified.</p>
        <a href={record.source_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center font-semibold text-[#087647] underline">{record.source === 'NQR' ? 'Check official NQR record' : 'Check official PM-AJAY catalogue'} ↗</a>
      </article>)}
    </div>
    {results.pages > 1 && <nav aria-label="Catalogue pages" className="mt-6 flex items-center justify-between gap-4">
      {results.page > 1 ? <Link className="rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold" href={catalogueHref(results, results.page - 1)}>← Previous</Link> : <span />}
      <span className="text-sm">{results.page} / {results.pages}</span>
      {results.page < results.pages ? <Link className="rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold" href={catalogueHref(results, results.page + 1)}>Next →</Link> : <span />}
    </nav>}
    <details id="source-notes" className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-6">
      <summary className="cursor-pointer font-semibold">Source history and review limits</summary>
      <p className="mt-3">Government catalogue facts were extracted from attributed, commit-pinned public archives. Saksham&apos;s ranking logic, keyword annotations and translated titles were not imported. Archive retrieval is not government verification; LEAP&apos;s independently reviewed references appear below. Source titles remain in English.</p>
      {archive.sources.map(source => <div key={source.id} className="mt-4 min-w-0"><p className="font-semibold">{source.id}: {source.record_count.toLocaleString('en-IN')} entries · Archive retrieved {source.retrieved_on}</p><a className="underline" href={source.archive_url} target="_blank" rel="noopener noreferrer">View attributed source snapshot ↗</a><p className="mt-1 break-all text-xs text-slate-500">SHA-256: {source.archive_sha256}</p></div>)}
    </details>
  </section>;
}

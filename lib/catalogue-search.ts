export type CatalogueRecord = {
  id: string; source: string; title: string; code: string; sector: string;
  source_record_id: string; source_url: string; review_status: string;
  recommendation_eligible: boolean; batch_availability: string;
  nsqf_level?: number; awarding_body?: string; duration_hours?: number | null;
  course_scope?: string; course_group?: string; sub_sector?: string;
};
export type SearchParams = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) => typeof value === 'string' ? value : '';
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function searchCatalogue(records: CatalogueRecord[], params: SearchParams) {
  const q = single(params.q).trim().slice(0, 120);
  const source = ['NQR', 'PMAJAY'].includes(single(params.source)) ? single(params.source) : '';
  const sector = single(params.sector).slice(0, 150);
  const level = /^(?:[1-9](?:\.5)?|10)$/.test(single(params.level)) ? single(params.level) : '';
  const terms = normalize(q).split(' ').filter(Boolean);
  const matches = records.filter(row => {
    if (source && row.source !== source || sector && row.sector !== sector || level && row.nsqf_level !== Number(level)) return false;
    const haystack = normalize([row.title, row.code, row.sector, row.awarding_body, row.course_group, row.sub_sector].filter(Boolean).join(' '));
    return terms.every(term => haystack.includes(term));
  }).sort((a, b) => a.title.localeCompare(b.title, 'en') || a.id.localeCompare(b.id, 'en'));
  const pages = Math.max(1, Math.ceil(matches.length / 24));
  const requested = Number(single(params.page));
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, pages) : 1;
  return { q, source, sector, level, total: matches.length, pages, page, rows: matches.slice((page - 1) * 24, page * 24) };
}

export function catalogueHref(filters: {q: string; source: string; sector: string; level: string}, page: number) {
  const params = new URLSearchParams();
  for (const key of ['q', 'source', 'sector', 'level'] as const) if (filters[key]) params.set(key, filters[key]);
  params.set('page', String(page));
  return `/qualifications?${params.toString()}#catalogue`;
}

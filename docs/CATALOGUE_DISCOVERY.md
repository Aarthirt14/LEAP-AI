# Catalogue discovery and recommendation boundaries

LEAP's `/qualifications` page searches 1,283 NQR qualification records and 2,366 PM-AJAY course listings. These catalogues can overlap. Their sum is not a count of unique qualifications, available training batches, or verified opportunities.

## Provenance

On 7 October 2026, attempts to retrieve the government NQR and PM-AJAY CourseList pages timed out or returned gateway errors. We therefore imported factual catalogue fields from the public archives in [varuntutejaa/Saksham](https://github.com/varuntutejaa/Saksham/tree/d1cd2c4905f99978c852e74ac6ce84e2a867886a/server/prisma/data), pinned to commit `d1cd2c4905f99978c852e74ac6ce84e2a867886a`. Attribution is also visible in the application.

The archive's documentation identifies NQR and PM-AJAY as its original sources. LEAP has **not independently revalidated the bulk records against those sources**. We extracted catalogue facts only, not Saksham's application code, ranking engine, added keyword annotations or translated titles.

`data/catalogue-archive.json` records the archive URLs, pinned commit, original file SHA-256 digests, archive retrieval date and a null official-review date. Each entry is `AWAITING_OFFICIAL_RECHECK`, has `recommendation_eligible: false`, and explicitly unverified batch availability. Archive titles and codes are preserved; a PM-AJAY course scope such as National is not converted into an NSQF level.

## Search

Search is server-rendered with 24 entries per page, title/code/sector/awarding-body matching and catalogue, sector and NSQF-level filters. Only a page of results is sent to the browser. Search and pagination work with ordinary links and GET forms, including without JavaScript. Source titles remain in English. NSQF-level filtering applies to the NQR archive; PM-AJAY entries without that field cannot match it.

## What can influence recommendations?

The separate, two-record `data/nqr-reference.json` remains the source-reviewed eligibility catalogue. Its database import is already run by `backend/seed/start_production.sh`. Expiry, review age and alternative entry-route checks continue to apply. The discovery archive is **not imported into the Qualification table**, cannot grant eligibility, and cannot contribute opportunity, RPL, funding or placement evidence.

To promote a bulk entry: independently inspect its current official detail page; verify its identity/version, dates, duration and all alternative entry routes; encode and test the routes; add it to the reviewed snapshot and bundled backend copy using the existing validation/import workflow. Do not mark an archived entry reviewed merely because its URL resolves or its title matches. Source-to-competency mapping still needs separate review.

## Reproduce

Download the two factual JSON archives from the pinned links in the snapshot to a temporary input directory. Then run:

```bash
python scripts/import_catalogue_archive.py /path/to/inputs --retrieved-on YYYY-MM-DD
python scripts/test_catalogue_import.py
node scripts/check-catalogue.mjs
pnpm build
```

Use the actual archive download date. Reimporting does not advance any official-review date. The importer validates the entire input before atomically replacing the output; it makes no network or database writes. Current quantities are asserted by the search check, so an intentional source update must review the changed counts.

## Still needed

- Direct government-source refresh and qualification-detail review at scale.
- Verified provider/batch records with dates, seats, fees and confirmation provenance.
- Broader tested eligibility and competency mappings before increasing recommendation coverage.
- Real-speaker assessment and field evaluation. A larger searchable catalogue is not evidence of better recommendations.

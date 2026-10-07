# Real NQR reference catalogue

## Sources reviewed on 7 October 2026

| Record | Official source | Published validity end | Hours |
| --- | --- | --- | --- |
| Solar PV Installer–Electrical | https://www.nqr.gov.in/qualifications/11689 | 2027-05-29 | 390 |
| Electric Vehicle Service Technician | https://www.nqr.gov.in/qualifications/13239 | 2028-02-18 | 450–720 |

The source pages supply qualification level, awarding body, alternative entry routes, occupational-standard codes and duration. Summaries are paraphrased; official links remain the authority. The registry ID is not presented as a QP code. An original approval date is preserved as such, not mislabeled as the current version's validity-start date.

`data/nqr-reference.json` is the single manually reviewed source snapshot consumed by `/qualifications`. The page evaluates expiry and 30-day review age per request. It does not fetch NQR on page load, claim automatic synchronization, or infer a live batch. The landing page links to the catalogue. Source summaries are in English; no translated regulatory equivalence is claimed.

## Import reviewed references

From the repository root:

```bash
python backend/seed/import_nqr_reference.py data/nqr-reference.json
python backend/seed/import_nqr_reference.py reviewed.json --output data/nqr-reference.json
```

The importer checks unique registry IDs, matching official URLs, required fields, date coherence, NSQF levels, duration ranges and explicit unverified batch status. It atomically writes only after the whole snapshot passes. Importing replaces the reference snapshot, so include all records to retain. It does not contact a website, certify source contents, or write to a production database.

Expired records remain visible with an expiry warning for traceability. Rechecking must inspect the official source before changing `source_checked_on`; never advance dates automatically. NQR's homepage currently announces migration to Kaushalverse. Confirm redirected records and identifiers before changing the allowed source hosts; no undocumented API has been assumed.

## Database import and recommendation integration

The Qualification model has nullable `source_metadata` JSON, added by Alembic revision `20261007_nqr_metadata`. It holds the reviewed snapshot, structured routes and a SHA-256 digest. Existing records remain compatible. The latest snapshot is stored; Git preserves source-file history. This is not a full version-history database.

After applying migrations, run from `backend` against the intended configured database:

```bash
python -m alembic upgrade head
python -m seed.load_nqr_database ../data/nqr-reference.json
python -m seed.load_nqr_database ../data/nqr-reference.json --apply
```

The first import reports changes only. `--apply` commits an idempotent transaction. In a backend-only container, supply the reviewed JSON at a mounted/copied path. Import does not run automatically at startup and has not been run against production.

Keys `NQR:11689` and `NQR:13239` are internal registry references, not QP codes. Originally-approved dates are not substituted for current-version valid-from dates. Duration uses the published maximum for conservative training-burden scoring; the range stays in evidence. No training opportunities, seats, fees or competencies are invented.

## Alternative-route evaluation

Conditions within a route use AND; alternative routes use OR. A satisfied route yields `ELIGIBLE_ON_REPORTED_FACTS`, not admission approval. Missing information yields `NEEDS_VERIFICATION`, half eligibility credit and RED human review. Every route must be definitely unmet before `NOT_ELIGIBLE` excludes the candidate. Invalid/empty rules cannot grant eligibility.

The current profile supplies recognized completed school classes. Prior NSQF level, vocational certificates and qualification-relevant experience are not collected by the existing UI, so remain unknown. Generic work experience does not prove relevant experience. An unspecified NTC does not satisfy a two-year NTC requirement. Degree/diploma text is not silently converted into a school class.

NQR references older than 30 days since source review, future review timestamps and missing review dates are excluded from new recommendations. Published expiry is enforced independently. Review dates may only advance after source inspection. Missing competency mapping forces RED review; NOS identifiers alone do not establish RPL. Previously generated pathways are not retroactively regenerated; they need recalculation/review after catalogue changes.

Source links, review dates, expiry and route explanations accompany generated evidence. Local provider/batch verification remains separate. Before production release, verify migrations on staging, review the source-to-rule mapping, test real profiles with facilitators and finish PR #6 voice/recovery validation.

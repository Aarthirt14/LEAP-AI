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

## Recommendation boundary

The current Qualification model has one minimum education/experience pair, while these source entries have several alternative routes including prior NSQF levels and certificates. Flattening these alternatives could wrongly exclude or admit beneficiaries. Therefore this change provides real browsable references without silently inserting them into ranking or converting all alternatives to a single threshold.

Next integration requires a model/migration for versioned qualifications and alternative eligibility routes, evaluation against confirmed beneficiary facts, regression tests for those alternatives, and source-backed competency mapping. Live provider/batch information remains a separately verified dataset. No seats, fees, providers, district coverage, government funding or employment outcomes are invented here.

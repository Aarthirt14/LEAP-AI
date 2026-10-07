# Coimbatore pilot and evidence plan

Status on 7 October 2026: **3 source-reviewed qualifications, 17 authored software scenarios, 0 real speakers tested, 0 verified open batches**. These are separate measurements. Nothing in this release establishes that LEAP outperforms Saksham in beneficiary outcomes.

## What changed

The recommendation catalogue now includes [Helper Electrician, NQR 13770](https://www.nqr.gov.in/qualifications/13770), alongside Solar PV Installer–Electrical and Electric Vehicle Service Technician. The new record is level 2, 270 hours, with recorded validity through 30 April 2028. Its two entry alternatives are preserved, including the explicitly published route without formal education or experience. Empty rules still fail closed. The open-entry condition belongs to reviewed source metadata and cannot be submitted through a beneficiary profile. An eligible result is only an entry pre-screen, never permission for unsupervised electrical work or admission approval.

The complete Helper Electrician register entry was reviewed on 7 October. Subsequent requests timed out. Other candidate records were not added because full current details could not be established; for example, Sampling Tailor 11339 showed an expired validity period, and the dressmaking 12893 review remained incomplete. Three reviewed records are still a small coverage base. The 3,649 discovery entries remain outside eligibility and ranking.

Source review expires after 30 days for recommendation purposes. Qualifications without reviewed competencies retain RED confidence and no RPL competency claim. Importing a qualification does not create a training opportunity.

## Pilot district evidence

[Live pilot page](https://leap-ai-khaki.vercel.app/pilot/coimbatore) · [Versioned source data](../data/coimbatore-pilot.json)

The [Tamil Nadu DET directory](https://skilltrainingdet.in/coimbatore) supplies five government ITI contacts and the district training office. They are directory-checked contacts; they have not been called. The [district admission announcement](https://coimbatore.nic.in/direct-admission-open-at-government-itis-till-august-31/) closed on 31 August 2026. The [Samarth dashboard](https://samarth-textiles.gov.in/public_dashboard/dashboard/data/29/538/11607) establishes training history at Aathava Garments Unit 3, not new admissions. These sources supply no confirmed current batch for LEAP's reviewed qualifications.

Do not promote any of these listings to a VERIFIED TrainingOpportunity until a reviewer records: provider identity, qualification/awarding-body mapping, batch ID, application deadline, start/end dates, seat availability with timestamp, fees/subsidy conditions, location, timetable, official evidence URL or written provider confirmation, reviewer and review date. Reconfirm seats immediately before referral. Keep unknown values null. A directory or historical placement count cannot substitute for batch evidence.

Use [the verification worksheet](pilot-batch-verification.csv) to collect that evidence. Its rows are unverified leads, not available courses. No provider messages or calls were made by this change.

## Reproducible software comparison

From `backend`, with dependencies installed:

```sh
python -m evaluation.run_scenarios --output ../docs/evaluation-results.json
python -m pytest -q
```

[Results](evaluation-results.json) report every case, expected eligibility, recommendation inclusion and the reviewed catalogue hash. The date is fixed to 7 October 2026. The comparison uses the same engine with only the previous two registry IDs as a catalogue ablation. It is not a replay of an older deployed engine and is not a competitor test.

The 17 authored cases cover school, experience, certificate and previous-level routes; unrelated/scoped evidence; no-schooling entry; Tamil/Hindi aspiration text; review-age boundaries; and expiry. They verify conservative confidence and absence of unsupported opportunity claims. Passing a fixture is not proof of population accuracy, speech recognition or accessible UX. No person spoke the Tamil/Hindi text in this test.

## Real-speaker collection and comparison

Trial status: **NOT RUN**. Do not substitute synthesized speech, typed scenarios or developer role-play for beneficiaries.

1. Recruit consenting adult volunteers in the pilot district. Start with 10 Tamil speakers and 10 English speakers, including differing schooling and digital experience. For each additional supported language, recruit at least five speakers before reporting any language result. This is a pilot sample, not a representative population estimate.
2. Obtain separate recording consent, explain withdrawal, assign random speaker/clip IDs and keep contact/consent records outside GitHub. Use a restricted workspace for recordings and transcripts; agree a deletion date. No Aadhaar or unnecessary personal identifiers.
3. Capture six tasks per speaker on their usual phone: occupation/experience, schooling, aspiration, mobility/time constraint, an unknown/corrected answer, and a qualification-specific certificate/experience answer. Include quiet and ordinary background noise without manufacturing unsafe conditions. Preserve failed/empty transcriptions in the denominator.
4. A fluent human creates the reference transcript and expected profile before seeing the system output. A second reviewer resolves disagreements. Keep those speakers out of rule tuning. Fix application commit, language, device, browser, audio conditions and backend/model configuration.
5. Run the same consented tasks through both systems where their input modes and terms permit it. Randomize order and blind evaluators to system identity. Record unsupported language/input as unavailable; do not silently drop failures. Without comparable access to Saksham, report LEAP-only results and leave the competitor column untested.
6. Have two reviewers independently assess whether each result preserves aspirations, applies the correct entry route, reveals missing evidence, respects practical constraints and avoids inventing seats/funding. Record task completion, correction count, time, disagreement and the beneficiary's explanation of their next step. Report counts and uncertainty by language; catalogue size is not an outcome metric.

### Scoring recordings

One JSON object per line in a private JSONL file. Required string fields: `language`, `speaker_id`, `clip_id`, `consent_id`, `reference_transcript`, `recognized_transcript` (may be empty). Required objects: `expected_profile` (nonempty, independently labelled slots) and `actual_profile`. Use identical API field names and types. Explicit unknowns are `null`; absent expected slots are not scored. Corrections must be tracked separately from raw first-pass output.

```sh
python scripts/score-speaker-trial.py /private/trial.jsonl --output /private/report.json
```

The scorer computes word error rate, character error rate and exact profile-slot accuracy overall and per language. It counts empty recognitions as deletions, rejects duplicate clips and reports empty input as NOT_RUN. It never exports transcripts or participant IDs. Consent IDs are an audit reference; the script cannot establish that consent was actually obtained. Human guidance quality and task completion require the separate reviewer rubric above. Publish only consent-compatible aggregate results after review; small groups can still be identifiable.

## Release gates before claiming superiority

- Broader relevant qualifications must be fully reviewed and connected to rankings, not merely searchable.
- At least one current pilot batch must meet all verification fields and be reconfirmed before referral.
- Real-speaker and beneficiary task results must exist, with failures and language denominators included.
- A head-to-head claim requires comparable tasks, pinned versions and independent review for both systems.

This release improves the engineering foundation. The open-batch and real-speaker gates remain unmet.

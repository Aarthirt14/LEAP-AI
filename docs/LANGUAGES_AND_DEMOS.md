# Language previews, identity and role demos

## Ten language choices

English, Tamil and Hindi are joined by Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati and Odia. `lib/locales/extra.ts` supplies 129 authored strings per new language, including navigation, authentication, onboarding consent, all ten interview questions and their hints, and core evidence warnings. These translations still need native-speaker review.

This is **partial interface localization**, not full end-to-end semantic or dialect support. Longer guidance, backend explanations and some staff/demo copy remain in English. A translated notice makes that limitation visible. `extendLocales` shares the fallback across the interface instead of pretending missing translations exist. User-entered evidence is never automatically translated for display.

Language selection persists across navigation, supports native names/English names/locale tags, and does not imply a geographic state. All ten languages are selectable during onboarding. Browser speech recognition receives the selected `*-IN` tag, but browser/provider coverage varies; text entry remains available. The optional AI integration is unchanged and has not been certified for the seven new languages. Numeric parsing remains conservative. Unsupported occupation mapping preserves raw text and produces RED confidence with LANGUAGE_MAPPING_NEEDS_CONFIRMATION.

## Original LEAP identity

`public/leap-mark.svg` is an original code-authored vector: an ivory L, a saffron person, and a green ascending path/arrow. Navy, saffron and green match the established palette. It appears in the header, language selection, landing illustration, demo chooser and favicon. It is not an official government emblem. No external logo or image service is needed.

## Public read-only demos

`/demo` offers beneficiary, field worker, facilitator, district officer and administrator views without credentials. These are local UI sessions, **not privileged accounts**. A persistent banner identifies fictional, read-only data. Selecting a demo never creates a JWT or sends a login request. Existing real tokens remain untouched.

`lib/demo-session.ts` handles every request before the live API client, returning an exported fixture or a visible error. Missing routes and all mutations are blocked rather than falling through to the live service. Role switching, nested route refresh, review filters and worklist pagination use sessionStorage. Exit demo to use real registration/login. Public demos do not require backend DEMO_MODE and it must remain disabled in production.

The snapshot is generated from a brand-new temporary SQLite database by `python -m seed.export_public_demo` in `backend`. It uses the existing deterministic engine and synthetic seed; scores are not manually invented. It exports only selected GET responses, never JWTs/password hashes. RED pathways remain gated. Demo diagnostics describe the synthetic snapshot, not production health. This is a browsing demo: submitting interviews, editing profiles, approving reviews, and recording outcomes require a real account.

## Checks

- `node scripts/check-localization.mjs`: aliases, speech tags, critical copy and fallback availability across ten languages.
- `node scripts/check-demo.mjs`: five roles; no live network even on missing data/mutations; role restrictions; filter/pagination; real login preservation.
- Backend suite: 92 passed, including seven new language preservation/escalation tests.
- `pnpm exec tsc --noEmit` and `pnpm build`: passed.
- Visual inspection and release status are recorded separately in the milestone report.

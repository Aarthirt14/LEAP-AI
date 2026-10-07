# Voice and data reliability — first implementation milestone

This branch improves implementation reliability. It does not establish field accuracy, official data verification, full offline operation or live phone-channel availability.

## Changes

- An authenticated user can recover their own unfinished interview for an authorized beneficiary. The UI restores saved answers after a refresh and returns to the first unanswered question or the review stage. Recovery failures block starting a replacement interview until retry succeeds.
- The frontend opts into reusing an unfinished session. PostgreSQL parent-row locks serialize session creation and answer retries. Repeating the same answer returns its existing record; a different answer for an already-saved question requires the existing correction workflow. Original evidence remains preserved.
- A user-triggered **Listen to question** control speaks the translated question and hint using a matching installed/browser voice. It stops before microphone capture and on navigation. Missing language voices are explicitly reported. English/Tamil/Hindi control copy is provided; additional-language control fallback follows the existing partial-preview policy.
- NQR import normalization now requires a qualification name/code, numeric level, HTTPS NQR source URL and coherent validity dates. Training records marked VERIFIED require a source reference, verification date and expiry; synthetic records cannot be marked verified. Invalid, expired, future and duplicate records are excluded from accepted import results, with counts and row errors.

## Boundaries

Only answers already saved to the server are recoverable across refreshes. Unsent text remains in the current page; no sensitive transcript is persisted in browser storage by this change. There is no durable offline queue or automatic background submission. Resume requires connectivity and a signed-in session. It restores only interviews created by the current user, not another staff member's interview.

Source URL validation checks structure and hostname, not the contents or truth of the source. The release now imports two reviewed NQR qualifications into production using the bundled CLI snapshot. It does not independently verify providers or add a database import endpoint. Reviewed records still need an authorized import process. Multiple versions/eligibility routes should use a suitable composite unique key when passed to the normalization function.

The tests run on SQLite and cover sequential lost-response retries and authorization. PostgreSQL 18 concurrent start/answer-retry integration checks passed in GitHub Actions; see ELIGIBILITY_RELEASE.md. Microphone quality, speech synthesis availability and screen-reader usability need device testing.

## Next acceptance gates

1. Choose a pilot district and two languages with available reviewers. Curate current qualification records and verify actual provider/opportunity availability, with source dates and refresh responsibility.
2. Evaluate consented speech samples and complete journeys; report transcript/fact errors, correction rates and task completion, not only software-test counts.
3. Configure one real WhatsApp or IVR provider, then test receipt, consent, transcript confirmation, response delivery and interrupted-session recovery end to end.
4. Add an explicit opt-in design for expiring device drafts, durable retries and shared-device deletion before claiming offline completion.
5. Define worker assignments and district boundaries, enforce them server-side, and validate with cross-user/cross-district access tests.

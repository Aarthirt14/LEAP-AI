# PS 26097 — implementation acceptance checklist

Source: user-supplied problem statement, read October 5, 2026. This checks code rather than README feature claims. “Implemented” is not a claim of verified field effectiveness. The redesign is not complete and the product does not yet meet every primary requirement.

| Primary requirement | Current evidence | Status / acceptance gate |
| --- | --- | --- |
| Conversational livelihood interview covering education, family occupation, current work, skills, aspirations, mobility, physical constraints and employment preference | `components/leap-app.tsx` interview questions; `backend/app/services/interview_preview.py`; profile service; explicit confirmation before acceptance | Implemented structured interview. Verify full voice journey on supported devices; conversational adaptability remains limited. |
| Regional languages and local dialects; low-literacy voice interaction | English/Tamil/Hindi prompts; browser SpeechRecognition with locale; Unicode-preserving ontology aliases | Partial. Browser-dependent recognition, narrow semantic aliases, no validated dialect coverage or full spoken question delivery. Localization alone does not meet this requirement. |
| AI/ML profiling and recommendation | Deterministic constraint, aspiration, RPL and confidence engines; browser speech recognition | Partial. Rules provide explainable ranking, not a trained ML recommendation model. Keep deterministic scoring. Evaluate language understanding separately with reviewed transcripts and confirm extracted facts. Do not rebrand rule matching as broad language intelligence. |
| Suitable NSQF-aligned training | Qualification records, validity-date enforcement, NQR import normalization | Partial. A data adapter is not a live official integration. Need current authoritative qualification references, NSQF levels, QP/NOS mapping, refresh dates and auditable provenance before claiming official grounding. |
| Relevant trades and livelihood pathways | `backend/app/engines/pathway_engine.py`, aspiration guard and constraints; explanation UI | Implemented against supplied records. Quality depends on verified catalog coverage; synthetic test pathways are not field recommendations. |
| Skill gaps requiring intervention | `backend/app/engines/rpl_engine.py` matched/missing competencies and RPL/bridge/full-training routes | Implemented comparison. Validate competencies against authoritative qualification sources and human assessment; RPL candidacy is not certification. |
| Region-specific employment or enterprise opportunities and local economic realities | Location/mobility constraints, training records and provenance; unverified availability warnings | Partial / major gap. No proven current district opportunity feed or demand validation. Training seats alone are not job demand or enterprise viability. Require source, geography, freshness and verification for each opportunity. |
| Low-connectivity and low-tech operation | Mobile layout, text fallback, request errors; unsent answer retained in current page | Partial / major gap. Current-page state is not durable offline storage. Need consent-aware drafts, reconnection recovery, duplicate-safe retry and tested constrained-network performance. |
| IVR for feature phones, WhatsApp voice notes, lightweight mobile/kiosk channels | Browser application exists; no working IVR/WhatsApp integration found | Browser channel only. Define channel acceptance with PS stakeholders. IVR/WhatsApp require provider integration and delivery/consent/security validation; never list future adapters as working integrations. |
| Empathetic, accessible interaction | Humanized questions, confirmation/editing, consent unchecked, keyboard/mobile layouts, reduced-motion behavior | Partial. Requires target-user usability testing, language review, screen-reader checks and actual microphone testing. |
| Ground-level support, coordination and post-training outcomes | Worker/facilitator/officer workspaces, RED approval gate, follow-up records | Partial. Recorded outcomes are self-reported where marked, not verified placement rates. Explicit worker assignment authorization policy and district scoping remain separate backend tasks. |

## Delivery order and non-negotiable acceptance gates

1. Finish visual redesign and regression checks, including localized profile/progress and post-review follow-up.
2. Ground qualifications and local opportunity evidence in authorized, current sources. Do not fabricate availability, scrape blindly, or infer geography from language.
3. Evaluate multilingual STT/TTS and confirmed semantic extraction against representative Tamil/Hindi and dialect samples. Measure errors, preserve raw text, escalate unsupported meaning. Keep deterministic ranking unchanged.
4. Add and test durable drafts, retry behavior and a lightweight assisted/kiosk journey; avoid storing sensitive drafts without an explicit privacy design.
5. Implement real channel adapters only after provider/access decisions. Verify end-to-end IVR/WhatsApp separately before making integration claims.
6. Run consented field usability validation. Do not infer caste, disadvantage or eligibility from appearance, name, occupation, family work or language.

The original instruction to postpone official-data/voice infrastructure until the core redesign is stable remains in force. This document makes the remaining PS work explicit; it does not mark it complete.

## October 5 — language assistance implementation

Added optional OpenAI-assisted answer clarification behind a backend feature flag and per-answer consent. Suggestions require editing and final confirmation; deterministic ranking is unchanged. Provider failures retain the manual path. This is a tested integration implementation, not evidence of live API access, dialect accuracy, spoken question delivery, verified opportunities or phone-channel readiness. See `AI_INTERVIEW_SETUP.md` for activation and limitations.

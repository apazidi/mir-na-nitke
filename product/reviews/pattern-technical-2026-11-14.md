# Pattern experiment — independent technical review

**Verdict: PASS for the isolated experiment.** No technical blockers found. This is not an art, enjoyment, release or deployment approval.

Reviewed branch `codex/reusable-pattern-study`, HEAD `9038dd86e01c065a99971ddd436cefd1627ffc46`, against main `5ca0f4030fd281d8344cae9866e1690a95528fcc`. Bundle source: `7a20ec4a811246483bef9ac6d2ff43ac9efd0aac`. Scope follows [the pre-code contract](pattern-contract-2026-11-14.md). The concurrent art-position correction is outside this verdict; rebuild and its separate visual review remain required.

## Findings

- `app/core/pattern.mjs` preserves one common project slot, exact costs and immutable method/work targets. Unique job records make payment, refund and claim idempotent. Cancellation settles time first, permits a refund only at exactly zero work, and stale job commands cannot alter another active job. Completion is explicit, unique and capped without carrying excess clicks.
- `app/ui/pattern-session.mjs` imports supported v4 state into its own namespace, retains original source bytes/export, preserves a legacy paid recipe, resumes existing experiment data without reimport, and rejects corrupt saves or unavailable storage. It never writes the source key. Existing global writer acquisition precedes import.
- Opt-in `engine` / `strictLoad` in `app/ui/session.mjs` commits storage before exposing candidate state. Failed start, refund or completion leaves the previous durable state and in-memory world intact, reports failure, and blocks subsequent mutations. This experiment deliberately fails closed rather than silently continuing as an unsaved temporary game. Existing default session behavior remains covered by passing tests.
- Paused crafting preserves world income and memories. Reload retains method, progress and auto preference; offline production remains capped at eight hours, repeated reload does not reapply time, and a reversed clock grants nothing. Existing base economy, shared writer and staged v4 catalog are unchanged.
- UI integration is gated by `experiment=pattern`; the default v4 entry remains default v4. Only owned accessories are applied; learned work uses its fixed total in rendering. Return wording and completion controls distinguish ready work from granted knowledge/accessories. Independent mobile/art evidence is owned by the separate critic, not inferred from these unit checks.
- Static build changes preserve binary PNG bytes, require committed artwork, hash copied sources/assets and serve PNG with the correct MIME type. Independently checked all 142 emitted file sizes/hashes and all recorded source hashes against the bundle source commit. No generated files were rewritten during this concurrent review.

## Independent verification

- `npm --prefix product test`: **82/82 PASS**.
- `npm --prefix product run validate`: **0 errors**, 9 existing missing draft-bunny asset warnings.
- Additional in-memory Node assertions: failed start and refund writes preserve both state and stored bytes; later actions remain blocked; stale cancelled-job start/cancel/complete leave another active job unchanged; six altered ledger/project fields reject deserialization; elapsed auto work persists before a rejected cancellation; offline reload and backwards time are idempotent; unavailable storage rejects experiment entry.
- Diff inspection confirms `app/core/index.mjs`, `app/ui/save-writer.mjs` and `ui/staged-catalog.mjs` have no changes against main. Existing lock, BFCache, temporary-memory, migration and v4 regression tests pass.

Reviewed the browser harness and available 360/390/430 evidence coverage, but did not repeat the full browser run already performed independently by the critic. Final source/art changes still require the normal committed bundle regeneration, green CI and public HTTPS verification before delivery.

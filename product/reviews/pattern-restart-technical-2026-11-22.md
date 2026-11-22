# Pattern restart — independent technical review

**Initial verdict: RETURN. Current verdict after the repair below: PASS.** Reviewed uncommitted restoration on `codex/pattern-restart-2026-11-22` against main `4ea096f`. No runtime files changed by reviewer.

## Verified blocker

`product/ui/gameplay.mjs` resets the intention in memory and calls `saveUI()`, whose write errors are swallowed. Cold-load reset rejects old intention only while the world is empty or pattern access remains locked. Therefore old intention survives a UI-only storage failure and can attach to the restarted world later.

Independent adversarial reproduction used the actual session and actual UI initialization code: save intention `both`; allow core writes but reject `own-ui` writes; restart successfully; craft/place Rabbit, Flower, Tree and Cat from the fresh 32-yarn state; reload. Actual intention: `both`; expected: `null`. This is reachable without modifying progress or economics.

Minimal durable protection: bind intention to a world generation/token committed atomically with the fresh core save. Reject mismatched UI generations even after accessories unlock; preserve compatibility for existing worlds without the new metadata. Clearing UI before restart alone introduces a lost-choice case when the following core write fails.

## Passing checks

- Independently ran pattern and intention focused tests: **16/16 PASS**.
- Additional assertions passed: backup includes settled elapsed time; fresh pattern ledger and auto preference reset; duplicate restart request after new progress does not reset that progress or replace backup; revoked writer and strict-save-blocked session cannot restart; original source and source-backup bytes remain unchanged.
- Backup-write and new-core-write failures preserve the old live and reloadable paid world. Writes are atomic per key, not a transaction across both keys; a successful backup write may remain when the following core write fails, as in the existing accepted implementation.
- Parent separately reports browser PASS at 360/390/430 for cancel, double confirmation, exact backup download, reload, first Rabbit and both failure points. This reviewer did not repeat that browser run or make a visual/enjoyment judgment.

Re-review only the durable intention boundary after correction. Other inspected restart boundaries have no blockers.

## Re-review after durable world identity repair

**PASS. The verified RETURN above is resolved.** Restart now generates `patternWorldId` in the candidate core state, committed together with the new world. UI restoration accepts intention only when its world identity matches. Existing/imported worlds without identities retain legacy compatibility. No economic migration or progression changes were introduced.

Independent checks on the repaired working tree:

- Pattern and intention focused tests: **17/17 PASS**.
- Repeated the original adversarial scenario with persistent UI-only write failures, a legitimate Rabbit → Flower → Tree → Cat progression from 32 yarn, and execution of the actual `gameplay.mjs` initializer after reopening: old intention is `null` while pattern access is unlocked. UI with the matching current ID can restore its chosen intention.
- Both restart write failures were injected for legacy worlds and already identified worlds. Neither failure changes the live/persisted identity; reopening retains the same state/identity. A generated but uncommitted candidate ID does not escape into the active save.
- Repeating the same successful restart request after further progress preserves the new progress, its ID and the existing restart backup. Revoked writers still cannot restart. Original source and source-backup bytes remain unchanged. Invalid optional ID types/values reject deserialization.

No remaining technical blockers in this bounded restoration. The previously described per-key backup limitation remains unchanged. Browser/visual review and delivery checks remain separate; this PASS does not claim enjoyment or public deployment.

## External harness follow-up

After PR #54, all eight merged-main CI/Pages/public-receipt checks passed. The exact 143-file HTTPS bundle and existing mobile journeys passed. The external intention runner failed twice only at its final fixture's dynamic import: the neutral `seed` URL is GitHub's 404 document, whose observed CSP is `default-src 'none'`. A browser probe confirmed a `csp` request failure; the existing public JSON manifest returned 200 and allowed importing the same real public module.

The test-only correction uses that inert manifest for this one neutral navigation when `PREVIEW_URL` is set. The local fixture, game URL, public modules and every assertion remain unchanged. Independent narrow review: **PASS**; no CSP bypass or game substitution. Full external acceptance is recorded with the follow-up PR. No runtime or preview-bundle change is needed.

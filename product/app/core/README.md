# Engine core API (#8)

Import index.mjs; index.d.mts describes the typed integration boundary.
No DOM, storage, clock reads, randomness, graphics or content discovery.

## Host sequence
1. Build Config and call validateConfig once.
2. createInitialState(config, now): UTC milliseconds supplied by host.
3. advanceTime(state, now, config): run on resume and ticks.
4. dispatch(state, {type, now, ...payload}, config): execute command.
5. selectView(state, config): detached read-model for UI.
6. serializeState(state), then deserializeState(json, config) on restore;
   advance restored state to current time.

All functions return detached JSON values. Invalid commands throw without
mutating input. Host should tick separately before commands, retaining that
advanced state even if the next command fails.

## Commands
- startProject {itemId}: pay yarn once, start abstract work.
- click: add work. Idle also adds work without spending yarn.
- completeCraft: explicitly claim a 100% project, once. Host can show final
  stage before completion. Item becomes owned and project clears.
- buyUpgrade {upgradeId}: geometric price, bounded level.
- placeItem {meadowId,slotId}: activate placed income and dependencies.
- pet/sniff {meadowId,interactionId}: invoke matching manual reward rule.

One item per stable ID; one placement globally per item. No cancellation,
repeat crafting, movement or item deletion in this first API.

## Adapter boundary for #10
Config is a separate engine economy adapter, NOT a content schema extension.
Adapter must supply only ready, validated catalog content. Preserve workUnits,
art.stages[].at, stable meadow/slot/item IDs. Map economy values separately:
yarnCost, passive rules, interaction rewards, upgrades and global rates.
Existing schema v1 does not accept the proposed economy fields.
Do not add them to ready manifests before a separate schema review.

Synthetic fixtures use two slots to test mechanics. Production five-slot and
art requirements remain enforced by content validation, outside core.

Read-model: wallet, owned IDs, project work/progress/stage index/canComplete,
project affordability, upgrade prices/levels, meadow slots/placement capability,
interaction availability and next timestamps. Stage index addresses the item's
manifest stages array. Interaction available is true only for eligible manual
rules. Idle rules always expose available=false; readyAt retains their automatic
timer for informational display. Never award idle rules manually.

## Time and saves
Backward timestamps are ignored. A tick consumes at most maxOfflineMs, then
checkpoints actual now, discarding excess time. Automatic timers share this cap.
Restoring the resulting save at the same timestamp earns nothing twice.
Rolling back to an older backup is not prevented; server validation is out of scope.

All placed meadows produce without an active-screen dependency. Positive reserve
income and an affordable starter prevent resource dead ends. Manual bonuses are
available immediately on placement, then cooldown limited. Automatic rules wait
one full period after dependencies become placed. They use arithmetic counts,
not a per-event loop. Commands take effect after accrual, never retroactively.

State v1: wallet, project, owned IDs, placements, levels, timers, lastTimestamp,
transactionSequence. Sequence is a counter, not transaction history or anti-cheat.
Unknown config IDs fail save loading and require migration, never silent resets.
Floating-point rates can cause tiny differences between different tick partitions;
identical state/time/config inputs are deterministic.

No legacy saves, browser storage adapters, UI, artwork or release included.

## Checks
Run npm --prefix product test and npm --prefix product run validate.
Older Node on Windows fails the existing test glob. Equivalent PowerShell:
node --test (Get-ChildItem product/tests/*.test.mjs).FullName

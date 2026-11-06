# Deterministic engine API (#8 / #27)

Import index.mjs; index.d.mts defines the typed boundary. This is an economy adapter, not a content schema extension. Existing configs and pet/sniff commands continue to work. No DOM, randomness, storage, clock reads or production manifest changes belong here.

## Commands and requirements

- startProject {itemId}, click, completeCraft, buyUpgrade {upgradeId} and placeItem {meadowId,slotId} retain their meanings. Yarn is charged once at project start; clicks and idle add abstract work.
- Optional requiresPlaced [{meadowId,slotId}] expresses local or cross-scene prerequisites on items, meadows, upgrades, interactions, recipes and events. Items with meadowId also require that meadow to be unlocked. requiresMemories [eventId] is available for unlocks/events/recipes, but not production rules: rates are constant between commands.
- interact {meadowId,interactionId} invokes a configured manual rule. The supported verb whitelist is pet, sniff, water, sway, knock, glow, land, greet, brew, feed, rock, shelter. Calling the exact legacy verb remains supported; mismatched verbs and idle rules cannot be invoked manually. Optional workBonus helps the current shared workshop project as well as the declared yarn reward. Actor metadata is returned to the UI.
- All placed meadows produce globally. No active-screen parameter affects economics. One owned instance and one permanent placement per item remain invariant.

## Persistent world events

worldEvents are bounded declarative state machines. An automatic event starts once its placed/memory requirements become true. After delayMs it enters visiting, records one persistent memory and grants optional rewardYarn once. After visitMs it ends. A visitor outcome identifies an existing item, destination meadow and normalized placement; it is not a new owned item. The renderer must hide the visitor's source sprite while visiting, retaining ownership and production.

A project event starts only when its linked recipe is completed. startRecipe {recipeId} uses the same paid workshop, work/click/idle progression and completeCraft command. Recipes are separate from collectible items. A repeatable project event progresses waiting → visiting → resting → available, with cooldownMs after the visit. It cannot queue or re-award while busy. A subsequent paid recipe may start only once available. Automatic events cannot repeat indefinitely.

Memory is a bounded map keyed by event ID: firstAt, lastAt and count. Event state stores phase, dueAt and count. No unbounded event log is retained. selectView returns visitors, event phases and lasting memories so return progress can be seen even after a visit has expired. Replaying a memory is presentation only and must not dispatch rewards.

## Time, saves and migration

Every action takes now. Invalid actions throw without changing their input. A browser host should commit advanceTime separately before attempting a command, so a rejected command cannot discard elapsed progress.

State version 2 adds events, memories and an accrual anchor. Between commands, passive income and work are recomputed from that anchor and elapsedMs; discrete rewards keep integer counts. Identical elapsed intervals produce identical wallet, work, event phases, timers and sequence regardless of tick partition. transactionSequence counts paid/manual and discrete reward transactions, not each passive rendering tick. All functions return detached JSON values.

A single advance caps work, passive production and repeating idle payouts at maxOfflineMs, checkpoints actual now and discards excess production time. Idle payout timers shift by the discarded interval. Finite world events follow actual wall time: a visit that expired while absent becomes a memory, never a frozen live visitor. Scheduled events execute in due-time/ID order; a memory may unlock a later once-only event within the same tick. Each pending event grants its reward once at its actual dueAt; there is no automatic repeat loop. Repeat visits require a new manual paid recipe. Backward clocks and same-time reloads grant nothing. Applying a production cap once to an eight-hour absence intentionally differs from eight separate one-hour sessions if the configured cap is shorter.

Deserialize explicitly migrates version 1 without resetting earned progress. Unknown item, meadow, slot, upgrade, timer or event IDs fail closed. Optional migrationV1.workUnits maps old totals to new totals so a paid project retains its exact progress ratio. migrationV1.ruleIds identifies old timer IDs: missing old timers remain an error; only newly introduced eligible timers are initialized at the saved timestamp. Wallet, ownership, placements and levels are retained. With unchanged config no migration metadata is needed. The host must keep the old storage key untouched when importing to a new preview key.

Version 2 loading validates event phases, timestamps, memory correspondence and accrual consistency. Future balance changes to existing version 2 work/rates require an explicit migration rather than silently reinterpreting an old anchor.

## Read model and checks

selectView includes rates (click work, idle work/second, total yarn/hour), project remaining work and honest idle ETA, unlocked/affordable items and recipes, upgrades with current/next effect, all meadow unlocks and slots, exact interaction verb/actor/reward/cooldown, visitors and memories. Unknown/null ETAs are not fabricated.

Run npm --prefix product test and npm --prefix product run validate. engine-world.test.mjs covers gating, global income, manual verbs and work effects, reciprocal events, repeatable gifts, exact time partition, cap/rollback/reload, v1 migration and malformed-state rejection. Existing engine/content/UI unit suites remain required. Visual quality is a separate gate.

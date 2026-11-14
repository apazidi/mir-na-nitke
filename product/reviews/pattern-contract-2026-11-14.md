# Reusable pattern — pre-code contract

Status: independent critic **PROTOTYPE-WORTHY**, not a delivered feature or proof of enjoyment. Source: [issue #50](https://github.com/apazidi/mir-na-nitke/issues/50). Designer: `idle_game_designer`; separate critic: `product_critic`; director owns delivery. This replaces neither the current game nor its accepted artwork.

## Choice and scope

After placing Rabbit, Flower, Tree and Cat, the player may choose either of two unique optional accessories: Rabbit scarf and Cat doily. Each costs 6 yarn and 144.2 abstract work directly. Learning a flower pattern once costs 2 yarn and 60 work; it permanently reduces each subsequently started accessory to 100.94 work. Knowledge is not consumable and adds no income. There are no new currencies, queues, meadows or promises of further content.

One desired accessory is cheaper and faster directly: 6 yarn / 144.2 work versus 8 / 160.94. Both accessories cost 12 / 288.4 directly or 14 / 261.88 with learning. Learning saves 26.52 work for both, at 2 extra yarn. After one direct accessory, learning for the remaining one is strictly worse; say so, without presenting it as an equal strategy or mandatory upgrade. Disable learning after both are finished. A rich wallet does not erase the time investment.

## Shared work and transactions

- Learning and accessory manufacture occupy the same project slot as existing paid work. They cannot displace or run alongside it.
- Starting atomically charges the exact price and records a unique job ID, selected method and fixed work target. A started job does not change method after learning or reload.
- Advance time before considering cancellation. At exactly zero work, cancel and refund precisely the paid 2 or 6 yarn once. After any positive work, offer pause without refund; keep the slot occupied.
- Auto and clicks only accrue work, capped at the target. The player explicitly completes a ready job. Completion atomically grants exactly one knowledge marker or accessory and frees the slot. Stale/repeated job commands cannot charge, refund or complete another job. Excess click work is not transferred.
- Keep existing click rates, upgrades, auto OFF preference, income, one-time offline accounting capped at eight hours and backwards-clock protections. Pausing crafting does not stop world income.

## Save and visible result

The experiment uses its own namespace. First entry copies a supported source save and preserves its original bytes and export access, never writing the source key. Later entry resumes the experiment without importing again. Preserve a source paid project in the common slot. Corrupt data must produce a safe explanatory failure, not a reset or false completion. Retain the existing global cross-tab writer lock. Persist job/method/work/knowledge/accessories atomically.

Completing the scarf also puts it on the original Rabbit. Completing the doily places it beside Cat, with no Coffee prerequisite or extra uncrafted prop. Both methods yield the same finished art and actions. Before explicit completion, return text says the work is ready, not that the pattern is already learned or accessory applied.

Real coherent staged motif/scarf/doily artwork and actual mobile application are required. Text, icons or only finished pictures cannot substitute for making. Keep source character artwork intact. New masters remain draft in a labelled isolated review route.

## Review evidence and rejection criteria

The independent critic found no pre-code blockers and specifically required checking return wording, cancellation after time advancement and save failure without false success. This is a rules review; no human playtest or implementation approval has occurred.

Acceptance must cover direct and learned paths; zero-work refund and post-work rejection; pause/reload/offline/backwards time; repeated commands; source import with paid work; rich saves; second tab; exact same final art and real application; first entry and 360/390/430 layouts. Designer conformance, separate technical review and actual product/art review precede delivery. Required CI and verified isolated public HTTPS are part of completion.

Reject the hypothesis if learning seems compulsory, payback is misunderstood, acquired capability does not invite a voluntarily chosen next item, or returning is described only as checking a timer. This tests one reinvestment link. Long-term resource surplus and return motivation remain open in #50 and #32.

# Visual repair v2 — first complete review scene

The owner's 6 November requirement is the release gate: the actual game must not remain visibly below `design-system/reference-v4.webp` in material quality, volume, lighting, composition or cohesion. Passing technical tests alone does not meet it.

## Comparison method

The approved reference is 387×620. Both comparison panes are exactly390×844; the reference is contained without stretching or cropping and the game is a native390×844 browser capture. The full meadow is earned by playing all five projects. Empty-state evidence checks that future objects are not baked into the background.

- [Before comparison](art-experiments/scene-v2/review/comparison-before.png)
- [Candidate comparison](art-experiments/scene-v2/review/comparison-after.png)
- [Evening](art-experiments/scene-v2/review/after-evening-390.png)
- [Empty meadow](art-experiments/scene-v2/review/after-empty-390.png)
- [Workshop](art-experiments/scene-v2/review/after-workshop-390.png)
- [Empty workshop and start action](art-experiments/scene-v2/review/after-empty-workshop-390.png)

## Repairs and evidence

| Criterion | Previous limitation | Candidate change |
| --- | --- | --- |
| Material and volume | Flat scenery and three synthetic placeholders | Detailed textile environment, three complete staged items, illustrated controls |
| Lighting | Uniform background and weak sprite integration | Directional daylight, layered evening environment, separately lit cottage with warm window |
| Composition | Large panels displaced the world; transparent boxes stole taps | One-screen diorama, compact HUD, project drawer, alpha-bound input targets |
| Ground contact | Cottage overlapped the bridge and then appeared detached from grass | Upslope placement, tight local contact shadow and irregular moss at the base |
| Cohesion | Generic primary actions among illustrated navigation | Shared illustrated normal/pressed/disabled actions, with live dynamic values outside artwork |
| Progressive reveal | Three final objects had no real artwork | All five projects have separate stages and sprites; an empty save reveals none |

The source prompts, selected masters, locked export pipeline and per-file hashes are recorded in [scene-v2](art-experiments/scene-v2/README.md). The ready-only production catalog and the approved reference remain unchanged. This is the isolated `TECHNICAL PREVIEW — ART NOT APPROVED` route, not a final visual-baseline acceptance.

## Verification status

PR [#25](https://github.com/apazidi/mir-na-nitke/pull/25) received independent technical and visual review. The initial full-scene review explicitly withheld visual acceptance for cottage ground contact, evening window lighting and inconsistent primary actions. After the repair, a second review of the actual day/evening, empty and workshop screens found those defects resolved and no remaining obvious gap in material, volume, depth, composition or cohesion that would block a labelled review deployment. This is a recommendation to review the candidate, not a claim that it surpasses the reference or that the owner has accepted a new baseline.

- 33 unit tests pass; content validation has0 errors and9 existing draft-bunny asset warnings.
- All65 bundled files pass byte length and SHA-256 verification against their pinned sources.
- The real browser loop earns and places all five objects through craft, pet, idle and sniff actions, then verifies reload. It does not grant an artificial wallet or unlock future objects for the comparison.
- Empty, two-object and full day/evening states are checked at360×800,390×844 and430×932. Full scenes fit one viewport. Other save namespaces remain intact.
- Focused Chrome checks cover initial start, pressed actions, placement and navigation. The cottage switches to its painted evening asset with computed `filter:none`; its anchor remains stable.
- The exact deployment, required CI and external HTTPS/legacy-route verification are recorded on PR#25. The stable review address is [play-preview](https://apazidi.github.io/mir-na-nitke/play-preview/).

The next product step after visual milestone acceptance is to give the tree, cottage and butterfly their own meaningful interactions, then use this reviewed scene as the template for further meadows.

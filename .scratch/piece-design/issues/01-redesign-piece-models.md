# Redesign the 3D Piece models

Status: needs-triage
Blocks: validating branch `feat/playtest-comments` (no PR until this is fixed)

## Problem

The owner still finds the Pieces ugly after the first redesign (artifact v10, 2026-10-21). The terrain rework on the same branch was judged an improvement; the Pieces were not.

This was raised twice in playtests:

1. Round 1: "hard to tell which piece is which; in chess you know at a glance what each piece is and does. Important to solve." The original game has the same problem.
2. Round 2, after the first redesign: "the pieces UI is still ugly."

## What exists now

`prototype/src/ui/Board3D.tsx` (`geoms`, `PIPS`, `PieceModel`), plus the matching 2D icons in `prototype/src/ui/bits.tsx` (`SILHOUETTES`, `PieceIcon`):

- Explorer: tall thin 5-sided needle with a white ball on top.
- Vanguard: square-based wedge sloping towards the enemy, with 2 white pips.
- Sentinel: 3-sided crenellated tower, with 3 white pips.
- Flat red/blue `meshStandardMaterial`; the Vanguard is turned round for Blue.

What worked: three different silhouettes now tell the Pieces apart, and pips show Strength (Attack = Armor).
What reads as ugly: crude primitives (low-poly cylinders and boxes), flat plastic colour, pips that look stuck on, no base, and the Vanguard looking like a block when seen face-on.

## Constraints

- Each Piece must be recognisable at a glance from the default camera, the top view and a phone screen, for both sides.
- Strength (1/2/3) should stay readable on the model.
- It must stay procedural (Three.js geometry, no model files) so the single-file build keeps working, and stay cheap: 12 Pieces plus exit effects.
- The 2D icons must match the 3D models.
- Optional: keep the original rule that the base has as many sides as the Piece has Movement (5/4/3).

## Directions to explore (to decide with the owner)

- Chess-like turned pieces (lathe geometry) sharing one base and collar, told apart by their heads: a scout's spire, a spear or arrowhead, a castle or shield.
- A stylised "miniature" look: a bevelled round base in the side colour, a neutral body (ivory or bronze) and a coloured crest, closer to board-game minis.
- Better materials: smooth shading, bevels, a slight rim light or outline, team colour on a base ring instead of the whole body.

Mock up 2 or 3 options side by side (an artifact or a screenshot sheet) before replacing the models.

## Acceptance

- The owner approves the look.
- A new player can name the three Pieces after the tutorial without hovering.
- All tests still pass, and capture/Finish effects, selection glow and hop animation still work with the new models.

## Comments

- 2026-10-21: owner picked the chess-like direction, then the two-tone Staunton, then finish **3B Pierre & bronze** (red jasper / lapis lazuli, bronze bands = Strength, walnut base; no white pips). Wired onto the board in `prototype/src/ui/pieceModel.tsx` (textures in `pieceTextures.ts`, own studio env map so the terrain is untouched); 2D icons and shape labels updated. Alternatives stay in the `#pieces` gallery. Still to judge in play: Explorer vs Vanguard at the default camera, phone size, capture/Finish effects.

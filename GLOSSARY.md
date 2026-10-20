# Traversal

A two-player 3D strategy board game: each player races pieces across a 10×10 landscape of varying heights and off the opposite edge. Terms follow the official rules at traversalgame.com/rules.

## Board

**Board**:
The 10×10 grid of squares on which a game is played.
_Avoid_: Field, map, playing field

**Square**:
One cell of the Board, with a whole-number Height.
_Avoid_: Block, tile, cell

**Height**:
The elevation of a Square; orthogonally adjacent Squares differ by at most 2.
_Avoid_: Elevation level, altitude

**Terrain**:
A complete assignment of Heights to the Board for one game.
_Avoid_: Landscape, combination, permutation

**Terrain Mode**:
The style a Terrain is generated in, such as Random, Mountains, Valleys or Desert.
_Avoid_: Landscape type

## Pieces

**Piece**:
One of the six units a Player commands, two of each Piece Type.
_Avoid_: Unit, pawn, soldier

**Piece Type**:
Explorer, Vanguard or Sentinel; each has a Movement and a Strength that sum to 6.

**Explorer**:
Pentagon-cone Piece Type with Movement 5 and Strength 1, which may instead step 1 diagonally or leap 2 orthogonally, ignoring Height.
_Avoid_: Medic

**Vanguard**:
Diamond-wedge Piece Type with Movement 4 and Strength 2, gaining +1 attack when its shortest path to the target uses all 4 Movement.
_Avoid_: Soldier

**Sentinel**:
Triangular-prism Piece Type with Movement 3 and Strength 3; if it is the first Piece of either side to Finish, its Player wins instantly.
_Avoid_: Guard

**Movement**:
The budget a Piece spends per turn: 1 per flat step, Height difference + 1 per step up or down.

**Strength**:
A Piece's base combat value, and the points it scores when it Finishes.

## Play

**Player 1 (Red)** / **Player 2 (Blue)**:
The two sides; Red starts on row 1 and Finishes off row 10, Blue the reverse.

**Attack**:
Moving within Movement onto an enemy Piece's Square and capturing it, allowed only when the attacker's effective Strength is at least the target's Defense; it ends the turn.
_Avoid_: Fight, combat move

**Defense**:
A Piece's effective resistance to an Attack: its Strength plus its Reinforcements.
_Avoid_: Defensive strength

**Ally**:
A friendly Piece adjacent to an Attack's target, adding its base Strength to the attack.

**Reinforcement**:
A friendly Piece adjacent to a defender, adding +1 to its defense.

**Finish**:
A Piece on its last row stepping off the Board with at least 1 Movement left, scoring its Strength.
_Avoid_: Cross, exit, score

**Game end**:
The game ends when two Pieces in total (either side) have Finished, or at the move limit; the higher score wins.

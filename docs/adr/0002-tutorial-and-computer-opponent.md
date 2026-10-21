# Tutorial and computer opponent join the prototype's scope

ADR 0001 kept the tutorial out of scope. We now bring in an interactive Tutorial and a Computer opponent, because the pitch hinges on two claims the play screen alone can't prove: that the game can be learned without reading the rules page, and that someone can try it alone in two minutes. Both run fully client-side on the prototype's own rules engine; the opponent's search runs in a Web Worker so Hard (about a second per move) never freezes the board.

## Consequences

- Accounts, matchmaking, the Board Generator page and leaderboards remain out of scope.
- Lessons are plain data (`prototype/src/game/lessons.ts`), each tested to be completable, so a rules change that breaks one fails the suite.

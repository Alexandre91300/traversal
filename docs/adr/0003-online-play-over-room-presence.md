# Online play rides on artifact room presence

The prototype is shared as a claude.ai artifact, which can't host a socket server, so online play uses the artifact runtime's `room` capability. Each player keeps their whole Move record (4-character Move refs) in their room presence, and the other side adopts it when it extends theirs. We chose presence over room events and the `db` store because presence is open to everyone the page is shared with, outside guests included, while events and db writes need Contributor rights or higher. Being able to send the link to a friend outside the organization mattered more than anything else here.

## Consequences

- Every incoming record is replayed through the rules engine (`game/replay.ts`), so a tampered or malformed record just stops at its first bad Move; presence is never trusted beyond that.
- Nothing persists: a game survives as long as one of its two players has the page open. If both leave, it is gone.
- No take-backs online. Seats are claimed by page and account, so a player who reloads can resume their seat; a third viewer is turned away.
- Online play only works on the published page; the local dev server shows it as unavailable.

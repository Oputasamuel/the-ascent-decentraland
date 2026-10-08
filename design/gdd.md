# THE ASCENT — Game Design Document

**Decentraland Creator Success Program**

| | |
|---|---|
| **Public experience title** | THE ASCENT — original game name, setting, code, and game design; content-policy self-check: clear |
| **Deployment target** | World `smashingviews.dcl.eth` |
| **Creator** | Samuel / Samuel.ip |
| **Date** | 2026-10-04 |
| **Platform** | Decentraland desktop and mobile |
| **Technology** | Decentraland SDK 7, TypeScript, React ECS |
| **Repository** | https://github.com/Oputasamuel/the-ascent-decentraland |

---

## 0. TL;DR

| | |
|---|---|
| **Player promise** | Enter a neon maze with other players, recover unstable Time Orbs, survive moving laser traps, and return your haul to the Vault before the four-minute round ends. |
| **Primary player** | Mobile and desktop players who enjoy short cooperative challenges, maze navigation, score chasing, and drop-in social play. |
| **Current status** | Public playable prototype with one shared deployment mode, synchronized multiplayer rounds, 240 randomized orbs, traps, Vault banking, rankings, map, compass, navigation signals, respawn, and replay flow. |
| **Requested round** | V1 — four-week social-retention and mobile-polish scope. |
| **Live at the end of the round** | A newcomer can understand the objective without developer help, complete the same loop on phone or desktop, cooperate with strangers in public rounds, and return for rotating Signal Runs and persistent recognition. |

---

## 1. Player Promise

**One-line promise.**

You are part of a futuristic recovery crew: enter a hostile maze, carry as many Time Orbs as you dare, and bank them for the team before the Vault closes.

**One familiar comparison.**

A short cooperative maze run with arcade-style risk and reward: exploration supplies the tension, moving lasers create the danger, and every safe return to the Vault turns an individual find into visible team progress.

**Why this game.**

THE ASCENT is designed around something Decentraland does especially well: recognizable avatars sharing a physical place. The maze gives strangers an immediate common task. Players can spread out, signal useful routes, compare contributions, and regroup in the lobby without requiring a host, moderator, scheduled performance, wearable, or payment.

---

## 2. First Minutes & How to Play

| Time | Player experience |
|---|---|
| **0–5 seconds after control** | You arrive in the midnight sky lobby. The public deployment console glows ahead, with a physical board explaining where to aim and which interaction to press. |
| **5–15 seconds** | You activate the console. Movement pauses while teleport VFX and a short elevated camera move show your avatar entering the maze. |
| **15–45 seconds** | At the maze entrance, a large physical mission board states: collect cyan orbs, return to the purple Vault, avoid lasers, and secure the haul before time expires. |
| **45–90 seconds** | You collect your first orb. The HUD immediately increases **CARRY**, creating a clear first success. |
| **1–3 minutes** | You navigate with the line compass and minimap, avoid a moving laser, and decide whether to search deeper or return with the orbs already carried. |
| **3–4 minutes** | You reach the central Vault. Banking converts **CARRY** into **SECURE**, advances the shared team score, and updates the ranking. |
| **Natural stopping point** | The timer expires or the team reaches its target. Results show the team outcome and contributions; the next round resets automatically with new orb and trap positions. |

**Player-facing How to Play.**

- Touch cyan Time Orbs to carry them.
- Return to the central purple Vault to secure them.
- Avoid active laser corridors; death removes unbanked orbs.
- Only secured orbs count when the timer ends.
- Use the compass, map, and Signals to navigate and help the group.

---

## 3. Core Loop

| # | Step | Player input → feedback → state change | Why repeat it? |
|---|---|---|---|
| 1 | **Deploy** | Aim at the public console and interact → cinematic charge and teleport → enter the active public maze round | Every run begins quickly from one shared social lobby. |
| 2 | **Explore** | Move through branching corridors → compass, map, lighting, and player Signals provide orientation → discover a route or orb cluster | Orb and trap layouts change each round. |
| 3 | **Collect** | Touch a cyan orb → pickup sound, disappearance, and HUD increase → orb becomes carried but remains at risk | Carrying more raises both potential contribution and potential loss. |
| 4 | **Survive** | Read a moving laser and time the crossing → clear or dangerous feedback → retain the carried haul or respawn after failure | Knowledge and timing improve across runs. |
| 5 | **Secure** | Enter the purple Vault with carried orbs → deposit effect and score update → carried orbs become permanent team progress | A deposit benefits the whole group and improves individual ranking. |
| 6 | **Regroup** | Place a Signal or follow another player → visible direction marker → teammates share routes, hazards, or the Vault location | Cooperation shortens searches and makes the team target achievable. |

| | |
|---|---|
| **One complete loop takes** | About 60–120 seconds from searching to banking; a full round lasts four minutes plus short countdown, result, and reset phases. |
| **Decision, challenge, or expression** | Bank now or risk a deeper search; take a short dangerous route or a longer safe one; follow a Signal, guide a newcomer, or compete for the top secured contribution. |
| **Shortest satisfying visit / typical session** | 4–5 minutes / 12–20 minutes. One round produces a complete result; a typical visit contains several randomized rounds. |
| **Why repetition 10 differs from repetition 1** | Round-seeded orb and laser positions change the safest routes, other players change which areas are already cleared, and future Signal Runs add a rotating cooperative condition. |

**Design pillars.**

1. **Understand it fast** — collect, return, secure.
2. **Risk creates stories** — an unbanked haul can still be lost.
3. **Better together** — exploration, Signals, and deposits improve with other players.
4. **One loop on every screen** — mobile players receive the complete game, not a reduced mode.

---

## 4. Why Players Come Back

### 4.1 The next-day (D1) sentence

> A player who enjoyed their first session returns the next day because the Daily Signal changes the public run's condition, and the lobby shows both today's challenge and recognition earned by meaningful participation.

Daily Signals are the proposed V1 retention feature. They are not claimed as part of the current public prototype.

### 4.2 The progression chain

> **Repeatable action → persistent recognition → visible social status → a new reason to contribute**

| Moment | What persists? | What becomes possible next? | How can another player tell? |
|---|---|---|---|
| **End of first session** | Personal best contribution and one completed-run mark | Compare the next run against a real baseline | Lobby board displays the best contribution |
| **End of first week** | Completed Daily Signals and participation streak | Earn a recovery-crew title based on play, not payment | Title or badge appears beside the player's board entry |
| **Week 3+** | Recognition for repeated deposits, safe runs, and helpful Signals | Pursue specialist identities such as Pathfinder or Vault Runner | Specialist recognition is visible in the shared lobby |

There is no currency, token, paid advantage, or tradable reward in the proposed scope.

### 4.3 Two return hooks

| Selected hook | Trigger | What the player anticipates | Reminder channel + no-reminder fallback |
|---|---|---|---|
| **Daily Signal Run** | One condition rotates at 00:00 UTC | A familiar maze with a changed team challenge, such as Overcharge, Scarcity, Deep Recovery, or Clean Run | Community post; fallback: the lobby display previews the active condition |
| **Weekly public board** | Contribution board refreshes weekly while longer-term recognition remains | A fair new scoring window and visible improvement | Social post; fallback: countdown and board state are visible at spawn |

---

## 5. Social by Design

| | |
|---|---|
| **Repeatable social loop** | Player A discovers an orb-rich route and places a Signal → Player B follows it and collects nearby orbs → both return to the Vault → their deposits advance the same objective and appear in the shared ranking. |
| **Disappearance test** | Without other players, collection and survival remain playable, but route sharing, division of the maze, shared urgency, visible deposits, rankings, and group success disappear. The experience becomes materially less effective. |
| **From strangers to a group** | Everyone receives the same simple objective and enters through one public deployment bay. No invitation or private-room setup is required. A player can contribute immediately by collecting even before learning the whole maze. |
| **Recognition & continuity** | Avatar names, live secured totals, the top-five ranking, lobby leaderboard, and proposed specialist recognition make helpful or skilled players identifiable. |
| **Quiet hours & player counts** | One player can complete the collection loop at any hour. Two or more can divide search areas and compare routes. The current technical goal is a stable shared public round; the tested maximum must be recorded through structured playtests rather than assumed. |
| **Drop-in / drop-out** | A late arrival joins the active public session and can contribute immediately. Leaving does not block the round; the coordinator maintains shared phase, orb claims, scores, and Signals. |
| **Visible play** | A bystander sees avatars racing through neon corridors, timing laser crossings, collecting glowing orbs, and converging on the central Vault. |
| **Shareable moment** | A player reaches the Vault with a large haul seconds before expiry, pushing the team across the target while the ranking updates. |
| **Bring-a-friend** | A friend helps divide the maze, confirms safe routes, and protects the value of a risky haul by guiding the return to the Vault. |

Voice chat is available through Decentraland, but no core mechanic depends on voice, fast typing, or a shared spoken language.

---

## 6. Mobile-First

### Every core-loop verb on touch

| Core verb | Touch implementation |
|---|---|
| Deploy / return | Aim at a large glowing physical console and use Decentraland's primary interaction control |
| Explore | Standard touch movement and camera controls |
| Collect | Walk into a generous trigger area; no small button or precision tap required |
| Avoid | Read high-contrast laser timing and move with the touch stick |
| Secure | Enter the Vault trigger; deposit happens through proximity |
| Navigate | Read the bottom line compass, tap the minimap to expand it, or follow physical landmarks |
| Signal | Open a compact tool and tap a large preset direction or danger option |

### UI plan

The React ECS interface uses a virtual 1920×1080 canvas that scales across aspect ratios. Essential information is split by purpose: timer and score at the top, map and rankings at the right, and an unboxed line compass near the bottom. Interaction targets are physical, bright, and backed by readable notice boards. Lobby-only and gameplay-only states prevent unnecessary overlays.

### Performance plan

- reuse Sci-Fi Asset Pack models and textures;
- batch orb animation updates instead of updating all 240 every frame;
- use simple trigger and collision volumes;
- limit effect lifetime and simultaneous environmental particles;
- keep maze corridors clear of dense decorative geometry;
- reuse floor and wall treatments over the 9×9-parcel footprint;
- test the full deploy, play, death, return, and redeploy loop on real mobile devices.

**Current evidence.** The complete core flow has been manually tested with mobile inputs. Formal device/performance coverage, frame-rate measurements, and multiplayer load limits remain V1 test work.

**Desktop-only dependencies.** None in the required loop.

---

## 7. World, Look & Story

**Story / world.**

The Vault is failing. Its Time Orbs have scattered through a recovery maze where security lasers cycle unpredictably. Crews deploy from a midnight orbital hub to retrieve the unstable energy before the system resets.

**Visual direction.**

THE ASCENT combines a permanently midnight alien landscape with an industrial sci-fi facility. Cyan communicates interaction and collectible energy; purple identifies the Vault and team objective; red marks danger; orange supports structural details and navigation. The lobby is ordered and technological, while the maze exterior mixes moderate alien forest growth, rocks, environmental motes, and neon architecture.

**Signature image.**

Several distinct Decentraland avatars sprint through a dark blue corridor toward a purple Vault while cyan orbs float ahead and red laser beams sweep across their route.

**Audio direction.**

Energetic electronic music supports the timer without overwhelming social audio. Orb pickup, Vault deposit, laser hit, death, teleport charge, and arrival each have distinct feedback. Environmental ambience reinforces the scale of the lobby and maze.

---

## 8. Audience & Comparables

**Primary player and arrival context.**

For Decentraland players who enjoy short cooperative objectives, navigational puzzles, and score chasing, arriving alone or with friends and looking for a complete 5–20-minute activity that works on a phone.

**How the first group arrives.**

The public World link, Decentraland discovery surfaces, community posts, and structured playtests all lead to the same shared lobby. The game remains playable between promoted sessions and never waits for a host.

**Deliberately not for.**

Players seeking combat, a long narrative campaign, paid progression, or complex inventory management. THE ASCENT prioritizes a repeatable social round.

### Comparables

| | Comparable A — *Pac-Man 256* | Comparable B — *Spaceteam* |
|---|---|---|
| **What works** | Immediate movement, readable pickup goals, route planning, escalating spatial danger, and short mobile sessions | Shared urgency turns simple actions into social stories; players feel responsible for a common outcome |
| **What does not directly fit** | Primarily solo and endless; it does not use persistent avatars or a shared social space | Communication can become inaccessible without voice/shared language, and the play space is mostly interface rather than a navigable world |
| **What THE ASCENT does differently** | Uses a finite social maze, risky banking, public avatars, shared deposits, and randomized four-minute rounds | Makes cooperation possible through world navigation, Signals, map landmarks, and visible actions, while keeping voice optional |

---

## 9. Four-Week Plan — V1 Scope

| Week | Playable / completed outcome |
|---|---|
| **1 — Baseline and instrumentation** | Confirm public build stability; record joins, deployments, deposits, deaths, round completions, repeat rounds, and return sessions; run first-time-player tests on phone and desktop. |
| **2 — Daily Signal prototype** | Three rotating conditions work end to end; the lobby explains today's condition in one sentence; multiplayer test determines whether behavior changes. |
| **3 — Recognition and onboarding** | Meaningful-participation streak, weekly board, and one visible specialist recognition work; physical signage and mobile UI are revised from observed confusion. |
| **4 — Mobile and social validation** | Mixed-device public playtest; performance and synchronization fixes; final V1 deployment; GDD updated with measured player-count and retention findings. |

### V1 success hypothesis

If every public round has one clear rotating cooperative condition and visible recognition for meaningful contribution, more players will coordinate, complete multiple rounds, and return on another day.

### Success indicators

- first-time players deploy, collect, and secure without verbal developer help;
- most observed players correctly explain **CARRY** versus **SECURE** after one round;
- multiplayer rounds receive deposits from more than one player when multiple players are present;
- players use Signals or visible route-following to assist one another;
- some players voluntarily begin another round after results;
- returning testers identify the Daily Signal and change their play accordingly;
- mobile players complete the same core loop as desktop players;
- synchronization, UI, and frame rate remain comfortable on the tested device set.

Baseline testing will determine responsible numeric targets; this document does not invent unmeasured retention or performance figures.

### What keeps the experience changing after launch

- Daily Signals rotate without requiring a new map.
- Orb and laser layouts already change with the round seed.
- Weekly boards give returning and new players a fair scoring window.
- Additional conditions can reuse the same stable collection, trap, and Vault systems.

### Explicitly not building in V1

1. Private rooms, tutorial mode, or spectate mode.
2. A second maze or major expansion of the 9×9 scene.
3. Tokens, tradable rewards, paid power, shop, or inventory economy.
4. Combat, weapons, or hostile NPC systems.
5. A dependence on scheduled events, moderators, or voice chat.
6. Extensive new custom 3D art before the social hypothesis is tested.

### Top risk and fallback

**Risk:** In a public client-coordinated scene, synchronization can be disrupted when the current coordinator leaves or clients disagree about round state.

**Mitigation:** Keep round, claim, deposit, and Signal messages idempotent; request snapshots when joining; test coordinator changes deliberately; log desynchronization cases.

**Fallback:** If seamless coordinator transfer is not reliable by Week 4, preserve the public round and fast automatic recovery while clearly documenting the edge case, rather than adding more progression on an unstable foundation.

---

## 10. Current Build Specification

| System | Current behavior |
|---|---|
| **Scene** | 9×9 parcels in `smashingviews.dcl.eth`, fixed midnight skybox |
| **Mode** | One public multiplayer deployment mode |
| **Round** | 5-second countdown, 240-second play phase, 8-second results, automatic reset |
| **Objective** | Team secures 120 of 240 available Time Orbs |
| **Variation** | Round-seeded orb positions and laser definitions |
| **Risk** | Laser death/respawn removes the local player's unbanked haul |
| **Navigation** | Physical mission boards, minimap, line compass, environmental landmarks, player Signals |
| **Social state** | Synchronized round phase, orb claims, deposits, scores, presence, and Signals through a shared public message channel |
| **Presentation** | Sci-fi lobby, maze and floor tiles, midnight world, environmental particles, cinematic teleport VFX, electronic music, contextual SFX |
| **Accessibility** | Text supports color coding; voice is optional; large physical targets; quick return after failure |
| **Source** | Open GitHub repository under MIT for original source code; third-party assets retain their own licenses |

---

## 11. Playtest Plan

### Groups

- first-time Decentraland players;
- experienced Decentraland players;
- solo arrivals who encounter strangers;
- invited friend groups;
- mobile-only and mixed mobile/desktop groups.

### Questions to observe

1. What does a first-time player do in the first ten seconds?
2. Can they locate and activate the public deployment console?
3. Do they understand carried versus secured orbs?
4. Can they find and recognize the Vault?
5. When do they decide to bank rather than continue searching?
6. Do other players cause them to divide routes, follow Signals, or regroup?
7. Does the Daily Signal create a different decision rather than just different text?
8. Do they start another round voluntarily?
9. Do they return on a later day, and what do they remember?
10. Which UI, camera, interaction, or performance issues occur on real phones?

### Method

- direct observation without explaining the game first;
- short post-session interview;
- anonymous counts of core gameplay events;
- comparison between first and later sessions;
- written issue log by device, player count, and round state.

---

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Players behave as independent collectors | Daily cooperative conditions, shared target feedback, Signals, and recognition for group-helpful behavior |
| New players become lost | Minimap, compass, physical mission board, strong Vault color language, entrance landmark, and Signals |
| Empty periods weaken the social premise | Keep solo collection fully playable while routing every arrival into one public lobby and one mode |
| UI obstructs mobile controls | Conditional lobby/gameplay UI, scalable canvas, large targets, small-screen testing, and removal of nonessential overlays |
| 240 pickups or decorative effects reduce performance | Batched animation, entity reuse where practical, bounded particles, simple collisions, and device profiling |
| Round state desynchronizes | Coordinator snapshots, round-scoped IDs, synchronized claims, deliberate join/leave tests, and fast reset recovery |
| Rankings overpower cooperation | Rank secured contribution while keeping the win condition and strongest feedback team-wide |
| Retention features become empty chores | Count only meaningful participation and test whether each hook changes player decisions or return intent |

---

## 13. Production Principles

- Build and test the smallest playable version of each feature before visual polish.
- Keep the public mode as the single source of truth; do not fragment players across modes.
- Treat mobile as a launch platform, not a late compatibility task.
- Use observed player behavior to set thresholds and priorities.
- Update this GDD when tests disprove an assumption.
- Keep the experience publicly accessible, standalone, open source, and original.

---

## 14. Summary

THE ASCENT already supports the complete foundational loop:

> Meet in the sky lobby → deploy together → explore → collect → survive → secure → compare results → replay.

The V1 proposal does not replace that loop with a large feature list. It asks one focused design question:

> Can a rotating cooperative Signal and visible recognition turn a readable four-minute maze game into a social experience players deliberately replay and return to?

The answer will come from a four-week implementation, real mobile and multiplayer testing, and measured player behavior—not from unverified claims.

---

**One last question.**

Section 4 was the hardest: THE ASCENT already creates immediate replay through randomized rounds, but the stronger design challenge is giving players a genuine next-day reason to return without adding grind, tradable rewards, or a feature that only looks like retention on paper.

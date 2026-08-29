# THE ASCENT — Maze Vault

THE ASCENT is a persistent public multiplayer maze game built with Decentraland SDK 7. Players deploy together from a sci-fi sky lobby, collect randomized glowing orbs, survive moving laser traps, and return carried orbs to the central vault before the round expires.

## Social gameplay

- One shared public deployment mode and multiplayer channel
- Cooperative team objective with synchronized orb claims
- Live player and team scoring
- Persistent lobby leaderboard
- Player-created navigation signals
- Decentraland platform voice chat enabled
- Automatic timed rounds that require no host, event, or moderator

## Mobile support

The experience supports Decentraland mobile movement and touch interactions. Interactive stations use primary pointer actions, while the HUD uses a virtual 1920 × 1080 canvas that scales to smaller screens. The deployment, maze, orb collection, vault deposit, death, lobby return, and redeployment flows have been manually tested on mobile.

## Run locally

Requirements:

- Node.js 16 or newer
- npm 6 or newer
- Decentraland Creator Hub, or a browser supported by the SDK preview

```bash
npm install
npm run start
```

You can also open the project directory directly from Decentraland Creator Hub and select **Preview**.

## Production build

```bash
npm run build
```

## Deployment

Open the project in Creator Hub, select **Publish**, then deploy it to a public Decentraland World. The scene is configured with a fixed midnight skybox.

## Project structure

- `src/game` — session and round lifecycle
- `src/multiplayer` — shared public multiplayer state
- `src/lobby` — sky lobby and deployment/return stations
- `src/maze` — maze, exterior environment, and scene layout
- `src/orbs` — randomized synchronized orb system
- `src/traps` — animated laser hazards
- `src/effects` — environmental and teleport effects
- `src/ui.tsx` — mobile-aware HUD, compass, map, rankings, and signals

## License and asset notices

The original source code in this repository is released under the MIT License. Third-party models, textures, audio, fonts, and Decentraland asset-pack content remain subject to their respective authors' licenses and are not relicensed by the MIT License. Review the original asset sources and license terms before redistributing those assets outside this project.

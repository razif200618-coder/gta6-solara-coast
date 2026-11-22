# SOLARA HEAT

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/razif200618-coder/gta6-solara-coast/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/razif200618-coder/gta6-solara-coast/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Built for the [make.fun "Make GTA 6" bounty](https://make.fun/bounty/gta6-01) — my referral link: https://make.fun/r/vnv5dw3z

An original open-world crime game set in the invented sun-soaked coastal city of **Solara Coast**. Drive, steal cars, outrun the police, run street races, fix up your ride at the Marina garage, and climb from Rookie to **King of Solara** across 10 story missions.

All names, characters, story, art and sound are original inventions. No assets from any other game.

## How to play

Open `game/index.html` in desktop Chrome. It plays fully offline — no network requests.

- **Menu:** click Start (or press Enter). Progress auto-saves to localStorage; Continue resumes it.
- **On foot:** WASD to move, Shift to run, Space to punch, F to shoot (pistol), E to enter / exit a car, G at the Marina garage, T downtown to start a street race, V to change radio station, M to mute, P / Esc to pause.
- **Driving:** W/S accelerate / brake, A/D steer, Space handbrake, E to exit, F to shoot from the car.
- **Weapons:** 1 fists, 2 pistol. Ammo stashes (green crates) around the city refill pistol ammo.
- **Wanted:** crimes raise your wanted level (1–5 stars). At 3 stars police set roadblocks; at 4 stars a helicopter joins the hunt. Get caught and you're Busted. Lose the cops to cool down.
- **Garage (Marina, press G):** Repair $50, Engine tune $200, Armor $150, Repaint $40.
- **Races (downtown, press T):** beat 2 rivals through 6 checkpoints — win $150 + 8 respect.
- **Missions:** follow the objective in the HUD. 10 story missions pay cash and respect.
- **Demos:** `?demo=chase`, `?demo=drive`, `?demo=mission`, `?demo=foot` jump straight into a staged scene.

## Tech

Hand-written WebGL1 3D engine (no libraries), runtime-generated canvas textures, synthesized WebAudio music and sound effects (no audio files). Source is split by system under `game/src/`.

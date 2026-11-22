# SOLARA HEAT

An original open-world crime game in the invented coastal city of Solara Coast, built for the make.fun "Make GTA 6" bounty (gta6-01).

![SOLARA HEAT](https://make.fun/bounty/gta6-01)

## How to play

Open `game/index.html` in a desktop browser (or run `node serve.ts` — no, serve it with any static server, e.g. `python3 -m http.server` in the repo root, then open `/game/`).

- **WASD / arrows** — walk on foot (relative to the camera), drive in a car
- **E** — enter / exit a car (stealing a moving car raises your wanted level)
- **Space** — punch on foot, handbrake in a car
- **F** — fire the pistol (ammo pickups at the hideout, garage and Beach Cafe)
- **1 / 2** — switch weapon (fists / pistol)
- **V** — change the in-car radio station (SOLARA FM, HEAT FM, PALM RADIO)
- **G** — open the Solara Garage when parked at it (repair, engine tune, armor, repaint)
- **T** — start a repeatable street race at the Downtown race start
- **M** — start the next story mission
- **P** — pause, **R** — reset to the hideout

## The game

A real 3D open world: a hand-written WebGL engine (`engine3d.js`) renders Solara Coast in perspective with a third-person chase camera — textured 3D buildings with lit window grids, balconies, rooftop props and neon signs (SOLARA HOTEL, BEACH CAFE, TACO SOL, NEON PALMS, MARINA MOTORS, SOLARA GARAGE), crosswalks, dashed lane lines, street lamps, traffic lights, a palm-lined beachfront boulevard, beach umbrellas, waves and a warm sunset sky with clouds and birds. Cars have cabins, spoilers, mirrors and flashing police light bars; pedestrians vary in height and clothing, some wear hats.

## The game

- A sun-soaked coastal city: Downtown, Old Town, Marina, Beachfront, a park, and a beach with the sea to the south.
- On foot and by car, with traffic cars following the road grid and pedestrians on the sidewalks.
- Wanted system: 1–5 stars, police chases, roadblocks at 3 stars, a helicopter at 4+ stars. Lose the police to cool down; get caught and you're Busted.
- Combat: fists plus a pistol with ammo (find green ammo stashes). Shooting police or pedestrians raises your wanted level; cruisers can be disabled with 3 hits.
- Solara Garage: repair, engine tuning, armor and repaint for cash. Cars take damage from crashes and police rams.
- Repeatable street races at the Downtown race start, against two rival drivers.
- In-car radio: three synthesized stations (SOLARA FM, HEAT FM, PALM RADIO).
- 10 story missions with Dara, Kiko, Mara and Rex: car theft, courier runs, getaways, street races, crate pickups, a harbor heist, an escort, a beachfront blitz, and the final Solara Job. Missions pay cash and respect; respect ranks run Rookie → Street → Crew → Lieutenant → King of Solara, and each district tracks its own standing.
- HUD with cash, respect + rank progress, wanted stars, mission objective, waypoint arrow, weapon slot, radio station, car HP, district standing, and a live minimap. Progress saves to localStorage.
- All sound is synthesized with WebAudio — engine hum, sirens, pickup blips, radio loops. No audio files, no network requests.

## Structure

- `game/index.html` — page, loads the game scripts
- `game/src/config.js` — constants, palette, districts, seeded RNG
- `game/src/world.js` — city generation, roads, buildings, collision
- `game/src/input.js` — keyboard state
- `game/src/audio.js` — synthesized sound
- `game/src/entities.js` — traffic cars and pedestrians
- `game/src/player.js` — player on foot and driving
- `game/src/police.js` — wanted level, chases, roadblocks, helicopter
- `game/src/missions.js` — the 10 story missions
- `game/src/weapons.js` — pistol combat, ammo pickups, tracers
- `game/src/activities.js` — Solara Garage, repeatable street race, district standing
- `game/src/engine3d.js` — hand-written WebGL1 engine (shaders, matrices, cube geometry, lighting, fog, runtime canvas textures for facades and signs)
- `game/src/render3d.js` — 3D world rendering: city, cars, people, police, helicopter, mission beam
- `game/src/hud.js` — HUD and minimap (2D overlay canvas)
- `game/src/main.js` — game loop, menus, save/load, demo presets
- `main.ts` — entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`

## Originality

Every name, character, story, map, and piece of art and sound in this game is invented for SOLARA HEAT. Nothing is taken from Rockstar Games' Grand Theft Auto series or any other commercial game. The game is written from scratch in plain JavaScript — no engine or library is vendored.

## License

MIT — see [LICENSE](LICENSE).

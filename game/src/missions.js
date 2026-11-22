// missions.js — 10 original story missions for Solara Coast.
// Each: title, giver, briefing, target point, reward. Completing one advances
// the story and pays cash + respect.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var M = S.Missions = {};
  M.list = [
    { id: 1, title: 'First Heat', giver: 'Mara Voss', brief: 'Mara needs a driver. Steal the red coupe on Coral Row and bring it to the Marina.', target: { x: -60, z: 140 }, cash: 200, respect: 10 },
    { id: 2, title: 'Sunset Delivery', giver: 'Mara Voss', brief: 'A package for the Beach Cafe. Drive it down the boulevard — do not smash the car.', target: { x: -140, z: -80 }, cash: 250, respect: 10 },
    { id: 3, title: 'Pier Pressure', giver: 'Dario Sol', brief: 'Dario\'s rivals are shaking down the pier. Clear the pier deck, then meet Dario at the marina office.', target: { x: -90, z: 170 }, cash: 300, respect: 12 },
    { id: 4, title: 'Neon Run', giver: 'Lena Kade', brief: 'Lena\'s race crew needs a fourth car. Win the downtown sprint to earn her trust.', target: { x: 20, z: 20 }, cash: 350, respect: 14 },
    { id: 5, title: 'Taco Truck Trouble', giver: 'Dario Sol', brief: 'The Taco Sol truck was jacked. Get it back from Northside and return it to the beachfront.', target: { x: 150, z: 150 }, cash: 400, respect: 14 },
    { id: 6, title: 'The Informant', giver: 'Mara Voss', brief: 'An informant is hiding in Palms Park. Escort him to the Solara Hotel without losing the tail.', target: { x: 120, z: -20 }, cash: 500, respect: 16 },
    { id: 7, title: 'Marina Motors', giver: 'Lena Kade', brief: 'A buyer at Marina Motors wants the fastest car on the coast. Deliver a tuned ride — garage tune helps.', target: { x: -40, z: 180 }, cash: 600, respect: 18 },
    { id: 8, title: 'Heat Wave', giver: 'Dario Sol', brief: 'The PD set up roadblocks across downtown. Break through and reach the park safehouse.', target: { x: 100, z: 0 }, cash: 700, respect: 20 },
    { id: 9, title: 'King\'s Gambit', giver: 'Mara Voss', brief: 'The old king of the coast, Ren Corso, is stepping down. Prove yourself in one last race at the beachfront.', target: { x: -150, z: 0 }, cash: 900, respect: 25 },
    { id: 10, title: 'King of Solara', giver: 'Ren Corso', brief: 'Final job: drive the coast end to end, lose a 4-star tail, and take the crown at the Solara Hotel.', target: { x: -100, z: -100 }, cash: 1500, respect: 40 }
  ];
  M.current = function () {
    var st = S.state;
    if (st.missionIndex >= M.list.length) return null;
    return M.list[st.missionIndex];
  };
  M.start = function () {
    var m = M.current();
    if (!m) return null;
    S.state.mission = { id: m.id, title: m.title, giver: m.giver, brief: m.brief, target: m.target, done: false };
    return S.state.mission;
  };
  // Reach the target marker to complete the active mission.
  M.checkProgress = function () {
    var st = S.state;
    if (!st.mission || st.mission.done) return false;
    if (S.dist2d(st.player.x, st.player.z, st.mission.target.x, st.mission.target.z) < 8) {
      return M.complete();
    }
    return false;
  };
  M.complete = function () {
    var st = S.state, m = M.current();
    if (!m || !st.mission) return false;
    st.mission.done = true;
    st.cash += m.cash; st.respect += m.respect;
    st.missionsDone++; st.missionIndex++;
    st.mission = null;
    if (S.Audio) S.Audio.missionDone();
    return { cash: m.cash, respect: m.respect, next: M.current() };
  };
  M.objectiveText = function () {
    if (S.state.mission) return S.state.mission.title + ' — reach the gold marker';
    var m = M.current();
    return m ? 'Next: ' + m.title + ' (' + m.giver + ')' : 'All missions complete — you are King of Solara';
  };
})(typeof window !== 'undefined' ? window : globalThis);

// player.js — on-foot movement, driving, entering/exiting and stealing cars.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var P = S.Player = {};
  P.WALK_SPEED = 5; P.RUN_SPEED = 9; P.CAR_TOP_SPEED = 34;

  P.update = function (dt, input) {
    var st = S.state, p = st.player;
    if (st.paused || st.busted) return;
    if (p.inCar && st.car) {
      var car = st.car;
      var accel = (input.up ? 1 : 0) - (input.down ? 0.7 : 0);
      var tune = 1 + st.garage.tune * 0.25;
      car.speed = S.clamp(car.speed + accel * 22 * tune * dt, -10, P.CAR_TOP_SPEED * tune);
      if (!input.up && !input.down) car.speed *= Math.max(0, 1 - 1.6 * dt);
      if (input.handbrake) car.speed *= Math.max(0, 1 - 4 * dt);
      car.angle += (input.left ? 1 : 0) * 1.9 * dt * (car.speed >= 0 ? 1 : -1) * S.clamp(Math.abs(car.speed) / 8, 0, 1);
      car.angle -= (input.right ? 1 : 0) * 1.9 * dt * (car.speed >= 0 ? 1 : -1) * S.clamp(Math.abs(car.speed) / 8, 0, 1);
      car.x += Math.sin(car.angle) * car.speed * dt;
      car.z += Math.cos(car.angle) * car.speed * dt;
      car.x = S.clamp(car.x, -205, 205); car.z = S.clamp(car.z, -205, 205);
      p.x = car.x; p.z = car.z; p.angle = car.angle; p.speed = car.speed;
      if (Math.abs(car.speed) > 20 && Math.random() < dt * 0.05) S.Audio.skid();
    } else {
      var sp = input.run ? P.RUN_SPEED : P.WALK_SPEED;
      var mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      var mz = (input.up ? 1 : 0) - (input.down ? 1 : 0);
      if (mx || mz) {
        var len = Math.sqrt(mx * mx + mz * mz);
        p.x += (mx / len) * sp * dt; p.z += (mz / len) * sp * dt;
        p.angle = Math.atan2(mx / len, mz / len);
        p.speed = sp;
      } else p.speed = 0;
      p.x = S.clamp(p.x, -205, 205); p.z = S.clamp(p.z, -205, 205);
    }
    st.playTime += dt;
  };
  // E: enter nearest car (steal it) or exit current car.
  P.toggleCar = function () {
    var st = S.state, p = st.player;
    if (p.inCar) {
      p.inCar = false; p.carId = null;
      var car = st.car;
      if (car) { p.x = car.x + Math.sin(car.angle + Math.PI / 2) * 3; p.z = car.z + Math.cos(car.angle + Math.PI / 2) * 3; }
      st.car = null;
      return { action: 'exit' };
    }
    var car2 = S.Entities.nearestCar(p.x, p.z, 6);
    if (!car2) return { action: 'none' };
    p.inCar = true; p.carId = car2.id; st.car = car2;
    if (car2.parked || S.Entities.traffic.indexOf(car2) >= 0) {
      st.carsStolen++;
      S.Police.addWanted(1, 'car theft');
    }
    car2.parked = false; car2.speed = 0;
    S.Audio.door();
    return { action: 'enter', car: car2 };
  };
  P.damageCar = function (amount) {
    var st = S.state;
    var armor = 1 - st.garage.armor * 0.2;
    st.carHp = S.clamp(st.carHp - amount * armor, 0, 100);
    if (st.carHp <= 0 && st.player.inCar) { st.player.inCar = false; st.car = null; }
    return st.carHp;
  };
  P.heal = function (amount) { S.state.playerHp = S.clamp(S.state.playerHp + amount, 0, 100); return S.state.playerHp; };
})(typeof window !== 'undefined' ? window : globalThis);

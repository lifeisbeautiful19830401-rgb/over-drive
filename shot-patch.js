"use strict";

// ショットゲージを従来より速く溜めます。
const odBaseUpdateMeters = updateMeters;
updateMeters = function (dt) {
  odBaseUpdateMeters(dt);
  if (!running) return;

  const extraGain = 6 + (speed >= 40 ? 6 : 0) + (speed >= 80 ? 8 : 0) + (boss ? 8 : 0);
  shot = clamp(shot + extraGain * dt, 0, 100);
};

// アイテム取得時にもショットゲージを追加で回復します。
const odBaseItem = item;
item = function (type) {
  odBaseItem(type);
  const bonus = {
    fuel: 15,
    momiji: 17,
    shield: 15,
    slow: 20,
    okonomiyaki: 25
  }[type] || 0;
  shot = clamp(shot + bonus, 0, 100);
};

// 弾を少し大きくして命中しやすくします。
shoot = function () {
  if (!running || screen !== "game" || shot < 100) return;

  bullets.push({
    x: player.x + player.w / 2 - 10,
    y: player.y - 42,
    w: 20,
    h: 44,
    life: 1.7
  });
  shot = 0;
  text("SHOT!", player.x + player.w / 2, player.y - 22, "#9fe8ff", 0.45, 18);
};

// 命中範囲を広げ、破壊可能な障害物は確実に消します。
bulletHits = function () {
  const remainingBullets = [];
  const destroyedObstacles = new Set();

  for (const bullet of bullets) {
    let used = false;
    const hitArea = {
      x: bullet.x - 10,
      y: bullet.y - 6,
      w: bullet.w + 20,
      h: bullet.h + 12
    };

    if (boss && overlap(hitArea, bossBox())) {
      if (overlap(hitArea, weakBox())) {
        boss.hp -= 1;
        boss.flash = 0.16;
        text("HIT!", boss.x + boss.w / 2, boss.y + 22, "#9fe8ff", 0.5, 20);

        if (boss.hp <= 0) {
          score += 1000;
          fuel = Math.min(maxFuel, fuel + 30);
          shield = Math.min(2, shield + 1);
          text("BOSS CLEAR!", 240, 260, "#52e38d", 1.4, 34);
          boss = null;
        }
      } else {
        text("WEAK POINT!", 240, 180, "#ffd447", 0.7, 18);
      }
      used = true;
    }

    if (!used) {
      for (const obstacle of obstacles) {
        if (destroyedObstacles.has(obstacle) || !overlap(hitArea, obstacle)) continue;

        if (destroyable.has(obstacle.type)) {
          destroyedObstacles.add(obstacle);
          score += 150;
          shot = clamp(shot + 20, 0, 100);
          text("DESTROY! +150", obstacle.x + obstacle.w / 2, obstacle.y, "#9fe8ff", 0.75, 18);
        } else if (safe.has(obstacle.type)) {
          text("危ない！", obstacle.x + obstacle.w / 2, obstacle.y, "#ffd447", 0.6, 18);
        }

        used = true;
        break;
      }
    }

    if (!used) remainingBullets.push(bullet);
  }

  if (destroyedObstacles.size > 0) {
    obstacles = obstacles.filter((obstacle) => !destroyedObstacles.has(obstacle));
  }
  bullets = remainingBullets;
};

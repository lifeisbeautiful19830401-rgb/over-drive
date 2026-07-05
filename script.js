"use strict";

// Canvasの準備です。ここに道路、車、障害物、アイテムを描きます。
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 画面要素をまとめて取得します。
const screens = {
  title: document.getElementById("titleScreen"),
  car: document.getElementById("carScreen"),
  stage: document.getElementById("stageScreen"),
  game: document.getElementById("gameScreen"),
  gameOver: document.getElementById("gameOverScreen")
};

const scoreText = document.getElementById("scoreText");
const levelText = document.getElementById("levelText");
const fuelBar = document.getElementById("fuelBar");
const speedText = document.getElementById("speedText");
const speedBar = document.getElementById("speedBar");
const shieldText = document.getElementById("shieldText");
const finalScoreText = document.getElementById("finalScoreText");
const gameOverTitle = document.getElementById("gameOverTitle");
const gameOverMessage = document.getElementById("gameOverMessage");

// 車種データです。選んだ車によってゲーム中の性能が変わります。
const CAR_TYPES = [
  {
    id: "kei",
    name: "軽自動車",
    description: "車体と当たり判定が小さく、避けやすい。燃料は少なめ。",
    width: 36,
    height: 56,
    hitWidth: 30,
    hitHeight: 48,
    acceleration: 44,
    maxSpeed: 110,
    fuel: 82,
    color: "#52e38d"
  },
  {
    id: "standard",
    name: "普通車",
    description: "加速、最高速度、燃料がバランス型。初心者向け。",
    width: 44,
    height: 66,
    hitWidth: 38,
    hitHeight: 56,
    acceleration: 42,
    maxSpeed: 120,
    fuel: 100,
    color: "#5bc0ff"
  },
  {
    id: "truck",
    name: "トラック",
    description: "大きく避けにくいが、燃料が多く長く走りやすい。",
    width: 58,
    height: 82,
    hitWidth: 52,
    hitHeight: 72,
    acceleration: 31,
    maxSpeed: 95,
    fuel: 135,
    color: "#ffb84a"
  }
];

// ステージデータです。Googleマップ連動を足す場合も、この形に変換すれば使えます。
const STAGES = [
  {
    stageName: "広島駅周辺",
    locationType: "station",
    backgroundColor: "#33404a",
    obstacleTypes: ["bus", "bicycle", "taxi", "cone", "tram", "dog"],
    itemRates: { fuel: 0.24, momiji: 0.26, shield: 0.16, slow: 0.16, okonomiyaki: 0.18 },
    difficulty: 1.15,
    description: "バス、自転車、タクシーが多い交通量多めのステージ。"
  },
  {
    stageName: "平和記念公園周辺",
    locationType: "park",
    backgroundColor: "#2f5139",
    obstacleTypes: ["tourist", "bicycle", "cone", "dog"],
    itemRates: { fuel: 0.22, momiji: 0.32, shield: 0.16, slow: 0.16, okonomiyaki: 0.14 },
    difficulty: 0.98,
    description: "観光客風の障害物が多く、アイテムがやや出やすい。"
  },
  {
    stageName: "宇品港周辺",
    locationType: "port",
    backgroundColor: "#294957",
    obstacleTypes: ["truck", "puddle", "container", "cone", "dog"],
    itemRates: { fuel: 0.30, momiji: 0.20, shield: 0.18, slow: 0.18, okonomiyaki: 0.14 },
    difficulty: 1.12,
    description: "トラック、水たまり、コンテナ風障害物が多い港ステージ。"
  },
  {
    stageName: "宮島口周辺",
    locationType: "tourism",
    backgroundColor: "#51402d",
    obstacleTypes: ["tourBus", "deer", "tourist", "dog"],
    itemRates: { fuel: 0.20, momiji: 0.34, shield: 0.16, slow: 0.16, okonomiyaki: 0.14 },
    difficulty: 1.05,
    description: "観光バスと鹿風の障害物が登場する観光地ステージ。"
  },
  {
    stageName: "マツダスタジアム周辺",
    locationType: "stadium",
    backgroundColor: "#562d35",
    obstacleTypes: ["crowd", "taxi", "cone", "bus", "dog"],
    itemRates: { fuel: 0.18, momiji: 0.22, shield: 0.15, slow: 0.15, okonomiyaki: 0.30 },
    difficulty: 1.18,
    description: "赤い応援アイテムが出やすく、人混み風の障害物が多い。"
  }
];

const ITEM_TYPES = ["fuel", "momiji", "shield", "slow", "okonomiyaki"];

let selectedCar = CAR_TYPES[1];
let selectedStage = STAGES[0];
let currentScreen = "title";
let lastTime = 0;
let animationId = 0;

// 入力状態です。キーやタッチボタンが押されている間だけtrueになります。
const input = {
  left: false,
  right: false,
  up: false,
  down: false,
  accelerate: false,
  brake: false
};

// ゲーム中に変化する値をまとめます。
let player;
let obstacles;
let items;
let dogWarnings;
let score = 0;
let level = 1;
let speed = 0;
let fuel = selectedCar.fuel;
let maxFuel = selectedCar.fuel;
let shieldCount = 0;
let invincibleTimer = 0;
let slowTimer = 0;
let obstacleTimer;
let itemTimer;
let dogTimer;
let laneOffset;
let isGameRunning;

function showScreen(name) {
  currentScreen = name;
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function buildCarTable() {
  const body = document.getElementById("carTableBody");
  body.innerHTML = "";

  CAR_TYPES.forEach((car) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${car.name}</strong></td>
      <td>${car.description}</td>
      <td>${car.maxSpeed} km/h</td>
      <td>${car.fuel}</td>
      <td><button data-car="${car.id}">この車で走る</button></td>
    `;
    body.appendChild(row);
  });

  body.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCar = CAR_TYPES.find((car) => car.id === button.dataset.car);
      showScreen("stage");
    });
  });
}

function buildStageList() {
  const list = document.getElementById("stageList");
  list.innerHTML = "";

  STAGES.forEach((stage, index) => {
    const card = document.createElement("article");
    card.className = "stage-card";
    card.innerHTML = `
      <h3>${index + 1}. ${stage.stageName}</h3>
      <p>${stage.description}</p>
      <button data-stage="${index}">このステージで開始</button>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedStage = STAGES[Number(button.dataset.stage)];
      startGame();
    });
  });
}

function resetGameState() {
  maxFuel = selectedCar.fuel;
  fuel = maxFuel;
  score = 0;
  level = 1;
  speed = 0;
  shieldCount = 0;
  invincibleTimer = 0;
  slowTimer = 0;
  obstacleTimer = 0;
  itemTimer = 1.2;
  dogTimer = 3.5;
  laneOffset = 0;
  obstacles = [];
  items = [];
  dogWarnings = [];
  isGameRunning = true;

  player = {
    x: canvas.width / 2 - selectedCar.width / 2,
    y: canvas.height - selectedCar.height - 30,
    width: selectedCar.width,
    height: selectedCar.height,
    hitWidth: selectedCar.hitWidth,
    hitHeight: selectedCar.hitHeight,
    color: selectedCar.color
  };
}

function startGame() {
  cancelAnimationFrame(animationId);
  resetGameState();
  showScreen("game");
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function gameLoop(time) {
  const deltaTime = Math.min((time - lastTime) / 1000, 0.04);
  lastTime = time;

  if (isGameRunning) {
    update(deltaTime);
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }
}

function update(deltaTime) {
  updateSpeed(deltaTime);
  updatePlayer(deltaTime);
  updateTimers(deltaTime);
  spawnThings(deltaTime);
  updateObjects(deltaTime);
  checkCollisions();
  updateHud();
}

function updateSpeed(deltaTime) {
  if (input.accelerate || input.up) {
    speed += selectedCar.acceleration * deltaTime;
  } else {
    speed -= 10 * deltaTime;
  }

  if (input.brake || input.down) {
    speed -= 58 * deltaTime;
  }

  speed = clamp(speed, 0, selectedCar.maxSpeed);
}

function updatePlayer(deltaTime) {
  const moveSpeed = 230 + speed * 1.2;

  if (input.left) player.x -= moveSpeed * deltaTime;
  if (input.right) player.x += moveSpeed * deltaTime;
  if (input.up) player.y -= 95 * deltaTime;
  if (input.down) player.y += 95 * deltaTime;

  player.x = clamp(player.x, 64, canvas.width - 64 - player.width);
  player.y = clamp(player.y, 110, canvas.height - player.height - 18);
}

function updateTimers(deltaTime) {
  const fuelUse = (0.85 + speed / 125) * deltaTime;
  const scoreGain = (2 + speed / 12) * deltaTime;

  fuel -= fuelUse;
  score += scoreGain;
  level = Math.floor(score / 500) + 1;

  invincibleTimer = Math.max(0, invincibleTimer - deltaTime);
  slowTimer = Math.max(0, slowTimer - deltaTime);

  if (fuel <= 0) {
    endGame("燃料切れ", "燃料がなくなりました。無理せず給油も大切です。");
  }
}

function spawnThings(deltaTime) {
  const difficulty = selectedStage.difficulty + level * 0.06;
  const speedBonus = 1 + speed / 160;

  obstacleTimer -= deltaTime;
  itemTimer -= deltaTime;
  dogTimer -= deltaTime;

  if (obstacleTimer <= 0) {
    spawnObstacle();
    obstacleTimer = Math.max(0.38, 1.25 / difficulty / speedBonus);
  }

  if (itemTimer <= 0) {
    spawnItem();
    itemTimer = random(2.2, 4.4);
  }

  if (dogTimer <= 0 && Math.random() < 0.72) {
    spawnDogWarning();
    dogTimer = random(7.5, 12.5);
  }
}

function updateObjects(deltaTime) {
  const scrollSpeed = 90 + speed * 3.2 + level * 7;
  const slowFactor = slowTimer > 0 ? 0.55 : 1;
  const objectSpeed = scrollSpeed * slowFactor;

  laneOffset = (laneOffset + objectSpeed * deltaTime) % 90;

  obstacles.forEach((obstacle) => {
    obstacle.y += objectSpeed * obstacle.speedRate * deltaTime;
    if (obstacle.type === "dog") {
      obstacle.x += obstacle.vx * deltaTime;
    }
  });

  items.forEach((item) => {
    item.y += objectSpeed * 0.88 * deltaTime;
  });

  dogWarnings.forEach((warning) => {
    warning.time -= deltaTime;
    if (warning.time <= 0) {
      spawnDog(warning);
      warning.done = true;
    }
  });

  obstacles = obstacles.filter((obstacle) => obstacle.y < canvas.height + 100 && obstacle.x > -90 && obstacle.x < canvas.width + 90);
  items = items.filter((item) => item.y < canvas.height + 60);
  dogWarnings = dogWarnings.filter((warning) => !warning.done);
}

function spawnObstacle() {
  const candidates = selectedStage.obstacleTypes.filter((type) => type !== "dog");
  const type = pick(candidates);
  const size = getObstacleSize(type);

  obstacles.push({
    type,
    x: random(82, canvas.width - 82 - size.width),
    y: -size.height - 10,
    width: size.width,
    height: size.height,
    speedRate: random(0.82, 1.16)
  });
}

function spawnDogWarning() {
  const fromLeft = Math.random() < 0.5;
  dogWarnings.push({
    fromLeft,
    x: fromLeft ? 34 : canvas.width - 58,
    y: random(180, canvas.height - 230),
    time: 0.85,
    done: false
  });
}

function spawnDog(warning) {
  obstacles.push({
    type: "dog",
    x: warning.fromLeft ? -34 : canvas.width + 8,
    y: warning.y,
    width: 34,
    height: 24,
    vx: warning.fromLeft ? 150 : -150,
    speedRate: 0.35,
    isDog: true
  });
}

function spawnItem() {
  const itemType = chooseItemByRate(selectedStage.itemRates);
  items.push({
    type: itemType,
    x: random(86, canvas.width - 118),
    y: -34,
    width: 30,
    height: 30
  });
}

function checkCollisions() {
  const playerHitBox = getPlayerHitBox();

  for (const obstacle of obstacles) {
    if (rectsOverlap(playerHitBox, obstacle)) {
      handleObstacleHit(obstacle);
      return;
    }
  }

  items = items.filter((item) => {
    if (rectsOverlap(playerHitBox, item)) {
      applyItem(item.type);
      return false;
    }
    return true;
  });
}

function handleObstacleHit(obstacle) {
  if (invincibleTimer > 0) {
    removeObstacle(obstacle);
    return;
  }

  if (shieldCount > 0) {
    shieldCount -= 1;
    removeObstacle(obstacle);
    return;
  }

  if (obstacle.type === "dog") {
    endGame("安全運転に気をつけよう", "犬が飛び出しました。落ち着いて周囲を確認しましょう。");
  } else {
    endGame("ゲームオーバー", "障害物に接触しました。安全第一で再挑戦しましょう。");
  }
}

function removeObstacle(target) {
  obstacles = obstacles.filter((obstacle) => obstacle !== target);
}

function applyItem(type) {
  if (type === "fuel") {
    fuel = Math.min(maxFuel, fuel + 25);
  }
  if (type === "momiji") {
    score += 100;
  }
  if (type === "shield") {
    shieldCount = Math.min(2, shieldCount + 1);
  }
  if (type === "slow") {
    slowTimer = 5;
  }
  if (type === "okonomiyaki") {
    invincibleTimer = 5;
  }
}

function endGame(title, message) {
  if (!isGameRunning) return;
  isGameRunning = false;
  cancelAnimationFrame(animationId);
  gameOverTitle.textContent = title;
  gameOverMessage.textContent = message;
  finalScoreText.textContent = Math.floor(score);
  showScreen("gameOver");
}

function draw() {
  drawRoad();
  drawStageDecorations();
  items.forEach(drawItem);
  obstacles.forEach(drawObstacle);
  dogWarnings.forEach(drawDogWarning);
  drawPlayerCar();

  if (invincibleTimer > 0 || slowTimer > 0) {
    drawEffectText();
  }
}

function drawRoad() {
  ctx.fillStyle = selectedStage.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#25252c";
  ctx.fillRect(60, 0, canvas.width - 120, canvas.height);

  ctx.fillStyle = "#e6e0be";
  ctx.fillRect(55, 0, 5, canvas.height);
  ctx.fillRect(canvas.width - 60, 0, 5, canvas.height);

  ctx.fillStyle = "#f8f5dc";
  for (let y = -90; y < canvas.height + 90; y += 90) {
    ctx.fillRect(canvas.width / 2 - 5, y + laneOffset, 10, 45);
  }
}

function drawStageDecorations() {
  ctx.fillStyle = "rgba(255, 212, 71, 0.16)";
  ctx.font = "18px Arial";
  ctx.fillText(selectedStage.stageName, 18, 34);

  if (selectedStage.locationType === "stadium") {
    ctx.fillStyle = "#e84242";
    for (let i = 0; i < 6; i++) ctx.fillRect(12, 82 + i * 70, 30, 18);
  }

  if (selectedStage.locationType === "port") {
    ctx.fillStyle = "#5bc0ff";
    for (let i = 0; i < 5; i++) ctx.fillRect(canvas.width - 42, 90 + i * 88, 24, 24);
  }
}

function drawPlayerCar() {
  const flashing = invincibleTimer > 0 && Math.floor(performance.now() / 120) % 2 === 0;
  if (flashing) return;

  drawCarShape(player.x, player.y, player.width, player.height, player.color, selectedCar.id);

  if (shieldCount > 0) {
    ctx.strokeStyle = "#9fe8ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(player.x + player.width / 2, player.y + player.height / 2, player.width * 0.75, player.height * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCarShape(x, y, width, height, color, kind) {
  const hoodHeight = kind === "truck" ? height * 0.22 : height * 0.26;
  const cabinY = y + hoodHeight;
  const cabinHeight = kind === "truck" ? height * 0.38 : height * 0.34;
  const bodyRadius = Math.max(5, width * 0.16);

  // 影、タイヤ、車体の順に描くと、道路の上に乗っているように見えます。
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  fillRoundedRect(x + 4, y + 5, width, height, bodyRadius);

  ctx.fillStyle = "#111";
  fillRoundedRect(x - 4, y + height * 0.18, 9, height * 0.25, 3);
  fillRoundedRect(x + width - 5, y + height * 0.18, 9, height * 0.25, 3);
  fillRoundedRect(x - 4, y + height * 0.62, 9, height * 0.25, 3);
  fillRoundedRect(x + width - 5, y + height * 0.62, 9, height * 0.25, 3);

  const bodyGradient = ctx.createLinearGradient(x, y, x + width, y);
  bodyGradient.addColorStop(0, shadeColor(color, -24));
  bodyGradient.addColorStop(0.5, color);
  bodyGradient.addColorStop(1, shadeColor(color, -34));
  ctx.fillStyle = bodyGradient;
  fillRoundedRect(x, y, width, height, bodyRadius);

  // ボンネット、ルーフ、トランクを描き分けて、上から見た車らしさを出します。
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  fillRoundedRect(x + width * 0.14, y + 5, width * 0.72, hoodHeight - 7, 4);
  fillRoundedRect(x + width * 0.12, cabinY, width * 0.76, cabinHeight, 6);
  fillRoundedRect(x + width * 0.16, y + height * 0.72, width * 0.68, height * 0.18, 4);

  ctx.fillStyle = "#bfeeff";
  fillRoundedRect(x + width * 0.2, cabinY + 4, width * 0.6, cabinHeight * 0.36, 4);
  fillRoundedRect(x + width * 0.2, cabinY + cabinHeight * 0.58, width * 0.6, cabinHeight * 0.3, 4);

  ctx.strokeStyle = "rgba(20, 20, 25, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y + 7);
  ctx.lineTo(x + width / 2, y + height - 9);
  ctx.stroke();

  ctx.fillStyle = "#fff4a8";
  ctx.fillRect(x + 6, y + 3, width * 0.2, 5);
  ctx.fillRect(x + width - width * 0.2 - 6, y + 3, width * 0.2, 5);

  ctx.fillStyle = kind === "truck" ? "#777" : "#ff4b4b";
  ctx.fillRect(x + 7, y + height - 8, width * 0.22, 5);
  ctx.fillRect(x + width - width * 0.22 - 7, y + height - 8, width * 0.22, 5);
}

function drawObstacle(obstacle) {
  const x = obstacle.x;
  const y = obstacle.y;
  const w = obstacle.width;
  const h = obstacle.height;

  if (obstacle.type === "cone") drawCone(x, y, w, h);
  else if (obstacle.type === "bus" || obstacle.type === "tourBus") drawBus(x, y, w, h, obstacle.type);
  else if (obstacle.type === "taxi") drawTaxi(x, y, w, h);
  else if (obstacle.type === "bicycle") drawBicycle(x, y, w, h);
  else if (obstacle.type === "tram") drawTram(x, y, w, h);
  else if (obstacle.type === "puddle") drawPuddle(x, y, w, h);
  else if (obstacle.type === "truck") drawObstacleTruck(x, y, w, h);
  else if (obstacle.type === "tourist" || obstacle.type === "crowd") drawPeople(x, y, w, h, obstacle.type);
  else if (obstacle.type === "deer") drawDeer(x, y, w, h);
  else if (obstacle.type === "dog") drawDog(x, y, w, h);
  else drawBox(x, y, w, h, "#d65f3d");
}

function drawItem(item) {
  const x = item.x;
  const y = item.y;

  ctx.save();
  ctx.translate(x + item.width / 2, y + item.height / 2);

  if (item.type === "fuel") {
    ctx.fillStyle = "#52e38d";
    ctx.fillRect(-10, -13, 20, 26);
    ctx.fillStyle = "#17171c";
    ctx.fillRect(-5, -8, 10, 7);
  }
  if (item.type === "momiji") {
    ctx.fillStyle = "#ff554a";
    for (let i = 0; i < 5; i++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.fillRect(-4, -14, 8, 14);
    }
  }
  if (item.type === "shield") {
    ctx.strokeStyle = "#9fe8ff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (item.type === "slow") {
    ctx.fillStyle = "#f8f5dc";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#17171c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -9);
    ctx.moveTo(0, 0);
    ctx.lineTo(8, 5);
    ctx.stroke();
  }
  if (item.type === "okonomiyaki") {
    ctx.fillStyle = "#c98745";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8f5dc";
    ctx.fillRect(-10, -2, 20, 4);
    ctx.fillStyle = "#ff554a";
    ctx.fillRect(-6, -8, 12, 3);
  }

  ctx.restore();
}

function drawDogWarning(warning) {
  ctx.fillStyle = "#ffd447";
  ctx.fillRect(warning.x, warning.y - 10, 26, 34);
  ctx.fillStyle = "#17171c";
  ctx.font = "bold 28px Arial";
  ctx.fillText("!", warning.x + 8, warning.y + 17);
}

function drawEffectText() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(100, 72, canvas.width - 200, 50);
  ctx.fillStyle = "#ffd447";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  const effects = [];
  if (invincibleTimer > 0) effects.push("無敵");
  if (slowTimer > 0) effects.push("スロー");
  ctx.fillText(effects.join(" / "), canvas.width / 2, 104);
  ctx.textAlign = "left";
}

function drawCone(x, y, w, h) {
  ctx.fillStyle = "#ff7a2f";
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f8f5dc";
  ctx.fillRect(x + 6, y + h * 0.55, w - 12, 5);
}

function drawBus(x, y, w, h, type) {
  const color = type === "tourBus" ? "#ffd447" : "#4fc3ff";
  drawVehicleBody(x, y, w, h, color, 7);
  ctx.fillStyle = "#dff7ff";
  for (let i = 0; i < 3; i++) fillRoundedRect(x + 8 + i * 16, y + 11, 11, 13, 3);
  ctx.fillStyle = "#222";
  ctx.fillRect(x + 8, y + h - 13, w - 16, 4);
  ctx.fillStyle = "#ff4b4b";
  ctx.fillRect(x + 8, y + h - 8, 10, 5);
  ctx.fillRect(x + w - 18, y + h - 8, 10, 5);
}

function drawTaxi(x, y, w, h) {
  drawVehicleBody(x, y, w, h, "#f2c94c", 7);
  ctx.fillStyle = "#111";
  ctx.fillRect(x + w * 0.35, y + 4, w * 0.3, 5);
  ctx.fillStyle = "#dff7ff";
  fillRoundedRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.22, 3);
  fillRoundedRect(x + w * 0.22, y + h * 0.58, w * 0.56, h * 0.18, 3);
}

function drawBicycle(x, y, w, h) {
  ctx.strokeStyle = "#f8f5dc";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + 8, y + h - 8, 7, 0, Math.PI * 2);
  ctx.arc(x + w - 8, y + h - 8, 7, 0, Math.PI * 2);
  ctx.moveTo(x + 8, y + h - 8);
  ctx.lineTo(x + w / 2, y + 8);
  ctx.lineTo(x + w - 8, y + h - 8);
  ctx.stroke();
}

function drawTram(x, y, w, h) {
  drawBox(x, y, w, h, "#72d6a0");
  ctx.fillStyle = "#17171c";
  ctx.fillRect(x + 8, y + 8, w - 16, 16);
  ctx.strokeStyle = "#ffd447";
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y - 14);
  ctx.stroke();
}

function drawPuddle(x, y, w, h) {
  ctx.fillStyle = "#55bde8";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacleTruck(x, y, w, h) {
  drawVehicleBody(x, y, w, h, "#b8b8b8", 5);
  ctx.fillStyle = "#6e737a";
  fillRoundedRect(x + 7, y + 7, w - 14, h * 0.25, 4);
  ctx.fillStyle = "#dff7ff";
  ctx.fillRect(x + 12, y + 12, w - 24, 10);
  ctx.fillStyle = "#858585";
  ctx.fillRect(x + 8, y + h * 0.44, w - 16, h * 0.33);
}

function drawPeople(x, y, w, h, type) {
  const count = type === "crowd" ? 4 : 2;
  for (let i = 0; i < count; i++) {
    const px = x + 8 + i * 12;
    ctx.fillStyle = i % 2 ? "#ffd447" : "#ff554a";
    ctx.beginPath();
    ctx.arc(px, y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(px - 4, y + 15, 8, h - 18);
  }
}

function drawDeer(x, y, w, h) {
  ctx.fillStyle = "#b8793f";
  ctx.fillRect(x + 8, y + 12, w - 12, h - 18);
  ctx.fillRect(x + w - 12, y + 4, 12, 14);
  ctx.fillStyle = "#f8f5dc";
  ctx.fillRect(x + w - 10, y, 3, 8);
  ctx.fillRect(x + w - 4, y, 3, 8);
}

function drawDog(x, y, w, h) {
  ctx.fillStyle = "#9a6338";
  ctx.fillRect(x + 6, y + 7, w - 12, h - 8);
  ctx.fillRect(x + w - 12, y + 2, 10, 11);
  ctx.fillStyle = "#5a321b";
  ctx.fillRect(x + 3, y + 12, 8, 4);
  ctx.fillStyle = "#111";
  ctx.fillRect(x + w - 5, y + 6, 3, 3);
}

function drawBox(x, y, w, h, color) {
  ctx.fillStyle = "#111";
  ctx.fillRect(x + 4, y + 4, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawVehicleBody(x, y, w, h, color, radius) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  fillRoundedRect(x + 4, y + 4, w, h, radius);

  ctx.fillStyle = "#111";
  fillRoundedRect(x - 3, y + h * 0.18, 7, h * 0.22, 3);
  fillRoundedRect(x + w - 4, y + h * 0.18, 7, h * 0.22, 3);
  fillRoundedRect(x - 3, y + h * 0.66, 7, h * 0.22, 3);
  fillRoundedRect(x + w - 4, y + h * 0.66, 7, h * 0.22, 3);

  const gradient = ctx.createLinearGradient(x, y, x + w, y);
  gradient.addColorStop(0, shadeColor(color, -22));
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, shadeColor(color, -32));
  ctx.fillStyle = gradient;
  fillRoundedRect(x, y, w, h, radius);

  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  fillRoundedRect(x + 6, y + 5, w - 12, h * 0.22, 4);
}

function fillRoundedRect(x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function shadeColor(color, percent) {
  const hex = color.replace("#", "");
  const amount = Math.round(2.55 * percent);
  const r = clamp(parseInt(hex.slice(0, 2), 16) + amount, 0, 255);
  const g = clamp(parseInt(hex.slice(2, 4), 16) + amount, 0, 255);
  const b = clamp(parseInt(hex.slice(4, 6), 16) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function updateHud() {
  scoreText.textContent = Math.floor(score);
  levelText.textContent = level;
  fuelBar.style.width = `${clamp((fuel / maxFuel) * 100, 0, 100)}%`;
  speedText.textContent = `${Math.floor(speed)} km/h`;
  speedBar.style.width = `${clamp((speed / selectedCar.maxSpeed) * 100, 0, 100)}%`;
  shieldText.textContent = shieldCount > 0 ? `${shieldCount}回` : "なし";
}

function getPlayerHitBox() {
  return {
    x: player.x + (player.width - player.hitWidth) / 2,
    y: player.y + (player.height - player.hitHeight) / 2,
    width: player.hitWidth,
    height: player.hitHeight
  };
}

function getObstacleSize(type) {
  const sizes = {
    cone: { width: 28, height: 34 },
    bus: { width: 58, height: 82 },
    taxi: { width: 46, height: 66 },
    bicycle: { width: 38, height: 42 },
    tram: { width: 54, height: 98 },
    puddle: { width: 60, height: 28 },
    truck: { width: 62, height: 92 },
    container: { width: 64, height: 48 },
    tourist: { width: 38, height: 48 },
    crowd: { width: 60, height: 48 },
    deer: { width: 44, height: 34 },
    tourBus: { width: 64, height: 88 }
  };
  return sizes[type] || { width: 42, height: 42 };
}

function chooseItemByRate(rates) {
  const total = ITEM_TYPES.reduce((sum, type) => sum + rates[type], 0);
  let value = Math.random() * total;

  for (const type of ITEM_TYPES) {
    value -= rates[type];
    if (value <= 0) return type;
  }

  return "momiji";
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// キーボード入力です。WASDと矢印キーの両方に対応します。
window.addEventListener("keydown", (event) => {
  setKey(event.key, true);
});

window.addEventListener("keyup", (event) => {
  setKey(event.key, false);
});

function setKey(key, isPressed) {
  if (key === "ArrowLeft" || key.toLowerCase() === "a") input.left = isPressed;
  if (key === "ArrowRight" || key.toLowerCase() === "d") input.right = isPressed;
  if (key === "ArrowUp" || key.toLowerCase() === "w") {
    input.up = isPressed;
    input.accelerate = isPressed;
  }
  if (key === "ArrowDown" || key.toLowerCase() === "s") {
    input.down = isPressed;
    input.brake = isPressed;
  }
}

// スマホ用ボタンです。押している間だけ入力が有効になります。
document.querySelectorAll("#touchControls button").forEach((button) => {
  const key = button.dataset.key;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    input[key] = true;
    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener("pointerup", () => {
    input[key] = false;
  });

  button.addEventListener("pointercancel", () => {
    input[key] = false;
  });

  button.addEventListener("pointerleave", () => {
    input[key] = false;
  });
});

document.getElementById("startButton").addEventListener("click", () => showScreen("car"));
document.getElementById("retryButton").addEventListener("click", startGame);
document.getElementById("backToCarButton").addEventListener("click", () => showScreen("car"));

document.querySelectorAll("[data-screen]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.screen.replace("Screen", "")));
});

buildCarTable();
buildStageList();
updateHud();

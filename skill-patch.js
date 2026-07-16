"use strict";

// 人・犬・鹿を安全に退避させる「ホーンスキル」。
let hornGauge = 0;
let hornWave = 0;

const hornHud = document.createElement("div");
hornHud.className = "hud-card wide horn-hud";
hornHud.innerHTML = `
  <span>ホーンスキル</span>
  <strong id="hornText">0%</strong>
  <div class="bar"><div id="hornBar" class="bar-fill horn"></div></div>
`;
const shotHud = document.getElementById("shotText")?.closest(".hud-card");
if (shotHud) shotHud.insertAdjacentElement("afterend", hornHud);

const hornText = document.getElementById("hornText");
const hornBar = document.getElementById("hornBar");

const skillStyle = document.createElement("style");
skillStyle.textContent = `
  .horn { background: linear-gradient(90deg, #b9f6ff, #4fc3ff); }
  .horn-button,
  .desktop-horn-button {
    color: #10202a;
    background: linear-gradient(180deg, #c9f8ff, #48bfe3);
    border-color: #e8fdff;
  }
  .horn-button[disabled],
  .desktop-horn-button[disabled] {
    cursor: not-allowed;
    opacity: 0.45;
    filter: grayscale(0.35);
  }
  .horn-button.is-ready,
  .desktop-horn-button.is-ready {
    animation: hornReadyPulse 0.8s ease-in-out infinite alternate;
    box-shadow: 0 0 18px rgba(79, 195, 255, 0.95), 3px 3px 0 #08080a !important;
  }
  @keyframes hornReadyPulse {
    from { transform: scale(1); }
    to { transform: scale(1.035); }
  }

  @media (hover: none), (pointer: coarse) {
    .horn-hud {
      grid-column: span 3 !important;
      min-height: 38px !important;
    }
    .horn-hud strong {
      display: inline-block;
      margin-right: 6px;
    }
    .horn-hud .bar {
      display: inline-block;
      width: calc(100% - 62px);
      vertical-align: middle;
    }
    .pedals {
      grid-template-rows: repeat(3, 1fr) !important;
    }
    .pedals .horn-button {
      grid-column: 1;
      grid-row: 1;
    }
    .pedals .shot-button {
      grid-column: 1;
      grid-row: 2;
    }
    .pedals .brake-button {
      grid-column: 1;
      grid-row: 3;
    }
    .pedals .accelerate-button {
      grid-column: 2;
      grid-row: 1 / 4;
    }
  }

  @media (hover: hover) and (pointer: fine) {
    .desktop-shot-controls {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 8px 10px;
    }
    .desktop-shot-button,
    .desktop-horn-button {
      width: 100%;
      min-width: 0 !important;
      min-height: 58px;
    }
    .desktop-shot-help,
    .desktop-horn-help {
      margin: 0;
      color: #c9c8d0;
      font-size: 0.78rem;
      line-height: 1.35;
      text-align: center;
    }
    .desktop-horn-help strong {
      display: block;
      color: #9fe8ff;
      font-size: 0.88rem;
    }
  }
`;
document.head.appendChild(skillStyle);

// スマホ操作にホーンボタンを追加。
const pedals = document.querySelector("#touchControls .pedals");
let mobileHornButton = null;
if (pedals) {
  mobileHornButton = document.createElement("button");
  mobileHornButton.type = "button";
  mobileHornButton.className = "horn-button";
  mobileHornButton.setAttribute("aria-label", "ホーンスキル");
  mobileHornButton.innerHTML = '<span class="button-icon">)))</span><span>ホーン</span>';
  pedals.prepend(mobileHornButton);
}

// PC操作パネルにもホーンボタンを追加。
const desktopControls = document.getElementById("desktopShotControls");
let desktopHornButton = null;
let desktopHornStatus = null;
if (desktopControls) {
  desktopHornButton = document.createElement("button");
  desktopHornButton.id = "desktopHornButton";
  desktopHornButton.type = "button";
  desktopHornButton.className = "desktop-horn-button";
  desktopHornButton.disabled = true;
  desktopHornButton.textContent = "))) ホーンスキル";

  const help = document.createElement("p");
  help.className = "desktop-horn-help";
  help.innerHTML = '<strong id="desktopHornStatus">ゲージを溜めています</strong>Hキーでも発動できます';
  desktopHornStatus = help.querySelector("strong");

  desktopControls.append(desktopHornButton, help);
}

function activateHornSkill() {
  if (!running || screen !== "game" || hornGauge < 100) return;

  const targets = obstacles.filter((obstacle) => safe.has(obstacle.type));
  const warningCount = warnings.length;
  const total = targets.length + warningCount;

  if (total === 0) {
    text("退避対象なし", player.x + player.w / 2, player.y - 30, "#9fe8ff", 0.7, 17);
    return;
  }

  const targetSet = new Set(targets);
  obstacles = obstacles.filter((obstacle) => !targetSet.has(obstacle));
  warnings = [];
  hornGauge = 0;
  hornWave = 0.75;
  score += total * 50;

  targets.forEach((target) => {
    text("退避！", target.x + target.w / 2, target.y, "#b9f6ff", 0.8, 18);
  });
  text(`HORN CLEAR! +${total * 50}`, 240, player.y - 55, "#9fe8ff", 1.0, 24);
}

if (mobileHornButton) {
  mobileHornButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    activateHornSkill();
  });
}
if (desktopHornButton) desktopHornButton.addEventListener("click", activateHornSkill);

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyH" && !event.repeat) {
    event.preventDefault();
    activateHornSkill();
  }
});

// ショットゲージと同等の条件で独立して蓄積。
const odHornBaseUpdateMeters = updateMeters;
updateMeters = function (dt) {
  odHornBaseUpdateMeters(dt);
  if (!running) return;

  const gain = 7.4 + (speed >= 40 ? 6 : 0) + (speed >= 80 ? 20 : 0) + (boss ? 14 : 0);
  hornGauge = clamp(hornGauge + gain * dt, 0, 100);
};

// アイテム取得時もショットと同程度に回復。
const odHornBaseItem = item;
item = function (type) {
  odHornBaseItem(type);
  const bonus = {
    fuel: 15,
    momiji: 35,
    shield: 15,
    slow: 20,
    okonomiyaki: 50
  }[type] || 0;
  hornGauge = clamp(hornGauge + bonus, 0, 100);
};

// 新しいゲーム開始時にゲージをリセット。
const odHornBaseStart = start;
start = function () {
  hornGauge = 0;
  hornWave = 0;
  odHornBaseStart();
};
const retryButton = document.getElementById("retryButton");
if (retryButton) retryButton.onclick = start;

// HUDとボタン状態を更新。
const odHornBaseHud = hud;
hud = function () {
  odHornBaseHud();
  const ready = running && screen === "game" && hornGauge >= 100;
  if (hornText) hornText.textContent = ready ? "HORN OK" : `${Math.floor(hornGauge)}%`;
  if (hornBar) hornBar.style.width = `${clamp(hornGauge, 0, 100)}%`;

  [mobileHornButton, desktopHornButton].forEach((button) => {
    if (!button) return;
    button.disabled = !ready;
    button.classList.toggle("is-ready", ready);
  });
  if (desktopHornStatus) {
    desktopHornStatus.textContent = ready ? "HORN OK — 退避可能" : `ホーンゲージ ${Math.floor(hornGauge)}%`;
  }
};

// 発動時の音波エフェクト。
const odHornBaseUpdate = update;
update = function (dt) {
  odHornBaseUpdate(dt);
  hornWave = Math.max(0, hornWave - dt);
};

const odHornBaseDraw = draw;
draw = function () {
  odHornBaseDraw();
  if (hornWave <= 0) return;

  const progress = 1 - hornWave / 0.75;
  ctx.save();
  ctx.strokeStyle = `rgba(159, 232, 255, ${1 - progress})`;
  ctx.lineWidth = 7 - progress * 4;
  for (let i = 0; i < 3; i++) {
    const radius = 35 + progress * 260 - i * 38;
    if (radius <= 0) continue;
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
};

// 犬と鹿を、影・体の丸み・脚・耳・目を使ったリアル寄りの描画へ変更。
const odHornBaseDrawObs = drawObs;
drawObs = function (obstacle) {
  if (obstacle.type === "dog") {
    drawRealisticDog(obstacle);
    return;
  }
  if (obstacle.type === "deer") {
    drawRealisticDeer(obstacle);
    return;
  }
  odHornBaseDrawObs(obstacle);
};

function drawRealisticDog(o) {
  const right = !o.vx || o.vx > 0;
  ctx.save();
  ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
  ctx.scale(right ? 1 : -1, 1);
  ctx.translate(-o.w / 2, -o.h / 2);

  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath();
  ctx.ellipse(o.w * 0.5, o.h * 0.88, o.w * 0.46, o.h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  const fur = ctx.createLinearGradient(0, 0, o.w, o.h);
  fur.addColorStop(0, "#d2a16f");
  fur.addColorStop(0.55, "#9b6338");
  fur.addColorStop(1, "#5b351f");
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(o.w * 0.46, o.h * 0.48, o.w * 0.34, o.h * 0.28, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(o.w * 0.78, o.h * 0.35, o.w * 0.19, o.h * 0.22, 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#724326";
  ctx.beginPath();
  ctx.moveTo(o.w * 0.72, o.h * 0.16);
  ctx.lineTo(o.w * 0.78, o.h * 0.02);
  ctx.lineTo(o.w * 0.84, o.h * 0.22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#bf8a5d";
  ctx.beginPath();
  ctx.ellipse(o.w * 0.94, o.h * 0.43, o.w * 0.13, o.h * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#62391f";
  ctx.lineWidth = Math.max(2, o.w * 0.06);
  ctx.lineCap = "round";
  [[0.28,0.64,0.24,0.94],[0.48,0.66,0.5,0.96],[0.62,0.62,0.68,0.92]].forEach((leg) => {
    ctx.beginPath();
    ctx.moveTo(o.w * leg[0], o.h * leg[1]);
    ctx.lineTo(o.w * leg[2], o.h * leg[3]);
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.moveTo(o.w * 0.15, o.h * 0.4);
  ctx.quadraticCurveTo(-o.w * 0.02, o.h * 0.18, o.w * 0.06, o.h * 0.08);
  ctx.stroke();

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(o.w * 0.84, o.h * 0.31, Math.max(1.5, o.w * 0.035), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(o.w * 1.03, o.h * 0.42, Math.max(1.5, o.w * 0.04), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.45)";
  ctx.beginPath();
  ctx.ellipse(o.w * 0.43, o.h * 0.35, o.w * 0.16, o.h * 0.07, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRealisticDeer(o) {
  ctx.save();
  ctx.translate(o.x, o.y);

  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath();
  ctx.ellipse(o.w * 0.5, o.h * 0.92, o.w * 0.46, o.h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  const coat = ctx.createLinearGradient(0, 0, o.w, o.h);
  coat.addColorStop(0, "#d29a5f");
  coat.addColorStop(0.55, "#a76532");
  coat.addColorStop(1, "#63371f");
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(o.w * 0.43, o.h * 0.48, o.w * 0.35, o.h * 0.27, -0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(o.w * 0.66, o.h * 0.48);
  ctx.quadraticCurveTo(o.w * 0.72, o.h * 0.18, o.w * 0.82, o.h * 0.14);
  ctx.lineTo(o.w * 0.88, o.h * 0.48);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(o.w * 0.85, o.h * 0.2, o.w * 0.17, o.h * 0.16, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d8aa78";
  ctx.beginPath();
  ctx.ellipse(o.w * 0.99, o.h * 0.25, o.w * 0.12, o.h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#784425";
  ctx.beginPath();
  ctx.moveTo(o.w * 0.76, o.h * 0.12);
  ctx.lineTo(o.w * 0.69, -o.h * 0.02);
  ctx.lineTo(o.w * 0.83, o.h * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(o.w * 0.9, o.h * 0.08);
  ctx.lineTo(o.w * 1.0, -o.h * 0.01);
  ctx.lineTo(o.w * 0.96, o.h * 0.14);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#6c4025";
  ctx.lineWidth = Math.max(2, o.w * 0.045);
  ctx.lineCap = "round";
  [[0.24,0.64,0.19,0.98],[0.42,0.68,0.43,0.98],[0.58,0.65,0.63,0.98],[0.69,0.6,0.76,0.94]].forEach((leg) => {
    ctx.beginPath();
    ctx.moveTo(o.w * leg[0], o.h * leg[1]);
    ctx.lineTo(o.w * leg[2], o.h * leg[3]);
    ctx.stroke();
  });

  ctx.strokeStyle = "#4f2d1c";
  ctx.lineWidth = Math.max(1.5, o.w * 0.035);
  [[0.79,0.05,0.76,-0.18],[0.84,0.04,0.88,-0.2]].forEach((antler) => {
    ctx.beginPath();
    ctx.moveTo(o.w * antler[0], o.h * antler[1]);
    ctx.lineTo(o.w * antler[2], o.h * antler[3]);
    ctx.lineTo(o.w * (antler[2] - 0.06), o.h * (antler[3] + 0.06));
    ctx.moveTo(o.w * antler[2], o.h * antler[3]);
    ctx.lineTo(o.w * (antler[2] + 0.06), o.h * (antler[3] + 0.04));
    ctx.stroke();
  });

  ctx.fillStyle = "#f2d3ad";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(o.w * (0.25 + i * 0.08), o.h * (0.35 + (i % 2) * 0.12), Math.max(1.2, o.w * 0.025), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(o.w * 0.9, o.h * 0.17, Math.max(1.4, o.w * 0.03), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(o.w * 1.08, o.h * 0.25, Math.max(1.4, o.w * 0.035), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#eee4d4";
  ctx.beginPath();
  ctx.ellipse(o.w * 0.12, o.h * 0.43, o.w * 0.07, o.h * 0.12, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

hud();

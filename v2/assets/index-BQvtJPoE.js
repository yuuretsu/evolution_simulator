import { P as PIX } from "./pix-DUQ-AW49.js";
/*!
 * Copyright (C) 2026 Юрий Морозов (yurafrozen@gmail.com)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License 
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
const SIM = {};
const params = new URLSearchParams(window.location.search);
function getWorldSizeParam(name, defaultValue) {
  let alias = name === "w" ? "width" : "height";
  let raw = Number.parseInt(params.get(name) || params.get(alias) || "", 10);
  if (!Number.isFinite(raw)) return defaultValue;
  return Math.max(8, raw);
}
SIM.worldWidth = getWorldSizeParam("w", 512);
SIM.worldHeight = getWorldSizeParam("h", 128);
SIM.visibleHeight = Math.max(1, SIM.worldHeight - 1);
const controlsEl = document.querySelector(".controls");
const cameraIndicatorContainer = document.querySelector(".camera-indicator-container");
const getUiReservedHeight = () => {
  const controlsHeight = controlsEl ? controlsEl.offsetHeight : 56;
  const indicatorHeight = cameraIndicatorContainer ? cameraIndicatorContainer.offsetHeight : 4;
  return controlsHeight + indicatorHeight;
};
SIM.uiReservedHeight = getUiReservedHeight();
SIM.scale = Math.max(1, (window.innerHeight - SIM.uiReservedHeight) / SIM.visibleHeight);
SIM.px = 1;
SIM.width = SIM.worldWidth;
SIM.height = SIM.worldHeight;
const DIR_OFFSETS = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
const LIGHT_BY_ROW = Array.from({ length: SIM.height }, (_, y) => 10 ** (-0.03 * y));
const SPEED_BUDGETS_MS = [1, 1.7, 2.8, 4.5, 7, 10, 13, 16];
PIX.setup("sim", SIM.width, SIM.height, SIM.px, SIM.scale);
const visibleCanvasHeight = SIM.visibleHeight * SIM.px;
PIX.mainCanvas.height = visibleCanvasHeight;
PIX.mainCanvas._canvas.style.height = `${visibleCanvasHeight * SIM.scale}px`;
const simScrollEl = document.getElementById("sim-scroll");
const cameraThumb = document.getElementById("camera-thumb");
function centerCanvasView() {
  simScrollEl.scrollLeft = Math.max(0, (simScrollEl.scrollWidth - simScrollEl.clientWidth) / 2);
}
requestAnimationFrame(centerCanvasView);
function updateCameraIndicator() {
  const scrollWidth = simScrollEl.scrollWidth;
  const clientWidth = simScrollEl.clientWidth;
  const scrollLeft = simScrollEl.scrollLeft;
  if (scrollWidth <= clientWidth) {
    cameraThumb.style.width = "100%";
    cameraThumb.style.left = "0";
    return;
  }
  const maxScroll = scrollWidth - clientWidth;
  const viewportRatio = clientWidth / scrollWidth;
  const indicatorWidth = cameraIndicatorContainer.clientWidth;
  const thumbWidth = Math.max(20, viewportRatio * indicatorWidth);
  const thumbLeft = scrollLeft / maxScroll * (indicatorWidth - thumbWidth);
  cameraThumb.style.width = `${thumbWidth}px`;
  cameraThumb.style.left = `${thumbLeft}px`;
}
simScrollEl.addEventListener("scroll", updateCameraIndicator);
window.addEventListener("resize", updateCameraIndicator);
requestAnimationFrame(updateCameraIndicator);
let isDragging = false;
let dragStartX = 0;
let dragStartScrollLeft = 0;
simScrollEl.addEventListener("mousedown", (e) => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartScrollLeft = simScrollEl.scrollLeft;
  simScrollEl.style.cursor = "grabbing";
  e.preventDefault();
});
window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const dx = e.clientX - dragStartX;
  simScrollEl.scrollLeft = dragStartScrollLeft - dx;
});
window.addEventListener("mouseup", () => {
  isDragging = false;
  simScrollEl.style.cursor = "grab";
});
window.addEventListener("mouseleave", () => {
  if (isDragging) {
    isDragging = false;
    simScrollEl.style.cursor = "grab";
  }
});
simScrollEl.style.cursor = "grab";
simScrollEl.addEventListener("wheel", (e) => {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    return;
  }
  e.preventDefault();
  simScrollEl.scrollLeft += e.deltaY;
}, { passive: false });
SIM.speedLevel = 6;
SIM.fullSpeed = false;
SIM.paused = false;
SIM.ups = 0;
SIM.updatesInWindow = 0;
SIM.lastUpsUpdate = performance.now();
class Obj extends PIX.Pixel {
  constructor(x, y, color) {
    super(SIM.world, x, y, color);
    this._canvas = CNV.world;
    this.age = 0;
    this.draw();
  }
  draw() {
    super.draw(this._canvas);
  }
  moveTo(x, y) {
    this.clear(this._canvas);
    super.moveTo(x, y);
    this.draw();
  }
  mixColor(color, rate = 0.01) {
    this.color = PIX.color.mixing(this.color, color, rate);
    if (Math.round(this.age) % 20 == 0) this.draw();
  }
  fall(frequency) {
    if (this.age % frequency == 0) {
      if (this.y >= SIM.height - 1) {
        return;
      }
      let [nx, ny] = [this.x, this.y + 1];
      if (Math.random() > 0.1 && !SIM.world.getAt(nx, ny)) {
        this.moveTo(nx, ny);
      } else {
        let side = Math.random() > 0.5 ? -1 : 1;
        if (!SIM.world.getAt(this.x + side, ny)) {
          this.moveTo(this.x + side, ny);
        }
      }
    }
  }
}
class DeadBot extends Obj {
  constructor(bot) {
    let color = PIX.color.mixing([50, 50, 80], bot.color, 0.25);
    super(bot.x, bot.y, color);
    this.energy = bot.energy;
  }
  live() {
    if (this.age >= 1e5 || this.energy <= 0) {
      this.clear(this._canvas);
      SIM.world.clearAt(this.x, this.y);
      delete SIM.deadBots[this._id];
      SIM.amountOfDeadBots = Math.max(0, SIM.amountOfDeadBots - 1);
      return;
    }
    this.fall(1);
    this.age += 1;
  }
}
class Bot extends Obj {
  constructor(x, y, parent) {
    SIM.amountOfBots += 1;
    if (parent) {
      super(x, y, parent.color.slice());
      this.dna = mutatedDna(parent.dna);
      this.energy = parent.energy;
    } else {
      let brightness = calcLight(y) * 127;
      let color = PIX.color.mixing([brightness / 3, brightness / 2, brightness + 15], [100, 100, 150], 0.9);
      super(x, y, color);
      this.dna = genDna();
      this.energy = 0;
    }
    this.direction = PIX.random.num(0, 7);
    this.dnaPos = 0;
  }
  dirToCoords(dir = this.direction) {
    let nx = this.x + DIR_OFFSETS[dir][0];
    let ny = this.y + DIR_OFFSETS[dir][1];
    return [nx, ny];
  }
  rotateRel() {
    this.dnaLastCom = this.dna[this.dnaPos];
    this.dnaLastPos = this.dnaPos;
    this.moveDnaPos(1);
    this.direction = (this.direction + this.dna[this.dnaPos]) % 8;
    this.moveDnaPos(1);
  }
  multiplyTo(x, y) {
    let bot = new Bot(x, y, this);
    this.energy = (this.energy - 50) / 2;
    SIM.nextBots.push(bot);
  }
  moveForward() {
    this.dnaLastCom = this.dna[this.dnaPos];
    this.dnaLastPos = this.dnaPos;
    let [nx, ny] = this.dirToCoords();
    if (!SIM.world.getAt(nx, ny)) {
      this.moveTo(nx, ny);
    }
    this.moveDnaPos(1);
  }
  multiplyForward() {
    this.dnaLastCom = this.dna[this.dnaPos];
    this.dnaLastPos = this.dnaPos;
    let [nx, ny] = this.dirToCoords();
    if (!SIM.world.getAt(nx, ny) && this.energy >= 500 && this.age >= 50) {
      this.multiplyTo(nx, ny);
    }
    this.moveDnaPos(1);
  }
  attackForward() {
    this.dnaLastCom = this.dna[this.dnaPos];
    this.dnaLastPos = this.dnaPos;
    let [nx, ny] = this.dirToCoords();
    let target = SIM.world.getAt(nx, ny);
    if (target instanceof Bot) {
      this.mixColor([200, 20, 20]);
      this.energy += target.energy * 0.5;
      if (this.energy > 1e3) this.energy = 1e3;
      target.energy = 0;
      target.age = target.age * 1.1;
    }
    this.moveDnaPos(1);
  }
  removeDead() {
    this.dnaLastCom = this.dna[this.dnaPos];
    this.dnaLastPos = this.dnaPos;
    let [nx, ny] = this.dirToCoords();
    let target = SIM.world.getAt(nx, ny);
    if (target instanceof DeadBot) {
      this.mixColor([100, 100, 200], 0.05);
      this.energy += target.energy * 0.5 + 1;
      if (this.energy > 1e3) this.energy = 1e3;
      target.energy = 0;
      target.age = Math.floor(target.age * 2);
    }
    this.moveDnaPos(1);
  }
  whatIsAhead() {
    this.dnaLastCom = this.dna[this.dnaPos];
    this.dnaLastPos = this.dnaPos;
    let [nx, ny] = this.dirToCoords();
    let target = SIM.world.getAt(nx, ny);
    if (target instanceof Bot) {
      this.moveDnaPos(1);
    } else if (target instanceof DeadBot) {
      this.moveDnaPos(2);
    } else if (!target) {
      this.moveDnaPos(3);
    } else {
      this.moveDnaPos(4);
    }
  }
  whereDirected() {
    this.dnaLastCom = this.dna[this.dnaPos];
    this.dnaLastPos = this.dnaPos;
    this.moveDnaPos(this.direction + 1);
  }
  photoSynthesis() {
    this.dnaLastCom = this.dna[this.dnaPos];
    this.dnaLastPos = this.dnaPos;
    let light = calcLight(this.y);
    this.mixColor([20, 200, 20], light * 0.01);
    this.energy += 5 * light;
    if (this.energy > 1e3) this.energy = 1e3;
    this.moveDnaPos(1);
  }
  die() {
    SIM.amountOfBots -= 1;
    this.clear(this._canvas);
    SIM.world.clearAt(this.x, this.y);
    SIM.amountOfDeadBots += 1;
    assign(new DeadBot(this), SIM.deadBots);
  }
  moveDnaPos(n) {
    this.dnaPos = (this.dnaPos + n) % 64;
  }
  doNothing() {
    this.dnaLastCom = this.dna[this.dnaPos];
    this.dnaLastPos = this.dnaPos;
    this.moveDnaPos(this.dna[this.dnaPos]);
  }
  live() {
    if (Math.round(this.age) % 60 == 0) this.draw();
    if (this.age >= 1e3) {
      this.die();
      return;
    }
    while (true) {
      let gene = this.dna[this.dnaPos];
      if (gene === 0) {
        this.multiplyForward();
        break;
      } else if (gene === 1) {
        this.rotateRel();
        break;
      } else if (gene === 2) {
        this.photoSynthesis();
        break;
      } else if (gene === 3) {
        this.attackForward();
        break;
      } else if (gene === 4) {
        this.moveForward();
        break;
      } else if (gene === 5) {
        this.removeDead();
        break;
      } else if (gene === 31) {
        this.whatIsAhead();
        break;
      } else if (gene === 32) {
        this.whereDirected();
        break;
      } else {
        this.doNothing();
        break;
      }
    }
    this.mixColor([100, 100, 100], 1e-3);
    this.age += 1;
    SIM.nextBots.push(this);
  }
}
function assign(obj, group) {
  while (true) {
    let id = Math.floor(Math.random() * PIX._max * 100);
    if (!group.hasOwnProperty(id)) {
      obj._id = id;
      group[id] = obj;
      return;
    }
  }
}
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function genDna(len = 64) {
  let dna = [];
  for (let i = 0; i < len; i++) {
    dna.push(PIX.random.num(0, 3));
  }
  return dna;
}
function mutatedDna(dna, rate = 1) {
  let newDna = dna.slice();
  for (let i = 0; i < rate; i++) {
    newDna[PIX.random.num(0, 63)] = PIX.random.num(0, 63);
  }
  return newDna;
}
function calcLight(y) {
  return LIGHT_BY_ROW[y];
}
SIM.world = new PIX.Grid();
SIM.bots = [];
SIM.nextBots = [];
SIM.deadBots = {};
const CNV = {
  background: new PIX.Canvas(),
  world: new PIX.Canvas()
};
CNV.background.fill([0, 0, 0]);
for (let y = 0; y < SIM.height; y++) {
  let brightness = calcLight(y) * 127;
  PIX.draw.rect(0, y * SIM.px, SIM.width * SIM.px, SIM.px, [brightness / 3, brightness / 2, brightness + 15], CNV.background);
}
for (let x = 0; x < SIM.width; x++) {
  new Obj(x, SIM.height - 1, [150, 150, 150]);
}
SIM.amountOfBots = 0;
SIM.amountOfDeadBots = 0;
for (let i = 0; i < 1e3; i++) {
  let [rx, ry] = SIM.world.getRandomEmpty();
  let bot = new Bot(rx, ry);
  bot.energy = 100;
  bot.age += PIX.random.num(0, 100);
  SIM.bots.push(bot);
}
SIM.cycle = 0;
SIM.maxFastSliceMs = 14;
SIM.maxFastStepsPerFrame = 2e4;
const upsValueEl = document.getElementById("ups-value");
const worldAgeEl = document.getElementById("world-age");
const liveCountEl = document.getElementById("live-count");
const deadCountEl = document.getElementById("dead-count");
const speedSliderEl = document.getElementById("speed-slider");
const speedLabelEl = document.getElementById("speed-label");
const pauseBtnEl = document.getElementById("pause-btn");
const ruNumberFormat = new Intl.NumberFormat("ru-RU");
function updateSpeedLabel() {
  if (SIM.fullSpeed) {
    speedLabelEl.textContent = "без огр.";
    return;
  }
  let budget = SPEED_BUDGETS_MS[SIM.speedLevel];
  speedLabelEl.textContent = `${budget} мс`;
}
function applySpeedLevel(level) {
  SIM.speedLevel = level;
  SIM.fullSpeed = level >= SPEED_BUDGETS_MS.length;
  updateSpeedLabel();
}
function updatePauseButton() {
  if (SIM.paused) {
    pauseBtnEl.classList.add("paused");
    pauseBtnEl.setAttribute("aria-label", "Продолжить");
  } else {
    pauseBtnEl.classList.remove("paused");
    pauseBtnEl.setAttribute("aria-label", "Пауза");
  }
}
speedSliderEl.addEventListener("input", () => {
  applySpeedLevel(Number(speedSliderEl.value));
});
pauseBtnEl.addEventListener("click", () => {
  SIM.paused = !SIM.paused;
  updatePauseButton();
});
applySpeedLevel(Number(speedSliderEl.value));
updatePauseButton();
worldAgeEl.textContent = ruNumberFormat.format(SIM.cycle);
liveCountEl.textContent = ruNumberFormat.format(SIM.amountOfBots);
deadCountEl.textContent = ruNumberFormat.format(SIM.amountOfDeadBots);
function stepSimulation() {
  SIM.nextBots.length = 0;
  shuffleInPlace(SIM.bots);
  for (let i = 0; i < SIM.bots.length; i++) SIM.bots[i].live();
  for (let id in SIM.deadBots) SIM.deadBots[id].live();
  let botsBuffer = SIM.bots;
  SIM.bots = SIM.nextBots;
  SIM.nextBots = botsBuffer;
  SIM.cycle += 1;
}
function renderFrame() {
  PIX.draw.fill([100, 100, 100]);
  CNV.background.draw();
  CNV.world.draw();
}
PIX.loop(function() {
  let frameStart = performance.now();
  let updatesThisFrame = 0;
  if (!SIM.paused) {
    let stepCounter = 0;
    if (SIM.fullSpeed) {
      while (performance.now() - frameStart < SIM.maxFastSliceMs && stepCounter < SIM.maxFastStepsPerFrame) {
        stepSimulation();
        stepCounter += 1;
        updatesThisFrame += 1;
      }
    } else {
      let budget = SPEED_BUDGETS_MS[SIM.speedLevel];
      while (performance.now() - frameStart < budget) {
        stepSimulation();
        updatesThisFrame += 1;
      }
    }
  }
  renderFrame();
  SIM.updatesInWindow += updatesThisFrame;
  if (frameStart - SIM.lastUpsUpdate >= 1e3) {
    SIM.ups = Math.round(SIM.updatesInWindow * 1e3 / (frameStart - SIM.lastUpsUpdate));
    SIM.updatesInWindow = 0;
    SIM.lastUpsUpdate = frameStart;
    upsValueEl.textContent = ruNumberFormat.format(SIM.ups);
    worldAgeEl.textContent = ruNumberFormat.format(SIM.cycle);
    liveCountEl.textContent = ruNumberFormat.format(SIM.amountOfBots);
    deadCountEl.textContent = ruNumberFormat.format(SIM.amountOfDeadBots);
  }
});

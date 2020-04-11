"use strict";

const SIM = {};

SIM.px = Math.round(window.innerHeight / 120);
SIM.width = Math.floor((window.innerWidth - 200) / SIM.px);
SIM.height = Math.floor((window.innerHeight - 30) / SIM.px);

PIX.setup('sim', SIM.width, SIM.height, SIM.px);

class Obj extends PIX.Pixel {
	constructor(x, y, color) {
		super(SIM.world, x, y, color);
		this._canvas = CNV.world;
		this.age = 0;
		this.draw();
	}
	draw() {
		super.draw(this._canvas);

		// let ch = this.energy / 8 + 100;
		// super.draw(this._canvas, [ch, ch, ch]);

		// let ch = (this.x ^ this.y) / (61/365);
		// super.draw(this._canvas, `hsl(${ch}, 100%, 50%)`);
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
			let [x, y] = [this.x, this.y + 1];
			if (Math.random() > 0.1 && !SIM.world.getAt(x, y)) {
				this.moveTo(x, y);
			} else {
				if (Math.random() > 0.5) {
					let [x, y] = [this.x - 1, this.y+1];
					if (!SIM.world.getAt(x, y)) {
						this.moveTo(x, y);
					}
				} else {
					let [x, y] = [this.x + 1, this.y+1];
					if (!SIM.world.getAt(x, y)) {
						this.moveTo(x, y);
					}
				}
			}
		}
	}
}


class DeadBot extends Obj {
	constructor(bot) {
		let ch = calcLight(bot.y) * 127;
		let color = PIX.color.mixing([50, 50, 80], bot.color, 0.25);
		// color = PIX.color.mixing(color, [ch/3, ch/2, ch+15], 0.25);
		super(bot.x, bot.y, color);
		this.energy = bot.energy;
	}
	get info() {
		return [
			`Мертвец`,
			`Возраст:  ${this.age}`,
			`Энергия:  ${Math.floor(this.energy)}`,
		];
	}
	live() {
		if (this.age >= 100000 || this.energy <= 0) {
			this.clear(this._canvas);
			SIM.world.clearAt(this.x, this.y);
			delete SIM.deadBots[this._id];
			return;
		}
		// if (this.age < 1000) this.mixColor([0, 0, 0], 0.001);
		this.fall(1);
		this.age += 1;
	}
}


class Bot extends Obj {
	constructor(x, y, parent) {
		SIM.amountOfBots += 1;
		SIM.amountOfBirths += 1;
		let ch = calcLight(y) * 127;
		if (parent) {
			// let color = PIX.color.mixing([150, 150, 150], parent.color, 0.5);
			let color = parent.color.slice();
			super(x, y, color);
			this.dna = mutatedDna(parent.dna);
			this.energy = parent.energy;
		} else {
			let color = PIX.color.mixing([ch/3, ch/2, ch+15], [100, 100, 150], 0.9);
			super(x, y, color)
			this.dna = genDna();
			this.energy = 0;
		}
		this.narrow = PIX.random.num(0, 7);
		this.dnaPos = 0;
	}
	get info() {
		let command;
		switch (this.dnaLastCom) {
			case  0: command = 'размножается     '; break;
			case  1: command = 'поворачивается   '; break;
			case  2: command = 'фотосинтезирует  '; break;
			case  3: command = 'ворует энергию   '; break;
			case  4: command = 'плавает          '; break;
			case  5: command = 'ест труп         '; break;
			case 31: command = 'что спереди?     '; break;
			case 32: command = 'куда я направлен?'; break;
			default: command = 'бездельничает    ';
		}
		let narrow;
		switch (this.narrow){
			case 0: narrow = '←↑'; break;
			case 1: narrow = ' ↑'; break;
			case 2: narrow = ' ↑→'; break;
			case 3: narrow = '  →'; break;
			case 4: narrow = ' ↓→'; break;
			case 5: narrow = ' ↓'; break;
			case 6: narrow = '←↓'; break;
			case 7: narrow = '←'; break;
		}
		return [
			`Бот`,
			`Возраст:  ${Math.round(this.age)}`,
			`Энергия:  ${Math.floor(this.energy)}`,
			`Действие: ${command}`,
			`Направл.: ${narrow}`,
			`Com:      ${this.dna[this.dnaLastPos]}`,
		];
	}
	narrow2coords(narrow = this.narrow) {
		//   0 1 2
		//   7   3
		//   6 5 4
		let coords = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
		let x = this.x + coords[narrow][0];
		let y = this.y + coords[narrow][1];
		return [x, y];
	}
	rotateRel(n) {
		this.dnaLastCom = this.dna[this.dnaPos];
		this.dnaLastPos = this.dnaPos;
		this.moveDnaPos(1);
		this.narrow = (this.narrow + this.dna[this.dnaPos]) % 8;
		// this.narrow = (this.narrow + 1) % 8;
		this.moveDnaPos(1);
		// this.moveDnaPos(this.dna[this.dnaPos]);
	}
	multiplyTo(x, y) {
		let bot = new Bot(x, y, this);
		this.energy -= 50;
		this.energy /= 2;
		assign(bot, SIM.nextBots);
	}
	moveForward() {
		this.dnaLastCom = this.dna[this.dnaPos];
		this.dnaLastPos = this.dnaPos;
		let [x, y] = this.narrow2coords();
		if (!SIM.world.getAt(x, y)) {
			this.moveTo(x, y);
		}
		this.moveDnaPos(1);
		// this.moveDnaPos(this.dna[this.dnaPos]);
	}
	multiplyForward() {
		this.dnaLastCom = this.dna[this.dnaPos];
		this.dnaLastPos = this.dnaPos;
		let [x, y] = this.narrow2coords();
		if (!SIM.world.getAt(x, y) && this.energy >= 500 && this.age >= 50) {
			this.multiplyTo(x, y);
		}
		this.moveDnaPos(1);
		// this.moveDnaPos(this.dna[this.dnaPos]);
	}
	attackForward() {
		this.dnaLastCom = this.dna[this.dnaPos];
		this.dnaLastPos = this.dnaPos;
		let [x, y] = this.narrow2coords();
		let obj = SIM.world.getAt(x, y);
		if (obj instanceof Bot) {
			this.mixColor([200, 20, 20]);
			this.energy += obj.energy * 0.5;
			if (this.energy > 1000) this.energy = 1000;
			obj.energy = 0;
			obj.age = obj.age * 1.1;
		}
		this.moveDnaPos(1);
		// this.moveDnaPos(this.dna[this.dnaPos]);
	}
	removeDead() {
		this.dnaLastCom = this.dna[this.dnaPos];
		this.dnaLastPos = this.dnaPos;
		let [x, y] = this.narrow2coords();
		let obj = SIM.world.getAt(x, y);
		if (obj instanceof DeadBot) {
			this.mixColor([100, 100, 200], 0.05);
			this.energy += obj.energy * 0.5 + 1;
			if (this.energy > 1000) this.energy = 1000;
			obj.energy = 0;
			obj.age = Math.floor(obj.age * 2);
		}
		this.moveDnaPos(1);
		// this.moveDnaPos(this.dna[this.dnaPos]);
	}
	whatIsAhead() {
		this.dnaLastCom = this.dna[this.dnaPos];
		this.dnaLastPos = this.dnaPos;
		// this.mixColor([255, 0, 255]);
		let [x, y] = this.narrow2coords();
		let obj = SIM.world.getAt(x, y);
		if (obj instanceof Bot) {
			this.moveDnaPos(1);
		} else if (obj instanceof DeadBot) {
			this.moveDnaPos(2);
		} else if (!obj) {
			this.moveDnaPos(3);
		} else {
			this.moveDnaPos(4);
		}
		// this.moveDnaPos(this.dna[this.dnaPos]);
	}
	whereDirected() {
		this.dnaLastCom = this.dna[this.dnaPos];
		this.dnaLastPos = this.dnaPos;
		// this.mixColor([255, 255, 255]);
		switch (this.narrow) {
			case 0: this.moveDnaPos(1); break;
			case 1: this.moveDnaPos(2); break;
			case 2: this.moveDnaPos(3); break;
			case 3: this.moveDnaPos(4); break;
			case 4: this.moveDnaPos(5); break;
			case 5: this.moveDnaPos(6); break;
			case 6: this.moveDnaPos(7); break;
			case 7: this.moveDnaPos(8); break;
		}
		// this.moveDnaPos(this.dna[this.dnaPos]);
	}
	photoSynthesis() {
		this.dnaLastCom = this.dna[this.dnaPos];
		this.dnaLastPos = this.dnaPos;
		let n = calcLight(this.y) * 0.01;
		this.mixColor([20, 200, 20], n);
		this.energy += 5 * calcLight(this.y);
		// this.energy += 2;
		if (this.energy > 1000) this.energy = 1000;
		this.moveDnaPos(1);
		// this.moveDnaPos(this.dna[this.dnaPos]);
	}
	die() {
		SIM.amountOfBots -= 1;
		this.clear(this._canvas);
		SIM.world.clearAt(this.x, this.y);
		assign(new DeadBot(this), SIM.deadBots)
	}
	moveDnaPos(n) {
		// this.mixColor([50, 50, 50]);
		this.dnaPos = (this.dnaPos + n) % 64;
		// this.dnaPos = n;
	}
	doNothing() {
		this.dnaLastCom = this.dna[this.dnaPos];
		this.dnaLastPos = this.dnaPos;
		this.moveDnaPos(this.dna[this.dnaPos]);
	}
	live() {

		if (Math.round(this.age) % 60 == 0) this.draw();

		let cycle = 0;

		if (this.age >= 1000) {
			this.die();
			return;
		}

		while (true) {
			let gene = this.dna[this.dnaPos];

			if      (gene === 0)  {this.multiplyForward(); break;}
			else if (gene === 1)  {this.rotateRel(1);      break;}
			else if (gene === 2)  {this.photoSynthesis();  break;}
			else if (gene === 3)  {this.attackForward();   break;}
			else if (gene === 4)  {this.moveForward();     break;}
			else if (gene === 5)  {this.removeDead();      break;}
			else if (gene === 31) {this.whatIsAhead();     break;}
			else if (gene === 32) {this.whereDirected();   break;}
			else                  {this.doNothing();       break;}

			if (cycle >= 50) {
				// this.mixColor([150, 150, 150], 0.01);
				break;
			}
			cycle += 1;
		}
		// this.fall(500);
		this.mixColor([100, 100, 100], 0.001);
		this.age += 1;
		// this.energy -= 0.5;
		assign(this, SIM.nextBots);
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


function genDna(len = 64) {
	let dna = [];
	for (let i = 0; i < len; i++) {
		dna.push(PIX.random.num(0, 3));
	}
	return dna;
}


function mutatedDna(dna, rate = 1) {
	let newDna = dna.slice();
	if (Math.random() > 0.0) {
		for (let i = 0; i < rate; i++) {
			newDna[PIX.random.num(0, 63)] = PIX.random.num(0, 63);
		}
	}
	return newDna;
}


function showDna(bot, absX, absY) {

	let lol = bot.dnaLastPos;

	let dist = 150/8;
	PIX.draw.rect(absX, absY, 8*dist, 8*dist, [0, 0, 0]);
	// let absX = SIM.width * SIM.px + 10;
	// let absY = PIX._bottom + 10;
	let pX = lol % Math.sqrt(bot.dna.length) * dist + absX;
	let pY = Math.floor(lol / Math.sqrt(bot.dna.length)) * dist + absY;
	PIX.draw.rect(pX, pY, dist, dist, [255, 100, 100]);
	for (let x = 0; x < Math.sqrt(bot.dna.length); x++) {
		for (let y = 0; y < Math.sqrt(bot.dna.length); y++) {
			let canvas = PIX.mainCanvas;
			canvas.ctx.font = "10px courier";
			canvas.ctx.textBaseline = "middle";
			canvas.ctx.textAlign = "center";
			canvas.ctx.fillStyle = 'white';

			let num = bot.dna[x+y*Math.sqrt(bot.dna.length)];
			let text;
			switch (num) {
				case 0:
					text = 'MU';
					canvas.ctx.fillStyle = PIX.color.get([200, 200, 200]);
					break;
				case 1:
					text = 'RO';
					canvas.ctx.fillStyle = PIX.color.get([200, 200, 200]);
					break;
				case 2:
					text = 'PH';
					canvas.ctx.fillStyle = PIX.color.get([100, 255, 100]);
					break;
				case 3:
					text = 'AT';
					canvas.ctx.fillStyle = PIX.color.get([255, 100, 100]);
					break;
				case 4:
					text = 'MO';
					canvas.ctx.fillStyle = PIX.color.get([255, 255, 255]);
					break;
				case 5:
					text = 'ED';
					canvas.ctx.fillStyle = PIX.color.get([100, 100, 255]);
					break;
				default:
					text = num;
					canvas.ctx.fillStyle = PIX.color.get([100, 100, 100]);
					break;
			}
			canvas.ctx.fillText(text, x * dist + absX + dist/2, y * dist + absY + dist/2);
		}
	}
}


function calcLight(y) {
	return 10**(-0.03 * y);
}


SIM.world = new PIX.Grid();
SIM.bots = {};
SIM.deadBots = {};
SIM.graphicBots = new PIX.Graphic2(50);
SIM.graphicBirths = new PIX.Graphic2(50);
SIM.graphicFps = new PIX.Graphic2(50);
const CNV = {
	background: new PIX.Canvas(),
	world: new PIX.Canvas(),
};
CNV.background.fill([0, 0, 0]);

for (let y = 0; y < SIM.height; y++) {
	let ch = calcLight(y) * 127;
	// ch = 255;
	PIX.draw.rect(0, y * SIM.px, SIM.width * SIM.px, SIM.px, [ch/3, ch/2, ch+15], CNV.background);

	// let n = 1 - calcLight(y);
	// let ch = n * 255;
	// PIX.draw.rect(0, y * SIM.px, SIM.width * SIM.px, SIM.px, [ch, ch, ch], CNV.background);
}


for (let x = 0; x < SIM.width; x++) {
	let wall = new Obj(x, SIM.height - 1, [150, 150, 150]);
	wall.info = [`Стена`];
}


SIM.amountOfBots = 0;
SIM.amountOfBirths = 0;
for (let i = 0; i < 1000; i++) {
	let [x, y] = SIM.world.getRandomEmpty();
	let bot = new Bot(x, y);
	bot.energy = 100;
	bot.age += PIX.random.num(0, 100);
	assign(bot, SIM.bots);

	// bot.dna = [
	// 	 1, 1, 1, 1, 1, 1, 1, 1,
	// 	 1, 1, 1, 1, 1, 1, 1, 1,
	// 	 1, 1, 0, 1, 1, 1, 1, 1,
	// 	 1, 1, 1, 1, 1, 1, 1, 1,
	// 	 1, 1, 1, 1, 1, 1, 1, 1,
	// 	 1, 1, 1, 1, 1, 1, 1, 1,
	// 	 1, 1, 1, 1, 1, 1, 1, 1,
	// 	 1, 1, 1, 1, 1, 1, 1, 1,
	// ]
}

let start = Date.now();
let fps = 0;
SIM.cycle = 0;
PIX.loop(function() {
	fps += 1;
	SIM.nextBots = {};
	for (let id in SIM.bots)     SIM.bots[id].live();
	for (let id in SIM.deadBots) SIM.deadBots[id].live();
	SIM.bots = SIM.nextBots;

	if (SIM.cycle % 50 == 0) SIM.graphicBots.pushData(SIM.amountOfBots / 300);
	if (SIM.cycle % 50 == 0) SIM.graphicBirths.pushData(SIM.amountOfBirths);
	if (Date.now() - start >= 1000) {
		SIM.graphicFps.pushData(fps / 2);
		start = Date.now();
		SIM.fps = fps;
		fps = 0;
	}

	PIX.draw.fill([100, 100, 100]);
	CNV.background.draw();
	CNV.world.draw();
	SIM.graphicBots.draw(`боты: ${SIM.amountOfBots}`);
	SIM.graphicBirths.draw(`рождаемость: ${SIM.amountOfBirths}`);
	SIM.amountOfBirths = 0;
	SIM.graphicFps.draw(`fps: ${SIM.fps}`);
	PIX.draw.text(0, 0, [
		`время: ${SIM.cycle}`
	]);

	if (PIX.mouse.overGrid) {
		let [gX, gY] = [PIX.mouse.gridX, PIX.mouse.gridY];
		let [x, y] = [PIX.mouse.x, PIX.mouse.y];
		let here = SIM.world.getAt(gX, gY);
		if (here instanceof Obj) {
			let pX, pY;
			if (y < here.info.length * 15 + 3 - 10) pY = 0;
			else pY = y - here.info.length * 15 + 3 - 10;
			pY = Math.floor(pY);
			if (x < 80) pX = 0;
			else pX = x - 80;
			pX = Math.floor(pX);
			PIX.draw.text(pX + 25, pY, here.info);
			PIX.draw.pixel(gX, gY, [255, 255, 0, 0.5]);
			PIX.draw.rect(pX-0, pY, 25, 30, [0, 0, 0, 0.5]);
			PIX.draw.rect(pX+5, pY+5, 20, 20, here.color);
			if (here instanceof Bot) {
				let gap = (PIX._sidebarWidth - 8*(150/8)) / 2;
				showDna(here,  gap + SIM.width * SIM.px, gap + PIX._bottom);
			}
		}
	}

	SIM.cycle += 1;
});
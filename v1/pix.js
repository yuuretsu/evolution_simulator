const PIX = (function() {
	return {
		setup(canvas, width = 100, height = 100, cell = 5) {
			[PIX._width, PIX._height] = [width, height];
			PIX._max = width * height;
			PIX._cell = cell;
			PIX._hasSidebar = false;
			PIX._sidebarWidth = 150;
			PIX._bottom = 0;

			let cnv = new PIX.Canvas();
			if (document.getElementById(canvas)) {
				cnv._canvas = document.getElementById(canvas);
				cnv._canvas.width = width * cell;
				cnv._canvas.height = height * cell;
				cnv._ctx = cnv._canvas.getContext("2d");
			} else {
				document.body.appendChild(cnv._canvas);
			}
			PIX.mainCanvas = cnv;

			PIX.mouse = {
				over: false,
				x: 0,
				y: 0,
				gridX: 0,
				gridY: 0,
				button: null,
			};

			cnv._canvas.addEventListener('mousemove', event => {
				let rect = cnv._canvas.getBoundingClientRect();
				PIX.mouse.x = event.clientX - rect.left;
				PIX.mouse.y = event.clientY - rect.top;
				if (PIX.mouse.x < PIX._width * PIX._cell) {
					PIX.mouse.overGrid = true;
					PIX.mouse.gridX = Math.floor(PIX.mouse.x / PIX._cell);
					PIX.mouse.gridY = Math.floor(PIX.mouse.y / PIX._cell);
				} else {
					PIX.mouse.overGrid = false;
				}
			})

			cnv._canvas.addEventListener('mouseup', event => {
				PIX.mouse.button = event.button;
			})

			cnv._canvas.addEventListener('mouseover', event => {
				PIX.mouse.over = true;
			})

			cnv._canvas.addEventListener('mouseout', event => {
				PIX.mouse.over = false;
				PIX.mouse.overGrid = false;
			})
		},

		loop(handler) {
			function PIXloop() {
				PIX.mainCanvas.clear();
				handler();
				PIX.mouse.button = null;
				requestAnimationFrame(PIXloop);
			}
			requestAnimationFrame(PIXloop);
			// setInterval(PIXloop, 1000/2);
		},

		Pixel: class Pixel {
			constructor(grid, x, y, color = [30, 30, 30]) {
				grid.setAt(x, y, this);
				this._grid = grid;
				[this._x, this._y] = [x, y];
				this.color = color;
			}
			get x() { return this._x; }
			get y() { return this._y; }
			get grid() { return this._grid; }
			moveTo(x, y, grid = this.grid) {
				[x, y] = PIX.normalCoords(x, y);
				// this._grid.setAt(this._x, this._y, null);
				this.grid.clearAt(this.x, this.y);
				[this._x, this._y, this._grid] = [x, y, grid];
				grid.setAt(x, y, this);
			}
			draw(canvas, color = this.color) {
				PIX.draw.pixel(this._x, this._y, color, canvas);
			}
			clear(canvas) {
				PIX.draw.clearPixel(this.x, this.y, canvas);
			}
		},

		Graphic: class Graphic {
			constructor(maxItems, maxH) {
				this._maxH = maxH;
				this._maxItems = maxItems;
				this._items = 0;
				this._canvas = new PIX.Canvas(maxItems, maxH);
				this.colors = {
					bg: 'rgba(0, 0, 0, 0.5)',
					data: 'rgba(50, 150, 50, 1)',
				}
				PIX.draw.fill(this.colors.bg, this._canvas);
			}
			pushData(data) {
				if (this._items < this._maxItems) {
					data %= this._maxH;
					this._items += 1;
					PIX.draw.rect(this._items - 1, this._maxH - data, 1, data, this.colors.data, this._canvas);
				} else {
					this._items = 0;
					this._canvas.clear();
					PIX.draw.fill(this.colors.bg, this._canvas);
					this.pushData(data);
				}
			}
			draw(x, y, canvas = PIX.mainCanvas) {
				this._canvas.draw(canvas, x, y);
			}
		},

		Graphic3: class Graphic3 {
			constructor(maxH) {
				this._maxH = maxH;
				this._maxItems = PIX._width * PIX._cell;
				this._items = 0;
				this._canvas = new PIX.Canvas(this._maxItems, maxH);
				this.colors = {
					bg: 'rgb(80, 80, 80)',
					data: 'rgb(150, 150, 150)',
				}
				PIX.mainCanvas._canvas.height += this._maxH;
				PIX.draw.fill(this.colors.bg, this._canvas);
				this._y = PIX._bottom;
				PIX._bottom += maxH;
			}
			pushData(data) {
				if (this._items < this._maxItems) {
					data %= this._maxH;
					this._items += 1;
					PIX.draw.rect(this._items - 1, this._maxH - data, 1, data, this.colors.data, this._canvas);
				} else {
					this._items = 0;
					this._canvas.clear();
					PIX.draw.fill(this.colors.bg, this._canvas);
					this.pushData(data);
				}
			}
			draw(title) {
				this._canvas.draw(PIX.mainCanvas, 0, this._y);
				if (title) {
					PIX.draw.text(0, this._y, [title]);
				}
			}
		},

		Graphic2: class Graphic2 {
			constructor(maxH) {
				this._maxH = maxH;
				this._maxItems = PIX._sidebarWidth;
				this._items = 0;
				this.colors = {
					bg: 'rgb(80, 80, 80)',
					data: 'rgb(150, 150, 150)',
				}
				this._canvas = new PIX.Canvas(this._maxItems, maxH);
				this.redraw();
				if (!PIX._hasSidebar) {
					PIX._hasSidebar = true;
					PIX.mainCanvas._canvas.width += this._maxItems;
				}
				this._y = PIX._bottom;
				PIX._bottom += maxH;
			}
			redraw() {
				this._canvas.clear();
				PIX.draw.fill(this.colors.bg, this._canvas);
				PIX.draw.rect(0, this._maxH - 1, this._maxItems, 1, [0, 0, 0, 0.25], this._canvas);
			}
			pushData(data) {
				if (this._items < this._maxItems) {
					data %= this._maxH;
					this._items += 1;
					PIX.draw.rect(this._items - 1, this._maxH - data, 1, data, this.colors.data, this._canvas);
				} else {
					this._items = 0;
					this.redraw();
					this.pushData(data);
				}
			}
			draw(title) {
				this._canvas.draw(PIX.mainCanvas, PIX._width * PIX._cell, this._y);
				if (title) {
					PIX.draw.text(PIX._width * PIX._cell, this._y, [title]);
				}
			}
		},

		Grid: class Grid {
			constructor(obj = null) {
				for (let x = 0; x < PIX._width; x++) {
					for (let y = 0; y < PIX._height; y++) {
						this[x + y * PIX._width] = obj;
					}
				}
				if (obj == null) this._size = 0;
				else this._size = PIX._max;
			}
			get size() { return this._size; }
			get hasEmpty() {
				if (this._size < PIX._max) return true;
				else return false;
			}
			getAt(x, y) {
				[x, y] = PIX.normalCoords(x, y);
				// console.log(x, y);
				return this[x + y * PIX._width];
			}
			setAt(x, y, obj) {
				[x, y] = PIX.normalCoords(x, y);
				if (obj === null) {
					this.clearAt(x, y);
				} else {
					if (this[x + y * PIX._width] === null) {
						this[x + y * PIX._width] = obj;
						this._size += 1;
					} else {
						throw "cell " + x + ":" + y + " is already taken by " + this.getAt(x, y);
					}
				}
			}
			clearAt(x, y) {
				[x, y] = PIX.normalCoords(x, y);
				if (this[x + y * PIX._width] !== null) {
					this[x + y * PIX._width] = null;
					this._size -= 1;
				}
			}
			replaceAt(x, y, obj) {
				[x, y] = PIX.normalCoords(x, y);
				if (obj === null) {
					clearAt(x, y);
				} else {
					this[x + y * PIX._width] = obj;
				}
			}
			getRandom() {
				return [PIX.random.num(0, PIX._width - 1), PIX.random.num(0, PIX._height - 1)];
			}
			getRandomEmpty() {
				if (this.hasEmpty) {
					let x, y;
					while (true) {
						x = PIX.random.num(0, PIX._width - 1);
						y = PIX.random.num(0, PIX._height - 1);
						if (this[x + y * PIX._width] === null) break;
					}
					return [x, y];
				} else {
					throw 'grid has no empty cells';
				}
			}
		},

		Canvas: class Canvas {
			constructor(width = PIX._width * PIX._cell, height = PIX._height * PIX._cell) {
				let canvas = document.createElement('canvas');
				[canvas.width, canvas.height] = [width, height];
				this._canvas = canvas;
				this._ctx = canvas.getContext("2d");
			}
			set width(width) { this._canvas.width = width; }
			get width() { return this._canvas.width; }
			set height(height) { this._canvas.height = height; }
			get height() { return this._canvas.height; }
			get ctx() { return this._ctx; }
			draw(canvas = PIX.mainCanvas, x = 0, y = 0) {
				PIX.draw.canvas(x, y, this, canvas);
			}
			fill(color = [0, 0, 0]) {
				PIX.draw.fill(color, this);
			}
			clear() {
				PIX.draw.clearRect(0, 0, this._canvas.width, this._canvas.height, this);
			}
		},

		color: {
			get(color) {
				if (color instanceof Array) {
					if (color.length === 3) {
						return 'rgb(' + Math.round(color[0]) + ', ' + Math.round(color[1]) + ', ' + Math.round(color[2]) + ')';
					} else if (color.length === 4) {
						return 'rgba(' + Math.round(color[0]) + ', ' + Math.round(color[1]) + ', ' + Math.round(color[2]) + ', ' + color[3] + ')';
					}
				} else if (typeof color == "string") {
					return color;
				}
				throw `PIX.color.get error: ${color}`;
			},
			random(min = 0, max = 255) {
				let color = [];
				for (let i = 0; i < 3; i++) {
					color.push(PIX.random.num(min, max));
				}
				return color;
			},
			mutate(color, rate) {
				var newColor = color.slice(0);
				for (var i = 0; i < color.length; i++) {
					newColor[i] += PIX.random.num(-rate, rate);
					if (newColor[i] > 255) newColor[i] = 255;
					if (newColor[i] < 0) newColor[i] = 0;
				}
				return newColor;
			},
			mixing(color1, color2, balance = 0.5) {
				let newColor = [];
				for (let i = 0; i < Math.min(color1.length, color2.length); i++) {
					newColor.push(color2[i] * balance + color1[i] * (1 - balance));
				}
				return newColor;
			},
		},

		draw: {
			fill(color = [240, 240, 240], canvas = PIX.mainCanvas) {
				canvas.ctx.fillStyle = PIX.color.get(color);
				canvas.ctx.fillRect(0, 0, canvas.width, canvas.height);
			},
			pixel(x, y, color, canvas = PIX.mainCanvas) {
				// [x, y] = PIX.normalCoords(x, y);
				// canvas.ctx.fillStyle = PIX.color.get(color);
				// canvas.ctx.fillRect(x * PIX._cell, y * PIX._cell, PIX._cell, PIX._cell);

				[x, y] = PIX.normalCoords(x, y);
				PIX.draw.rect(x * PIX._cell, y * PIX._cell, PIX._cell, PIX._cell, color, canvas);
			},
			pixelFrame(x, y, color, border = 1, canvas = PIX.mainCanvas) {
				[x, y] = PIX.normalCoords(x, y);
				PIX.draw.rect(x * PIX._cell, y * PIX._cell, PIX._cell, PIX._cell, color, canvas);
				PIX.draw.clearRect(x * PIX._cell + border, y * PIX._cell + border, PIX._cell - border * 2, PIX._cell - border * 2, canvas);
			},
			rect(x, y, w, h, color = [200, 200, 200], canvas = PIX.mainCanvas) {
				canvas.ctx.fillStyle = PIX.color.get(color);
				canvas.ctx.fillRect(x, y, w, h);
			},
			canvas: function(x, y, input, canvas = PIX.mainCanvas) {
				canvas.ctx.drawImage(input._canvas, x, y);
			},
			clear(canvas = PIX.mainCanvas) {
				canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);
			},
			clearRect(x, y, w, h, canvas = PIX.mainCanvas) {
				canvas.ctx.clearRect(x, y, w, h);
			},
			clearPixel(x, y, canvas = PIX.mainCanvas) {
				[x, y] = PIX.normalCoords(x, y);
				canvas.ctx.clearRect(x * PIX._cell, y * PIX._cell, PIX._cell, PIX._cell);
			},
			label(x, y, text, canvas = PIX.mainCanvas) {
				canvas.ctx.font = "12px courier";
				canvas.ctx.textBaseline = "hanging";
				canvas.ctx.textAlign = "left";
				canvas.ctx.fillStyle = 'white';
				canvas.ctx.fillText(text, x, y);
			},
			text(x, y, txt, canvas = PIX.mainCanvas) {

				canvas.ctx.font = "12px courier";

				let maxWidth = 0;
				for (let i = 0; i < txt.length; i++) {
					let w = canvas.ctx.measureText(txt[i]).width;
					if (w > maxWidth) maxWidth = Math.round(w);
				}

				PIX.draw.rect(x, y, maxWidth + 10, 15 * txt.length + 3, [0, 0, 0, 0.5], canvas);
				for (let i = 0; i < txt.length; i++) {
					PIX.draw.label(x + 5, y + 5, txt[i], canvas);
					y += 15;
				}
			}
		},

		random: {
			num(min, max) {
				return Math.floor(Math.random() * (max - min + 1)) + min;
			},
			bool() {
				return Boolean(Math.round(Math.random()));
			},
			fromArray(arr) {
				return arr[this.num(0, arr.length - 1)];
			},
			toArray(arr, item) {
				arr.splice(PIX.random.num(0, arr.length), 0, item);
				return arr;
			},
		},

		normalCoords(x, y) {
			x = Math.round(x);
			y = Math.round(y);
			if (x >= 0) x = x % PIX._width;
			else x = PIX._width - ((-x) % PIX._width);
			if (y >= 0) y = y % PIX._height;
			else y = PIX._height - ((-y) % PIX._height);
			return [x, y];

			// x = Math.round(x);
			// y = Math.round(y);
			// if (x < 0) x = PIX._width + x;
			// x %= PIX._width;
			// if (y < 0) y = PIX._height + y;
			// y %= PIX._height;
			// return [x, y];
		},

		moore: [
			[-1,-1], [ 0,-1], [ 1,-1],
			[-1, 0],          [ 1, 0],
			[-1, 1], [ 0, 1], [ 1, 1]
		],

	};
}());
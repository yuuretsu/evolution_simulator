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
const PIX = /* @__PURE__ */ function() {
  return {
    setup(canvas, width = 100, height = 100, cell = 5, displayScale = 1) {
      [PIX._width, PIX._height] = [width, height];
      PIX._max = width * height;
      PIX._cell = cell;
      PIX._displayScale = Math.max(1, displayScale);
      PIX._hasSidebar = false;
      PIX._sidebarWidth = 150;
      PIX._bottom = 0;
      let cnv = new PIX.Canvas();
      if (document.getElementById(canvas)) {
        cnv._canvas = document.getElementById(canvas);
        cnv._canvas.width = width * cell;
        cnv._canvas.height = height * cell;
        cnv._ctx = cnv._canvas.getContext("2d");
        cnv._ctx.imageSmoothingEnabled = false;
      } else {
        document.body.appendChild(cnv._canvas);
      }
      cnv._canvas.style.imageRendering = "pixelated";
      cnv._canvas.style.width = `${cnv._canvas.width * PIX._displayScale}px`;
      cnv._canvas.style.height = `${cnv._canvas.height * PIX._displayScale}px`;
      cnv._resetBuffer();
      PIX.mainCanvas = cnv;
      PIX.mouse = {
        over: false,
        x: 0,
        y: 0,
        gridX: 0,
        gridY: 0,
        button: null
      };
      cnv._canvas.addEventListener("mousemove", (event) => {
        let rect = cnv._canvas.getBoundingClientRect();
        let scaleX = cnv._canvas.width / rect.width;
        let scaleY = cnv._canvas.height / rect.height;
        PIX.mouse.x = (event.clientX - rect.left) * scaleX;
        PIX.mouse.y = (event.clientY - rect.top) * scaleY;
        if (PIX.mouse.x < PIX._width * PIX._cell) {
          PIX.mouse.overGrid = true;
          PIX.mouse.gridX = Math.floor(PIX.mouse.x / PIX._cell);
          PIX.mouse.gridY = Math.floor(PIX.mouse.y / PIX._cell);
        } else {
          PIX.mouse.overGrid = false;
        }
      });
      cnv._canvas.addEventListener("mouseup", (event) => {
        PIX.mouse.button = event.button;
      });
      cnv._canvas.addEventListener("mouseover", (event) => {
        PIX.mouse.over = true;
      });
      cnv._canvas.addEventListener("mouseout", (event) => {
        PIX.mouse.over = false;
        PIX.mouse.overGrid = false;
      });
    },
    loop(handler) {
      function PIXloop() {
        PIX.mainCanvas.clear();
        handler();
        PIX.mainCanvas.flush();
        PIX.mouse.button = null;
        requestAnimationFrame(PIXloop);
      }
      requestAnimationFrame(PIXloop);
    },
    Pixel: class Pixel {
      constructor(grid, x, y, color = [30, 30, 30]) {
        [x, y] = PIX.normalCoords(x, y);
        grid.setAt(x, y, this);
        this._grid = grid;
        [this._x, this._y] = [x, y];
        this.color = color;
      }
      get x() {
        return this._x;
      }
      get y() {
        return this._y;
      }
      get grid() {
        return this._grid;
      }
      moveTo(x, y, grid = this.grid) {
        [x, y] = PIX.normalCoords(x, y);
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
          bg: "rgba(0, 0, 0, 0.5)",
          data: "rgba(50, 150, 50, 1)"
        };
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
          bg: "rgb(80, 80, 80)",
          data: "rgb(150, 150, 150)"
        };
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
          bg: "rgb(80, 80, 80)",
          data: "rgb(150, 150, 150)"
        };
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
      get size() {
        return this._size;
      }
      get hasEmpty() {
        if (this._size < PIX._max) return true;
        else return false;
      }
      getAt(x, y) {
        [x, y] = PIX.normalCoords(x, y);
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
          throw "grid has no empty cells";
        }
      }
    },
    Canvas: class Canvas {
      constructor(width = PIX._width * PIX._cell, height = PIX._height * PIX._cell) {
        let canvas = document.createElement("canvas");
        [canvas.width, canvas.height] = [width, height];
        this._canvas = canvas;
        this._ctx = canvas.getContext("2d");
        this._ctx.imageSmoothingEnabled = false;
        this._resetBuffer();
      }
      _resetBuffer() {
        this._imageData = this._ctx.createImageData(this._canvas.width, this._canvas.height);
        this._data = this._imageData.data;
        this._dirty = true;
      }
      set width(width) {
        this._canvas.width = width;
        this._ctx.imageSmoothingEnabled = false;
        this._resetBuffer();
      }
      get width() {
        return this._canvas.width;
      }
      set height(height) {
        this._canvas.height = height;
        this._ctx.imageSmoothingEnabled = false;
        this._resetBuffer();
      }
      get height() {
        return this._canvas.height;
      }
      get ctx() {
        return this._ctx;
      }
      get data() {
        return this._data;
      }
      flush() {
        if (this._dirty) {
          this._ctx.putImageData(this._imageData, 0, 0);
          this._dirty = false;
        }
      }
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
            return "rgb(" + Math.round(color[0]) + ", " + Math.round(color[1]) + ", " + Math.round(color[2]) + ")";
          } else if (color.length === 4) {
            return "rgba(" + Math.round(color[0]) + ", " + Math.round(color[1]) + ", " + Math.round(color[2]) + ", " + color[3] + ")";
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
      rgba(color) {
        if (color instanceof Array) {
          if (color.length === 3) {
            return [Math.round(color[0]), Math.round(color[1]), Math.round(color[2]), 255];
          }
          if (color.length === 4) {
            return [Math.round(color[0]), Math.round(color[1]), Math.round(color[2]), Math.round(color[3] * 255)];
          }
        }
        if (typeof color === "string") {
          if (!PIX._colorParserCtx) {
            let parserCanvas = document.createElement("canvas");
            PIX._colorParserCtx = parserCanvas.getContext("2d");
          }
          PIX._colorParserCtx.fillStyle = color;
          let normalized = PIX._colorParserCtx.fillStyle;
          let hex = normalized.startsWith("#") ? normalized.slice(1) : null;
          if (hex && (hex.length === 3 || hex.length === 6)) {
            if (hex.length === 3) hex = hex.split("").map((ch) => ch + ch).join("");
            return [
              parseInt(hex.slice(0, 2), 16),
              parseInt(hex.slice(2, 4), 16),
              parseInt(hex.slice(4, 6), 16),
              255
            ];
          }
        }
        throw `PIX.color.rgba error: ${color}`;
      }
    },
    draw: {
      blendPixel(data, idx, r, g, b, a) {
        if (a === 255) {
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
          return;
        }
        if (a === 0) return;
        let alpha = a / 255;
        let inv = 1 - alpha;
        data[idx] = Math.round(r * alpha + data[idx] * inv);
        data[idx + 1] = Math.round(g * alpha + data[idx + 1] * inv);
        data[idx + 2] = Math.round(b * alpha + data[idx + 2] * inv);
        data[idx + 3] = Math.round(a + data[idx + 3] * inv);
      },
      fill(color = [240, 240, 240], canvas = PIX.mainCanvas) {
        PIX.draw.rect(0, 0, canvas.width, canvas.height, color, canvas);
      },
      pixel(x, y, color, canvas = PIX.mainCanvas) {
        [x, y] = PIX.normalCoords(x, y);
        PIX.draw.rect(x * PIX._cell, y * PIX._cell, PIX._cell, PIX._cell, color, canvas);
      },
      pixelFrame(x, y, color, border = 1, canvas = PIX.mainCanvas) {
        [x, y] = PIX.normalCoords(x, y);
        PIX.draw.rect(x * PIX._cell, y * PIX._cell, PIX._cell, PIX._cell, color, canvas);
        PIX.draw.clearRect(x * PIX._cell + border, y * PIX._cell + border, PIX._cell - border * 2, PIX._cell - border * 2, canvas);
      },
      rect(x, y, w, h, color = [200, 200, 200], canvas = PIX.mainCanvas) {
        let [r, g, b, a] = PIX.color.rgba(color);
        let x0 = Math.max(0, Math.floor(x));
        let y0 = Math.max(0, Math.floor(y));
        let x1 = Math.min(canvas.width, Math.ceil(x + w));
        let y1 = Math.min(canvas.height, Math.ceil(y + h));
        if (x1 <= x0 || y1 <= y0) return;
        let data = canvas.data;
        let stride = canvas.width * 4;
        for (let py = y0; py < y1; py++) {
          let row = py * stride;
          for (let px = x0; px < x1; px++) {
            let idx = row + px * 4;
            PIX.draw.blendPixel(data, idx, r, g, b, a);
          }
        }
        canvas._dirty = true;
      },
      canvas: function(x, y, input, canvas = PIX.mainCanvas) {
        let x0 = Math.floor(x);
        let y0 = Math.floor(y);
        let startX = Math.max(0, x0);
        let startY = Math.max(0, y0);
        let endX = Math.min(canvas.width, x0 + input.width);
        let endY = Math.min(canvas.height, y0 + input.height);
        if (endX <= startX || endY <= startY) return;
        let srcData = input.data;
        let dstData = canvas.data;
        let srcWidth = input.width;
        let dstWidth = canvas.width;
        for (let py = startY; py < endY; py++) {
          let srcY = py - y0;
          for (let px = startX; px < endX; px++) {
            let srcX = px - x0;
            let sIdx = (srcY * srcWidth + srcX) * 4;
            let sa = srcData[sIdx + 3];
            if (sa === 0) continue;
            let dIdx = (py * dstWidth + px) * 4;
            PIX.draw.blendPixel(dstData, dIdx, srcData[sIdx], srcData[sIdx + 1], srcData[sIdx + 2], sa);
          }
        }
        canvas._dirty = true;
      },
      clear(canvas = PIX.mainCanvas) {
        PIX.draw.clearRect(0, 0, canvas.width, canvas.height, canvas);
      },
      clearRect(x, y, w, h, canvas = PIX.mainCanvas) {
        let x0 = Math.max(0, Math.floor(x));
        let y0 = Math.max(0, Math.floor(y));
        let x1 = Math.min(canvas.width, Math.ceil(x + w));
        let y1 = Math.min(canvas.height, Math.ceil(y + h));
        if (x1 <= x0 || y1 <= y0) return;
        let data = canvas.data;
        let stride = canvas.width * 4;
        for (let py = y0; py < y1; py++) {
          let row = py * stride;
          for (let px = x0; px < x1; px++) {
            let idx = row + px * 4;
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 0;
          }
        }
        canvas._dirty = true;
      },
      clearPixel(x, y, canvas = PIX.mainCanvas) {
        [x, y] = PIX.normalCoords(x, y);
        PIX.draw.clearRect(x * PIX._cell, y * PIX._cell, PIX._cell, PIX._cell, canvas);
      },
      label(x, y, text, canvas = PIX.mainCanvas) {
        canvas.flush();
        canvas.ctx.font = "12px courier";
        canvas.ctx.textBaseline = "hanging";
        canvas.ctx.textAlign = "left";
        canvas.ctx.fillStyle = "white";
        canvas.ctx.fillText(text, x, y);
        canvas._dirty = false;
      },
      text(x, y, txt, canvas = PIX.mainCanvas) {
        canvas.flush();
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
        canvas._dirty = false;
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
      }
    },
    normalCoords(x, y) {
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0) x = x % PIX._width;
      else x = PIX._width - -x % PIX._width;
      if (y >= 0) y = y % PIX._height;
      else y = PIX._height - -y % PIX._height;
      return [x, y];
    },
    moore: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1]
    ]
  };
}();
export {
  PIX as P
};

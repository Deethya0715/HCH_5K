"use strict";

// Inlined into each generated tribute sign. Draws a QR symbol in the browser
// with no network access. Byte mode, error correction M, versions 1–15.

var QR_EXP = new Uint8Array(512);
var QR_LOG = new Uint8Array(256);

(function initQrField() {
  var x = 1;
  for (var i = 0; i < 255; i += 1) {
    QR_EXP[i] = x;
    QR_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (var j = 255; j < 512; j += 1) QR_EXP[j] = QR_EXP[j - 255];
})();

// ISO/IEC 18004 Table 9, level M: [ecc per block, group1 blocks, group1 data, group2 blocks, group2 data]
var QR_EC_M = [
  null,
  [10, 1, 16, 0, 0],
  [16, 1, 28, 0, 0],
  [26, 1, 44, 0, 0],
  [18, 2, 32, 0, 0],
  [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0],
  [18, 4, 31, 0, 0],
  [22, 2, 38, 2, 39],
  [22, 3, 36, 2, 37],
  [26, 4, 43, 1, 44],
  [30, 1, 50, 4, 51],
  [22, 6, 36, 2, 37],
  [22, 8, 37, 1, 38],
  [24, 4, 40, 5, 41],
  [24, 5, 41, 5, 42],
];

var QR_ALIGN = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
];

var QR_REMAINDER = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 3, 3];

function qrMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return QR_EXP[QR_LOG[a] + QR_LOG[b]];
}

function qrGenerator(degree) {
  var poly = new Uint8Array([1]);
  for (var i = 0; i < degree; i += 1) {
    var next = new Uint8Array(poly.length + 1);
    for (var j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= qrMul(poly[j], QR_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function qrRemainder(data, degree) {
  var gen = qrGenerator(degree);
  var res = new Uint8Array(data.length + degree);
  res.set(data);
  for (var i = 0; i < data.length; i += 1) {
    var coef = res[i];
    if (coef === 0) continue;
    for (var j = 1; j < gen.length; j += 1) {
      res[i + j] ^= qrMul(gen[j], coef);
    }
  }
  return res.slice(data.length);
}

function qrPut(bits, value, length) {
  for (var i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
}

function qrDataCapacity(version) {
  var row = QR_EC_M[version];
  return row[1] * row[2] + row[3] * row[4];
}

function qrChooseVersion(byteLength) {
  for (var version = 1; version < QR_EC_M.length; version += 1) {
    var countBits = version <= 9 ? 8 : 16;
    var needed = 4 + countBits + byteLength * 8;
    if (needed <= qrDataCapacity(version) * 8) return version;
  }
  return 0;
}

function qrCodewords(bytes, version) {
  var bits = [];
  var countBits = version <= 9 ? 8 : 16;
  var capacity = qrDataCapacity(version) * 8;
  qrPut(bits, 0x4, 4);
  qrPut(bits, bytes.length, countBits);
  for (var i = 0; i < bytes.length; i += 1) qrPut(bits, bytes[i], 8);
  var terminator = Math.min(4, capacity - bits.length);
  qrPut(bits, 0, terminator);
  while (bits.length % 8 !== 0) bits.push(0);
  var pads = [0xec, 0x11];
  var padIndex = 0;
  while (bits.length < capacity) {
    qrPut(bits, pads[padIndex], 8);
    padIndex ^= 1;
  }
  var words = [];
  for (var b = 0; b < bits.length; b += 8) {
    var value = 0;
    for (var k = 0; k < 8; k += 1) value = (value << 1) | bits[b + k];
    words.push(value);
  }
  return words;
}

function qrInterleave(words, version) {
  var row = QR_EC_M[version];
  var ecc = row[0];
  var blocks = [];
  var offset = 0;
  function take(count, size) {
    for (var i = 0; i < count; i += 1) {
      var data = Uint8Array.from(words.slice(offset, offset + size));
      offset += size;
      blocks.push({ data: data, ecc: qrRemainder(data, ecc) });
    }
  }
  take(row[1], row[2]);
  take(row[3], row[4]);
  var out = [];
  var maxData = Math.max(row[2], row[4]);
  for (var i = 0; i < maxData; i += 1) {
    for (var b = 0; b < blocks.length; b += 1) {
      if (i < blocks[b].data.length) out.push(blocks[b].data[i]);
    }
  }
  for (var e = 0; e < ecc; e += 1) {
    for (var n = 0; n < blocks.length; n += 1) out.push(blocks[n].ecc[e]);
  }
  return out;
}

function qrBlank(size) {
  var matrix = [];
  var reserved = [];
  for (var r = 0; r < size; r += 1) {
    matrix.push(new Uint8Array(size));
    reserved.push(new Uint8Array(size));
  }
  return { matrix: matrix, reserved: reserved };
}

function qrFinder(matrix, reserved, top, left) {
  for (var r = 0; r < 7; r += 1) {
    for (var c = 0; c < 7; c += 1) {
      var edge = r === 0 || r === 6 || c === 0 || c === 6;
      var core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[top + r][left + c] = edge || core ? 1 : 0;
      reserved[top + r][left + c] = 1;
    }
  }
  var size = matrix.length;
  for (var i = -1; i <= 7; i += 1) {
    var cells = [
      [top + i, left - 1],
      [top + i, left + 7],
      [top - 1, left + i],
      [top + 7, left + i],
    ];
    for (var n = 0; n < cells.length; n += 1) {
      var row = cells[n][0];
      var col = cells[n][1];
      if (row < 0 || col < 0 || row >= size || col >= size) continue;
      if (reserved[row][col]) continue;
      matrix[row][col] = 0;
      reserved[row][col] = 1;
    }
  }
}

function qrAlignment(matrix, reserved, centerRow, centerCol) {
  for (var r = -2; r <= 2; r += 1) {
    for (var c = -2; c <= 2; c += 1) {
      var dist = Math.max(Math.abs(r), Math.abs(c));
      var row = centerRow + r;
      var col = centerCol + c;
      matrix[row][col] = dist === 0 || dist === 2 ? 1 : 0;
      reserved[row][col] = 1;
    }
  }
}

function qrReserveFormat(reserved) {
  var size = reserved.length;
  var cells = [];
  for (var i = 0; i <= 5; i += 1) cells.push([i, 8]);
  cells.push([7, 8], [8, 8], [8, 7]);
  for (var h = 9; h < 15; h += 1) cells.push([8, 14 - h]);
  for (var v = 0; v < 8; v += 1) cells.push([8, size - 1 - v]);
  for (var s = 8; s < 15; s += 1) cells.push([size - 15 + s, 8]);
  for (var n = 0; n < cells.length; n += 1) reserved[cells[n][0]][cells[n][1]] = 1;
}

function qrDrawFormat(matrix, mask) {
  var size = matrix.length;
  var data = mask;
  var rem = data << 10;
  for (var i = 14; i >= 10; i -= 1) {
    if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
  }
  var bits = ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
  function bit(index) {
    return (bits >>> index) & 1;
  }
  for (var a = 0; a <= 5; a += 1) matrix[a][8] = bit(a);
  matrix[7][8] = bit(6);
  matrix[8][8] = bit(7);
  matrix[8][7] = bit(8);
  for (var b = 9; b < 15; b += 1) matrix[8][14 - b] = bit(b);
  for (var c = 0; c < 8; c += 1) matrix[8][size - 1 - c] = bit(c);
  for (var d = 8; d < 15; d += 1) matrix[size - 15 + d][8] = bit(d);
}

function qrDrawVersion(matrix, reserved, version) {
  if (version < 7) return;
  var size = matrix.length;
  var rem = version << 12;
  for (var i = 17; i >= 12; i -= 1) {
    if ((rem >>> i) & 1) rem ^= 0x1f25 << (i - 12);
  }
  var bits = (version << 12) | (rem & 0xfff);
  for (var n = 0; n < 18; n += 1) {
    var dark = (bits >>> n) & 1;
    var a = size - 11 + (n % 3);
    var b = Math.floor(n / 3);
    matrix[b][a] = dark;
    matrix[a][b] = dark;
    reserved[b][a] = 1;
    reserved[a][b] = 1;
  }
}

function qrPlaceData(matrix, reserved, bytes, version) {
  var bits = [];
  for (var i = 0; i < bytes.length; i += 1) {
    for (var shift = 7; shift >= 0; shift -= 1) bits.push((bytes[i] >>> shift) & 1);
  }
  for (var r = 0; r < QR_REMAINDER[version]; r += 1) bits.push(0);
  var size = matrix.length;
  var index = 0;
  for (var right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    var upward = ((right + 1) & 2) === 0;
    for (var vert = 0; vert < size; vert += 1) {
      var row = upward ? size - 1 - vert : vert;
      for (var j = 0; j < 2; j += 1) {
        var col = right - j;
        if (reserved[row][col]) continue;
        matrix[row][col] = index < bits.length ? bits[index] : 0;
        index += 1;
      }
    }
  }
  if (index !== bits.length) throw new Error("QR layout mismatch");
}

function qrMaskBit(mask, row, col) {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function qrPenalty(matrix) {
  var size = matrix.length;
  var score = 0;
  function runs(line) {
    var total = 0;
    var run = 1;
    for (var i = 1; i < line.length; i += 1) {
      if (line[i] === line[i - 1]) run += 1;
      else {
        if (run >= 5) total += run - 2;
        run = 1;
      }
    }
    if (run >= 5) total += run - 2;
    return total;
  }
  function finderLike(line) {
    var total = 0;
    for (var i = 0; i <= line.length - 11; i += 1) {
      var slice = "";
      for (var k = 0; k < 11; k += 1) slice += line[i + k] ? "1" : "0";
      if (slice === "10111010000" || slice === "00001011101") total += 40;
    }
    return total;
  }
  for (var r = 0; r < size; r += 1) {
    score += runs(matrix[r]);
    score += finderLike(matrix[r]);
  }
  for (var c = 0; c < size; c += 1) {
    var col = [];
    for (var y = 0; y < size; y += 1) col.push(matrix[y][c]);
    score += runs(col);
    score += finderLike(col);
  }
  for (var row = 0; row < size - 1; row += 1) {
    for (var colIndex = 0; colIndex < size - 1; colIndex += 1) {
      var value = matrix[row][colIndex];
      if (
        value === matrix[row][colIndex + 1] &&
        value === matrix[row + 1][colIndex] &&
        value === matrix[row + 1][colIndex + 1]
      ) {
        score += 3;
      }
    }
  }
  var dark = 0;
  for (var rr = 0; rr < size; rr += 1) {
    for (var cc = 0; cc < size; cc += 1) if (matrix[rr][cc]) dark += 1;
  }
  var percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

function tributeQrModules(text) {
  var value = String(text || "").trim();
  if (!value) return null;
  var bytes = Array.from(new TextEncoder().encode(value));
  var version = qrChooseVersion(bytes.length);
  if (!version) return null;
  var size = 17 + version * 4;
  var grid = qrBlank(size);
  var matrix = grid.matrix;
  var reserved = grid.reserved;
  qrFinder(matrix, reserved, 0, 0);
  qrFinder(matrix, reserved, 0, size - 7);
  qrFinder(matrix, reserved, size - 7, 0);
  for (var i = 0; i < size; i += 1) {
    if (!reserved[6][i]) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      reserved[6][i] = 1;
    }
    if (!reserved[i][6]) {
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
      reserved[i][6] = 1;
    }
  }
  var align = QR_ALIGN[version];
  if (align.length) {
    var last = align[align.length - 1];
    for (var ar = 0; ar < align.length; ar += 1) {
      for (var ac = 0; ac < align.length; ac += 1) {
        var centerRow = align[ar];
        var centerCol = align[ac];
        var overlapsFinder =
          (centerRow === 6 && centerCol === 6) ||
          (centerRow === 6 && centerCol === last) ||
          (centerRow === last && centerCol === 6);
        if (overlapsFinder) continue;
        qrAlignment(matrix, reserved, centerRow, centerCol);
      }
    }
  }
  qrReserveFormat(reserved);
  qrDrawVersion(matrix, reserved, version);
  matrix[size - 8][8] = 1;
  reserved[size - 8][8] = 1;
  var codewords = qrInterleave(qrCodewords(bytes, version), version);
  qrPlaceData(matrix, reserved, codewords, version);

  var best = null;
  var bestScore = Infinity;
  for (var mask = 0; mask < 8; mask += 1) {
    var masked = matrix.map(function (row) {
      return row.slice();
    });
    for (var row = 0; row < size; row += 1) {
      for (var col = 0; col < size; col += 1) {
        if (reserved[row][col]) continue;
        if (qrMaskBit(mask, row, col)) masked[row][col] ^= 1;
      }
    }
    qrDrawFormat(masked, mask);
    var score = qrPenalty(masked);
    if (score < bestScore) {
      bestScore = score;
      best = masked;
    }
  }
  return best;
}

function renderTributeQr(text) {
  var modules = tributeQrModules(text);
  if (!modules) {
    if (!String(text || "").trim()) return "";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 28" role="img"><text x="2" y="18" fill="#0B2545" font-family="Arial,sans-serif" font-size="10">QR link is too long to encode.</text></svg>';
  }
  var quiet = 4;
  var n = modules.length;
  var span = n + quiet * 2;
  var rects = "";
  for (var r = 0; r < n; r += 1) {
    var start = -1;
    for (var c = 0; c <= n; c += 1) {
      var dark = c < n && modules[r][c];
      if (dark && start < 0) start = c;
      if (!dark && start >= 0) {
        rects +=
          '<rect x="' +
          (start + quiet) +
          '" y="' +
          (r + quiet) +
          '" width="' +
          (c - start) +
          '" height="1"/>';
        start = -1;
      }
    }
  }
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    span +
    " " +
    span +
    '" shape-rendering="crispEdges" role="img" aria-label="Scannable QR code">' +
    '<rect width="100%" height="100%" fill="#ffffff"/>' +
    '<g fill="#000000">' +
    rects +
    "</g></svg>"
  );
}

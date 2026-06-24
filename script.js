const SIZE = 4;
const TILE_COLORS = {
  2: { bg: "#eee4da", fg: "#776e65" },
  4: { bg: "#ede0c8", fg: "#776e65" },
  8: { bg: "#f2b179", fg: "#f9f6f2" },
  16: { bg: "#f59563", fg: "#f9f6f2" },
  32: { bg: "#f67c5f", fg: "#f9f6f2" },
  64: { bg: "#f65e3b", fg: "#f9f6f2" },
  128: { bg: "#edcf72", fg: "#f9f6f2" },
  256: { bg: "#edcc61", fg: "#f9f6f2" },
  512: { bg: "#edc850", fg: "#f9f6f2" },
  1024: { bg: "#edc53f", fg: "#f9f6f2" },
  2048: { bg: "#edc22e", fg: "#f9f6f2" },
};

const gridContainer = document.getElementById("grid-container");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");

let board, score, bestScore, cellSize, gap;

function init() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  score = 0;
  bestScore = Number(localStorage.getItem("best2048") || 0);
  overlay.classList.remove("show");
  updateScores();
  buildBackgroundCells();
  addRandomTile();
  addRandomTile();
  render();
}

function buildBackgroundCells() {
  gridContainer.innerHTML = "";
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    gridContainer.appendChild(cell);
  }
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (board[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function updateScores() {
  scoreEl.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("best2048", bestScore);
  }
  bestScoreEl.textContent = bestScore;
}

function measure() {
  const containerRect = gridContainer.getBoundingClientRect();
  const padding = 8;
  const gapPx = 8;
  cellSize = (containerRect.width - padding * 2 - gapPx * (SIZE - 1)) / SIZE;
  gap = gapPx;
}

function render() {
  measure();
  gridContainer.querySelectorAll(".tile").forEach((t) => t.remove());
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = board[r][c];
      if (value === 0) continue;
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.textContent = value;
      const colors = TILE_COLORS[value] || { bg: "#3c3a32", fg: "#f9f6f2" };
      tile.style.background = colors.bg;
      tile.style.color = colors.fg;
      tile.style.width = cellSize + "px";
      tile.style.height = cellSize + "px";
      tile.style.fontSize = value > 512 ? cellSize * 0.32 + "px" : cellSize * 0.4 + "px";
      tile.style.top = 8 + r * (cellSize + gap) + "px";
      tile.style.left = 8 + c * (cellSize + gap) + "px";
      gridContainer.appendChild(tile);
    }
  }
}

function slideRowLeft(row) {
  const filtered = row.filter((v) => v !== 0);
  let gained = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      gained += filtered[i];
      filtered.splice(i + 1, 1);
    }
  }
  while (filtered.length < SIZE) filtered.push(0);
  return { row: filtered, gained };
}

function rotateBoard(b) {
  const newBoard = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) newBoard[c][SIZE - 1 - r] = b[r][c];
  return newBoard;
}

function move(direction) {
  let rotations = 0;
  if (direction === "up") rotations = 3;
  if (direction === "right") rotations = 2;
  if (direction === "down") rotations = 1;

  let working = board;
  for (let i = 0; i < rotations; i++) working = rotateBoard(working);

  let moved = false;
  let gainedTotal = 0;
  const result = working.map((row) => {
    const before = row.join(",");
    const { row: newRow, gained } = slideRowLeft(row);
    gainedTotal += gained;
    if (newRow.join(",") !== before) moved = true;
    return newRow;
  });

  let restored = result;
  for (let i = 0; i < (4 - rotations) % 4; i++) restored = rotateBoard(restored);

  if (moved) {
    board = restored;
    score += gainedTotal;
    updateScores();
    addRandomTile();
    render();
    checkGameState();
  }
}

function canMove() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return true;
      if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

function checkGameState() {
  const hasWon = board.some((row) => row.some((v) => v === 2048));
  if (hasWon) {
    overlayTitle.textContent = "¡Ganaste! 🎉";
    overlay.classList.add("show");
    return;
  }
  if (!canMove()) {
    overlayTitle.textContent = "Juego terminado";
    overlay.classList.add("show");
  }
}

document.addEventListener("keydown", (e) => {
  const map = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };
  if (map[e.key]) {
    e.preventDefault();
    move(map[e.key]);
  }
});

let touchStartX = 0;
let touchStartY = 0;

gridContainer.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
});

gridContainer.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].screenX - touchStartX;
  const dy = e.changedTouches[0].screenY - touchStartY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? "right" : "left");
  } else {
    move(dy > 0 ? "down" : "up");
  }
});

document.getElementById("new-game").addEventListener("click", init);
document.getElementById("try-again").addEventListener("click", init);
window.addEventListener("resize", render);

init();

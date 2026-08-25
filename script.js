const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d');

const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');

// Game Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#06b6d4', // I - Cyan
    '#3b82f6', // J - Blue
    '#f97316', // L - Orange
    '#eab308', // O - Yellow
    '#22c55e', // S - Green
    '#a855f7', // T - Purple
    '#ef4444'  // Z - Red
];

// Tetromino Shapes
const SHAPES = [
    [],
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // I
    [[2,0,0], [2,2,2], [0,0,0]], // J
    [[0,0,3], [3,3,3], [0,0,0]], // L
    [[4,4], [4,4]], // O
    [[0,5,5], [5,5,0], [0,0,0]], // S
    [[0,6,0], [6,6,6], [0,0,0]], // T
    [[7,7,0], [0,7,7], [0,0,0]]  // Z
];

// Game State
let board = [];
let score = 0;
let level = 1;
let lines = 0;
let isPaused = false;
let isGameOver = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let reqAnimationId = null;

let piece = {
    matrix: [],
    x: 0,
    y: 0
};

let nextPieceMatrix = [];

// Initialize Board
function initBoard() {
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
}

// Draw a single block
function drawBlock(ctx, x, y, colorId) {
    if (colorId === 0) return;
    
    ctx.fillStyle = COLORS[colorId];
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    // Add shine/border effect for modern look
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, 2); // top highlight
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, 2, BLOCK_SIZE); // left highlight
    
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE + BLOCK_SIZE - 2, BLOCK_SIZE, 2); // bottom shadow
    ctx.fillRect(x * BLOCK_SIZE + BLOCK_SIZE - 2, y * BLOCK_SIZE, 2, BLOCK_SIZE); // right shadow
    
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// Draw the board
function drawBoard() {
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(ctx, x, y, value);
            }
        });
    });
}

// Draw the current piece
function drawPiece() {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(ctx, piece.x + x, piece.y + y, value);
            }
        });
    });
}

// Draw the next piece preview
function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    // Calculate offset to center the piece in the preview box
    const offsetX = (4 - nextPieceMatrix[0].length) / 2;
    const offsetY = (4 - nextPieceMatrix.length) / 2;

    nextPieceMatrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(nextCtx, x + offsetX, y + offsetY, value);
            }
        });
    });
}

// Create a new random piece matrix
function createPiece() {
    const typeId = Math.floor(Math.random() * 7) + 1;
    return SHAPES[typeId];
}

// Reset piece to top
function resetPiece() {
    if (nextPieceMatrix.length === 0) {
        nextPieceMatrix = createPiece();
    }
    
    piece.matrix = nextPieceMatrix;
    piece.y = 0;
    piece.x = Math.floor(COLS / 2) - Math.floor(piece.matrix[0].length / 2);
    
    nextPieceMatrix = createPiece();
    drawNextPiece();
    
    // Game Over check
    if (collide(board, piece)) {
        gameOver();
    }
}

// Main Draw function
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawPiece();
}

// Collision detection
function collide(board, piece) {
    const m = piece.matrix;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (board[y + piece.y] && board[y + piece.y][x + piece.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// Merge piece into board
function merge(board, piece) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.y][x + piece.x] = value;
            }
        });
    });
}

// Rotate matrix
function rotate(matrix) {
    // Transpose then reverse each row
    const N = matrix.length;
    let res = [];
    for(let i=0; i<N; i++) {
        res.push(new Array(N).fill(0));
    }
    for (let y = 0; y < N; ++y) {
        for (let x = 0; x < N; ++x) {
            res[x][N - 1 - y] = matrix[y][x];
        }
    }
    return res;
}

// Player Rotate
function playerRotate() {
    const pos = piece.x;
    let offset = 1;
    const matrix = rotate(piece.matrix);
    
    const prevMatrix = piece.matrix;
    piece.matrix = matrix;
    
    // Wall kick
    while (collide(board, piece)) {
        piece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > matrix[0].length) {
            piece.matrix = prevMatrix;
            piece.x = pos;
            return;
        }
    }
}

// Move piece down
function playerDrop() {
    piece.y++;
    if (collide(board, piece)) {
        piece.y--;
        merge(board, piece);
        resetPiece();
        clearLines();
    }
    dropCounter = 0;
}

// Move piece left/right
function playerMove(dir) {
    piece.x += dir;
    if (collide(board, piece)) {
        piece.x -= dir;
    }
}

// Hard drop
function hardDrop() {
    while (!collide(board, piece)) {
        piece.y++;
    }
    piece.y--;
    merge(board, piece);
    resetPiece();
    clearLines();
    dropCounter = 0;
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;
    
    outer: for (let y = ROWS - 1; y >= 0; --y) {
        for (let x = 0; x < COLS; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        
        // Remove line and add empty line at top
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;
        
        linesCleared++;
    }
    
    if (linesCleared > 0) {
        // Scoring system: 1 line = 100, 2 = 300, 3 = 500, 4 = 800
        const lineScores = [0, 100, 300, 500, 800];
        score += lineScores[linesCleared] * level;
        lines += linesCleared;
        
        // Level up every 10 lines
        level = Math.floor(lines / 10) + 1;
        
        // Increase speed
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        updateScore();
    }
}

// Update score UI
function updateScore() {
    scoreElement.innerText = score;
    levelElement.innerText = level;
}

// Game Over logic
function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(reqAnimationId);
    overlayTitle.innerText = "GAME OVER";
    overlayTitle.classList.add('game-over');
    overlayText.innerText = `Final Score: ${score}`;
    overlayBtn.innerText = "Play Again";
    overlay.classList.remove('hidden');
}

// Toggle Pause
function togglePause() {
    if (isGameOver) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        cancelAnimationFrame(reqAnimationId);
        pauseBtn.innerText = "Resume";
        overlayTitle.innerText = "PAUSED";
        overlayTitle.classList.remove('game-over');
        overlayText.innerText = "Press Resume to continue";
        overlayBtn.innerText = "Resume";
        overlay.classList.remove('hidden');
    } else {
        pauseBtn.innerText = "Pause";
        overlay.classList.add('hidden');
        lastTime = performance.now();
        update();
    }
}

// Start / Restart game
function startGame() {
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    isGameOver = false;
    isPaused = false;
    
    updateScore();
    pauseBtn.innerText = "Pause";
    overlay.classList.add('hidden');
    
    nextPieceMatrix = [];
    resetPiece();
    
    if (reqAnimationId) {
        cancelAnimationFrame(reqAnimationId);
    }
    
    lastTime = performance.now();
    update();
}

// Main update loop
function update(time = 0) {
    if (isPaused || isGameOver) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    draw();
    reqAnimationId = requestAnimationFrame(update);
}

// Keyboard controls
document.addEventListener('keydown', event => {
    if (isPaused || isGameOver) {
        // Allow restarting with Space if game over
        if (isGameOver && event.code === 'Space') {
            startGame();
        }
        return;
    }
    
    switch (event.code) {
        case 'ArrowLeft':
            playerMove(-1);
            event.preventDefault();
            break;
        case 'ArrowRight':
            playerMove(1);
            event.preventDefault();
            break;
        case 'ArrowDown':
            playerDrop();
            event.preventDefault();
            break;
        case 'ArrowUp':
            playerRotate();
            event.preventDefault();
            break;
        case 'Space':
            hardDrop();
            event.preventDefault();
            break;
        case 'KeyP': // hidden feature: press P to pause
            togglePause();
            break;
    }
});

// Button events
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', startGame);
overlayBtn.addEventListener('click', () => {
    if (isGameOver) {
        startGame();
    } else {
        togglePause();
    }
});

// Start the game initially
startGame();

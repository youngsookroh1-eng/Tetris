const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 25;

const SHAPES = [
    [],
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ], // I
    [
        [2, 0, 0],
        [2, 2, 2],
        [0, 0, 0]
    ], // J
    [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0]
    ], // L
    [
        [4, 4],
        [4, 4]
    ], // O
    [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0]
    ], // S
    [
        [0, 6, 0],
        [6, 6, 6],
        [0, 0, 0]
    ], // T
    [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
    ]  // Z
];

const COLORS = [
    null,
    '#00ffff', // I - Cyan
    '#0000ff', // J - Blue
    '#ffa500', // L - Orange
    '#ffff00', // O - Yellow
    '#00ff00', // S - Green
    '#800080', // T - Purple
    '#ff0000', // Z - Red
    '#555555'  // 8 - Garbage Block (Gray)
];

class Tetris {
    constructor(canvasId, nextCanvasId, scoreId, gameOverId, opponent = null) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.nextCanvas = document.getElementById(nextCanvasId);
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.scoreElement = document.getElementById(scoreId);
        this.gameOverElement = document.getElementById(gameOverId);
        
        this.opponent = opponent;
        this.board = this.getEmptyBoard();
        this.piece = null;
        this.nextPiece = this.randomPiece();
        this.score = 0;
        this.gameOver = false;
        
        this.spawnPiece();
    }

    setOpponent(opponent) {
        this.opponent = opponent;
    }

    getEmptyBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    randomPiece() {
        const typeId = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
        const shape = SHAPES[typeId];
        return {
            x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
            y: 0,
            shape: shape,
            typeId: typeId
        };
    }

    spawnPiece() {
        this.piece = this.nextPiece;
        this.nextPiece = this.randomPiece();
        this.drawNextPiece();

        if (this.collision(this.piece.x, this.piece.y, this.piece.shape)) {
            this.gameOver = true;
            this.gameOverElement.classList.add('visible');
            return false;
        }
        return true;
    }

    draw() {
        this.ctx.fillStyle = '#05050a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw board
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.board[r][c] > 0) {
                    this.drawBlock(this.ctx, c, r, this.board[r][c], BLOCK_SIZE);
                }
            }
        }

        // Draw active piece
        if (this.piece) {
            for (let r = 0; r < this.piece.shape.length; r++) {
                for (let c = 0; c < this.piece.shape[r].length; c++) {
                    if (this.piece.shape[r][c] > 0) {
                        this.drawBlock(this.ctx, this.piece.x + c, this.piece.y + r, this.piece.shape[r][c], BLOCK_SIZE);
                    }
                }
            }
        }
    }

    drawNextPiece() {
        this.nextCtx.fillStyle = '#0a0a14';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        const shape = this.nextPiece.shape;
        const offsetX = (this.nextCanvas.width - shape[0].length * NEXT_BLOCK_SIZE) / 2;
        const offsetY = (this.nextCanvas.height - shape.length * NEXT_BLOCK_SIZE) / 2;

        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] > 0) {
                    this.drawBlock(this.nextCtx, c, r, shape[r][c], NEXT_BLOCK_SIZE, offsetX, offsetY);
                }
            }
        }
    }

    drawBlock(ctx, x, y, typeId, size, offsetX = 0, offsetY = 0) {
        ctx.fillStyle = COLORS[typeId];
        ctx.fillRect(offsetX + x * size, offsetY + y * size, size, size);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.strokeRect(offsetX + x * size, offsetY + y * size, size, size);
        // Highlight for 3D effect
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(offsetX + x * size, offsetY + y * size);
        ctx.lineTo(offsetX + x * size + size, offsetY + y * size);
        ctx.lineTo(offsetX + x * size + size - 4, offsetY + y * size + 4);
        ctx.lineTo(offsetX + x * size + 4, offsetY + y * size + 4);
        ctx.fill();
    }

    collision(x, y, shape) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 0) continue;
                let newX = x + c;
                let newY = y + r;
                if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                if (newY >= 0 && this.board[newY][newX] > 0) return true;
            }
        }
        return false;
    }

    rotate() {
        const shape = this.piece.shape;
        const newShape = shape[0].map((_, i) => shape.map(row => row[i])).reverse();
        if (!this.collision(this.piece.x, this.piece.y, newShape)) {
            this.piece.shape = newShape;
        }
    }

    moveDown() {
        if (!this.collision(this.piece.x, this.piece.y + 1, this.piece.shape)) {
            this.piece.y++;
        } else {
            this.merge();
        }
    }

    hardDrop() {
        while (!this.collision(this.piece.x, this.piece.y + 1, this.piece.shape)) {
            this.piece.y++;
        }
        this.merge();
    }

    moveLeft() {
        if (!this.collision(this.piece.x - 1, this.piece.y, this.piece.shape)) {
            this.piece.x--;
        }
    }

    moveRight() {
        if (!this.collision(this.piece.x + 1, this.piece.y, this.piece.shape)) {
            this.piece.x++;
        }
    }

    merge() {
        for (let r = 0; r < this.piece.shape.length; r++) {
            for (let c = 0; c < this.piece.shape[r].length; c++) {
                if (this.piece.shape[r][c] > 0) {
                    if (this.piece.y + r >= 0) {
                        this.board[this.piece.y + r][this.piece.x + c] = this.piece.shape[r][c];
                    }
                }
            }
        }
        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== 0)) {
                this.board.splice(r, 1);
                this.board.unshift(Array(COLS).fill(0));
                linesCleared++;
                r++; // Check the same row index again as the rows shifted down
            }
        }

        if (linesCleared > 0) {
            this.score += linesCleared * 100;
            this.scoreElement.innerText = this.score;
            
            if (linesCleared >= 2 && this.opponent) {
                this.opponent.receiveGarbage(linesCleared);
            }
        }
    }

    receiveGarbage(lines) {
        for (let i = 0; i < lines; i++) {
            this.board.shift(); // Remove top line
            const holeCol = Math.floor(Math.random() * COLS);
            const garbageLine = Array(COLS).fill(8); // 8 is garbage block color index
            garbageLine[holeCol] = 0; // Empty hole
            this.board.push(garbageLine);
        }
        // Adjust current piece position if pushed up
        if (this.collision(this.piece.x, this.piece.y, this.piece.shape)) {
            this.piece.y -= lines;
            if (this.piece.y < 0) {
                this.gameOver = true;
                this.gameOverElement.classList.add('visible');
            }
        }
    }
}

// Initialization
const p1 = new Tetris('p1-canvas', 'p1-next-canvas', 'p1-score', 'p1-game-over');
const p2 = new Tetris('p2-canvas', 'p2-next-canvas', 'p2-score', 'p2-game-over');
p1.setOpponent(p2);
p2.setOpponent(p1);

let isPaused = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let animationId = null;

const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');

function update(time = 0) {
    if (isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        if (!p1.gameOver) p1.moveDown();
        if (!p2.gameOver) p2.moveDown();
        dropCounter = 0;
    }

    p1.draw();
    p2.draw();

    if (!p1.gameOver || !p2.gameOver) {
        animationId = requestAnimationFrame(update);
    }
}

// Input Handling
document.addEventListener('keydown', event => {
    if (isPaused) return;

    // Player 1 (WASD, L-Shift)
    if (!p1.gameOver) {
        switch(event.code) {
            case 'KeyA': p1.moveLeft(); break;
            case 'KeyD': p1.moveRight(); break;
            case 'KeyS': p1.moveDown(); break;
            case 'KeyW': p1.rotate(); break;
            case 'ShiftLeft': p1.hardDrop(); break;
        }
    }

    // Player 2 (Arrows, Space)
    if (!p2.gameOver) {
        switch(event.code) {
            case 'ArrowLeft': p2.moveLeft(); break;
            case 'ArrowRight': p2.moveRight(); break;
            case 'ArrowDown': p2.moveDown(); break;
            case 'ArrowUp': p2.rotate(); break;
            case 'Space': 
                event.preventDefault(); // Prevent page scroll
                p2.hardDrop(); 
                break;
        }
    }
});

// Pause / Resume logic
pauseBtn.addEventListener('click', () => {
    if (!isPaused && (!p1.gameOver || !p2.gameOver)) {
        isPaused = true;
        cancelAnimationFrame(animationId);
        pauseBtn.disabled = true;
        resumeBtn.disabled = false;
    }
});

resumeBtn.addEventListener('click', () => {
    if (isPaused) {
        isPaused = false;
        pauseBtn.disabled = false;
        resumeBtn.disabled = true;
        lastTime = performance.now();
        update();
    }
});

// Start the game
update();

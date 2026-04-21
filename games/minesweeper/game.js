const LEVELS = {
    easy: { label: '初级矩阵', rows: 9, cols: 9, mines: 10 },
    medium: { label: '中级矩阵', rows: 16, cols: 16, mines: 40 },
    hard: { label: '高级矩阵', rows: 16, cols: 30, mines: 99 }
};

class QuantumMinesweeper {
    constructor() {
        this.boardEl = document.getElementById('board');
        this.mineCountEl = document.getElementById('mineCount');
        this.timerEl = document.getElementById('timer');
        this.modeLabelEl = document.getElementById('modeLabel');
        this.systemStatusEl = document.getElementById('systemStatus');
        this.boardTitleEl = document.getElementById('boardTitle');
        this.revealedCountEl = document.getElementById('revealedCount');
        this.flagCountEl = document.getElementById('flagCount');
        this.safeLeftEl = document.getElementById('safeLeft');
        this.logPanelEl = document.getElementById('logPanel');
        this.difficultyTabsEl = document.getElementById('difficultyTabs');
        this.resetBtn = document.getElementById('resetBtn');

        this.level = 'easy';
        this.timer = 0;
        this.timerId = null;
        this.firstClick = true;
        this.gameOver = false;
        this.board = [];

        this.bindEvents();
        this.startNewGame();
    }

    bindEvents() {
        this.difficultyTabsEl.addEventListener('click', (event) => {
            const button = event.target.closest('.tab');
            if (!button) {
                return;
            }

            this.level = button.dataset.level;
            this.updateActiveTab();
            this.startNewGame();
        });

        this.resetBtn.addEventListener('click', () => {
            this.startNewGame();
        });

        this.boardEl.addEventListener('click', (event) => {
            const cellEl = event.target.closest('.cell');
            if (!cellEl) {
                return;
            }
            this.handleLeftClick(Number(cellEl.dataset.row), Number(cellEl.dataset.col));
        });

        this.boardEl.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const cellEl = event.target.closest('.cell');
            if (!cellEl) {
                return;
            }
            this.toggleFlag(Number(cellEl.dataset.row), Number(cellEl.dataset.col));
        });

        this.boardEl.addEventListener('dblclick', (event) => {
            const cellEl = event.target.closest('.cell');
            if (!cellEl) {
                return;
            }
            this.handleChord(Number(cellEl.dataset.row), Number(cellEl.dataset.col));
        });
    }

    startNewGame() {
        const config = LEVELS[this.level];
        this.rows = config.rows;
        this.cols = config.cols;
        this.totalMines = config.mines;
        this.firstClick = true;
        this.gameOver = false;
        this.timer = 0;
        this.explodedCell = null;
        this.stopTimer();

        this.board = Array.from({ length: this.rows }, () =>
            Array.from({ length: this.cols }, () => ({
                mine: false,
                revealed: false,
                flagged: false,
                adjacent: 0
            }))
        );

        const cellSize = this.cols >= 30 ? 22 : this.cols >= 16 ? 32 : 42;
        const cellGap = this.cols >= 30 ? 4 : 6;
        this.boardEl.style.setProperty('--cell-size', `${cellSize}px`);
        this.boardEl.style.setProperty('--cell-gap', `${cellGap}px`);
        this.boardEl.style.gridTemplateColumns = `repeat(${this.cols}, ${cellSize}px)`;
        this.modeLabelEl.textContent = config.label;
        this.systemStatusEl.textContent = '待机';
        this.boardTitleEl.textContent = `${this.rows} × ${this.cols} / ${this.totalMines} 枚量子地雷`;
        this.timerEl.textContent = '0';
        this.pushLogs([
            `系统已重置 -> ${config.label}`,
            '等待首次扫描，地雷矩阵尚未生成。'
        ]);

        this.renderBoard();
        this.updateTelemetry();
    }

    placeMines(safeRow, safeCol) {
        let placed = 0;

        while (placed < this.totalMines) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            const isSafeZone = Math.abs(row - safeRow) <= 1 && Math.abs(col - safeCol) <= 1;

            if (isSafeZone || this.board[row][col].mine) {
                continue;
            }

            this.board[row][col].mine = true;
            placed += 1;
        }

        for (let row = 0; row < this.rows; row += 1) {
            for (let col = 0; col < this.cols; col += 1) {
                if (!this.board[row][col].mine) {
                    this.board[row][col].adjacent = this.countAdjacentMines(row, col);
                }
            }
        }
    }

    countAdjacentMines(row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr += 1) {
            for (let dc = -1; dc <= 1; dc += 1) {
                if (dr === 0 && dc === 0) {
                    continue;
                }
                const nr = row + dr;
                const nc = col + dc;
                if (this.inBounds(nr, nc) && this.board[nr][nc].mine) {
                    count += 1;
                }
            }
        }
        return count;
    }

    inBounds(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    handleLeftClick(row, col) {
        if (this.gameOver) {
            return;
        }

        const cell = this.board[row][col];
        if (cell.flagged || cell.revealed) {
            return;
        }

        if (this.firstClick) {
            this.firstClick = false;
            this.placeMines(row, col);
            this.startTimer();
            this.systemStatusEl.textContent = '扫描中';
            this.pushLogs([
                `首次安全扫描 -> (${row + 1}, ${col + 1})`,
                '量子地雷矩阵已加载。'
            ]);
        }

        if (cell.mine) {
            cell.revealed = true;
            this.revealAllMines(row, col);
            this.endGame(false);
            return;
        }

        this.revealCell(row, col);
        this.checkWin();
        this.renderBoard();
        this.updateTelemetry();
    }

    revealCell(row, col) {
        const queue = [[row, col]];

        while (queue.length > 0) {
            const [currentRow, currentCol] = queue.shift();
            const cell = this.board[currentRow][currentCol];

            if (cell.revealed || cell.flagged) {
                continue;
            }

            cell.revealed = true;

            if (cell.adjacent === 0) {
                for (let dr = -1; dr <= 1; dr += 1) {
                    for (let dc = -1; dc <= 1; dc += 1) {
                        if (dr === 0 && dc === 0) {
                            continue;
                        }
                        const nr = currentRow + dr;
                        const nc = currentCol + dc;
                        if (this.inBounds(nr, nc) && !this.board[nr][nc].revealed) {
                            queue.push([nr, nc]);
                        }
                    }
                }
            }
        }
    }

    toggleFlag(row, col) {
        if (this.gameOver) {
            return;
        }

        const cell = this.board[row][col];
        if (cell.revealed) {
            return;
        }

        cell.flagged = !cell.flagged;
        this.renderBoard();
        this.updateTelemetry();
    }

    handleChord(row, col) {
        if (this.gameOver) {
            return;
        }

        const cell = this.board[row][col];
        if (!cell.revealed || cell.adjacent === 0) {
            return;
        }

        let flaggedAround = 0;
        const hiddenNeighbors = [];

        for (let dr = -1; dr <= 1; dr += 1) {
            for (let dc = -1; dc <= 1; dc += 1) {
                if (dr === 0 && dc === 0) {
                    continue;
                }
                const nr = row + dr;
                const nc = col + dc;
                if (!this.inBounds(nr, nc)) {
                    continue;
                }
                const neighbor = this.board[nr][nc];
                if (neighbor.flagged) {
                    flaggedAround += 1;
                } else if (!neighbor.revealed) {
                    hiddenNeighbors.push([nr, nc]);
                }
            }
        }

        if (flaggedAround !== cell.adjacent) {
            return;
        }

        hiddenNeighbors.forEach(([nr, nc]) => this.handleLeftClick(nr, nc));
    }

    revealAllMines(explodedRow, explodedCol) {
        for (let row = 0; row < this.rows; row += 1) {
            for (let col = 0; col < this.cols; col += 1) {
                const cell = this.board[row][col];
                if (cell.mine) {
                    cell.revealed = true;
                }
            }
        }
        this.explodedCell = `${explodedRow}-${explodedCol}`;
        this.renderBoard();
        this.updateTelemetry();
    }

    checkWin() {
        let revealedSafe = 0;
        for (let row = 0; row < this.rows; row += 1) {
            for (let col = 0; col < this.cols; col += 1) {
                const cell = this.board[row][col];
                if (cell.revealed && !cell.mine) {
                    revealedSafe += 1;
                }
            }
        }

        if (revealedSafe === this.rows * this.cols - this.totalMines) {
            for (let row = 0; row < this.rows; row += 1) {
                for (let col = 0; col < this.cols; col += 1) {
                    if (this.board[row][col].mine) {
                        this.board[row][col].flagged = true;
                    }
                }
            }
            this.endGame(true);
        }
    }

    endGame(win) {
        this.gameOver = true;
        this.stopTimer();
        this.systemStatusEl.textContent = win ? '清除完成' : '系统告警';
        this.pushLogs(
            win
                ? ['全部安全格已清除。', `任务完成，用时 ${this.timer} 秒。`]
                : ['危险格点被触发。', '扫描终止，请重新部署。']
        );
        this.renderBoard();
        this.updateTelemetry();
    }

    startTimer() {
        this.stopTimer();
        this.timerId = setInterval(() => {
            this.timer += 1;
            this.timerEl.textContent = String(this.timer);
        }, 1000);
    }

    stopTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    updateActiveTab() {
        this.difficultyTabsEl.querySelectorAll('.tab').forEach((button) => {
            button.classList.toggle('active', button.dataset.level === this.level);
        });
    }

    updateTelemetry() {
        let flagged = 0;
        let revealed = 0;
        for (let row = 0; row < this.rows; row += 1) {
            for (let col = 0; col < this.cols; col += 1) {
                const cell = this.board[row][col];
                if (cell.flagged) {
                    flagged += 1;
                }
                if (cell.revealed && !cell.mine) {
                    revealed += 1;
                }
            }
        }

        this.mineCountEl.textContent = String(this.totalMines - flagged);
        this.revealedCountEl.textContent = String(revealed);
        this.flagCountEl.textContent = String(flagged);
        this.safeLeftEl.textContent = String(this.rows * this.cols - this.totalMines - revealed);
    }

    pushLogs(lines) {
        this.logPanelEl.innerHTML = lines
            .map((line) => `<div class="log-entry">${line}</div>`)
            .join('');
    }

    renderBoard() {
        this.boardEl.innerHTML = '';

        for (let row = 0; row < this.rows; row += 1) {
            for (let col = 0; col < this.cols; col += 1) {
                const cell = this.board[row][col];
                const cellEl = document.createElement('div');
                cellEl.className = 'cell';
                cellEl.dataset.row = String(row);
                cellEl.dataset.col = String(col);

                if (cell.revealed) {
                    cellEl.classList.add('revealed');
                    if (cell.mine) {
                        cellEl.classList.add('mine');
                        cellEl.textContent = '✹';
                        if (this.explodedCell === `${row}-${col}`) {
                            cellEl.classList.add('exploded');
                        }
                    } else if (cell.adjacent > 0) {
                        cellEl.textContent = String(cell.adjacent);
                        cellEl.classList.add(`n${cell.adjacent}`);
                    }
                } else if (cell.flagged) {
                    cellEl.classList.add('flagged');
                    cellEl.textContent = '⚑';
                }

                this.boardEl.appendChild(cellEl);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuantumMinesweeper();
});

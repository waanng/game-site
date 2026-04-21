const DIRECTIONS = {
    up: { row: -1, col: 0 },
    right: { row: 0, col: 1 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 }
};

const MIRROR_REFLECTION = {
    '/': {
        up: 'right',
        right: 'up',
        down: 'left',
        left: 'down'
    },
    '\\': {
        up: 'left',
        left: 'up',
        down: 'right',
        right: 'down'
    }
};

const LEVELS = [
    {
        title: '第一束光',
        mission: '只转动一面镜子，让第一束激光成功照到核心。',
        grid: [
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['E>', '.', '.', '/', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', 'T', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.']
        ]
    },
    {
        title: '双镜校准',
        mission: '用两面镜子改变路径，让光线先向下再折向目标。',
        grid: [
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['E>', '.', '.', '/', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '\\', '.', '.', '.', 'T'],
            ['.', '.', '.', '.', '.', '.', '.', '.']
        ]
    },
    {
        title: '绕墙折返',
        mission: '墙体会封住中段通路，需要反射后从上层绕开。',
        grid: [
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '\\', '.', '.', '.', 'T', '.'],
            ['.', '.', '.', '#', '#', '#', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['E>', '.', '/', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.']
        ]
    },
    {
        title: '回旋反射',
        mission: '把底部发出的光折向上方，再横向送入核心。',
        grid: [
            ['.', '.', '.', '.', '.', 'T', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '\\', '.', '.', '/', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['E>', '.', '/', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.']
        ]
    },
    {
        title: '夹层迷宫',
        mission: '穿过夹层障碍，把激光从左上送到右下核心。',
        grid: [
            ['E>', '.', '/', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '#', '#', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '/', '.', '.', '.', '/', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', 'T', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.']
        ]
    },
    {
        title: '终端总控',
        mission: '最后一关需要四次折射，才能把能量送到终端核心。',
        grid: [
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '\\', 'T'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '\\', '.', '.', '.', '\\', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '#', '.', '.', '.', '.', '#', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['E>', '.', '\\', '.', '.', '.', '.', '.']
        ]
    }
];

class PhotonMaze {
    constructor() {
        this.boardEl = document.getElementById('board');
        this.beamLayer = document.getElementById('beamLayer');
        this.levelLabelEl = document.getElementById('levelLabel');
        this.systemStatusEl = document.getElementById('systemStatus');
        this.bounceCountEl = document.getElementById('bounceCount');
        this.boardTitleEl = document.getElementById('boardTitle');
        this.missionTextEl = document.getElementById('missionText');
        this.logPanelEl = document.getElementById('logPanel');
        this.resetBtn = document.getElementById('resetBtn');
        this.nextBtn = document.getElementById('nextBtn');

        this.levelIndex = 0;
        this.initialGrid = [];
        this.currentGrid = [];
        this.pathSegments = [];
        this.hitTarget = false;
        this.bounceCount = 0;

        this.bindEvents();
        this.loadLevel(this.levelIndex);
    }

    bindEvents() {
        this.boardEl.addEventListener('click', (event) => {
            const cell = event.target.closest('.board-cell.mirror');
            if (!cell || this.hitTarget) {
                return;
            }

            const row = Number(cell.dataset.row);
            const col = Number(cell.dataset.col);
            this.currentGrid[row][col] = this.currentGrid[row][col] === '/' ? '\\' : '/';
            this.evaluateBoard();
            this.renderBoard();
        });

        this.resetBtn.addEventListener('click', () => {
            this.currentGrid = this.cloneGrid(this.initialGrid);
            this.evaluateBoard();
            this.renderBoard();
        });

        this.nextBtn.addEventListener('click', () => {
            if (!this.hitTarget) {
                return;
            }

            const nextIndex = this.levelIndex + 1;
            if (nextIndex < LEVELS.length) {
                this.loadLevel(nextIndex);
            }
        });
    }

    loadLevel(index) {
        this.levelIndex = index;
        const level = LEVELS[index];
        this.initialGrid = this.cloneGrid(level.grid);
        this.currentGrid = this.cloneGrid(level.grid);
        this.boardTitleEl.textContent = `Level ${index + 1} · ${level.title}`;
        this.missionTextEl.textContent = level.mission;
        this.levelLabelEl.textContent = String(index + 1).padStart(2, '0');
        this.nextBtn.disabled = true;
        this.evaluateBoard();
        this.renderBoard();
    }

    cloneGrid(grid) {
        return grid.map((row) => [...row]);
    }

    evaluateBoard() {
        const result = this.traceBeam();
        this.pathSegments = result.segments;
        this.hitTarget = result.hitTarget;
        this.bounceCount = result.bounces;
        this.bounceCountEl.textContent = String(result.bounces);
        this.systemStatusEl.textContent = result.hitTarget ? '核心已点亮' : '路径待校准';
        this.nextBtn.disabled = !result.hitTarget || this.levelIndex === LEVELS.length - 1;
        this.renderLog(result);
    }

    traceBeam() {
        const emitter = this.findEmitter();
        if (!emitter) {
            return { segments: [], hitTarget: false, bounces: 0, events: ['未找到发射器。'] };
        }

        const segments = [];
        const events = [`激光从 (${emitter.row + 1}, ${emitter.col + 1}) 发射。`];
        let direction = emitter.direction;
        let currentRow = emitter.row;
        let currentCol = emitter.col;
        let bounces = 0;
        let hitTarget = false;
        const visited = new Set();

        while (true) {
            const step = DIRECTIONS[direction];
            const nextRow = currentRow + step.row;
            const nextCol = currentCol + step.col;
            const fromPoint = this.getExitPoint(currentRow, currentCol, direction);

            if (!this.inBounds(nextRow, nextCol)) {
                const endPoint = this.getBoundaryPoint(currentRow, currentCol, direction);
                segments.push({ from: fromPoint, to: endPoint });
                events.push('激光离开实验矩阵。');
                break;
            }

            const cellValue = this.currentGrid[nextRow][nextCol];
            const center = this.getCellCenter(nextRow, nextCol);
            segments.push({ from: fromPoint, to: center });

            if (cellValue === '#') {
                events.push(`激光被墙体挡在 (${nextRow + 1}, ${nextCol + 1})。`);
                break;
            }

            if (cellValue === 'T') {
                hitTarget = true;
                events.push(`目标核心已点亮，坐标 (${nextRow + 1}, ${nextCol + 1})。`);
                break;
            }

            if (cellValue === '/' || cellValue === '\\') {
                const visitKey = `${nextRow},${nextCol},${direction},${cellValue}`;
                if (visited.has(visitKey)) {
                    events.push('检测到光路循环，已中止。');
                    break;
                }

                visited.add(visitKey);
                bounces += 1;
                const newDirection = MIRROR_REFLECTION[cellValue][direction];
                events.push(`镜面反射 ${bounces} 次，方向 ${this.getDirectionLabel(direction)} -> ${this.getDirectionLabel(newDirection)}。`);
                currentRow = nextRow;
                currentCol = nextCol;
                direction = newDirection;
                continue;
            }

            currentRow = nextRow;
            currentCol = nextCol;
        }

        return { segments, hitTarget, bounces, events };
    }

    findEmitter() {
        for (let row = 0; row < this.currentGrid.length; row += 1) {
            for (let col = 0; col < this.currentGrid[row].length; col += 1) {
                const cell = this.currentGrid[row][col];
                if (cell.startsWith('E')) {
                    return {
                        row,
                        col,
                        direction: this.parseEmitterDirection(cell)
                    };
                }
            }
        }
        return null;
    }

    parseEmitterDirection(value) {
        const symbol = value[1];
        const map = {
            '^': 'up',
            '>': 'right',
            v: 'down',
            '<': 'left'
        };
        return map[symbol];
    }

    getDirectionLabel(direction) {
        const labels = { up: '上', right: '右', down: '下', left: '左' };
        return labels[direction];
    }

    inBounds(row, col) {
        return row >= 0 && row < this.currentGrid.length && col >= 0 && col < this.currentGrid[0].length;
    }

    getCellPitch() {
        const rootStyles = getComputedStyle(document.documentElement);
        const cellSize = Number.parseFloat(rootStyles.getPropertyValue('--cell-size'));
        return cellSize + 8;
    }

    getCellCenter(row, col) {
        const pitch = this.getCellPitch();
        const cellSize = pitch - 8;
        return {
            x: col * pitch + cellSize / 2,
            y: row * pitch + cellSize / 2
        };
    }

    getExitPoint(row, col, direction) {
        const center = this.getCellCenter(row, col);
        const cellSize = this.getCellPitch() - 8;
        const half = cellSize / 2;
        if (direction === 'up') return { x: center.x, y: center.y - half };
        if (direction === 'right') return { x: center.x + half, y: center.y };
        if (direction === 'down') return { x: center.x, y: center.y + half };
        return { x: center.x - half, y: center.y };
    }

    getBoundaryPoint(row, col, direction) {
        const exit = this.getExitPoint(row, col, direction);
        const pitch = this.getCellPitch();
        if (direction === 'up') return { x: exit.x, y: -4 };
        if (direction === 'right') return { x: this.currentGrid[0].length * pitch - 4, y: exit.y };
        if (direction === 'down') return { x: exit.x, y: this.currentGrid.length * pitch - 4 };
        return { x: -4, y: exit.y };
    }

    renderBoard() {
        const rows = this.currentGrid.length;
        const cols = this.currentGrid[0].length;
        this.boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
        this.boardEl.style.gridTemplateRows = `repeat(${rows}, var(--cell-size))`;

        this.boardEl.innerHTML = '';
        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                const value = this.currentGrid[row][col];
                const cell = document.createElement('button');
                cell.className = 'board-cell';
                cell.type = 'button';
                cell.dataset.row = String(row);
                cell.dataset.col = String(col);

                if (value === '#') {
                    cell.classList.add('wall');
                    cell.innerHTML = '<span class="cell-content wall-symbol">■</span>';
                    cell.disabled = true;
                } else if (value === '/' || value === '\\') {
                    cell.classList.add('mirror');
                    cell.innerHTML = `<span class="cell-content mirror-symbol">${value === '\\' ? '╲' : '╱'}</span>`;
                } else if (value.startsWith('E')) {
                    cell.classList.add('emitter');
                    cell.innerHTML = `<span class="cell-content emitter-symbol">${this.getEmitterSymbol(value)}</span>`;
                    cell.disabled = true;
                } else if (value === 'T') {
                    cell.classList.add('target');
                    if (this.hitTarget) {
                        cell.classList.add('hit');
                    }
                    cell.innerHTML = '<span class="cell-content target-symbol">◎</span>';
                    cell.disabled = true;
                } else {
                    cell.classList.add('empty');
                    cell.disabled = true;
                }

                this.boardEl.appendChild(cell);
            }
        }

        this.renderBeam();
    }

    getEmitterSymbol(value) {
        const symbol = value[1];
        if (symbol === '^') return '▲';
        if (symbol === '>') return '▶';
        if (symbol === 'v') return '▼';
        return '◀';
    }

    renderBeam() {
        const pitch = this.getCellPitch();
        const width = this.currentGrid[0].length * pitch - 8;
        const height = this.currentGrid.length * pitch - 8;

        this.beamLayer.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.beamLayer.setAttribute('width', String(width));
        this.beamLayer.setAttribute('height', String(height));

        const pathData = this.pathSegments
            .map((segment) => `M ${segment.from.x} ${segment.from.y} L ${segment.to.x} ${segment.to.y}`)
            .join(' ');

        this.beamLayer.innerHTML = `
            <defs>
                <filter id="beamGlow">
                    <feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur>
                    <feMerge>
                        <feMergeNode in="blur"></feMergeNode>
                        <feMergeNode in="SourceGraphic"></feMergeNode>
                    </feMerge>
                </filter>
            </defs>
            <path d="${pathData}" stroke="rgba(83,243,255,0.25)" stroke-width="10" fill="none" filter="url(#beamGlow)" stroke-linecap="round"></path>
            <path d="${pathData}" stroke="${this.hitTarget ? '#d4ff62' : '#53f3ff'}" stroke-width="4" fill="none" stroke-linecap="round"></path>
        `;
    }

    renderLog(result) {
        const lines = [...result.events];
        if (result.hitTarget) {
            lines.push(this.levelIndex === LEVELS.length - 1 ? '全部实验矩阵已完成。' : '本关校准成功，可以进入下一关。');
        } else {
            lines.push('继续调整镜面，直到命中目标核心。');
        }

        this.logPanelEl.innerHTML = lines
            .slice(-4)
            .map((line) => `<div class="log-entry">${line}</div>`)
            .join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PhotonMaze();
});

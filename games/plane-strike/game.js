const myBoardCanvas = document.getElementById('myBoard');
const enemyBoardCanvas = document.getElementById('enemyBoard');
const myCtx = myBoardCanvas.getContext('2d');
const enemyCtx = enemyBoardCanvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const rotateBtn = document.getElementById('rotateBtn');
const myStatusEl = document.getElementById('myStatus');
const enemyStatusEl = document.getElementById('enemyStatus');
const turnIndicator = document.getElementById('turnIndicator');
const shotCountEl = document.getElementById('shotCount');

const GRID_SIZE = 10;
const CELL_SIZE = 36;

const PLANE_SHAPES = {
    up: [
        { x: 2, y: 0, type: 'head' },
        { x: 0, y: 1, type: 'wing' }, { x: 1, y: 1, type: 'wing' }, { x: 2, y: 1, type: 'wing' }, { x: 3, y: 1, type: 'wing' }, { x: 4, y: 1, type: 'wing' },
        { x: 2, y: 2, type: 'body' },
        { x: 1, y: 3, type: 'tail' }, { x: 2, y: 3, type: 'tail' }, { x: 3, y: 3, type: 'tail' },
    ],
    down: [
        { x: 1, y: 0, type: 'tail' }, { x: 2, y: 0, type: 'tail' }, { x: 3, y: 0, type: 'tail' },
        { x: 2, y: 1, type: 'body' },
        { x: 0, y: 2, type: 'wing' }, { x: 1, y: 2, type: 'wing' }, { x: 2, y: 2, type: 'wing' }, { x: 3, y: 2, type: 'wing' }, { x: 4, y: 2, type: 'wing' },
        { x: 2, y: 3, type: 'head' },
    ],
    left: [
        { x: 0, y: 2, type: 'head' },
        { x: 1, y: 0, type: 'wing' }, { x: 1, y: 1, type: 'wing' }, { x: 1, y: 2, type: 'wing' }, { x: 1, y: 3, type: 'wing' }, { x: 1, y: 4, type: 'wing' },
        { x: 2, y: 2, type: 'body' },
        { x: 3, y: 1, type: 'tail' }, { x: 3, y: 2, type: 'tail' }, { x: 3, y: 3, type: 'tail' },
    ],
    right: [
        { x: 3, y: 1, type: 'tail' }, { x: 3, y: 2, type: 'tail' }, { x: 3, y: 3, type: 'tail' },
        { x: 2, y: 2, type: 'body' },
        { x: 1, y: 0, type: 'wing' }, { x: 1, y: 1, type: 'wing' }, { x: 1, y: 2, type: 'wing' }, { x: 1, y: 3, type: 'wing' }, { x: 1, y: 4, type: 'wing' },
        { x: 0, y: 2, type: 'head' },
    ]
};

const DIRECTIONS = ['up', 'down', 'left', 'right'];
const PLANE_COUNT = 3;

let myPlanes = [];
let enemyPlanes = [];
let myShots = [];
let enemyShots = [];
let isMyTurn = true;
let gameStarted = false;
let gameOver = false;
let shotCount = 0;

let aiHits = [];
let aiLastHit = null;

function getRandomDirection() {
    return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
}

function getPlaneCells(baseX, baseY, direction) {
    const shape = PLANE_SHAPES[direction];
    return shape.map(cell => ({
        x: baseX + cell.x,
        y: baseY + cell.y,
        type: cell.type
    }));
}

function canPlacePlane(baseX, baseY, direction, existingPlanes) {
    const cells = getPlaneCells(baseX, baseY, direction);
    
    for (const cell of cells) {
        if (cell.x < 0 || cell.x >= GRID_SIZE || cell.y < 0 || cell.y >= GRID_SIZE) {
            return false;
        }
    }
    
    for (const plane of existingPlanes) {
        for (const cell of plane) {
            for (const newCell of cells) {
                if (cell.x === newCell.x && cell.y === newCell.y) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

function placeRandomPlanes() {
    const planes = [];
    let placed = 0;
    let attempts = 0;
    
    while (placed < PLANE_COUNT && attempts < 500) {
        const direction = getRandomDirection();
        const baseX = Math.floor(Math.random() * GRID_SIZE);
        const baseY = Math.floor(Math.random() * GRID_SIZE);
        
        if (canPlacePlane(baseX, baseY, direction, planes)) {
            planes.push(getPlaneCells(baseX, baseY, direction));
            placed++;
        }
        attempts++;
    }
    
    return planes;
}

function initAI() {
    aiHits = [];
    aiLastHit = null;
}

function drawGrid(ctx, planes = [], shots = []) {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }
    
    for (const plane of planes) {
        for (const cell of plane) {
            const x = cell.x * CELL_SIZE;
            const y = cell.y * CELL_SIZE;
            
            if (cell.type === 'head') {
                ctx.fillStyle = '#e74c3c';
            } else if (cell.type === 'wing') {
                ctx.fillStyle = '#3498db';
            } else if (cell.type === 'body') {
                ctx.fillStyle = '#9b59b6';
            } else {
                ctx.fillStyle = '#2ecc71';
            }
            
            ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
    }
    
    for (const shot of shots) {
        const x = shot.x * CELL_SIZE;
        const y = shot.y * CELL_SIZE;
        
        if (shot.hit) {
            if (shot.isHead) {
                ctx.fillStyle = '#c0392b';
            } else {
                ctx.fillStyle = '#f39c12';
            }
            ctx.beginPath();
            ctx.arc(x + CELL_SIZE/2, y + CELL_SIZE/2, CELL_SIZE/3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 8, y + 8);
            ctx.lineTo(x + CELL_SIZE - 8, y + CELL_SIZE - 8);
            ctx.moveTo(x + CELL_SIZE - 8, y + 8);
            ctx.lineTo(x + 8, y + CELL_SIZE - 8);
            ctx.stroke();
        }
    }
}

function drawMyBoard() {
    drawGrid(myCtx, myPlanes, myShots);
}

function drawEnemyBoard() {
    drawGrid(enemyCtx, [], enemyShots);
}

function handleEnemyClick(e) {
    if (!isMyTurn || gameOver) return;
    
    const rect = enemyBoardCanvas.getBoundingClientRect();
    const scaleX = enemyBoardCanvas.width / rect.width;
    const scaleY = enemyBoardCanvas.height / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / CELL_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / CELL_SIZE);
    
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
    
    for (const shot of enemyShots) {
        if (shot.x === x && shot.y === y) return;
    }
    
    shotCount++;
    shotCountEl.textContent = shotCount;
    
    let hit = false;
    let isHead = false;
    let hitPlane = null;
    
    for (const plane of enemyPlanes) {
        for (const cell of plane) {
            if (cell.x === x && cell.y === y) {
                hit = true;
                if (cell.type === 'head') isHead = true;
                hitPlane = plane;
                break;
            }
        }
        if (hit) break;
    }
    
    enemyShots.push({ x, y, hit, isHead, plane: hitPlane });
    drawEnemyBoard();
    
    const allHeadsHit = enemyPlanes.every(plane => {
        return enemyShots.some(shot => shot.hit && shot.isHead && shot.plane === plane);
    });
    
    if (allHeadsHit) {
        gameOver = true;
        enemyStatusEl.textContent = '胜利！';
        enemyStatusEl.style.color = '#2ecc71';
        myStatusEl.textContent = '你赢了！';
        myStatusEl.style.color = '#2ecc71';
        turnIndicator.textContent = '你赢了！';
        turnIndicator.className = 'turn-indicator my-turn';
        startBtn.textContent = '再来一局';
        startBtn.style.display = 'inline-block';
        rotateBtn.style.display = 'none';
        return;
    }
    
    if (hit) {
        enemyStatusEl.textContent = isHead ? '击中机头！' : '击中！继续';
        enemyStatusEl.style.color = '#f39c12';
        
        aiLastHit = { x, y, isHead };
        aiHits.push({ x, y, isHead });
    } else {
        enemyStatusEl.textContent = '未击中';
        enemyStatusEl.style.color = '#aaa';
        isMyTurn = false;
        turnIndicator.textContent = '对方回合';
        turnIndicator.className = 'turn-indicator enemy-turn';
        enemyBoardCanvas.classList.add('disabled');
        
        setTimeout(enemyTurn, 600);
    }
}

function enemyTurn() {
    if (gameOver) return;
    
    let x, y;
    let valid = false;
    
    if (aiLastHit && !aiLastHit.isHead) {
        const directions = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
        ];
        
        for (const dir of directions) {
            const nx = aiLastHit.x + dir.dx;
            const ny = aiLastHit.y + dir.dy;
            
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                let alreadyShot = myShots.some(s => s.x === nx && s.y === ny);
                if (!alreadyShot) {
                    x = nx;
                    y = ny;
                    valid = true;
                    break;
                }
            }
        }
    }
    
    if (!valid) {
        let attempts = 0;
        while (attempts < 200) {
            x = Math.floor(Math.random() * GRID_SIZE);
            y = Math.floor(Math.random() * GRID_SIZE);
            valid = !myShots.some(s => s.x === x && s.y === y);
            if (valid) break;
            attempts++;
        }
    }
    
    let hit = false;
    let isHead = false;
    let hitPlane = null;
    
    for (const plane of myPlanes) {
        for (const cell of plane) {
            if (cell.x === x && cell.y === y) {
                hit = true;
                if (cell.type === 'head') isHead = true;
                hitPlane = plane;
                break;
            }
        }
        if (hit) break;
    }
    
    myShots.push({ x, y, hit, isHead, plane: hitPlane });
    drawMyBoard();
    
    const allHeadsHit = myPlanes.every(plane => {
        return myShots.some(shot => shot.hit && shot.isHead && shot.plane === plane);
    });
    
    if (allHeadsHit) {
        gameOver = true;
        myStatusEl.textContent = '失败！';
        myStatusEl.style.color = '#e74c3c';
        enemyStatusEl.textContent = '你输了！';
        enemyStatusEl.style.color = '#2ecc71';
        turnIndicator.textContent = '你输了！';
        turnIndicator.className = 'turn-indicator enemy-turn';
        startBtn.textContent = '再来一局';
        startBtn.style.display = 'inline-block';
        return;
    }
    
    if (hit) {
        myStatusEl.textContent = isHead ? '被击中机头！' : '被击中！对方继续';
        myStatusEl.style.color = '#e74c3c';
        
        aiLastHit = { x, y, isHead };
        aiHits.push({ x, y, isHead });
        
        setTimeout(enemyTurn, 500);
    } else {
        myStatusEl.textContent = '未被击中';
        myStatusEl.style.color = '#aaa';
        isMyTurn = true;
        turnIndicator.textContent = '你的回合';
        turnIndicator.className = 'turn-indicator my-turn';
        enemyBoardCanvas.classList.remove('disabled');
    }
}

function startGame() {
    myPlanes = [];
    enemyPlanes = [];
    myShots = [];
    enemyShots = [];
    isMyTurn = true;
    gameStarted = true;
    gameOver = false;
    shotCount = 0;
    initAI();
    
    shotCountEl.textContent = '0';
    
    myPlanes = placeRandomPlanes();
    enemyPlanes = placeRandomPlanes();
    
    drawMyBoard();
    drawEnemyBoard();
    
    myStatusEl.textContent = `已部署 ${PLANE_COUNT} 架飞机`;
    myStatusEl.style.color = '#2ecc71';
    enemyStatusEl.textContent = '等待猜测';
    enemyStatusEl.style.color = '#aaa';
    
    turnIndicator.textContent = '你的回合';
    turnIndicator.className = 'turn-indicator my-turn';
    
    startBtn.style.display = 'none';
    rotateBtn.style.display = 'inline-block';
    
    enemyBoardCanvas.classList.remove('disabled');
}

myBoardCanvas.addEventListener('click', () => {
    if (!gameStarted) myStatusEl.textContent = '点击"开始游戏"';
});

enemyBoardCanvas.addEventListener('click', handleEnemyClick);
startBtn.addEventListener('click', startGame);

rotateBtn.addEventListener('click', () => {
    if (!gameStarted || gameOver) return;
    myPlanes = placeRandomPlanes();
    drawMyBoard();
    myStatusEl.textContent = `飞机已重新部署 (${PLANE_COUNT} 架)`;
    myStatusEl.style.color = '#3498db';
});

document.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && gameStarted && !gameOver) {
        rotateBtn.click();
    }
});

myBoardCanvas.width = GRID_SIZE * CELL_SIZE;
myBoardCanvas.height = GRID_SIZE * CELL_SIZE;
enemyBoardCanvas.width = GRID_SIZE * CELL_SIZE;
enemyBoardCanvas.height = GRID_SIZE * CELL_SIZE;

drawMyBoard();
drawEnemyBoard();

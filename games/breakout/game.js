const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('totalScore');
const comboEl = document.getElementById('combo');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

const paddle = {
    width: 80,
    height: 12,
    x: (canvas.width - 80) / 2,
    y: canvas.height - 30,
    speed: 8,
    dx: 0
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height - 40,
    radius: 8,
    speed: 4,
    dx: 4,
    dy: -4
};

const brick = {
    width: 55,
    height: 20,
    padding: 8,
    offsetTop: 50,
    offsetLeft: 30
};

const hedgehogs = [
    { x: canvas.width / 2 - 40, y: 180, radius: 15 },
    { x: canvas.width / 2 + 40, y: 180, radius: 15 }
];

const levels = [
    {
        name: '第一关',
        pattern: [
            [0,0,0,0,0,0,0,0],
            [1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1],
            [0,0,0,0,0,0,0,0],
        ]
    },
    {
        name: '第二关',
        pattern: [
            [0,0,1,1,1,1,0,0],
            [0,1,1,1,1,1,1,0],
            [1,1,1,1,1,1,1,1],
            [1,1,0,0,0,0,1,1],
        ]
    },
    {
        name: '第三关',
        pattern: [
            [1,0,1,0,0,1,0,1],
            [0,1,0,1,1,0,1,0],
            [1,1,1,1,1,1,1,1],
            [0,1,1,1,1,1,1,0],
        ]
    }
];

let currentLevel = 0;
let bricks = [];
let totalScore = 0;
let levelScore = 0;
let lives = 3;
let combo = 0;
let gameRunning = false;
let levelComplete = false;
let animationId;

function initBricks() {
    const pattern = levels[currentLevel].pattern;
    const rows = pattern.length;
    const cols = pattern[0].length;
    
    brick.columnCount = cols;
    brick.rowCount = rows;
    
    const totalWidth = cols * (brick.width + brick.padding) - brick.padding;
    brick.offsetLeft = (canvas.width - totalWidth) / 2;
    
    bricks = [];
    for (let c = 0; c < cols; c++) {
        bricks[c] = [];
        for (let r = 0; r < rows; r++) {
            bricks[c][r] = { 
                x: 0, 
                y: 0, 
                status: pattern[r][c] 
            };
        }
    }
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#4a90d9';
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
    ctx.fillStyle = '#4a90d9';
    ctx.fill();
    ctx.closePath();
}

function drawHedgehogs() {
    hedgehogs.forEach(h => {
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#8B4513';
        ctx.fill();
        ctx.closePath();
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const spikeX = h.x + Math.cos(angle) * (h.radius + 8);
            const spikeY = h.y + Math.sin(angle) * (h.radius + 8);
            ctx.beginPath();
            ctx.moveTo(h.x + Math.cos(angle - 0.2) * h.radius, h.y + Math.sin(angle - 0.2) * h.radius);
            ctx.lineTo(spikeX, spikeY);
            ctx.lineTo(h.x + Math.cos(angle + 0.2) * h.radius, h.y + Math.sin(angle + 0.2) * h.radius);
            ctx.fillStyle = '#8B4513';
            ctx.fill();
            ctx.closePath();
        }
        
        ctx.beginPath();
        ctx.arc(h.x - 4, h.y - 3, 3, 0, Math.PI * 2);
        ctx.arc(h.x + 4, h.y - 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.closePath();
    });
}

function drawBricks() {
    const cols = brick.columnCount;
    const rows = brick.rowCount;
    
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = c * (brick.width + brick.padding) + brick.offsetLeft;
                const brickY = r * (brick.height + brick.padding) + brick.offsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                
                ctx.beginPath();
                ctx.roundRect(brickX, brickY, brick.width, brick.height, 4);
                
                const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
                ctx.fillStyle = colors[r % colors.length];
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function collisionDetection() {
    const cols = brick.columnCount;
    const rows = brick.rowCount;
    
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                if (ball.x > b.x && ball.x < b.x + brick.width &&
                    ball.y > b.y && ball.y < b.y + brick.height) {
                    ball.dy = -ball.dy;
                    b.status = 0;
                    
                    combo++;
                    const comboBonus = combo * 10;
                    const points = 10 + comboBonus;
                    levelScore += points;
                    scoreEl.textContent = totalScore + levelScore;
                    comboEl.textContent = combo;
                    
                    if (combo > 1) {
                        comboEl.classList.add('active');
                        setTimeout(() => comboEl.classList.remove('active'), 300);
                    }
                    
                    if (checkWin()) {
                        levelComplete = true;
                        levelCompleteHandler();
                    }
                }
            }
        }
    }
}

function checkHedgehogCollision() {
    for (const h of hedgehogs) {
        const dx = ball.x - h.x;
        const dy = ball.y - h.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < ball.radius + h.radius) {
            return true;
        }
    }
    return false;
}

function checkWin() {
    const cols = brick.columnCount;
    const rows = brick.rowCount;
    
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            if (bricks[c][r].status === 1) {
                return false;
            }
        }
    }
    return true;
}

function movePaddle() {
    paddle.x += paddle.dx;
    
    if (paddle.x < 0) {
        paddle.x = 0;
    }
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx = -ball.dx;
    }
    
    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
    }
    
    if (checkHedgehogCollision()) {
        ballHitHedgehog();
        return;
    }
    
    if (ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width) {
        
        ball.dy = -ball.speed;
        
        const hitPoint = ball.x - (paddle.x + paddle.width / 2);
        ball.dx = hitPoint * 0.15;
        
        combo = 0;
        comboEl.textContent = combo;
    }
    
    if (ball.y + ball.radius > canvas.height) {
        loseLife();
    }
}

function ballHitHedgehog() {
    lives--;
    livesEl.textContent = lives;
    
    if (lives === 0) {
        gameOver(false);
    } else {
        resetBall();
    }
}

function loseLife() {
    lives--;
    livesEl.textContent = lives;
    
    if (lives === 0) {
        gameOver(false);
    } else {
        resetBall();
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 40;
    ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -4;
    paddle.x = (canvas.width - paddle.width) / 2;
    combo = 0;
    comboEl.textContent = combo;
}

function levelCompleteHandler() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    const lifeBonus = lives * 100;
    const levelFinalScore = levelScore + lifeBonus;
    totalScore += levelFinalScore;
    
    if (currentLevel >= levels.length - 1) {
        allLevelsComplete();
        return;
    }
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${levels[currentLevel].name} 通关!`, canvas.width / 2, canvas.height / 2 - 60);
    
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`本关得分: ${levelScore}`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText(`生命奖励: +${lifeBonus}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`本关总计: ${levelFinalScore}`, canvas.width / 2, canvas.height / 2 + 40);
    
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`总分: ${totalScore}`, canvas.width / 2, canvas.height / 2 + 80);
    
    ctx.fillStyle = '#4a90d9';
    ctx.font = '18px sans-serif';
    ctx.fillText('3秒后进入下一关...', canvas.width / 2, canvas.height / 2 + 120);
    
    setTimeout(() => {
        currentLevel++;
        startLevel();
    }, 3000);
}

function allLevelsComplete() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('恭喜通关!', canvas.width / 2, canvas.height / 2 - 60);
    
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText(`总分: ${totalScore}`, canvas.width / 2, canvas.height / 2 + 10);
    
    ctx.fillStyle = '#aaa';
    ctx.font = '16px sans-serif';
    ctx.fillText('点击"重新开始"可再玩一次', canvas.width / 2, canvas.height / 2 + 50);
    
    restartBtn.textContent = '重新开始';
    restartBtn.style.display = 'inline-block';
}

function draw() {
    if (!gameRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBricks();
    drawHedgehogs();
    drawBall();
    drawPaddle();
    collisionDetection();
    moveBall();
    movePaddle();
    
    animationId = requestAnimationFrame(draw);
}

function startLevel() {
    initBricks();
    levelScore = 0;
    lives = 3;
    combo = 0;
    livesEl.textContent = lives;
    comboEl.textContent = combo;
    levelEl.textContent = currentLevel + 1;
    resetBall();
    
    gameRunning = true;
    levelComplete = false;
    restartBtn.style.display = 'none';
    startBtn.style.display = 'none';
    
    draw();
}

function startGame() {
    currentLevel = 0;
    totalScore = 0;
    scoreEl.textContent = 0;
    startLevel();
}

function gameOver(win) {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`当前总分: ${totalScore}`, canvas.width / 2, canvas.height / 2 + 30);
    
    restartBtn.textContent = '重新开始';
    restartBtn.style.display = 'inline-block';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        paddle.dx = -paddle.speed;
    } else if (e.key === 'ArrowRight') {
        paddle.dx = paddle.speed;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        paddle.dx = 0;
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    paddle.x = mouseX - paddle.width / 2;
    
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

levelEl.textContent = 1;
initBricks();
drawBricks();
drawHedgehogs();
drawPaddle();
drawBall();

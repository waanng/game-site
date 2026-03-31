// 康威生命游戏 - Conway's Game of Life
class GameOfLife {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 网格配置
        this.cols = 80;
        this.rows = 60;
        this.cellSize = 10;
        this.showGrid = true;
        this.wrapEdges = true;
        
        // 游戏状态
        this.grid = null;
        this.nextGrid = null;
        this.cellAge = null; // 细胞年龄（用于年龄模式）
        this.isRunning = false;
        this.isPaused = false;
        this.generation = 0;
        
        // 模拟速度
        this.speed = 10; // 代/秒
        this.lastFrameTime = 0;
        this.animationId = null;
        
        // 显示模式
        this.displayMode = 'standard'; // standard, age, heatmap
        
        // 编辑状态
        this.isDrawing = false;
        this.drawMode = true; // true = 绘制, false = 擦除
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        this.resetGrid();
        this.setupEventListeners();
        // 默认加载脉冲星图案，更大更显眼
        this.loadPattern('pulsar');
        this.render();
        // 3秒后自动开始，让用户看到生命演化
        setTimeout(() => {
            if (!this.isRunning && this.generation === 0) {
                this.start();
            }
        }, 2000);
    }
    
    // 调整画布大小
    resizeCanvas() {
        this.canvas.width = this.cols * this.cellSize;
        this.canvas.height = this.rows * this.cellSize;
    }
    
    // 初始化网格
    resetGrid() {
        this.grid = new Uint8Array(this.cols * this.rows);
        this.nextGrid = new Uint8Array(this.cols * this.rows);
        this.cellAge = new Uint16Array(this.cols * this.rows);
        this.generation = 0;
        this.updateStats();
    }
    
    // 设置事件监听
    setupEventListeners() {
        // 画布鼠标事件
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', () => this.isDrawing = false);
        
        // 防止拖拽时选中文字
        this.canvas.addEventListener('selectstart', (e) => e.preventDefault());
        
        // 控制按钮
        document.getElementById('playBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('stepBtn').addEventListener('click', () => this.step());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        
        // 速度滑块
        const speedSlider = document.getElementById('speedSlider');
        speedSlider.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            document.getElementById('speedValue').textContent = this.speed + '代/秒';
        });
        
        // 网格大小
        document.getElementById('gridSize').addEventListener('change', (e) => {
            const size = parseInt(e.target.value);
            this.cols = size;
            this.rows = Math.floor(size * 0.75); // 保持4:3比例
            this.pause();
            this.resizeCanvas();
            this.resetGrid();
            this.render();
        });
        
        // 显示选项
        document.getElementById('showGrid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.render();
        });
        document.getElementById('wrapEdges').addEventListener('change', (e) => {
            this.wrapEdges = e.target.checked;
        });
        
        // 预设图案
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pattern = e.currentTarget.dataset.pattern;
                this.loadPattern(pattern);
            });
        });
        
        // 显示模式
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.displayMode = e.currentTarget.dataset.mode;
                this.render();
            });
        });
        
        // 保存/加载
        document.getElementById('saveBtn').addEventListener('click', () => this.savePattern());
        document.getElementById('loadBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        document.getElementById('fileInput').addEventListener('change', (e) => this.loadPatternFromFile(e.target.files[0]));
        
        // 键盘快捷键
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    // 键盘事件
    handleKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        switch(e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                this.isRunning ? this.pause() : this.start();
                break;
            case 's':
                this.step();
                break;
            case 'c':
                this.clear();
                break;
            case 'r':
                this.reset();
                break;
        }
    }
    
    // 鼠标事件处理
    handleMouseDown(e) {
        if (this.isRunning) return;
        
        this.isDrawing = true;
        this.drawMode = e.button === 0; // 左键绘制，右键擦除
        this.toggleCell(e);
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing || this.isRunning) return;
        this.toggleCell(e);
    }
    
    handleMouseUp() {
        this.isDrawing = false;
    }
    
    // 切换细胞状态
    toggleCell(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            const index = row * this.cols + col;
            const newValue = this.drawMode ? 1 : 0;
            
            if (this.grid[index] !== newValue) {
                this.grid[index] = newValue;
                if (newValue === 0) this.cellAge[index] = 0;
                this.render();
                this.updateStats();
            }
        }
    }
    
    // 计算邻居数量
    countNeighbors(row, col) {
        let count = 0;
        
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                let nr = row + dr;
                let nc = col + dc;
                
                if (this.wrapEdges) {
                    // 环形边界
                    nr = (nr + this.rows) % this.rows;
                    nc = (nc + this.cols) % this.cols;
                } else {
                    // 硬边界
                    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
                }
                
                count += this.grid[nr * this.cols + nc];
            }
        }
        
        return count;
    }
    
    // 计算下一代
    computeNextGeneration() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = row * this.cols + col;
                const isAlive = this.grid[index];
                const neighbors = this.countNeighbors(row, col);
                
                if (isAlive) {
                    // 存活细胞：邻居数为2或3则存活
                    this.nextGrid[index] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
                    if (this.nextGrid[index]) {
                        this.cellAge[index] = Math.min(this.cellAge[index] + 1, 1000);
                    } else {
                        this.cellAge[index] = 0;
                    }
                } else {
                    // 死亡细胞：邻居数为3则复活
                    this.nextGrid[index] = (neighbors === 3) ? 1 : 0;
                    if (this.nextGrid[index]) {
                        this.cellAge[index] = 1;
                    }
                }
            }
        }
        
        // 交换网格
        [this.grid, this.nextGrid] = [this.nextGrid, this.grid];
        this.generation++;
    }
    
    // 游戏循环
    gameLoop(timestamp) {
        if (!this.isRunning || this.isPaused) return;
        
        const frameInterval = 1000 / this.speed;
        
        if (timestamp - this.lastFrameTime >= frameInterval) {
            this.computeNextGeneration();
            this.render();
            this.updateStats();
            this.lastFrameTime = timestamp;
        }
        
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    // 渲染
    render() {
        // 清空画布 - 使用稍亮的背景色提高对比度
        this.ctx.fillStyle = '#0d1117';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格线
        if (this.showGrid) {
            this.drawGrid();
        }
        
        // 绘制细胞
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const index = row * this.cols + col;
                if (this.grid[index]) {
                    this.drawCell(row, col, index);
                }
            }
        }
    }
    
    // 绘制网格线
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(100, 200, 150, 0.15)';
        this.ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= this.canvas.width; x += this.cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.canvas.height; y += this.cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    // 绘制单个细胞
    drawCell(row, col, index) {
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const age = this.cellAge[index];
        
        let color;
        
        switch (this.displayMode) {
            case 'age':
                // 根据年龄变色：年轻(蓝) -> 中年(绿) -> 老年(红)
                if (age < 10) {
                    color = `hsl(200, 80%, ${50 + age * 2}%)`;
                } else if (age < 50) {
                    color = `hsl(${120 + (age - 10) * 2}, 80%, 50%)`;
                } else {
                    color = `hsl(${200 - Math.min(age - 50, 50)}, 80%, 50%)`;
                }
                break;
                
            case 'heatmap':
                // 热力图：根据邻居数量
                const neighbors = this.countNeighbors(row, col);
                const heat = Math.min(neighbors / 8, 1);
                const hue = (1 - heat) * 240; // 蓝到红
                color = `hsl(${hue}, 80%, 50%)`;
                break;
                
            default: // standard
                // 标准模式：更亮的绿色，提高可见性
                color = '#50fa7b';
        }
        
        // 绘制细胞 - 增强可见性
        const padding = 0.5; // 减小间隙，让细胞更大
        const cellW = this.cellSize - padding * 2;
        
        if (this.displayMode === 'standard') {
            // 标准模式：强发光效果
            // 外层发光
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x + padding, y + padding, cellW, cellW);
            
            // 内部高光
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.fillRect(x + padding + 1, y + padding + 1, cellW * 0.4, cellW * 0.4);
        } else {
            // 其他模式
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x + padding, y + padding, cellW, cellW);
        }
    }
    
    // 更新统计
    updateStats() {
        let population = 0;
        for (let i = 0; i < this.grid.length; i++) {
            population += this.grid[i];
        }
        
        const density = ((population / (this.cols * this.rows)) * 100).toFixed(1);
        
        document.getElementById('generation').textContent = this.generation;
        document.getElementById('population').textContent = population;
        document.getElementById('density').textContent = density + '%';
    }
    
    // 开始模拟
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        
        document.getElementById('playBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        
        this.lastFrameTime = performance.now();
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    // 暂停
    pause() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }
    
    // 单步执行
    step() {
        if (this.isRunning) return;
        
        this.computeNextGeneration();
        this.render();
        this.updateStats();
    }
    
    // 清空
    clear() {
        this.pause();
        this.grid.fill(0);
        this.cellAge.fill(0);
        this.generation = 0;
        this.render();
        this.updateStats();
    }
    
    // 重置
    reset() {
        this.pause();
        this.resetGrid();
        this.render();
    }
    
    // 加载预设图案
    loadPattern(pattern) {
        this.pause();
        this.clear();
        
        const centerX = Math.floor(this.cols / 2);
        const centerY = Math.floor(this.rows / 2);
        
        switch(pattern) {
            case 'glider':
                // 滑翔机
                this.setCell(centerX, centerY, 1);
                this.setCell(centerX + 1, centerY + 1, 1);
                this.setCell(centerX - 1, centerY + 2, 1);
                this.setCell(centerX, centerY + 2, 1);
                this.setCell(centerX + 1, centerY + 2, 1);
                break;
                
            case 'pulsar':
                // 脉冲星（周期3）
                const pulsarPattern = [
                    [-4, -6], [-3, -6], [-2, -6], [2, -6], [3, -6], [4, -6],
                    [-6, -4], [-1, -4], [1, -4], [6, -4],
                    [-6, -3], [-1, -3], [1, -3], [6, -3],
                    [-6, -2], [-1, -2], [1, -2], [6, -2],
                    [-4, -1], [-3, -1], [-2, -1], [2, -1], [3, -1], [4, -1],
                    [-4, 1], [-3, 1], [-2, 1], [2, 1], [3, 1], [4, 1],
                    [-6, 2], [-1, 2], [1, 2], [6, 2],
                    [-6, 3], [-1, 3], [1, 3], [6, 3],
                    [-6, 4], [-1, 4], [1, 4], [6, 4],
                    [-4, 6], [-3, 6], [-2, 6], [2, 6], [3, 6], [4, 6]
                ];
                pulsarPattern.forEach(([dx, dy]) => {
                    this.setCell(centerX + dx, centerY + dy, 1);
                });
                break;
                
            case 'gosper':
                // 高斯帕滑翔机枪
                const gosperPattern = [
                    [0, 4], [0, 5], [1, 4], [1, 5],
                    [10, 4], [10, 5], [10, 6], [11, 3], [11, 7], [12, 2], [12, 8],
                    [13, 2], [13, 8], [14, 5], [15, 3], [15, 7], [16, 4], [16, 5], [16, 6], [17, 5],
                    [20, 2], [20, 3], [20, 4], [21, 2], [21, 3], [21, 4], [22, 1], [22, 5],
                    [24, 0], [24, 1], [24, 5], [24, 6],
                    [34, 2], [34, 3], [35, 2], [35, 3]
                ];
                gosperPattern.forEach(([dx, dy]) => {
                    this.setCell(centerX - 20 + dx, centerY + dy, 1);
                });
                break;
                
            case 'random':
                // 随机初始化（30%密度）
                for (let i = 0; i < this.grid.length; i++) {
                    if (Math.random() < 0.3) {
                        this.grid[i] = 1;
                        this.cellAge[i] = 1;
                    }
                }
                break;
        }
        
        this.render();
        this.updateStats();
    }
    
    // 设置细胞状态
    setCell(col, row, value) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            const index = row * this.cols + col;
            this.grid[index] = value;
            if (value) this.cellAge[index] = 1;
        }
    }
    
    // 保存图案
    savePattern() {
        const pattern = {
            cols: this.cols,
            rows: this.rows,
            grid: Array.from(this.grid),
            cellAge: Array.from(this.cellAge),
            generation: this.generation,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(pattern)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `game-of-life-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    // 从文件加载图案
    loadPatternFromFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const pattern = JSON.parse(e.target.result);
                
                if (pattern.cols && pattern.rows && pattern.grid) {
                    this.pause();
                    
                    this.cols = pattern.cols;
                    this.rows = pattern.rows;
                    this.resizeCanvas();
                    this.resetGrid();
                    
                    this.grid = new Uint8Array(pattern.grid);
                    if (pattern.cellAge) {
                        this.cellAge = new Uint16Array(pattern.cellAge);
                    }
                    this.generation = pattern.generation || 0;
                    
                    // 更新UI
                    const gridSizeSelect = document.getElementById('gridSize');
                    gridSizeSelect.value = this.cols.toString();
                    
                    this.render();
                    this.updateStats();
                }
            } catch (err) {
                alert('加载失败：文件格式错误');
            }
        };
        reader.readAsText(file);
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new GameOfLife();
});
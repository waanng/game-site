// 分形探索器 - Fractal Explorer
class FractalExplorer {
    constructor() {
        this.canvas = document.getElementById('fractalCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.selectionBox = document.getElementById('selectionBox');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // 视图状态
        this.viewState = {
            centerX: 0,
            centerY: 0,
            zoom: 1,
            maxIterations: 100
        };
        
        // 初始状态（用于重置）
        this.initialState = { ...this.viewState };
        
        // 分形类型
        this.fractalType = 'mandelbrot';
        this.juliaC = { real: -0.7269, imag: 0.1889 };
        
        // 颜色方案
        this.colorScheme = 'fire';
        
        // 历史记录
        this.history = [];
        this.maxHistory = 5;
        
        // 拖拽选择状态
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };
        
        // 渲染状态
        this.isRendering = false;
        this.renderQueue = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.render();
    }
    
    // 设置事件监听
    setupEventListeners() {
        // 画布交互
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // 防止拖拽时选中文字
        this.canvas.addEventListener('selectstart', (e) => e.preventDefault());
        
        // 分形类型切换
        document.querySelectorAll('.fractal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.switchFractalType(type);
            });
        });
        
        // Julia参数
        document.getElementById('applyJulia').addEventListener('click', () => {
            this.juliaC.real = parseFloat(document.getElementById('juliaReal').value);
            this.juliaC.imag = parseFloat(document.getElementById('juliaImag').value);
            this.render();
            // 隐藏Julia参数表单
            document.getElementById('juliaParams').style.display = 'none';
        });
        
        // 迭代次数
        const iterSlider = document.getElementById('iterSlider');
        iterSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('iterValue').textContent = value;
            this.viewState.maxIterations = value;
        });
        iterSlider.addEventListener('change', () => this.render());
        
        // 颜色方案
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.colorScheme = e.target.dataset.scheme;
                this.render();
            });
        });
        
        // 缩放控制
        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(2));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(0.5));
        
        // 操作按钮
        document.getElementById('saveBtn').addEventListener('click', () => this.saveImage());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        
        // 发现标记
        document.querySelectorAll('.discovery-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const x = parseFloat(e.currentTarget.dataset.x);
                const y = parseFloat(e.currentTarget.dataset.y);
                const zoom = parseFloat(e.currentTarget.dataset.zoom);
                this.jumpToLocation(x, y, zoom);
            });
        });
    }
    
    // 切换分形类型
    switchFractalType(type) {
        this.fractalType = type;
        
        // 更新按钮状态
        document.querySelectorAll('.fractal-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        
        // 显示/隐藏Julia参数
        const juliaParams = document.getElementById('juliaParams');
        juliaParams.style.display = type === 'julia' ? 'block' : 'none';
        
        // 设置不同分形的初始视图
        if (type === 'mandelbrot') {
            this.viewState = { centerX: -0.5, centerY: 0, zoom: 1, maxIterations: this.viewState.maxIterations };
        } else if (type === 'julia') {
            this.viewState = { centerX: 0, centerY: 0, zoom: 1.5, maxIterations: this.viewState.maxIterations };
        } else if (type === 'burning') {
            this.viewState = { centerX: -1.75, centerY: -0.03, zoom: 0.8, maxIterations: this.viewState.maxIterations };
        }
        
        this.initialState = { ...this.viewState };
        this.render();
    }
    
    // 鼠标按下
    handleMouseDown(e) {
        if (this.isRendering) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.isDragging = true;
        this.dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.dragCurrent = { ...this.dragStart };
        
        this.selectionBox.style.display = 'block';
        this.updateSelectionBox();
    }
    
    // 鼠标移动
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 更新坐标显示
        const complex = this.screenToComplex(x, y);
        document.getElementById('coordDisplay').textContent = 
            `${complex.real.toFixed(6)} ${complex.imag >= 0 ? '+' : ''}${complex.imag.toFixed(6)}i`;
        
        if (this.isDragging) {
            this.dragCurrent = { x, y };
            this.updateSelectionBox();
        }
    }
    
    // 鼠标释放
    handleMouseUp(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.selectionBox.style.display = 'none';
        
        const width = Math.abs(this.dragCurrent.x - this.dragStart.x);
        const height = Math.abs(this.dragCurrent.y - this.dragStart.y);
        
        // 如果选区太小，视为点击
        if (width < 10 || height < 10) {
            return;
        }
        
        // 计算选区的中心点和缩放比例
        const centerX = (this.dragStart.x + this.dragCurrent.x) / 2;
        const centerY = (this.dragStart.y + this.dragCurrent.y) / 2;
        
        // 保存当前状态到历史
        this.addToHistory();
        
        // 计算新的视图
        const complex = this.screenToComplex(centerX, centerY);
        const scaleX = width / this.canvas.width;
        const scaleY = height / this.canvas.height;
        const scale = Math.max(scaleX, scaleY);
        
        this.viewState.centerX = complex.real;
        this.viewState.centerY = complex.imag;
        this.viewState.zoom /= scale;
        
        this.render();
    }
    
    // 双击放大
    handleDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.addToHistory();
        
        const complex = this.screenToComplex(x, y);
        this.viewState.centerX = complex.real;
        this.viewState.centerY = complex.imag;
        this.viewState.zoom *= 3;
        
        this.render();
    }
    
    // 滚轮缩放
    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        
        // 保持鼠标指向的位置不变
        const complex = this.screenToComplex(x, y);
        const newZoom = this.viewState.zoom * zoomFactor;
        
        // 限制缩放范围
        if (newZoom < 0.5 || newZoom > 1000000) return;
        
        this.viewState.centerX = complex.real - (complex.real - this.viewState.centerX) / zoomFactor;
        this.viewState.centerY = complex.imag - (complex.imag - this.viewState.centerY) / zoomFactor;
        this.viewState.zoom = newZoom;
        
        this.render();
    }
    
    // 更新选区框显示
    updateSelectionBox() {
        const canvasRect = this.canvas.getBoundingClientRect();
        const wrapperRect = this.canvas.parentElement.getBoundingClientRect();
        
        const left = Math.min(this.dragStart.x, this.dragCurrent.x) + (canvasRect.left - wrapperRect.left);
        const top = Math.min(this.dragStart.y, this.dragCurrent.y) + (canvasRect.top - wrapperRect.top);
        const width = Math.abs(this.dragCurrent.x - this.dragStart.x);
        const height = Math.abs(this.dragCurrent.y - this.dragStart.y);
        
        // 保持正方形比例
        const size = Math.max(width, height);
        
        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${size}px`;
        this.selectionBox.style.height = `${size}px`;
    }
    
    // 屏幕坐标转复数坐标
    screenToComplex(screenX, screenY) {
        const scale = 4 / (this.canvas.width * this.viewState.zoom);
        const real = this.viewState.centerX + (screenX - this.canvas.width / 2) * scale;
        const imag = this.viewState.centerY - (screenY - this.canvas.height / 2) * scale;
        return { real, imag };
    }
    
    // 复数坐标转屏幕坐标
    complexToScreen(real, imag) {
        const scale = 4 / (this.canvas.width * this.viewState.zoom);
        const screenX = (real - this.viewState.centerX) / scale + this.canvas.width / 2;
        const screenY = -(imag - this.viewState.centerY) / scale + this.canvas.height / 2;
        return { x: screenX, y: screenY };
    }
    
    // 计算分形
    calculateFractal(cReal, cImag) {
        let zReal = 0, zImag = 0;
        let iter = 0;
        
        if (this.fractalType === 'mandelbrot') {
            zReal = 0;
            zImag = 0;
            while (iter < this.viewState.maxIterations && zReal * zReal + zImag * zImag < 4) {
                const newZReal = zReal * zReal - zImag * zImag + cReal;
                zImag = 2 * zReal * zImag + cImag;
                zReal = newZReal;
                iter++;
            }
        } else if (this.fractalType === 'julia') {
            zReal = cReal;
            zImag = cImag;
            while (iter < this.viewState.maxIterations && zReal * zReal + zImag * zImag < 4) {
                const newZReal = zReal * zReal - zImag * zImag + this.juliaC.real;
                zImag = 2 * zReal * zImag + this.juliaC.imag;
                zReal = newZReal;
                iter++;
            }
        } else if (this.fractalType === 'burning') {
            zReal = 0;
            zImag = 0;
            while (iter < this.viewState.maxIterations && zReal * zReal + zImag * zImag < 4) {
                const newZReal = zReal * zReal - zImag * zImag + cReal;
                zImag = Math.abs(2 * zReal * zImag) + cImag;
                zReal = Math.abs(newZReal);
                iter++;
            }
        }
        
        return iter;
    }
    
    // 获取颜色
    getColor(iteration, maxIter) {
        if (iteration === maxIter) {
            return { r: 0, g: 0, b: 0 };
        }
        
        const t = iteration / maxIter;
        
        switch (this.colorScheme) {
            case 'fire':
                return {
                    r: Math.min(255, Math.floor(255 * Math.pow(t, 0.5))),
                    g: Math.min(255, Math.floor(255 * Math.pow(t, 2))),
                    b: Math.min(255, Math.floor(255 * Math.pow(t, 3)))
                };
            case 'ocean':
                return {
                    r: Math.min(255, Math.floor(50 * t)),
                    g: Math.min(255, Math.floor(100 + 100 * t)),
                    b: Math.min(255, Math.floor(150 + 105 * t))
                };
            case 'neon':
                const hue = t * 360;
                return this.hslToRgb(hue / 360, 1, 0.5);
            case 'grayscale':
                const gray = Math.floor(255 * t);
                return { r: gray, g: gray, b: gray };
            case 'forest':
                return {
                    r: Math.min(255, Math.floor(30 * t)),
                    g: Math.min(255, Math.floor(100 + 155 * t)),
                    b: Math.min(255, Math.floor(50 * t))
                };
            default:
                return { r: 255, g: 255, b: 255 };
        }
    }
    
    // HSL转RGB
    hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    // 渲染分形
    render() {
        if (this.isRendering) {
            // 如果正在渲染，取消当前渲染并重新开始
            this.cancelRender = true;
            setTimeout(() => this.render(), 50);
            return;
        }
        
        this.isRendering = true;
        this.cancelRender = false;
        this.loadingOverlay.classList.add('active');
        
        // 更新显示
        document.getElementById('zoomDisplay').textContent = this.viewState.zoom.toFixed(1) + 'x';
        document.getElementById('iterDisplay').textContent = this.viewState.maxIterations;
        
        const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        // 分块渲染以避免阻塞UI
        const blockSize = 50;
        let currentBlock = 0;
        const totalBlocks = Math.ceil(this.canvas.width / blockSize) * Math.ceil(this.canvas.height / blockSize);
        
        const renderBlock = () => {
            if (this.cancelRender) {
                this.isRendering = false;
                this.loadingOverlay.classList.remove('active');
                return;
            }
            
            const blocksPerFrame = 4;
            
            for (let b = 0; b < blocksPerFrame && currentBlock < totalBlocks; b++, currentBlock++) {
                const blockX = (currentBlock % Math.ceil(this.canvas.width / blockSize)) * blockSize;
                const blockY = Math.floor(currentBlock / Math.ceil(this.canvas.width / blockSize)) * blockSize;
                
                for (let y = blockY; y < Math.min(blockY + blockSize, this.canvas.height); y++) {
                    for (let x = blockX; x < Math.min(blockX + blockSize, this.canvas.width); x++) {
                        const complex = this.screenToComplex(x, y);
                        const iteration = this.calculateFractal(complex.real, complex.imag);
                        const color = this.getColor(iteration, this.viewState.maxIterations);
                        
                        const index = (y * this.canvas.width + x) * 4;
                        data[index] = color.r;
                        data[index + 1] = color.g;
                        data[index + 2] = color.b;
                        data[index + 3] = 255;
                    }
                }
            }
            
            // 更新画布
            this.ctx.putImageData(imageData, 0, 0);
            
            if (currentBlock < totalBlocks) {
                requestAnimationFrame(renderBlock);
            } else {
                this.isRendering = false;
                this.loadingOverlay.classList.remove('active');
            }
        };
        
        requestAnimationFrame(renderBlock);
    }
    
    // 缩放
    zoom(factor) {
        this.addToHistory();
        this.viewState.zoom *= factor;
        this.render();
    }
    
    // 保存图片
    saveImage() {
        const link = document.createElement('a');
        link.download = `fractal_${this.fractalType}_${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }
    
    // 重置
    reset() {
        this.viewState = { ...this.initialState };
        this.history = [];
        this.updateHistoryDisplay();
        this.render();
    }
    
    // 添加到历史
    addToHistory() {
        this.history.unshift({
            centerX: this.viewState.centerX,
            centerY: this.viewState.centerY,
            zoom: this.viewState.zoom,
            maxIterations: this.viewState.maxIterations
        });
        
        if (this.history.length > this.maxHistory) {
            this.history.pop();
        }
        
        this.updateHistoryDisplay();
    }
    
    // 更新历史显示
    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        this.history.forEach((state, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <span class="zoom-level">${state.zoom.toFixed(1)}x</span>
                <span class="coord">${state.centerX.toFixed(3)}, ${state.centerY.toFixed(3)}</span>
            `;
            item.addEventListener('click', () => {
                this.viewState = { ...state };
                document.getElementById('iterSlider').value = state.maxIterations;
                document.getElementById('iterValue').textContent = state.maxIterations;
                this.render();
            });
            historyList.appendChild(item);
        });
    }
    
    // 跳转到特定位置
    jumpToLocation(x, y, zoom) {
        this.addToHistory();
        this.viewState.centerX = x;
        this.viewState.centerY = y;
        this.viewState.zoom = zoom;
        this.render();
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new FractalExplorer();
});

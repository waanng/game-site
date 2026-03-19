# 士字飞机大战

一个基于网格的飞机对战小游戏，类似于经典的海战棋游戏。

## 游戏玩法

- **棋盘大小**：10×10 网格
- **飞机数量**：每方 3 架飞机
- **飞机形状**：士字形 (机头 + 机翼 + 机身 + 机尾)
- **获胜条件**：率先击中所有敌方机头

## 如何开始

1. 点击「开始游戏」按钮
2. 在你的阵地部署 3 架飞机（点击网格放置，鼠标悬停预览）
3. 按 `R` 键或点击按钮旋转飞机方向
4. 部署完成后，点击敌方阵地进行攻击
5. 命中敌机机头即可获胜！

## 本地运行

直接用浏览器打开 `index.html` 即可：

```bash
# macOS
open index.html

# Windows
start index.html

# Linux
xdg-open index.html
```

或使用任意本地服务器：

```bash
python3 -m http.server 8000
```

然后访问 http://localhost:8000

## 技术栈

- HTML5 Canvas
- 原生 JavaScript
- CSS3

## 预览

```
  ○        ← 机头
○○○○○      ← 机翼
  ○        ← 机身
 ○○○       ← 机尾
```

## 截图

![游戏截图](page.png)

## License

MIT

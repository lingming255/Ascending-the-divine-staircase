# Ascension Stairs - 中文说明文档

## 1. 项目简介
这是一个基于 **React** + **Vite** + **Electron** 的目标管理软件。支持无限层级的子目标拆分、可视化节点编辑、时间线安排日程、随手唤出的任务板以及全屏沉浸式体验。

## 2. 软件架构
本项目采用 **Web 混合架构**：
*   **核心逻辑**: React (Web 前端)
*   **桌面容器**: Electron (提供 exe 封装和系统级功能)
*   **数据存储**: 本地 LocalStorage (自动保存)

## 3. 快捷键
*   **全屏切换**: `F11` 或 `View -> Toggle Full Screen`
*   **开发者工具**: `Ctrl+Shift+I`

## 4. 如何修改与打包
如果您修改了 React 代码（例如 `src/` 下的文件），需要重新打包才能在 `.exe` 中生效。

### 开发环境 (实时预览)
在终端运行：
```bash
npm run dev
```
此时打开浏览器访问 `http://localhost:5173` 即可看到修改效果。

### 生产环境打包 (生成 .exe 安装包)
1. 在项目根目录打开 PowerShell 终端。
2. 运行自动化打包脚本：
```powershell
.\package.ps1
```
3. 等待构建完成，文件夹会自动打开。
4. 在 `dist-electron` 文件夹中找到安装包（例如 `Ascension Stairs Setup 0.0.0.exe`）。

> **💡 小贴士：免安装快速测试**
> 如果您不想安装，可以直接进入 `dist-electron/win-unpacked` 文件夹，双击 `Ascension Stairs.exe` 直接运行软件。这对于开发测试非常方便！

## 5. 常见问题
*   **为什么修改代码后软件没变？**
    *   因为软件运行的是打包后的静态文件。请务必运行 `.\package.ps1` 重新生成安装包。
*   **如何修改目标名称？**
    *   双击目标文字即可进入编辑模式，按 Enter 保存。

# Project: Ascension Stairs (天梯) - AI Context Index

## 1. 项目核心 (Core Identity)
*   **定位**: 游戏化目标管理/生产力工具 (Electron Desktop App)。
*   **隐喻**: 将抽象的任务/目标具象化为“无限攀登的天梯”。
*   **设计哲学**: 
    *   **Logic**: 硬核数据结构（支持 DAG 有向无环图的任务依赖）。
    *   **Visual**: 沉浸式 Canvas 渲染，通过环境/天气变化提供潜意识反馈。
    *   **Flow**: 极简交互，保护心流。

## 2. 技术栈 (Tech Stack)
*   **Runtime**: Electron 40 (Main/Renderer), Node.js (with `nodeIntegration: true`).
*   **Framework**: React 19, TypeScript 5.9, Vite 7.
*   **State Management**: `zustand` (核心，配合 `persist` 中间件实现本地存储).
*   **Graphics**: 
    *   HTML5 Canvas API (原生 2D 绘图，高性能渲染).
    *   Framer Motion (UI 组件动画).
*   **Styling**: Tailwind CSS.
*   **Utilities**: `@dnd-kit` (拖拽), `lucide-react` (图标), `clsx/tailwind-merge`.

## 3. 核心架构 (Architecture)

### A. 数据层 (Data Layer) - `src/store/gameStore.ts`
*   **Single Source of Truth**: 全局状态由 Zustand 托管。
*   **Core Entity (`Goal`)**:
    *   `id`: UUID.
    *   `content`: 任务描述.
    *   `priority`: P0 (Critical), P1, P2.
    *   `parentIds`: **关键设计**。存储父节点 ID 数组，支持多父节点（DAG 结构），而非简单的树状嵌套。
    *   `subGoals`: 子任务数组。
*   **Persistence**: 自动同步到 LocalStorage，重启即恢复。

### B. 视觉渲染层 (Visual Layer) - `src/components/AscensionCanvas.tsx`
*   **Engine**: 自研轻量级 Canvas 渲染循环 (`requestAnimationFrame`).
*   **Rendering Pipeline**:
    1.  **Environment**: 绘制背景（视差滚动）、天空渐变。
    2.  **Stairs**: 根据 `scroll` 偏移量动态计算可见台阶，实现无限滚动天梯。
    3.  **Weather**: 粒子系统（雨/雪/风/云），受时间系统控制。
    4.  **Player**: 绘制当前视点/角色。
*   **Procedural Generation**: 台阶样式、环境装饰物（竹子、路灯）基于种子或位置动态生成。

### C. 交互层 (Interaction Layer)
*   **Goal Tree (`src/components/GoalTree/GoalCanvas.tsx`)**: 
    *   无限画布节点编辑器。
    *   可视化管理任务依赖关系（连线、拖拽）。
*   **Task Dashboard (`src/components/TaskDashboard/TaskDashboard.tsx`)**:
    *   游戏化 UI 的任务列表。
    *   支持拖拽排序 (`dnd-kit`) 和快捷状态切换。

## 4. 目录结构导航 (Directory Map)
```
src/
├── components/
│   ├── AscensionCanvas.tsx    # [核心] Canvas 渲染引擎 (Visualizer, Renderer, TimeSystem)
│   ├── GoalTree/              # [核心] 节点式目标编辑器 (GoalNode, Connections)
│   │   ├── GoalCanvas.tsx
│   │   └── ...
│   ├── TaskDashboard/         # [核心] 任务列表与控制台
│   │   ├── TaskDashboard.tsx
│   │   └── ...
│   ├── Toolbar/               # 工具栏与功能按钮
│   │   ├── TacticalButton.tsx
│   │   └── EnvironmentToggle.tsx
│   └── UI.tsx                 # 主 UI 布局与模态框容器
├── store/
│   └── gameStore.ts           # [核心] 全局状态管理与业务逻辑
├── types.ts                   # TypeScript 类型定义
└── App.tsx                    # 路由与主布局
```

## 5. 开发者注意事项 (Dev Notes for AI)
1.  **Performance**: `AscensionCanvas` 每帧都在重绘。在渲染循环中添加逻辑时，**严禁**进行高开销计算或对象分配（GC Pressure）。
2.  **Data Integrity**: 修改 `Goal` 结构时，必须维护 `parentIds` 的引用完整性（例如删除节点时需清理其子节点的 parent 引用）。
3.  **Electron Security**: 项目目前开启了 `nodeIntegration`。在引入外部内容时需谨慎，但在本地文件操作上拥有完全权限。
4.  **Tailwind**: 优先使用 Tailwind 类名，仅在 Canvas 绘图逻辑中使用硬编码颜色/样式。

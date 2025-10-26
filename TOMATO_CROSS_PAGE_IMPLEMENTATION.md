# 番茄钟跨页面运行功能实现总结

## 实现日期
2025-10-26

## 功能概述

实现了番茄钟在后台持续运行的功能，用户可以在任务和统计页面继续工作，同时通过浮动窗口查看和控制番茄钟。

## 实现的功能

### 1. 全局番茄钟状态管理

**文件**: `frontend/src/core/store/tomatoStore.ts`

使用 Zustand 创建全局状态管理，包括：

- **状态**:
  - `timeRemaining`: 剩余时间（秒）
  - `isRunning`: 是否运行中
  - `isPaused`: 是否暂停
  - `selectedDuration`: 选择的时长（分钟）
  - `sessionStartTime`: 会话开始时间
  - `currentTask`: 当前关联任务

- **操作方法**:
  - `start(duration, task)`: 启动番茄钟
  - `pause()`: 暂停
  - `resume()`: 继续
  - `stop()`: 停止
  - `reset()`: 重置
  - `tick()`: 计时器滴答
  - `setCurrentTask(task)`: 设置当前任务
  - `setTimeRemaining(time)`: 设置剩余时间
  - `setSelectedDuration(duration)`: 设置时长

- **自动功能**:
  - 自动更新浏览器标签标题显示倒计时
  - 番茄钟完成时自动发送通知
  - 番茄钟完成时自动激活窗口

### 2. 浮动倒计时组件

**文件**: `frontend/src/components/FloatingTomatoTimer.tsx`

右下角浮动窗口，功能包括：

- **显示内容**:
  - 倒计时时间（大字体显示）
  - 当前任务名称（如果有）
  - 运行状态（运行中/暂停）

- **交互功能**:
  - 暂停/继续按钮
  - 停止按钮（带确认）
  - 最小化/展开功能
  - 点击时间返回番茄钟页面

- **样式特点**:
  - 固定定位在右下角
  - 半透明白色背景
  - 红色边框强调
  - 悬停效果
  - 响应式设计

### 3. 番茄钟页面重构

**文件**: `frontend/src/pages/SimpleTomatoPage.tsx`

改动：

- 移除本地状态，使用全局 `useTomatoStore`
- 保持现有 UI 和交互逻辑
- 保持总结对话框功能
- 保持 LocalStorage 数据持久化
- 添加统计页面导航链接

### 4. 任务页面集成

**文件**: `frontend/src/pages/SimpleTasksPage.tsx`

改动：

- 导入 `useTomatoStore` 和 `FloatingTomatoTimer`
- 根据 `isRunning` 状态条件渲染浮动窗口
- 不影响现有页面布局和功能

### 5. 统计页面集成

**文件**: `frontend/src/pages/StatisticsPage.tsx`

改动：

- 导入 `useTomatoStore` 和 `FloatingTomatoTimer`
- 根据 `isRunning` 状态条件渲染浮动窗口
- 不影响现有页面布局和功能

### 6. 网页关闭确认提示

**文件**: `frontend/src/App.tsx`

改动：

- 添加 `beforeunload` 事件监听
- 当番茄钟运行时阻止关闭
- 显示确认对话框："番茄钟正在运行，确定要离开吗？"

### 7. 导航链接新标签页打开

**文件**: 
- `frontend/src/pages/SimpleHomePage.tsx`
- `frontend/src/pages/SimpleTomatoPage.tsx`

改动：

- 任务列表链接添加 `target="_blank" rel="noopener noreferrer"`
- 统计页面链接添加 `target="_blank" rel="noopener noreferrer"`
- 首页和番茄钟链接保持当前标签页打开

## 技术实现细节

### 全局状态管理

使用 Zustand 的优势：

1. **轻量级**: 比 Redux 更简单
2. **无需 Provider**: 可以在任何组件中直接使用
3. **TypeScript 支持**: 完整的类型推断
4. **性能优化**: 只有使用的状态改变时才重新渲染

### 定时器实现

```typescript
// 在 store 内部管理定时器
let intervalId: number | null = null;

const startInterval = () => {
  if (intervalId) clearInterval(intervalId);
  
  intervalId = setInterval(() => {
    const state = get();
    if (state.isRunning && !state.isPaused && state.timeRemaining > 0) {
      set({ timeRemaining: state.timeRemaining - 1 });
      // 更新浏览器标题
      // ...
    } else if (state.timeRemaining === 0 && state.isRunning) {
      // 番茄钟完成
      // ...
    }
  }, 1000);
};
```

### 浏览器标题更新

```typescript
// 运行时
document.title = `[${timeStr}] ${taskName}`;

// 暂停时
document.title = `[暂停] ${timeStr} - ${taskName}`;

// 停止时
document.title = '🍅 番茄钟';
```

### 浮动窗口定位

```css
position: fixed;
bottom: 20px;
right: 20px;
z-index: 1000;
```

### 最小化功能

- 最小化时显示为圆形按钮（只有番茄图标）
- 展开时显示完整信息和控制按钮
- 点击切换状态

## 用户体验改进

1. **无缝切换**: 用户可以在不同页面间自由切换，番茄钟继续运行
2. **实时反馈**: 浮动窗口实时显示倒计时
3. **快速控制**: 在任何页面都可以暂停/继续/停止
4. **防止误关**: 运行时关闭网页会提示确认
5. **多任务支持**: 可以在新标签页打开任务和统计页面
6. **视觉提示**: 浏览器标签标题显示倒计时，即使切换到其他应用也能看到

## 数据持久化

- 番茄钟状态在内存中（全局 store）
- 任务数据和会话记录保存在 LocalStorage
- 页面刷新后需要重新开始番茄钟（这是设计决策，避免状态不一致）

## 浏览器兼容性

- **通知 API**: 需要用户授权，部分浏览器可能不支持
- **beforeunload 事件**: 现代浏览器都支持，但行为可能略有不同
- **LocalStorage**: 所有现代浏览器都支持

## 已知限制

1. **页面刷新**: 刷新页面会丢失番茄钟状态（需要重新开始）
2. **多标签页**: 多个标签页的番茄钟状态不同步（每个标签页独立）
3. **通知权限**: 用户需要手动授权通知权限
4. **浏览器限制**: 某些浏览器可能限制 beforeunload 的行为

## 未来改进方向

1. **状态持久化**: 使用 LocalStorage 保存番茄钟状态，刷新后可恢复
2. **多标签页同步**: 使用 BroadcastChannel API 同步多个标签页的状态
3. **后台运行**: 使用 Service Worker 实现真正的后台运行
4. **声音提醒**: 添加番茄钟完成时的声音提醒
5. **自定义浮动窗口位置**: 允许用户拖拽浮动窗口到任意位置

## 测试建议

### 功能测试

1. **基本功能**:
   - 启动番茄钟
   - 暂停/继续
   - 停止
   - 完成后总结

2. **跨页面测试**:
   - 启动番茄钟后切换到任务页面
   - 启动番茄钟后切换到统计页面
   - 在浮动窗口中控制番茄钟
   - 点击浮动窗口返回番茄钟页面

3. **新标签页测试**:
   - 从首页点击任务列表（新标签页）
   - 从首页点击统计页面（新标签页）
   - 从番茄钟页面点击任务列表（新标签页）
   - 从番茄钟页面点击统计页面（新标签页）

4. **关闭确认测试**:
   - 启动番茄钟后尝试关闭页面（应显示确认）
   - 未启动番茄钟时关闭页面（应直接关闭）
   - 番茄钟完成后关闭页面（应直接关闭）

5. **通知测试**:
   - 授权通知权限
   - 番茄钟完成时检查通知
   - 点击通知激活窗口

6. **浏览器标题测试**:
   - 运行时检查标题显示倒计时
   - 暂停时检查标题显示"暂停"
   - 停止后检查标题恢复默认

### 边界情况测试

1. 快速启动/停止多次
2. 在不同页面快速切换
3. 最小化/展开浮动窗口多次
4. 同时打开多个标签页
5. 网络断开时的行为

## 文件清单

### 新建文件
- `frontend/src/core/store/tomatoStore.ts` - 全局番茄钟状态管理
- `frontend/src/components/FloatingTomatoTimer.tsx` - 浮动倒计时组件

### 修改文件
- `frontend/src/App.tsx` - 添加网页关闭确认
- `frontend/src/pages/SimpleTomatoPage.tsx` - 使用全局状态
- `frontend/src/pages/SimpleTasksPage.tsx` - 添加浮动窗口
- `frontend/src/pages/StatisticsPage.tsx` - 添加浮动窗口
- `frontend/src/pages/SimpleHomePage.tsx` - 修改导航链接

## 总结

本次实现成功地将番茄钟从单页面应用扩展为跨页面应用，用户可以在工作时自由切换页面，同时保持番茄钟的运行。浮动窗口提供了便捷的控制方式，新标签页打开功能支持多任务工作，网页关闭确认避免了误操作导致的数据丢失。整体实现简洁高效，用户体验良好。


# 时间管理小精灵 - 测试指南

## 📋 功能测试清单

### 1. 任务管理功能

#### 创建任务
- [ ] 输入任务标题并点击"添加任务"按钮
- [ ] 验证新任务出现在列表中
- [ ] 验证任务默认状态为"待办"
- [ ] 验证任务默认优先级为"中"
- [ ] 刷新页面，验证任务仍然存在（localStorage 持久化）

#### 更新任务
- [ ] 勾选任务复选框，验证状态变为"已完成"
- [ ] 取消勾选，验证状态恢复为"待办"
- [ ] 使用下拉菜单更改任务状态（待办/进行中/已完成）
- [ ] 验证任务状态标签颜色正确显示
- [ ] 验证已完成任务显示删除线

#### 删除任务
- [ ] 点击"删除"按钮
- [ ] 验证任务从列表中移除
- [ ] 刷新页面，验证任务不再出现

### 2. 番茄钟功能

#### 基本计时
- [ ] 选择时长（15/25/30/45/60分钟）
- [ ] 点击"开始专注"按钮
- [ ] 验证计时器开始倒计时
- [ ] 验证进度条正确显示

#### 暂停和继续
- [ ] 点击"暂停"按钮
- [ ] 验证计时器停止
- [ ] 点击"继续"按钮
- [ ] 验证计时器恢复倒计时

#### 停止计时
- [ ] 点击"停止"按钮
- [ ] 确认弹窗
- [ ] 验证计时器重置
- [ ] 验证会话被保存到 localStorage（未完成状态）

#### 完成会话
- [ ] 等待计时器倒计时到 0（或设置短时长如 1 秒测试）
- [ ] 验证显示完成提示
- [ ] 验证会话被保存到 localStorage（完成状态）

### 3. 统计面板功能

#### 数据显示
- [ ] 访问统计页面
- [ ] 验证总任务数正确
- [ ] 验证已完成任务数正确
- [ ] 验证完成率计算正确
- [ ] 验证番茄钟会话统计正确

#### 时间段筛选
- [ ] 点击"今天"按钮
- [ ] 点击"本周"按钮
- [ ] 点击"本月"按钮
- [ ] 点击"全部"按钮
- [ ] 验证数据根据选择的时间段更新（当前版本显示全部数据）

#### 可视化图表
- [ ] 验证任务状态分布进度条正确显示
- [ ] 验证优先级分布进度条正确显示
- [ ] 验证番茄钟统计卡片正确显示
- [ ] 验证生产力洞察根据数据动态显示建议

### 4. 导航和路由

#### 页面导航
- [ ] 从首页导航到任务列表
- [ ] 从首页导航到番茄钟
- [ ] 从首页导航到统计
- [ ] 从任务列表导航到其他页面
- [ ] 从番茄钟导航到其他页面
- [ ] 从统计导航到其他页面

#### URL 直接访问
- [ ] 直接访问 http://localhost:5173/
- [ ] 直接访问 http://localhost:5173/tasks
- [ ] 直接访问 http://localhost:5173/tomato
- [ ] 直接访问 http://localhost:5173/statistics

### 5. 数据持久化

#### LocalStorage
- [ ] 创建多个任务
- [ ] 完成几个番茄钟会话
- [ ] 关闭浏览器标签页
- [ ] 重新打开应用
- [ ] 验证所有任务仍然存在
- [ ] 验证番茄钟会话记录仍然存在
- [ ] 验证统计数据正确显示

#### 数据清除
- [ ] 打开浏览器开发者工具
- [ ] 进入 Application > Local Storage
- [ ] 清除 `tasks` 和 `tomatoSessions` 数据
- [ ] 刷新页面
- [ ] 验证显示默认示例数据

### 6. UI/UX 测试

#### 响应式设计
- [ ] 在桌面浏览器测试（1920x1080）
- [ ] 在平板尺寸测试（768x1024）
- [ ] 在手机尺寸测试（375x667）
- [ ] 验证布局在不同尺寸下正常显示

#### 交互反馈
- [ ] 验证按钮 hover 效果
- [ ] 验证按钮点击反馈
- [ ] 验证输入框焦点样式
- [ ] 验证表单验证（空任务标题）

#### 视觉一致性
- [ ] 验证颜色主题一致
- [ ] 验证字体大小合适
- [ ] 验证间距和对齐
- [ ] 验证图标和 emoji 正确显示

## 🐛 已知问题

### 当前版本限制
1. **时间段筛选未实现**：统计页面的时间段筛选（今天/本周/本月）目前只是 UI，实际显示全部数据
2. **后端同步未启用**：为避免初始化问题，当前版本使用纯前端 localStorage，未连接后端 API
3. **任务类型固定**：新建任务的类型固定为"其他"，无法自定义选择

### 改进建议
1. 实现时间段筛选逻辑
2. 添加任务编辑功能（修改标题、优先级、类型）
3. 添加任务排序和筛选功能
4. 实现番茄钟与任务关联
5. 添加番茄钟提醒音效
6. 实现数据导出功能

## 🔧 调试工具

### 查看 LocalStorage 数据
```javascript
// 在浏览器控制台执行
console.log('任务数据:', JSON.parse(localStorage.getItem('tasks') || '[]'));
console.log('番茄钟会话:', JSON.parse(localStorage.getItem('tomatoSessions') || '[]'));
```

### 清除所有数据
```javascript
// 在浏览器控制台执行
localStorage.removeItem('tasks');
localStorage.removeItem('tomatoSessions');
location.reload();
```

### 添加测试数据
```javascript
// 添加测试任务
const testTasks = [
  { id: '1', title: '测试任务1', status: 'completed', priority: 'high', type: '工作' },
  { id: '2', title: '测试任务2', status: 'in_progress', priority: 'medium', type: '学习' },
  { id: '3', title: '测试任务3', status: 'pending', priority: 'low', type: '生活' }
];
localStorage.setItem('tasks', JSON.stringify(testTasks));

// 添加测试番茄钟会话
const testSessions = [
  { id: '1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), duration: 25, completed: true, taskId: null },
  { id: '2', startTime: new Date().toISOString(), endTime: new Date().toISOString(), duration: 25, completed: true, taskId: null }
];
localStorage.setItem('tomatoSessions', JSON.stringify(testSessions));

location.reload();
```

## 📊 性能测试

### 加载性能
- [ ] 测量首次加载时间
- [ ] 测量页面切换时间
- [ ] 验证无明显卡顿

### 内存使用
- [ ] 创建 100+ 任务
- [ ] 创建 100+ 番茄钟会话
- [ ] 验证应用仍然流畅运行

## ✅ 测试通过标准

- 所有核心功能正常工作
- 数据持久化正确
- UI 响应流畅
- 无控制台错误
- 跨浏览器兼容（Chrome, Firefox, Edge）


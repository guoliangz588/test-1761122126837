# UI交互功能手动测试指南

## 测试目标
验证health-goal-collection组件能否正确将用户填写的数据传递给main agent，并且agent能基于用户输入做出响应。

## 🚀 测试准备

### 1. 启动开发服务器
```bash
cd /home/guoliang/Code/ui-tool-server-standalone
npm run dev
```

### 2. 确认测试环境
- 浏览器控制台已打开（F12）
- 网络连接正常
- 项目已完成构建（无TypeScript错误）

## 📋 详细测试步骤

### 测试场景1: 创建Agent系统并测试UI交互

#### 步骤1: 创建健康管理系统
1. 打开 `http://localhost:3000/systems`
2. 点击"创建新系统"
3. 填写系统信息：
   - **系统名称**: "健康目标管理助手"
   - **描述**: "帮助用户设定和跟踪健康目标的智能助手系统"
   - **Agent配置**:
     ```json
     {
       "id": "main-health-agent",
       "name": "健康管理主助手",
       "type": "orchestrator",
       "systemPrompt": "你是一个专业的健康管理助手。当用户提交健康目标时，你应该：1) 确认收到用户的目标 2) 分析目标的合理性 3) 提供个性化建议 4) 不要重复调用UI工具",
       "description": "负责与用户交互，收集健康目标并提供建议",
       "capabilities": ["goal-analysis", "health-advice", "user-interaction"],
       "toolAccess": ["health-goal-collection"]
     }
     ```
4. 保存系统

#### 步骤2: 测试基础对话
1. 进入系统聊天页面 `/systems/[systemId]/chat`
2. 发送消息: "你好，我想设定一些健康目标"
3. **预期结果**: Agent应该响应并可能调用health-goal-collection工具

#### 步骤3: 测试UI组件数据传递（核心测试）
1. 当health-goal-collection组件出现时，填写以下内容：
   ```
   我的三个健康目标：
   1. 减重 - 在3个月内健康减重5公斤，通过合理饮食和规律运动
   2. 改善睡眠 - 建立固定作息，每天晚上11点前睡觉，保证8小时睡眠
   3. 增强体能 - 每周进行3次有氧运动，每次30分钟以上
   ```

2. 点击"提交给Agent"按钮

3. **关键检查点**:
   - [ ] 组件显示"Connected"状态
   - [ ] 提交后显示"已提交"标记
   - [ ] 浏览器控制台显示成功日志
   - [ ] **Agent收到数据并做出响应**（不再重复显示UI工具）

#### 步骤4: 验证Agent响应
1. **成功标志**: Agent应该回应类似：
   ```
   "谢谢您分享了您的健康目标。我已经收到了您的三个目标：减重、改善睡眠和增强体能。这些都是很好的目标..."
   ```

2. **失败标志**: 如果Agent再次显示health-goal-collection工具，说明数据传递失败

### 测试场景2: 调试模式验证

#### 开启调试信息
1. 打开浏览器开发者工具
2. 在聊天页面，查看Debug Info面板
3. 确认以下信息：
   - **Session**: 应显示有效的session ID
   - **Agent**: 应显示当前agent ID
   - **Connected**: 应显示"yes"

#### API调用验证
1. 在Network标签页中监控以下请求：
   - `POST /api/ui-interaction` - UI交互事件
   - `POST /api/agent-chat/[systemId]` - Agent聊天

2. 检查请求内容：
   ```json
   // UI交互请求应包含:
   {
     "toolId": "health-goal-collection",
     "eventType": "submit", 
     "data": {
       "healthGoals": "用户填写的具体内容...",
       "action": "goals-submitted"
     },
     "sessionId": "session_xxx",
     "agentId": "main-health-agent"
   }
   ```

### 测试场景3: 错误处理验证

#### 测试连接失败情况
1. 暂时断开网络连接
2. 尝试提交健康目标
3. **预期**: 应显示错误信息，但不崩溃

#### 测试空数据提交
1. 不填写任何内容，直接点击提交
2. **预期**: 提交按钮应该被禁用

## 🔍 故障排除指南

### 问题1: Agent重复显示UI工具
**症状**: 提交数据后，Agent再次调用health-goal-collection  
**可能原因**: 
- continueSession方法未正确获取availableUITools
- UI交互数据未正确传递到Agent上下文

**检查步骤**:
1. 查看浏览器控制台是否有错误
2. 确认`/api/ui-interaction`返回`sessionContinued: true`
3. 检查Agent的systemPrompt是否包含"不要重复调用UI工具"

### 问题2: UI组件显示"未连接到Agent会话"
**症状**: 组件显示连接警告  
**解决**:
1. 确认URL包含正确的sessionId参数
2. 检查agent-chat页面是否正确传递sessionId到UI组件

### 问题3: 数据未出现在聊天历史中
**症状**: 提交的健康目标未显示在对话中  
**原因**: continueSession可能未正确构建包含UI交互数据的上下文消息

## 📊 测试结果记录表

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 系统创建 | ⚪ | |  
| 基础对话 | ⚪ | |
| UI组件渲染 | ⚪ | |
| 数据提交 | ⚪ | |
| Agent响应 | ⚪ | |
| 会话继续 | ⚪ | |
| 错误处理 | ⚪ | |

**状态说明**: ✅ 通过 | ❌ 失败 | ⚪ 待测试

## 🎯 成功标准

测试成功的标志：
1. ✅ Agent收到用户提交的健康目标数据
2. ✅ Agent基于数据内容做出个性化响应
3. ✅ Agent不再重复调用health-goal-collection工具
4. ✅ 用户输入的数据出现在聊天历史中
5. ✅ 整个交互流程顺畅，无错误

## 🚨 如果测试失败

如果测试失败，请记录：
1. 具体错误症状
2. 浏览器控制台错误信息
3. 网络请求失败详情
4. Agent的具体响应内容

然后可以基于这些信息进行进一步的代码调试和修复。
# Agent X 聊天式改版设计

> 日期：2026-05-27
> 状态：设计已确认；实现计划见 `docs/superpowers/plans/2026-05-28-agent-x-chat-redesign.md`

## 1. 背景与目标

现有 agent x 子应用以「组织架构图 + 表单派发 + 看板/时间线」为交互核心。本次改版把它重做成**飞书/钉钉式的群聊协作工具**：用户拉一个工作群、抛出需求，由一个内置 PM（协调者）识别该用哪些虚拟员工、自动分派、监督纠偏、汇总回报，全过程以群聊形式实时呈现。

核心变化：

1. 交互层 → 三栏群聊（会话列表 / 群聊 / 群成员）
2. 弱化 department → 员工身上的轻量 `team` 标签
3. 虚拟员工拥有 skills / MCP / 累积记忆 + 名字 + 头像
4. 公司级共享知识库，接 RAG（先写 stub，接口预留）
5. PM 协调的多员工自动化协作，群聊式呈现
6. 保留定时 / 循环任务，融入聊天形态

## 2. 已确认的关键决策

| #   | 决策                                                                                             |
| --- | ------------------------------------------------------------------------------------------------ |
| 1   | **department 降级**为员工身上的 `team` 文本标签；skills/MCP/memory 全部下放到员工自身            |
| 2   | **PM 协调者模式**：PM 是顶层 agent，把员工当委派目标，带监督回路（审查结果、走偏纠偏、缺人补人） |
| 3   | **PM = 内置系统协调者**：每个工作群自动带一个，不占员工名额、用户不用配（指令可调）              |
| 4   | **会话 = 长期工作群**：常驻、可随时丢新需求；定时任务挂在群上，到点在同群发起新一轮              |
| 5   | **页面结构**：聊天为主 + 员工页 + 知识库页；Dashboard/Costs 作次要 tab；砍组织架构图             |
| 6   | **群聊布局**：三栏（会话列表 / 群聊 / 群成员+实时状态），飞书/钉钉风                             |
| 7   | **实施策略**：复用现有引擎 + 重做外壳 + 加 PM 层（非全新重写、非贴壳）                           |
| 8   | **v1 串行委派**：PM 一次盯一个员工；多员工真并行留作后续                                         |
| 9   | **Costs 只统计 agent x**：与日常会话 usage 彻底分开（修现有 bug）                                |

## 3. 数据模型

### 3.1 `agent`（员工）改造

- **删除**：`departmentId`(FK)、`position`、`collaboratorIds`、`isShadow`、`shadowOfAgentId`
- **新增**：`team`(text, 可空，如「数据组」)、`avatarSeed`(text)、`avatarStyle`(text)
- **保留**：`id`、`name`、`description`、`systemPrompt`、`toolAllowList`、`skillSlugs`、`mcpServerNames`、`model`、`provider`、`isActive`、时间戳

### 3.2 `conversation`（工作群，新）

```
id            uuid pk
title         text not null
icon          text            -- emoji，可空
memberAgentIds jsonb string[] default []   -- 当前在岗员工
archived      boolean default false
createdAt     timestamp
updatedAt     timestamp
lastMessageAt timestamp        -- 会话列表排序用
```

### 3.3 `message`（聊天流，新）

```
id            uuid pk
conversationId uuid fk -> conversation (onDelete cascade)
role          enum('user','pm','employee','system')
agentId       uuid fk -> agent (onDelete set null, 可空)  -- 哪个员工发的
content       text
parts         jsonb            -- 工具调用卡片等结构化内容，可空
taskId        uuid fk -> task (可空)  -- 产生此消息的任务
createdAt     timestamp
```

token 级 delta 只走 SSE，不落库；每条消息**完成时**写入本表。

### 3.4 `task` 改造

- **新增**：`conversationId` uuid fk -> conversation (onDelete cascade)
- **删除**：`assignedDepartmentId`
- **保留**：`parentTaskId`(PM→员工子任务)、`cronExpression`(定时任务挂群)、`lastRunAt`、`lastRunStatus`、`feedbackRating`、`feedbackNote`、`assignedAgentId`、`status`、`priority`、`input`、`output`、`maxRetries`、`retryCount`、时间戳

### 3.5 `taskExecution` / `taskExecutionEvent`

不变。`taskExecution.tokenUsage` 是 Costs 页的唯一数据源。

### 3.6 `agentMemory`

schema 不变；本次**首次接上写入**——员工完成任务后沉淀经验，作为后续任务上下文（兑现「员工累积记忆」）。

### 3.7 `knowledgeDoc`（知识库 stub，新）

```
id        uuid pk
title     text not null
content   text not null
createdAt timestamp
updatedAt timestamp
```

### 3.8 删除

`department` 表整张删除（local-first 单机 + dev 分支，直接迁移）。

## 4. PM 协调回路（后端核心）

### 4.1 流程

1. 用户在某会话发消息 → 后端启动/续跑该会话的 **PM agentLoop**
2. PM 系统提示注入：员工名册（名字 / team / 擅长 / skills）+ 职责说明（分析→拉人→派活→审查→纠偏→补人→汇报）
3. PM 工具集：
   - `delegateTask(employeeId, instructions)`：派子任务给员工，跑该员工 agentLoop，结果回流进 PM 推理（复用现有 delegate）
   - `recruitEmployee({ role, skills, name? })`：无人合适时临时造虚拟员工（复用 `autoCreateAgent`；缺名则自动起名 + 随机头像 seed），加入群成员
   - `searchKnowledgeBase(query)`：共享知识库（stub）
   - `askUser(question, options)`：卡住时向用户提问（复用 `escalateToUser`）
4. 每个员工跑自己的 agentLoop，带自己的 skills/MCP/工具/记忆 + 知识库访问；输出与工具调用以**该员工头像气泡**实时流入群聊
5. 结果回 PM → PM 对照目标逐份审查；达标则汇总回报用户，不达标则带明确反馈重派 / 换人 / 补人
6. `memberAgentIds` 随 PM 拉人动态更新（发 `member_joined` 事件）

### 4.2 纠偏机制

delegate 结果回流进 PM loop，PM 天然看到每份产出。在 PM 系统提示里**强制**：对照群目标逐份审查，不达标必须带具体纠正重派或换人——这是用户强调的硬需求。

### 4.3 生命周期

PM loop 按会话维度跑。用户发新消息时，用该群历史 `message` 重建 PM 上下文续跑；PM 不再调工具、产出最终用户消息时本轮结束。

### 4.4 v1 串行

PM 一次委派一个员工（现成 delegate 是同步的，最稳）。聊天里仍呈现「群聊感」（员工随干随冒泡）。真·多员工并行 = 后续增强。

### 4.5 退役的旧逻辑

`auto-router.ts`、`auto-fill.ts`、`smart-dispatch.ts` 的影子 agent 抢占/排队逻辑——被 PM 原生推理取代。

## 5. 定时任务接入聊天

`scheduler` 到点 → 不走旧 `smartDispatch`，而是：

1. 往对应会话注入一条 `role:'system'` 消息（如「[定时] 执行：<任务标题>」）
2. 启动该会话的 PM loop
3. 群里出现带日期分隔（`round_start` 事件）的新一轮，复用同批员工与上下文

`scheduler.ts` 的 node-cron 注册/反注册机制保留。

## 6. 流式 / SSE

- 会话级通道：`GET /api/agent-x/conversations/:id/sse`（复用 `SseManager` topic 机制）
- 事件在现有 `AgentXSseEvent` 上扩展（带 `conversationId`）：
  - `message_start`(role, agentId) / `message_delta`(token) / `message_end`
  - `tool_start` / `tool_end`（已有）
  - `member_joined`（PM 拉人）
  - `round_start`（定时/日期分隔）
  - `task_status` / `error`
- 渲染：打开会话 `GET /messages` 拉历史，之后靠 SSE 实时追加

## 7. 前端

### 7.1 页面

- **Chat**（默认，三栏）：左会话列表 / 中群聊+输入框 / 右群成员
- **Employees**：员工管理
- **Knowledge Base**：知识库（stub）
- **Dashboard / Costs**：次要 tab

### 7.2 组件

- **复用**：`messages-calling-tools`(工具卡)、markdown 渲染、`chat-layout` 的 nav-histories 模式、SSE 订阅模式
- **新建**：`ConversationList`、`GroupChat`、`GroupMessageBubble`(头像+名字+team标签+内容+工具卡，区分 pm/employee/user/system)、`GroupMembersPanel`(实时在岗/忙状态 + 加人)、`Composer`(@mention 点名员工)、`EmployeesPage`、`EmployeeEditor`、`AvatarPicker`、`KnowledgeBasePage`
- **退役**：`org-editor-graph`、`org-graph`、`department-config-panel`、`task-dispatch-dialog`、`task-kanban`(archive)；`agent-config-panel` → 改造为 `EmployeeEditor`

### 7.3 员工编辑器

名字、头像(`AvatarPicker`)、team、systemPrompt、skills 多选、MCP 多选、toolAllowList、model/provider、**记忆查看**（只读列出 `agentMemory`）。

## 8. 头像与起名（DiceBear）

- 存 `avatarSeed` + `avatarStyle`，渲染时确定性出图，不存图片、离线可用
- 默认风格：动手前用可视化辅助摆样张定（候选 `notionists` / `thumbs` / `adventurer`，偏人物/角色感）
- 缺名 → 自动起名（中性名字池随机）+ 随机 seed 出头像

## 9. 知识库 stub

- 页面：文档列表 + 添加（title/content）
- `searchKnowledgeBase(query)` 工具：朴素匹配（标题/正文 substring）返回假结果；函数签名与返回结构按真 RAG（embedding 检索）预留，将来替换不动调用方

## 10. Costs 修复（agent x 专属）

**现状 bug**：Costs 页读全局 `getUsageSummary`，把日常会话开销也算进去了。

**改法**：Costs 仅聚合 agent x 的 `taskExecution.tokenUsage`（按 conversation / task / 员工 / 时间维度），与日常 chat 的 usage 彻底分开；不再调用全局 `getUsageSummary`。新增对应聚合查询/端点。

## 11. 迁移

`pnpm db:generate` 生成：删 `department`、改 `agent`(去字段/加字段)、改 `task`(加 conversationId / 去 assignedDepartmentId)、新增 `conversation` / `message` / `knowledgeDoc`。

## 12. 错误处理

- 员工 agentLoop 失败 → 作为 `role:'system'` 错误气泡进群；PM 收到失败结果，决定重试 / 换人 / 上报用户（现有 retry 纳入 PM 决策）
- PM 自身失败 → 群里出错误气泡，**不静默吞**（与近期 chat.ts 的「不保存空消息」修复一致）

## 13. 测试

按 `*.test.ts` 放模块旁，mock electron/pglite：

- PM 工具选择 / 纠偏决策逻辑
- `searchKnowledgeBase` stub 行为
- Costs 聚合只含 agent x（不含日常会话）
- 迁移后 conversation/message/task 查询

## 14. 建议构建顺序

1. 数据模型 + 迁移
2. 后端：PM 协调器 + 员工 loop 改造（skills/MCP 取自员工）+ conversation/message 查询 + 会话级 SSE + KB stub + `searchKnowledgeBase`
3. 前端：三栏聊天 + 员工页 + 知识库页
4. 定时任务接入聊天
5. Costs 修复
6. 头像默认风格定稿 + 打磨

## 15. 范围之外 / 后续

- 多员工真并行执行
- 真 RAG（embedding 检索）替换 stub
- 影子 agent / 抢占
- 每会话自定义 PM

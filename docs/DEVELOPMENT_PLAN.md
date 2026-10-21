# Garden — AI Interactive Story Simulator
## Development Plan

---

# 0. 项目目标

本项目将原本依赖超长 Prompt 运行的互动剧情文游，产品化为一个真正的 AI Web Game。

核心目标不是制作一个“LLM 聊天页面”，而是建立：

- 固定游戏规则
- Game State
- Relationship State Machine
- Event Engine
- Rule Engine
- Structured Memory
- AI Narrative Generation
- SNS / Chat / NPC 世界联动
- 多结局系统

最终架构：

```text
玩家操作
    ↓
Action Interpreter
    ↓
Game State
    ↓
Rule Engine
    ↓
Event Engine
    ↓
Memory Retrieval
    ↓
Context Builder
    ↓
LLM
    ↓
Output Validator
    ↓
State Engine
    ↓
Memory Update
    ↓
UI
```

核心原则：

> 程序负责规则、状态和事实。
>
> Memory 负责过去发生过什么。
>
> LLM 负责自然语言理解、人物演绎和剧情创作。

---

# 1. 项目文档优先级

项目中存在三个不同作用的文档。

## 1.1 original-game-design.docx

这是：

**游戏内容的 Source of Truth。**

负责定义：

- 世界观
- 游戏调性
- 玩家创建规则
- 玩家身份
- 男主人设
- 追星程度
- 剧情节奏
- 角色卡
- 游戏属性
- NPC
- 感情阶段
- 事件池
- 危机事件
- 特殊触发条件
- 结局
- 叙事限制
- 禁止事项
- 图像需求

Codex 不得擅自根据自己的理解：

- 删除设定
- 合并人物
- 改写人物性格
- 修改恋爱雷区
- 缩减事件池
- 修改关系阶段
- 修改触发阈值
- 改写结局条件

除非后续明确收到新的产品需求。

---

## 1.2 GAME_SPEC.md

这是：

**面向开发的结构化游戏规格。**

它不是重新创作游戏。

它的任务是把 original-game-design.docx 中已有内容整理成开发能够直接使用的结构。

如果：

GAME_SPEC 与 original-game-design.docx 出现内容冲突，

以：

**original-game-design.docx**

为准。

---

## 1.3 DEVELOPMENT_PLAN.md

这是：

**技术架构与开发流程的 Source of Truth。**

它负责决定：

- 使用什么技术
- 代码如何组织
- 开发阶段
- AI 与程序的职责边界
- 数据如何存储
- Memory 如何设计
- 如何验收

如果技术实现细节与 GAME_SPEC 不同：

技术实现以 DEVELOPMENT_PLAN 为准；

游戏内容以 GAME_SPEC / 原始文档为准。

---

# 2. 内容使用边界

本项目基于用户提供的平行世界游戏设定进行开发。

对于角色设定：

只使用项目文档提供的游戏人设。

不要自行：

- 搜索现实艺人的私生活
- 补充现实恋爱经历
- 补充现实家庭信息
- 引入未经文档提供的争议或八卦
- 将游戏中的私下性格描述为现实本人真实人格

所有人物剧情均属于：

**平行世界虚构游戏设定。**

游戏中的亲密关系角色必须为成年人。

---

# 3. Narrative Constraints

这些规则不仅属于 Prompt，也属于游戏系统设计。

必须长期遵守。

## 3.1 第一视角信息限制

玩家只能知道：

- 自己亲眼看到的内容
- NPC明确告诉玩家的信息
- 玩家能够合理获得的社交媒体信息
- 已经解锁的剧情信息

玩家不能直接知道：

- 男主没有表达的内心想法
- 经纪人秘密讨论内容
- 公司暗中决策
- 粉圈尚未公开的信息
- NPC hidden facts

这些内容应进入：

```text
Hidden Memory
```

而不是直接出现在玩家剧情中。

---

## 3.2 Relationship Boundary

关系必须按照 Relationship State Machine 推进。

禁止：

- 无缘无故爱上玩家
- 陌生阶段主动深情告白
- 直接跳过暧昧
- 未达到关系阶段却产生不合理的亲密行为

玩家可以尝试越界行为。

但：

**NPC必须按照当前关系、性格和情境给出合理反应。**

不要通过禁止输入限制玩家自由度。

---

## 3.3 NPC Independence

NPC 不能只是剧情工具。

例如：

经纪人不能自动成为反派。

圈内女性角色不能自动成为恶毒情敌。

其他成员不能全部成为无脑助攻。

粉丝不能全部被塑造成恶意群体。

NPC应拥有：

- 自己的目标
- 自己的关系
- 自己知道的信息
- 自己不知道的信息
- 自己的风险判断
- 自己的重要 Memory

---

## 3.4 Player Independence

恋爱不是玩家唯一的人生。

玩家需要保留：

- 学业
- 工作
- 金钱
- 家庭
- 朋友
- 职业
- 自我成长

不同身份应该真实影响剧情。

不能让玩家无代价进入艺人生活。

---

# 4. 技术栈

第一版：

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Zod
- Next.js Server API
- localStorage

第二阶段再考虑：

- Supabase PostgreSQL
- 用户账号
- 云存档

第一版不要使用：

- LangChain
- Multi-Agent Framework
- Vector Database
- 复杂 RAG
- 微服务架构

除非后期数据规模证明确实需要。

---

# 5. 项目目录建议

```text
/docs
    original-game-design.docx
    GAME_SPEC.md
    DEVELOPMENT_PLAN.md

/app

/components
    game/
    character/
    chat/
    sns/
    npc/
    common/

/config
    characters/
    identities.ts
    fanLevels.ts
    gameModes.ts
    relationshipStages.ts
    npcTypes.ts
    eventPool.ts
    endings.ts
    globalRules.ts

/game
    ruleEngine.ts
    eventEngine.ts
    stateEngine.ts
    memoryEngine.ts
    endingEngine.ts
    contextBuilder.ts

/ai
    storyGenerator.ts
    actionInterpreter.ts
    schemas.ts
    prompts.ts

/store
    gameStore.ts

/types
    game.ts
    memory.ts
    event.ts
    character.ts
    npc.ts

/app/api
    game/
```

目录可以根据 Next.js 实际版本调整。

但必须保持：

**UI / Config / Game Logic / AI Logic 分离。**

---

# 6. Phase 1 — Web UI Skeleton

目标：

先让完整用户流程跑通。

这一阶段：

不要接 AI。

不要接数据库。

不要真正实现 Rule Engine。

---

## 页面流程

```text
Landing Page
     ↓
开始游戏
     ↓
Player Creation
     ↓
Character Selection
     ↓
Character Card
     ↓
进入剧情
     ↓
Game Main Page
```

---

## Player Creation

至少包含：

- 姓名
- 年龄
- 玩家身份
- 男主
- 追星程度
- 剧情节奏

数据可以暂时使用 mock data。

---

## Game Main Page

顶部：

- 第 X 周
- 当前地点
- 当前男主
- 当前关系阶段

状态：

- 好感度
- 人气值
- 心情值
- 金钱
- 恋情保密度
- 公司警觉度
- 事业压力

正文：

- 剧情标题
- 剧情正文
- A
- B
- C
- 自由行动输入框

底部导航：

- 剧情
- 消息
- SNS
- 人物
- 档案

---

## Phase 1 验收

必须能够完整操作：

```text
开始游戏
→ 创建角色
→ 确认
→ 查看角色卡
→ 进入游戏
→ 点击选项
→ 打开底部导航
```

允许所有数据为 Mock。

完成后停止。

不要自行进入下一 Phase。

---

# 7. Phase 1.5 — GAME_SPEC

这是正式开发游戏系统前必须完成的阶段。

Codex需要读取：

```text
docs/original-game-design.docx
```

然后创建：

```text
docs/GAME_SPEC.md
```

这一阶段：

**不要实现游戏逻辑。**

任务仅仅是把原始文档结构化。

---

## GAME_SPEC 至少包含

### Global Rules

游戏整体调性与核心原则。

---

### Player Setup

完整保留：

- 玩家身份选项
- 身份描述
- 优势
- 劣势
- 自定义身份

---

### Character Definitions

每一名可攻略角色分别整理：

- 名称
- Character ID
- 标签
- 性格
- 真实侧面（游戏设定）
- 恋爱雷区
- 推荐剧情
- 行为特征

不要擅自压缩成几个简单关键词。

---

### Fan Level

完整保留原始选项。

---

### Game Mode

完整保留所有剧情节奏模式。

---

### Character Card

整理：

- 基础资料
- 公开人设
- 私下性格
- 恋爱雷区
- 当前事业阶段
- 初始关系状态
- 档案详情
- 细节挖掘

---

### Game State

完整定义：

- affection
- popularity
- mood
- money
- secrecy
- companyAlert
- careerPressure

---

### NPC System

完整整理所有 NPC Slot。

包括：

- NPC角色定位
- 功能
- 与玩家关系
- 风险
- 叙事约束

---

### Relationship State Machine

完整保留：

```text
0–15 陌生人

16–30 有印象

31–50 产生兴趣

51–65 暧昧期

66–80 确认关系

81–90 热恋期

91–100 考验期
```

并整理每一阶段：

允许行为

禁止行为

典型互动。

---

### Event Pool

完整整理：

- 日常
- 感情
- 韩娱工作
- 粉圈舆论
- 公司
- 现实生活
- 圈内事件
- 危机

以及原始文档中出现的具体事件示例。

不要只保留八个分类名称。

---

### Trigger Events

完整整理全部阈值事件。

---

### Ending Rules

完整整理：

- HE
- OE
- BE
- SE

以及对应条件。

---

### Narrative Constraints

完整整理：

- 第一视角
- 禁止跳级
- NPC不能工具人化
- 现实/虚构边界
- 玩家独立人生
- 其他禁止事项

---

### Opening Template

保留原始首回合模板作为：

```text
reference opening
```

它是剧情风格参考。

不是要求每个新游戏完全复制同一个开局。

---

## Phase 1.5 验收

必须制作：

```text
CONTENT_COVERAGE_CHECKLIST
```

确认原始文档中的主要章节是否都已经进入 GAME_SPEC。

不允许 Codex用：

“etc.”

“等等”

“类似事件”

来替代原文中已经明确列出的重要设定。

如果内容很长，可以结构化整理，但不能因为长度擅自删除。

完成后停止。

---

# 8. Phase 2 — Config & Game State

现在开始把 GAME_SPEC 转换成代码。

建立：

```text
/config
/types
```

---

## Character Config

每个角色单独文件。

例如：

```text
/config/characters/sion.ts
/config/characters/riku.ts
...
```

Character Config 至少包含：

```text
id
name
tags
publicPersona
privatePersona
traits
romanceTriggers
romanceTaboos
preferredEventTypes
narrativeConstraints
```

不要把全部人物重新塞回一个 Prompt。

---

## Player Config

建立：

```text
identityConfig
fanLevelConfig
gameModeConfig
```

---

## GameState

至少：

```text
gameId

week

currentScene

careerStage

player

maleLead

gameMode

relationshipStage

stats
```

stats：

```text
affection
popularity
mood
money
secrecy
companyAlert
careerPressure
```

---

## Relationship State

关系阶段由程序自动判断。

LLM没有权限自行设置。

---

## Phase 2 验收

修改：

```text
affection
```

后：

```text
relationshipStage
```

必须自动更新。

刷新 UI 后正确显示。

不要接 AI。

---

# 9. Phase 3 — Rule Engine / Event Engine

建立：

```text
ruleEngine.ts
stateEngine.ts
eventEngine.ts
endingEngine.ts
```

---

# Rule Engine

负责判断：

- 当前允许发生什么
- 当前禁止发生什么
- 当前关系允许什么程度的互动
- 当前有哪些特殊条件被满足
- 玩家自由行为是否合法/风险多高

Rule Engine 不负责写剧情。

---

# Event Engine

事件分类至少支持：

```text
daily
relationship
career
publicOpinion
company
reality
entertainment
crisis
```

具体 Event Template 应来自 GAME_SPEC。

---

## Event Template

建议：

```ts
{
  id,
  category,
  tags,
  requirements,
  exclusions,
  baseWeight,
  affectedStats,
  cooldown,
  oncePerSave
}
```

---

## Game Mode 权重

剧情模式不能只作为 Prompt。

必须改变 Event Weight。

例如：

慢热现实向：

提高现实、日常、事业事件概率。

降低过快恋爱事件概率。

高压舆论向：

提高：

- publicOpinion
- company
- crisis

日常治愈向：

提高：

- daily
- relationship

但危机不能完全消失。

实际数值由实现阶段合理设置并统一维护在 Config 中。

不要散落在组件代码中。

---

# 10. Special Trigger Rules

必须至少实现原文中的特殊触发逻辑。

包括：

```text
mood < 20
→ 情绪崩溃

secrecy < 30
→ 媒体曝光危机

popularity > 60
→ 玩家开始被认出

money < 500
→ 经济困难

companyAlert > 80
→ 公司强制干预

careerPressure > 90
→ 男主崩溃
```

Event Engine负责识别：

候选事件。

LLM负责把事件写成：

具体剧情。

---

# 11. Ending Engine

Ending不能让LLM决定。

程序根据：

```text
week
affection
secrecy
companyAlert
careerPressure
playerLifeState
重要剧情Flag
```

判断：

当前有哪些 Ending Candidate。

AI只负责：

**在结局已经确定后进行文字演绎。**

---

# 12. Phase 3 验收

增加 Developer Debug Controls。

可以手动修改：

```text
affection
secrecy
companyAlert
careerPressure
money
mood
popularity
```

测试：

是否能正确触发：

- 关系阶段
- 危机事件
- Ending Candidate

完成后停止。

---

# 13. Phase 4 — Structured Memory

第一版不使用：

Vector Database。

建立：

```text
memoryEngine.ts
```

---

## Memory Schema

建议：

```ts
{
  id,
  gameId,
  week,
  type,
  actors,
  content,
  importance,
  emotion,
  tags,
  visibility,
  createdAt
}
```

---

## Memory Type

至少：

```text
short_term
long_term
relationship
hidden
```

---

## Visibility

至少：

```text
player_known
shared
hidden
```

---

# 14. Memory 职责

## Short-term

保存最近剧情上下文。

例如：

最近争吵。

刚刚发生的机场事件。

---

## Long-term

保存：

对后续剧情具有长期价值的重要事件。

例如：

第一次私聊。

第一次重大冲突。

重要选择。

---

## Relationship Memory

保存人物之间：

- 喜好
- 承诺
- 秘密
- 冲突
- 重要经历
- 已知信息

---

## Hidden Memory

保存：

游戏世界已经发生，

但玩家还不知道的事实。

例如：

```text
经纪人已经开始怀疑两人关系。
```

玩家不能直接读取 Hidden Memory。

Story Generator只能：

通过角色行为间接表现。

---

# 15. Memory Retrieval

第一版基于：

```text
actors
tags
importance
week
type
```

筛选。

不要做 embedding。

不要做 vector search。

例如：

当前事件：

```text
airport
riku
publicExposure
```

Memory Engine 可以寻找：

```text
actors includes riku
AND
tags contains airport OR publicExposure
```

再结合：

importance

recentness

选取少量相关 Memory。

---

# 16. Save System

第一版使用：

```text
Zustand
+
localStorage
```

必须保存：

- GameState
- Memory
- Event History
- NPC State
- Player Setup
- Current Week

刷新浏览器不能丢失。

支持：

- New Game
- Continue
- Delete Save

---

# 17. Phase 5 — AI Integration

只有前面游戏系统稳定之后才接 LLM。

建立：

```text
storyGenerator.ts
actionInterpreter.ts
contextBuilder.ts
schemas.ts
prompts.ts
```

---

# 18. Context Builder

每回合不要发送完整原始文档。

只发送当前真正需要的信息：

```text
Global Narrative Rules
+
Current Character Config
+
Current Relationship Stage
+
Current GameState
+
Current Event
+
Relevant NPC
+
Recent Events
+
Relevant Memories
+
Allowed Behavior
+
Forbidden Behavior
+
Player Action
```

---

# 19. Story Generator

LLM负责：

- 环境描写
- 人物对白
- NPC表现
- 剧情演绎
- A/B/C选项文案
- Memory Candidate建议

LLM不负责：

- 最终属性值
- 最终关系阶段
- 最终结局
- 特殊事件阈值判断

---

# 20. Structured Output

使用 Zod 校验。

示例：

```json
{
  "title": "",
  "story": "",
  "choices": [
    {
      "id": "A",
      "text": ""
    },
    {
      "id": "B",
      "text": ""
    },
    {
      "id": "C",
      "text": ""
    }
  ],
  "memoryCandidates": [],
  "suggestedEffects": {}
}
```

---

# 21. State Change

LLM不能返回：

```text
affection +7
```

作为最终结算。

它只能返回：

```text
affection: small_positive
```

或者结构化语义标签。

State Engine再映射为：

```text
small_positive → +2
```

实际变化还需要考虑：

- 当前关系阶段
- 角色性格
- 事件类型
- 风险程度
- 剧情模式

最终结果只能由 State Engine 写入 GameState。

---

# 22. Free Action

玩家必须可以自由输入行为。

例如：

```text
我追上去，把他掉下来的耳机递给他，
然后什么都没说就走。
```

Action Interpreter 转换成：

```json
{
  "intent": "help_then_leave",
  "initiative": "medium",
  "romanticIntensity": "low",
  "publicExposure": "low",
  "risk": "low"
}
```

再交给：

Rule Engine。

---

## 玩家越界行为

不要阻止玩家输入。

例如：

陌生阶段玩家：

“我直接向他表白。”

允许尝试。

但是：

根据：

- relationshipStage
- characterConfig
- context

生成合理后果。

不能因为玩家输入表白：

男主就自动接受。

---

# 23. Mock AI Mode

必须保留：

```text
Mock AI Mode
```

如果没有 API Key：

整个项目仍然可以运行。

便于：

- UI开发
- Rule Engine测试
- Event测试
- 面试演示
- 降低API消耗

---

# 24. Phase 6 — World Systems

实现：

```text
Chat
SNS
NPC Interaction
```

它们不能拥有三个独立世界。

全部共享：

```text
GameState
Memory
NPC State
Event History
```

---

## 示例

主剧情：

```text
机场事件：
男主下意识替玩家挡镜头。
```

系统写入：

```text
airport_protection_event
```

Event Engine判断：

可能出现舆论扩散。

SNS：

```text
粉丝讨论机场动作异常。
```

State：

```text
secrecy ↓
companyAlert ↑
```

随后触发：

```text
经纪人消息。
```

这是一条：

**Cross-System Event Chain。**

---

# 25. Chat System

聊天内容必须受：

- 关系阶段
- Character Config
- Memory
- 当前事业压力
- 当前事件

影响。

不能独立生成随机甜蜜对话。

---

# 26. SNS System

SNS可以模拟：

- 粉圈讨论
- 韩网论坛
- X
- Instagram
- 路透
- 爆料
- 舆论发酵

LLM负责：

具体帖子文案。

Event Engine负责：

SNS事件是否发生。

State Engine负责：

SNS事件产生什么后果。

---

# 27. NPC State

每个实际生成的 NPC 可以拥有：

```text
id
type
name
personality
relationship
trust
knownFacts
hiddenFacts
memories
```

NPC不能每次重新生成。

同一个存档中的 NPC：

必须具有连续性。

---

# 28. Phase 7 — Visual & UX

只有核心玩法稳定以后才完善。

包括：

- 响应式手机布局
- UI视觉统一
- 页面过渡
- Loading
- Error State
- Retry
- Save Management
- 动画
- 游戏日志

---

# 29. Character Visual System

原始文档希望游戏中存在角色视觉内容。

产品实现时保留：

```text
Character Visual Asset
```

字段和接口。

第一版本优先使用：

- 插画
- 游戏立绘
- 非写实头像

不要生成：

可能被误认为现实人物真实照片的视觉。

建议每个角色至少准备：

```text
normal
happy
sad
angry
tired
```

等基础状态。

剧情系统根据：

Character State

选择适合的视觉资源。

未来如果加入动态 Image Generation：

必须继续保持：

**明显的虚构游戏视觉风格。**

---

# 30. Debug Panel

开发环境必须提供 Debug Panel。

只在 development mode 显示。

可以查看：

```text
GameState

Relationship Stage

Current Event

Event Candidate

Event Weight

Memory

Hidden Memory

NPC State

Rule Engine Result

Ending Candidate
```

这是后续调试 AI 游戏最重要的工具之一。

---

# 31. 每个 Phase 的统一开发规则

Codex每一次只开发当前指定 Phase。

不要自动：

```text
进入下一Phase
```

完成以后必须汇报：

1. 修改了哪些文件
2. 新增了哪些文件
3. 当前实现了哪些功能
4. 哪些功能仍然是 Mock
5. 如何运行
6. 如何验收
7. 是否存在已知问题

---

# 32. 禁止行为

开发过程中不要：

- 为了方便删除游戏设定
- 把完整 DOCX 每轮发送给 LLM
- 让 LLM控制最终 GameState
- 让 LLM决定 Relationship Stage
- 让 LLM决定 Ending
- 用聊天记录代替 Structured Memory
- 在第一版直接加入复杂 Vector DB
- 在第一版直接加入 Multi-Agent
- 在 React Component 中写大量游戏规则
- 将 API Key 暴露到 Client
- 每个系统创建独立、不一致的游戏状态
- 为了减少代码而合并具有不同意义的属性
- 自行补充现实人物未经游戏文档定义的私生活信息

---

# 33. 产品最终目标

完成后的产品不应该是：

```text
Prompt
+
LLM
+
Chat UI
```

而应该是：

```text
Game Rules
+
Game State
+
Relationship State Machine
+
Event Engine
+
Structured Memory
+
NPC State
+
AI Narrative
+
Free-form Player Input
+
Chat / SNS / Story Cross-System World
+
Ending Engine
```

最终核心体验：

> 玩家可以自由行动，
> AI让世界保持开放；
> 程序让世界保持一致；
> Memory让角色真正记得过去；
> Game Rules保证剧情不会因为LLM随机性而失控。
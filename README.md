# Garden · Phase 3A Rule Engine

NCT WISH 平行世界互动剧情 Web Game。当前实现止于 Phase 3A：在 Phase 2 的 Config 与 GameState 之上增加了纯判断、无副作用的 Rule Engine。

## 启动

环境要求：Node.js 20.9 或更高版本。

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 验证

```bash
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
```

单元测试使用 Node 自带测试能力，不需要额外测试框架。`test:relationship` 覆盖关系阶段边界，`test:rules` 覆盖关系规则、特殊触发、越界行为、人物雷区与无副作用要求。

## Phase 2 数据层

- `config/characters/`：六名可攻略角色的独立完整配置。
- `config/identities.ts`：八种玩家身份，包括自定义入口。
- `config/fan-levels.ts`：五档追星程度。
- `config/game-modes.ts`：四种剧情节奏；尚未实现事件权重。
- `config/relationship-stages.ts`：七个关系阶段及允许、禁止和典型互动。
- `config/initial-state.ts`：原始设定中的初始范围和开局示例值。
- `types/`：Player、Character、GameState、GameStats、RelationshipStage、NPCType、EventCategory 等领域类型。
- `game/create-initial-game-state.ts`：从角色创建结果建立初始 `GameState`。
- `game/relationship.ts`：从 `affection` 唯一派生关系阶段。
- `store/game-store.ts`：角色创建、GameState 和 Phase 1 交互预览共用的 Zustand Store。

## Phase 3A Rule Engine

- `types/rules.ts`：结构化玩家动作、互动级别、风险、警告、违规、触发条件和评估结果类型。
- `config/relationship-rules.ts`：七段关系对应的机器可读互动级别和可接受动作类型。
- `config/special-trigger-rules.ts`：六条特殊触发阈值。
- `game/ruleEngine.ts`：关系规则、越界判断、风险、特殊触发与角色雷区匹配 API。

`allowed: false` 只表示行动超出当前叙事边界；`canAttempt` 始终为 `true`。Rule Engine 不拦截自由行动，也不修改 GameState。

开发环境中的游戏主界面会显示轻量 `Phase 3A Debug` 控件，可快速把好感度调整为 10、20、40、60、70、85、95，并观察当前关系规则与已满足的特殊触发。生产构建不会显示该控件。

## 当前边界

Phase 1 的三段固定 Mock 剧情、消息和 SNS 展示仍保留。A/B/C 不结算数值，也不推进周数。项目尚未接入 Event Engine、State Engine、Ending Engine、Structured Memory、LLM 或真正的 Chat/SNS 逻辑。

Store 只做 Phase 2 所需的轻量浏览器持久化，用于防止页面导航或刷新造成创建信息与 GameState 冲突；多存档、继续游戏和删除存档仍属于后续阶段。

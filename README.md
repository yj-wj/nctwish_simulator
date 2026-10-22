# Garden

Garden 是一个基于 Next.js 的 AI 互动剧情 Web Game。玩家可以创建成年角色、选择男主，通过 A/B/C 选项或自由行动推进故事，并在同一局游戏中使用消息、SNS、人物档案和本地存档。

## 技术栈

- Next.js 16、React 19、TypeScript、Tailwind CSS
- Zustand 状态管理、Zod 数据校验
- Node Test Runner 单元测试、Playwright 端到端测试
- Mock 与 Qwen 两种 AI Provider 模式

AI 负责理解玩家行动并生成 Story、Chat 和 SNS 文案；Rule、Event、State、History、Memory、World 与 Ending Engine 负责确定性的规则与状态结算。

## 本地运行

需要 Node.js 20.9 或更高版本。

```bash
npm install
copy .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`。默认使用 Mock 模式，无需外部 API。

## 环境配置

```ini
AI_MODE=mock
DASHSCOPE_API_KEY=
DASHSCOPE_BASE_URL=
ACTION_MODEL=qwen3.7-flash
STORY_MODEL=qwen3.7-plus
CHAT_MODEL=qwen3.7-plus
SNS_MODEL=qwen3.7-plus
RUN_LIVE_AI_TESTS=false
NEXT_PUBLIC_DEBUG_MODE=false
```

使用 Qwen 时，将 `AI_MODE` 设为 `qwen`，并只在 `.env.local` 中填写 DashScope API Key、兼容接口地址和模型名。`.env.local` 已被 Git 忽略；不要把真实 Key 写入 `.env.example`。

`NEXT_PUBLIC_DEBUG_MODE=true` 会显示现有 Rule、Event、State、Memory、AI Trace、Save、Chat、SNS 与 World 调试界面；设为 `false` 或不设置时隐藏。该变量只控制 Debug UI 是否渲染，不参与游戏状态或 AI 调用。

自动测试应保持 `RUN_LIVE_AI_TESTS=false`，避免消耗真实 Qwen API。

## 检查与构建

```bash
npm run test:unit
npm run typecheck
npm run build
npm run test:e2e
```

生产预览：

```bash
npm run start
```

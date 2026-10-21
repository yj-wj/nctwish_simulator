# Garden · Phase 1 Web UI Skeleton

一个可以启动和点击的 NCT WISH 平行世界互动剧情游戏 UI 骨架。本次开发严格止于 `DEVELOPMENT_PLAN.md` 的 Phase 1。

## 文档与范围

- 已完整阅读根目录 `DEVELOPMENT_PLAN.md`。
- 目录实际提供的原始设定文件是 `花园人设版.docx`，未找到名为 `original-game-design.docx` 的文件。已完整读取该 DOCX 正文，作为本阶段游戏内容依据。
- 两份原文件均保留原路径、原内容，没有改名、移动或覆盖。
- 游戏内容以 DOCX 为准；技术架构与开发范围以开发计划为准。
- 尚未编写 `GAME_SPEC.md`，没有进入 Phase 1.5 或 Phase 2。

## 启动

需要 Node.js 20.9 或更新版本与 npm。开发时使用 Node.js 24。

```powershell
cd D:\codex\nctwish_simulator
npm ci
npm run dev
```

打开终端打印的地址，默认是 http://localhost:3000 。当前工作区已经安装依赖，可直接运行 `npm run dev`。

生产模式：

```powershell
npm run build
npm run start
```

不需要 `.env`、API Key、账号或数据库。依赖安装后，页面不依赖外部图片、远程字体或 AI 请求。

## 已实现

完整页面流程：

```text
/ 开始游戏
  → /create 玩家创建
  → /characters 男主选择
  → /character-card 角色卡
  → /game 剧情主界面
```

- 玩家创建：姓名、整数年龄（18 岁及以上）、8 种身份（含自定义）、6 位男主、5 种追星程度、4 种剧情节奏。身份展示原文的描述、优势与劣势；自定义身份要求补充文本。
- 男主选择：六位角色分别呈现；与创建页的预选同步，可返回修改。
- 角色卡：成年身份、组合、事业阶段样例、初始关系、人物描述、原文人设参考、恋爱雷区、可展开的档案详情和细节观察、玩家创建信息与初始样例属性。
- 主界面：当前周数、场景、男主、关系阶段及七项状态。
- 剧情：原文首回合与两段固定 Mock 样例循环展示。点击任意 A/B/C 后进入下一段，显示上一轮选项与文字；每段保留标题、正文、三选项和自由行动输入框。
- 五个底部页面：剧情、消息、SNS、人物、档案。
- 消息：切换两个静态示例会话；不开放发送。
- SNS：虚构示例帖子与可切换的界面点赞；不影响游戏属性。
- 档案：当前创建信息及最近一次操作回执；可返回编辑。
- 基础响应式布局、键盘焦点、原生表单单选组、输入错误提示、路由保护。

## Mock 边界与已知限制

| 内容 | 当前行为 |
| --- | --- |
| 周数、地点、关系、事业阶段、七项状态 | 固定样例；不做属性结算、随机化或阶段判断 |
| 剧情 | 原文开局 → 门后的脚步声 → 风停下的片刻 → 原文开局，三段循环；后两段标为 UI 样例 |
| A/B/C | 任意选项都切换到下一段固定剧情；保留上一轮选择与回执，没有分支判定或属性变化 |
| 自由行动 | 接收并展示文本，不切换剧情；没有理解、审核、事件触发或 AI 回复 |
| 人物 | 原文设定的展示摘录，非完整 Phase 2 配置；私下性格标为设定参考，不作为已知剧情事实 |
| 角色卡字数与条目 | 本阶段摘录，不伪造缺失信息、不凑足固定条数；完整结构化整理留给 Phase 1.5 |
| 视觉 | CSS 夜景装饰与角色字母占位；未生成真人图像或角色立绘 |
| 消息 / SNS | 静态虚构样例；没有跨系统世界联动 |
| 档案 | 仅当前运行中的 UI 信息；不是正式存档或 Memory |
| 持久化 | Zustand 内存状态仅保留本次会话；刷新、关闭或新开标签页后须重新创建 |
| 后端 | 没有 API 路由、模型配置、LLM、Supabase、数据库、任何游戏引擎 |

原文中的规则、事件、阈值、关系阶段与结局仍完整保存在原 DOCX。本阶段未尝试将它们代码化或用 Mock 规则替代。

## 代码组织与新增文件

首次 Phase 1 开发新增了以下应用文件，两份原始文档未修改。后续 Mock 剧情循环仅修改 `mocks/story.ts`、`types/ui.ts`、`store/ui-store.ts`、`components/game/story-panel.tsx`、`tests/phase-one.spec.ts`、`playwright.config.ts` 和本 README，没有新增文件。

```text
.gitignore
package.json
package-lock.json
tsconfig.json
next-env.d.ts                 # Next.js 自动生成；不提交
next.config.ts
postcss.config.mjs
playwright.config.ts
README.md
app/
  layout.tsx
  globals.css
  page.tsx
  not-found.tsx
  create/page.tsx
  characters/page.tsx
  character-card/page.tsx
  game/
    layout.tsx
    page.tsx
    messages/page.tsx
    sns/page.tsx
    characters/page.tsx
    archive/page.tsx
components/
  common/
    brand.tsx
    site-header.tsx
    setup-shell.tsx
    route-guard.tsx
    night-garden.tsx
    start-button.tsx
  character/
    player-form.tsx
    character-selection.tsx
    character-profile.tsx
    character-visual.tsx
  game/
    game-shell.tsx
    stat-strip.tsx
    story-panel.tsx
    bottom-nav.tsx
    archive-preview.tsx
  chat/message-preview.tsx
  sns/sns-preview.tsx
mocks/
  setup-options.ts
  characters.ts
  story.ts
  world.ts
lib/player-schema.ts
store/ui-store.ts
types/ui.ts
tests/phase-one.spec.ts
```

`types/ui.ts` 仅定义页面数据契约；`store/ui-store.ts` 仅保存表单、路由进度、当前 Mock 片段索引与上一轮操作。切换底部页面会保留片段；重新创建或选择角色会重置为开局。它们不是后续正式的 GameState、Memory 或状态引擎。展示数据集中在 `mocks/`，后续可替换数据来源而保留页面组件。

## Phase 1 人工验收

1. 首页点击「开始游戏」。
2. 空表单提交，应提示填写名字与年龄；17 岁应被提示成年限制。
3. 填写姓名、成年年龄，检查 8 种身份、5 种追星程度、4 种节奏、6 位男主。选择自定义身份时应出现必填输入框。
4. 点击「确认，选择男主」，切换六位角色，点击「确定，查看角色卡」。
5. 验证角色卡和创建信息一致，展开「档案详情」「恋爱雷区」「细节挖掘」；返回修改后内容应同步。
6. 点击「进入剧情」，确认周数、场景、男主、陌生人关系与七项状态全部显示。
7. 依次点击 A、B、C，应看到「门后的脚步声」→「风停下的片刻」→ 原文开局，再点一次可继续循环。每次标题、正文与选项切换，顶部显示上一轮选项，属性、周数与关系不变；自由行动草稿清空。
8. 空白提交自由行动应提示；输入任意行动后提交，应显示已接收，不能伪装成 AI 回复。
9. 打开五个底部页面；消息可切换室友与妈妈，SNS 点赞可取消，人物对应当前男主，档案显示玩家与最近行动。
10. 将窗口缩到手机宽度，检查无横向溢出、底部导航可点击、表单与正文可读。
11. 刷新游戏页面，应安全回到创建页。此行为对应当前无存档的明确限制。

## 自动检查

```powershell
npm run typecheck
npm run build
npm run test:e2e
```

浏览器测试使用本机 Google Chrome（Playwright `channel: chrome`），需先完成生产构建。配置会在独立的 3100 端口启动最新生产构建，并在测试结束时关闭，不复用 3000 端口可能存在的旧预览。请保持 3100 端口空闲。无 Chrome 的环境可安装 Chrome 或调整 `playwright.config.ts` 使用已有的 Playwright Chromium。

用例在桌面 1440×1000 与手机 390×664 的视口下执行，覆盖完整流程、Mock 剧情循环与上一轮选择、页面切换后保持片段、全部角色切换、输入校验、五页导航、属性不结算、刷新回退及直接访问保护。截图保存在被忽略的 `test-results/` 中。

Mock 循环补充验证结果：TypeScript 检查通过；Next.js 生产构建通过；桌面与手机浏览器用例 6/6 通过（38.0 秒），已检查两种尺寸的截图。测试使用独立的 3100 端口；手动预览如仍运行旧生产服务，请重启服务并刷新页面。

没有已知的 Phase 1 阻塞问题。正式游戏尚未实现的能力见上方 Mock 边界；本阶段到此停止。

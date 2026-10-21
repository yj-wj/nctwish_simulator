import { expect, test, type Page } from "@playwright/test";

async function createPlayer(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "开始游戏" }).click();
  await page.getByLabel("你的名字").fill("林间");
  await page.getByLabel("年龄", { exact: false }).fill("23");
  await page.getByRole("button", { name: "确认，选择男主" }).click();
  await expect(page).toHaveURL(/\/characters$/);
}

async function enterGame(page: Page) {
  await createPlayer(page);
  await page.getByRole("radio", { name: "前田陆（Riku）", exact: true }).check();
  await page.getByRole("button", { name: "确定，查看角色卡" }).click();
  await page.getByRole("button", { name: "进入剧情" }).click();
  await expect(page).toHaveURL(/\/game$/);
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
}

test("完整流程、七项状态、ABC 和自由行动、五个底部页面", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("landing.png"), fullPage: true });
  await enterGame(page);
  await expect(page.getByText("第 1 周", { exact: true })).toBeVisible();
  await expect(page.locator(".context-details")).toContainText("前田陆（Riku）");
  await expect(page.locator(".relationship-pill")).toHaveText("陌生人");
  const stats = page.getByRole("region", { name: "七项状态（固定样例）" });
  await expect(stats.locator(".stat-item")).toHaveCount(7);
  for (const label of ["好感度", "人气值", "心情值", "金钱", "恋情保密度", "公司警觉度", "事业压力"]) {
    await expect(stats.getByText(label, { exact: true })).toBeVisible();
  }
  const initialStats = await stats.innerText();
  const initialContext = await page.locator(".game-context").innerText();
  await page.getByLabel("D · 自由行动").fill("尚未提交的草稿");
  const sequence = [
    { id: "A", title: "门后的脚步声" },
    { id: "B", title: "风停下的片刻" },
    { id: "C", title: "天亮之前，短暂交集" },
    { id: "A", title: "门后的脚步声" },
  ];
  for (const { id, title } of sequence) {
    const previousBody = await page.locator(".story-body").innerText();
    const choice = page.getByRole("button", { name: new RegExp(`^${id}`) });
    const previousText = await choice.locator("span").nth(1).innerText();
    await choice.click();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeFocused();
    expect(await page.locator(".story-body").innerText()).not.toEqual(previousBody);
    await expect(page.getByLabel("上一轮选择")).toHaveText(`上一轮选择：${id} · ${previousText}`);
    await expect(page.locator(".story-choice")).toHaveCount(3);
    await expect(page.getByLabel("D · 自由行动")).toHaveValue("");
    await expect(page.getByRole("status")).toContainText(`已选择 ${id}`);
    expect(await stats.innerText()).toEqual(initialStats);
    expect(await page.locator(".game-context").innerText()).toEqual(initialContext);
    await noOverflow(page);
  }
  await page.getByRole("button", { name: "提交行动" }).click();
  await expect(page.locator("#action-error")).toHaveText("请先写下你想做的行动。");
  await page.getByLabel("D · 自由行动").fill("我把资料收好，继续自己的工作。");
  await page.getByRole("button", { name: "提交行动" }).click();
  await expect(page.getByRole("status")).toContainText("自由行动已收到");
  await expect(page.getByRole("heading", { name: "门后的脚步声", exact: true })).toBeVisible();
  await expect(page.getByLabel("上一轮选择")).toContainText("上一轮选择：A");
  expect(await stats.innerText()).toEqual(initialStats);
  await noOverflow(page);
  await page.locator(".site-header").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("story.png"), fullPage: true });

  const nav = page.getByRole("navigation", { name: "游戏导航" });
  await nav.getByRole("link", { name: "消息", exact: true }).click();
  await page.getByRole("button", { name: "妈妈 家人" }).click();
  await expect(page.getByText("最近生活还习惯吗？", { exact: true })).toBeVisible();
  await noOverflow(page);
  await nav.getByRole("link", { name: "SNS", exact: true }).click();
  const like = page.getByRole("button", { name: "赞 花园里的观众" });
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await expect(like).toContainText("129");
  await like.click();
  await expect(like).toContainText("128");
  await noOverflow(page);
  await nav.getByRole("link", { name: "人物", exact: true }).click();
  await expect(page.locator(".profile-name")).toContainText("前田陆");
  await page.getByText("档案详情 · 私下性格", { exact: true }).click();
  await expect(page.locator("details[open]")).toContainText("黑色的猫");
  await noOverflow(page);
  await nav.getByRole("link", { name: "档案", exact: true }).click();
  await expect(page.getByRole("heading", { name: "林间" })).toBeVisible();
  await expect(page.locator(".archived-action")).toHaveText("我把资料收好，继续自己的工作。");
  await noOverflow(page);
  await nav.getByRole("link", { name: "剧情", exact: true }).click();
  await expect(page.getByRole("heading", { name: "门后的脚步声", exact: true })).toBeVisible();
  await expect(page.getByLabel("上一轮选择")).toContainText("上一轮选择：A");
  await expect(page.getByRole("status")).toContainText("自由行动已收到");
  expect(await stats.innerText()).toEqual(initialStats);
  await page.reload();
  await expect(page).toHaveURL(/\/create$/);
  await enterGame(page);
  await expect(page.getByRole("heading", { name: "天亮之前，短暂交集", exact: true })).toBeVisible();
  await expect(page.getByLabel("上一轮选择")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("输入校验、自定义身份、全部选择、返回修改", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name: "确认，选择男主" }).click();
  await expect(page.getByText("请填写你的名字。", { exact: true })).toBeVisible();
  await page.getByLabel("你的名字").fill("新故事");
  await page.getByLabel("年龄", { exact: false }).fill("17");
  await page.getByRole("button", { name: "确认，选择男主" }).click();
  await expect(page.getByText("本游戏角色须年满 18 岁。", { exact: true })).toBeVisible();
  await page.getByLabel("年龄", { exact: false }).fill("24");
  await expect(page.locator('input[name="identity"]')).toHaveCount(8);
  await expect(page.locator('input[name="pace"]')).toHaveCount(4);
  await expect(page.locator("#fanLevel option")).toHaveCount(5);
  await expect(page.locator("#maleLead option")).toHaveCount(6);
  await page.locator('input[value="custom"]').check();
  await page.getByRole("button", { name: "确认，选择男主" }).click();
  await expect(page.getByText("请描述你的身份与初遇契机。", { exact: true })).toBeVisible();
  await page.getByLabel("你的身份与初遇契机").fill("在首尔经营一家书店，因送书而相遇。");
  await page.getByLabel("追星程度").selectOption("returning");
  await page.getByRole("radio", { name: /日常治愈向/ }).check();
  await page.getByRole("button", { name: "确认，选择男主" }).click();
  await expect(page.getByRole("radio")).toHaveCount(6);
  for (const name of ["吴是温", "前田陆", "得能勇志", "金栽熙", "广濑辽", "藤永咲哉"]) {
    await page.getByRole("radio", { name: new RegExp(name) }).check();
    await page.getByRole("button", { name: "确定，查看角色卡" }).click();
    await expect(page.locator(".profile-name")).toContainText(name);
    await noOverflow(page);
    await page.getByRole("link", { name: "返回", exact: true }).click();
  }
  await page.getByRole("link", { name: "返回", exact: true }).click();
  await expect(page.getByLabel("你的名字")).toHaveValue("新故事");
  await expect(page.getByLabel("你的身份与初遇契机")).toHaveValue("在首尔经营一家书店，因送书而相遇。");
  await page.getByLabel("你的名字").fill("修改后");
  await page.getByRole("button", { name: "确认，选择男主" }).click();
  await page.getByRole("button", { name: "确定，查看角色卡" }).click();
  await expect(page.locator(".pairing-summary")).toContainText("修改后");
  await expect(page.locator(".pairing-summary")).toContainText("日常治愈向");
});

test("未创建时直接访问后续路由安全返回创建页", async ({ page }) => {
  for (const path of ["/characters", "/character-card", "/game", "/game/messages", "/game/sns", "/game/characters", "/game/archive"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/create$/);
    await expect(page.getByRole("heading", { name: "故事的主角，是你。" })).toBeVisible();
  }
});

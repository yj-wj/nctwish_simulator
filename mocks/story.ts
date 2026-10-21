import type { MockStory, StatPreview } from "@/types/ui";

// Fixed opening sample from the source document. Never used to settle actions.
export const previewContext = { week: 1, scene: "首尔汝矣岛电视台后门", relationship: "陌生人", careerStage: "回归期" } as const;
export const previewStats: StatPreview[] = [
  { id: "affection", label: "好感度", value: 8 },
  { id: "popularity", label: "人气值", value: 0 },
  { id: "mood", label: "心情值", value: 72 },
  { id: "money", label: "金钱", value: 2300 },
  { id: "secrecy", label: "恋情保密度", value: 100 },
  { id: "companyAlert", label: "公司警觉度", value: 18 },
  { id: "careerPressure", label: "事业压力", value: 67 },
];

export const opening = {
  title: "天亮之前，短暂交集",
  time: "04:27 AM",
  paragraphs: [
    "凌晨四点二十七分，首尔的天还没有亮。",
    "你站在电视台后门的风口，手里抱着一袋刚从便利店买来的热咖啡。塑料袋被风吹得轻轻响，远处排队的粉丝裹着羽绒服，小声核对着今天预录的入场号码。",
    "你原本只是来替前辈送资料。",
    "直到那辆黑色保姆车停在你面前。",
    "车门拉开的一瞬间，闪光灯从街对面亮起。",
    "他从车上下来，黑色大衣，鸭舌帽压得很低，口罩遮住大半张脸。你本来应该低头让开，可不知道为什么，他经过你身边时，脚步慢了一拍。",
    "你的资料袋被风吹开，几张纸散落在地。你蹲下去捡，手指冻得发僵。",
    "一只修长的手先你一步按住了快要滑进水洼里的文件。他没有看你太久，只是把纸递回来。",
    "“这个，湿了会很麻烦吧。”",
    "他的声音很轻，比舞台上更低，也更真实。你愣了一下，才反应过来道谢。",
    "“谢谢。”",
    "经纪人从车边看过来，眉头微微皱了一下。他却已经转身，像刚才什么都没有发生过一样，走进电视台的侧门。",
    "只有你手里的那张纸，还残留着一点不属于你的温度。",
  ],
};

// A fixed UI slideshow, not branching narrative or an event/relationship engine.
// After the third sample, wrap to the opening so the interaction can be repeated.
export const mockStories: MockStory[] = [
  {
    ...opening,
    sourceLabel: "初遇 · 原文开局样例",
    subtitle: "有些故事，始于一句很轻的谢谢。",
    choices: [
      { id: "A", text: "立刻离开，不给自己惹麻烦。" },
      { id: "B", text: "小声再说一次谢谢，试图让他听见。" },
      { id: "C", text: "假装镇定，继续完成工作，但偷偷记住他的名字。" },
    ],
  },
  {
    title: "门后的脚步声",
    time: "清晨 · 固定样例",
    sourceLabel: "Mock 剧情 · 交互样例",
    subtitle: "短暂的交集之后，清晨仍在继续。",
    paragraphs: [
      "电视台的侧门缓缓合上，脚步声隔着门板渐渐模糊。你收紧手中的资料袋，让纸张不再被风吹散。",
      "街对面的队伍往前移动了几步。有人低声确认入场时间，有人把围巾拉高了一点。",
      "你看了一眼手里的热咖啡。天还没有亮，自己的事情也还没有做完。",
    ],
    choices: [
      { id: "A", text: "整理好资料，确认没有遗漏。" },
      { id: "B", text: "站到避风的位置，喝一口热咖啡。" },
      { id: "C", text: "看看手机，确认自己接下来的安排。" },
    ],
  },
  {
    title: "风停下的片刻",
    time: "清晨 · 固定样例",
    sourceLabel: "Mock 剧情 · 交互样例",
    subtitle: "你也有属于自己的这一天。",
    paragraphs: [
      "风暂时小了些。你站在后门外，听见街角传来车辆缓缓驶过的声音。",
      "远处的灯还亮着，排队的人们安静地等候。那场短暂的相遇已经结束，眼前仍是一个普通的清晨。",
      "你把手里的东西拿稳，留出一点时间，想想自己接下来要做什么。",
    ],
    choices: [
      { id: "A", text: "列一下今天需要完成的事情。" },
      { id: "B", text: "给自己留一点吃早餐的时间。" },
      { id: "C", text: "收好手机，准备继续自己的安排。" },
    ],
  },
];

import { z } from "zod";

// Form validation only; no narrative validation or game rules.
export const playerSchema = z.object({
  name: z.string().trim().min(1, "请填写你的名字。").max(24, "名字最多 24 个字。"),
  age: z.string().trim().regex(/^\d+$/, "请填写整数年龄。").transform(Number).pipe(z.number().int().min(18, "本游戏角色须年满 18 岁。")),
  identity: z.enum(["student", "fan", "intern", "staff", "stylist", "translator", "part-time", "custom"]),
  customIdentity: z.string().trim().max(300, "自定义身份最多 300 字。"),
  maleLead: z.enum(["sion", "riku", "yushi", "jaehee", "ryo", "sakuya"]),
  fanLevel: z.enum(["longtime", "casual", "passerby", "returning", "single"]),
  pace: z.enum(["slow", "standard", "pressure", "healing"]),
}).superRefine((value, context) => {
  if (value.identity === "custom" && !value.customIdentity) {
    context.addIssue({ code: "custom", path: ["customIdentity"], message: "请描述你的身份与初遇契机。" });
  }
});

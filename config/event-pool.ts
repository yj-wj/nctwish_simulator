import type { EventCategory, EventTag, EventTemplate } from "../types/event";
import type { RelationshipStageId } from "../types/game";

type EventOptions = Partial<Omit<EventTemplate, "id" | "category" | "title" | "tags">>;

const noticedOnward: RelationshipStageId[] = ["noticed", "interested", "ambiguous", "committed", "inLove", "trial"];
const interestedOnward: RelationshipStageId[] = ["interested", "ambiguous", "committed", "inLove", "trial"];
const ambiguousOnward: RelationshipStageId[] = ["ambiguous", "committed", "inLove", "trial"];
const committedOnward: RelationshipStageId[] = ["committed", "inLove", "trial"];

function event(
  id: string,
  category: EventCategory,
  title: string,
  tags: EventTag[],
  options: EventOptions = {},
): EventTemplate {
  return {
    id,
    category,
    title,
    description: `来自 GAME_SPEC 的候选事件：${title}。当前仅显示 Mock 摘要，不生成剧情或结算属性。`,
    sourceKind: "example",
    tags,
    baseWeight: 10,
    cooldown: 2,
    ...options,
  };
}

function triggerReference(
  id: string,
  category: EventCategory,
  title: string,
  tags: EventTag[],
  requiredTrigger: NonNullable<EventTemplate["requiredTriggers"]>[number],
  options: EventOptions = {},
): EventTemplate {
  return event(id, category, title, tags, {
    sourceKind: "reference",
    baseWeight: 14,
    requiredTriggers: [requiredTrigger],
    ...options,
  });
}

/**
 * GAME_SPEC §10.2: 61 distinct Example entries. They stay separate even when
 * several share a category or tag because the source explicitly preserves them.
 */
export const directedEventTemplates: EventTemplate[] = [
  // 回归期事件：8 个常规条目 + 5 个风险条目。
  event("comeback_album_teaser", "career", "新专辑预告", ["comeback", "album"], { careerStages: ["回归期"], baseWeight: 12 }),
  event("comeback_concept_photos", "career", "概念照发布", ["comeback", "album", "media"], { careerStages: ["回归期"] }),
  event("comeback_mv_shoot", "career", "MV 拍摄", ["comeback", "mv", "work-contact"], { careerStages: ["回归期", "拍摄期"], baseWeight: 12 }),
  event("comeback_dance_practice", "career", "舞蹈练习室", ["comeback", "performance", "work-contact"], { careerStages: ["回归期"] }),
  event("comeback_music_show_prerecording", "career", "打歌节目预录", ["comeback", "music-show", "work-contact"], { careerStages: ["回归期"], baseWeight: 13 }),
  event("comeback_fansign_lottery", "career", "签售抽选", ["comeback", "fan-sign", "fandom"], { careerStages: ["回归期"] }),
  event("comeback_lyrics_decoding", "publicOpinion", "粉丝解码歌词", ["comeback", "album", "fandom", "sns"], { careerStages: ["回归期"] }),
  event("comeback_live_promotion", "career", "直播宣传", ["comeback", "live", "media"], { careerStages: ["回归期"] }),
  event("comeback_abnormal_condition_noticed", "publicOpinion", "男主状态异常被粉丝发现", ["comeback", "fandom", "performance", "high-risk"], { careerStages: ["回归期"], baseWeight: 7 }),
  event("comeback_gift_seen_in_content", "publicOpinion", "你送的物品出现在物料里", ["comeback", "fandom", "privacy", "high-risk"], { relationshipStages: interestedOnward, careerStages: ["回归期"], baseWeight: 6 }),
  event("comeback_lyrics_romance_code", "publicOpinion", "歌词疑似恋爱暗号", ["comeback", "album", "fandom", "high-risk"], { relationshipStages: ambiguousOnward, careerStages: ["回归期"], baseWeight: 6 }),
  event("comeback_live_glance", "relationship", "直播时他不小心看向你所在方向", ["comeback", "live", "relationship-progress", "high-risk"], { relationshipStages: interestedOnward, careerStages: ["回归期"], baseWeight: 7 }),
  event("comeback_player_seen_near_schedules", "publicOpinion", "粉丝发现你出现在多个行程附近", ["comeback", "fandom", "privacy", "high-risk"], { relationshipStages: noticedOnward, careerStages: ["回归期"], baseWeight: 6 }),

  // 演唱会 / 巡演事件：9 个条目。
  event("tour_seoul_encore", "career", "首尔安可场", ["tour", "concert", "performance"], { careerStages: ["巡演期"] }),
  event("tour_japan", "career", "日本巡演", ["tour", "concert", "travel"], { careerStages: ["巡演期"] }),
  event("tour_southeast_asia", "career", "东南亚场", ["tour", "concert", "travel"], { careerStages: ["巡演期"] }),
  event("tour_overseas", "career", "海外场", ["tour", "concert", "travel"], { careerStages: ["巡演期"] }),
  event("tour_backstage_corridor", "daily", "后台通道", ["tour", "backstage", "work-contact"], { careerStages: ["巡演期"] }),
  event("tour_light_ocean", "career", "应援灯海", ["tour", "concert", "fandom"], { careerStages: ["巡演期"] }),
  event("tour_long_distance", "relationship", "长期异地", ["tour", "long-distance", "relationship-progress"], { relationshipStages: interestedOnward, careerStages: ["巡演期"] }),
  event("tour_time_difference_distance", "relationship", "时差与冷淡", ["tour", "long-distance", "relationship-progress"], { relationshipStages: ambiguousOnward, careerStages: ["巡演期"] }),
  event("tour_stage_secret_code", "publicOpinion", "男主在台上说出疑似暗号的话", ["tour", "concert", "fandom", "high-risk"], { relationshipStages: ambiguousOnward, careerStages: ["巡演期"], baseWeight: 6 }),

  // 粉圈舆论事件：8 个条目。
  event("fandom_korean_forum_hot_post", "publicOpinion", "韩网论坛热帖", ["fandom", "sns", "media"]),
  event("fandom_x_instagram_repost", "publicOpinion", "X / Instagram 搬运", ["fandom", "sns", "media"]),
  event("fandom_overseas_translation", "publicOpinion", "海外粉丝翻译", ["fandom", "sns"]),
  event("fandom_fansite_preview", "publicOpinion", "站姐预览图", ["fandom", "media", "privacy"]),
  event("fandom_departure_essay", "publicOpinion", "粉丝脱粉小作文", ["fandom", "sns"]),
  event("fandom_malicious_edit", "publicOpinion", "黑粉恶剪", ["fandom", "sns", "media", "high-risk"]),
  event("fandom_sasaeng_tip", "crisis", "私生爆料", ["fandom", "privacy", "high-risk"]),
  event("fandom_solo_group_dispute", "publicOpinion", "唯粉与团粉争执", ["fandom", "sns"]),

  // 机场事件：7 个常规条目 + 6 个风险条目。
  event("airport_incheon_arrival_departure", "career", "仁川机场出入境", ["airport", "travel", "fandom"]),
  event("airport_fan_crowding", "crisis", "粉丝拥挤", ["airport", "fandom", "high-risk"]),
  event("airport_flashlights", "daily", "闪光灯", ["airport", "media"]),
  event("airport_player_in_frame_edge", "publicOpinion", "你被拍进边角", ["airport", "privacy", "media"], { relationshipStages: noticedOnward }),
  event("airport_lead_protects_player", "relationship", "男主下意识护你", ["airport", "relationship-progress", "high-risk"], { relationshipStages: ambiguousOnward, baseWeight: 7 }),
  event("airport_manager_notices", "company", "经纪人发现异常", ["airport", "company-intervention", "high-risk"], { relationshipStages: interestedOnward, baseWeight: 7 }),
  event("airport_fansite_catches_silhouette", "publicOpinion", "站姐照片里出现你的衣角或背影", ["airport", "fandom", "privacy", "media"], { relationshipStages: noticedOnward, baseWeight: 7 }),
  event("airport_eye_contact_too_long", "relationship", "对视太久", ["airport", "relationship-progress", "high-risk"], { relationshipStages: interestedOnward, baseWeight: 7 }),
  event("airport_lead_blocks_camera", "relationship", "男主主动挡镜头", ["airport", "privacy", "relationship-progress", "high-risk"], { relationshipStages: ambiguousOnward, baseWeight: 6 }),
  event("airport_matching_item", "publicOpinion", "同款物品", ["airport", "fandom", "privacy", "high-risk"], { relationshipStages: interestedOnward, baseWeight: 6 }),
  event("airport_same_time", "publicOpinion", "同一时间出现在机场", ["airport", "fandom", "privacy", "high-risk"], { relationshipStages: noticedOnward, baseWeight: 6 }),
  event("airport_private_handover", "relationship", "私下递东西", ["airport", "privacy", "relationship-progress", "high-risk"], { relationshipStages: interestedOnward, baseWeight: 6 }),
  event("airport_nonfan_area_glance", "publicOpinion", "男主看向非粉丝区域", ["airport", "fandom", "privacy", "high-risk"], { relationshipStages: interestedOnward, baseWeight: 6 }),

  // 公司干预事件：6 个条目。
  event("company_manager_interview", "company", "经纪人约谈你", ["company-intervention", "work-contact"], { relationshipStages: interestedOnward, baseWeight: 7 }),
  event("company_reduce_private_contact", "company", "公司要求男主减少私人联系", ["company-intervention", "relationship-progress"], { relationshipStages: interestedOnward, baseWeight: 6 }),
  event("company_staff_watch_phone", "company", "男主手机被工作人员关注", ["company-intervention", "privacy"], { relationshipStages: interestedOnward, baseWeight: 7 }),
  event("company_team_notices", "company", "团队成员察觉异常", ["company-intervention", "member-awareness"], { relationshipStages: interestedOnward, baseWeight: 7 }),
  event("company_comeback_warning", "company", "公司提出“回归期不要出问题”", ["company-intervention", "comeback"], { relationshipStages: interestedOnward, careerStages: ["回归期"], baseWeight: 7 }),
  event("company_player_removed_from_project", "company", "你被调离项目或不再允许接触相关行程", ["company-intervention", "work-contact", "high-risk"], { relationshipStages: ambiguousOnward, baseWeight: 5, oncePerSave: true }),

  // 组合成员察觉事件：5 个条目。
  event("member_notices_phone_frequency", "relationship", "其他成员发现男主看手机的频率变高", ["member-awareness", "relationship-progress"], { relationshipStages: interestedOnward }),
  event("member_waiting_room_tease", "relationship", "待机室里有人开玩笑试探", ["member-awareness", "backstage", "relationship-progress"], { relationshipStages: interestedOnward }),
  event("member_comeback_focus_warning", "company", "成员提醒他别在回归期分心", ["member-awareness", "comeback"], { relationshipStages: ambiguousOnward, careerStages: ["回归期"] }),
  event("member_covers_for_lead", "relationship", "成员私下帮他打掩护", ["member-awareness", "privacy", "relationship-progress"], { relationshipStages: committedOnward }),
  event("member_worries_he_gets_hurt", "relationship", "成员并不反对你们，但担心他受伤", ["member-awareness", "emotional", "relationship-progress"], { relationshipStages: committedOnward }),

  // 私生 / 狗仔危机：7 个条目。
  event("crisis_stranger_outside_home", "crisis", "小区门口陌生人", ["paparazzi", "privacy", "high-risk"]),
  event("crisis_license_plate_followed", "crisis", "车牌被跟", ["paparazzi", "privacy", "high-risk"]),
  event("crisis_cafe_secret_photo", "crisis", "咖啡店偷拍", ["paparazzi", "media", "privacy", "high-risk"], { relationshipStages: noticedOnward }),
  event("crisis_matching_clothes_found", "publicOpinion", "同款衣物被扒", ["paparazzi", "fandom", "privacy", "high-risk"], { relationshipStages: interestedOnward }),
  event("crisis_dispatch_countdown", "crisis", "Dispatch 式倒计时爆料", ["paparazzi", "media", "high-risk"], { relationshipStages: committedOnward, oncePerSave: true, baseWeight: 4 }),
  event("crisis_korean_anonymous_post", "publicOpinion", "韩网匿名帖", ["fandom", "sns", "privacy", "high-risk"], { relationshipStages: interestedOnward }),
  event("crisis_old_social_account_found", "crisis", "旧社交账号被翻出", ["sns", "personal-data", "privacy", "high-risk"], { relationshipStages: noticedOnward, oncePerSave: true }),
];

/** GAME_SPEC §11.2: 35 trigger manifestations, retained as conditional References. */
export const triggerEventTemplates: EventTemplate[] = [
  triggerReference("trigger_player_cries_at_home", "crisis", "你在大平层里突然哭出来", ["emotional", "housing"], "emotional_breakdown", { oncePerSave: true }),
  triggerReference("trigger_pressures_stack", "reality", "学业 / 工作 / 舆论 / 感情压力叠加", ["emotional", "school", "work-contact"], "emotional_breakdown"),
  triggerReference("trigger_lead_unreachable", "relationship", "男主联系不上", ["emotional", "relationship-progress"], "emotional_breakdown", { relationshipStages: noticedOnward }),
  triggerReference("trigger_friend_intervenes", "daily", "闺蜜或青梅竹马介入", ["emotional", "daily-life"], "emotional_breakdown"),
  triggerReference("trigger_player_doubts_relationship", "crisis", "你开始怀疑自己是否只是他人生里的风险", ["emotional", "relationship-progress"], "emotional_breakdown", { relationshipStages: interestedOnward }),

  triggerReference("trigger_exposure_anonymous_tip", "publicOpinion", "韩网匿名爆料", ["fandom", "sns", "media", "high-risk"], "exposure_crisis"),
  triggerReference("trigger_exposure_blurry_photo", "publicOpinion", "站姐发出模糊照片", ["fandom", "media", "privacy", "high-risk"], "exposure_crisis"),
  triggerReference("trigger_exposure_paparazzi_teaser", "crisis", "狗仔预告“明早十点”", ["paparazzi", "media", "high-risk"], "exposure_crisis", { oncePerSave: true }),
  triggerReference("trigger_exposure_emergency_meeting", "company", "公司紧急会议", ["company-intervention", "high-risk"], "exposure_crisis"),
  triggerReference("trigger_exposure_cut_contact", "company", "男主被要求切断联系", ["company-intervention", "relationship-progress", "high-risk"], "exposure_crisis", { relationshipStages: interestedOnward, oncePerSave: true }),
  triggerReference("trigger_exposure_fandom_split", "publicOpinion", "花园丝内部开始分裂讨论", ["fandom", "sns", "high-risk"], "exposure_crisis"),

  triggerReference("trigger_recognized_near_lead", "publicOpinion", "有粉丝发现你常出现在男主附近", ["fandom", "privacy"], "player_recognized"),
  triggerReference("trigger_recognized_social_accounts", "crisis", "你的小红书 / Instagram / X 被扒", ["sns", "personal-data", "privacy", "high-risk"], "player_recognized", { oncePerSave: true }),
  triggerReference("trigger_recognized_personal_history", "crisis", "你的旧照片、学校、兼职地点被曝光", ["personal-data", "school", "part-time", "privacy", "high-risk"], "player_recognized", { oncePerSave: true }),
  triggerReference("trigger_recognized_called_partner", "publicOpinion", "你被称为“疑似嫂子”", ["fandom", "sns", "high-risk"], "player_recognized"),
  triggerReference("trigger_recognized_life_impact", "reality", "金钱、学业、工作、人际关系都会受影响", ["financial", "school", "work-contact", "high-risk"], "player_recognized"),
  triggerReference("trigger_recognized_mother_calls", "reality", "妈妈可能打电话质问", ["family", "privacy"], "player_recognized"),
  triggerReference("trigger_recognized_company_alert", "company", "公司警觉度上升", ["company-intervention", "high-risk"], "player_recognized"),
  triggerReference("trigger_recognized_contact_reduced", "relationship", "男主可能因保护你而减少联系", ["privacy", "relationship-progress"], "player_recognized", { relationshipStages: noticedOnward }),

  triggerReference("trigger_financial_rent_due", "reality", "房租到期", ["financial", "housing"], "financial_crisis", { baseWeight: 18 }),
  triggerReference("trigger_financial_part_time_fired", "reality", "兼职被辞退", ["financial", "part-time", "work-contact"], "financial_crisis", { baseWeight: 18 }),
  triggerReference("trigger_financial_visa_tuition", "reality", "签证或学费压力", ["financial", "school"], "financial_crisis", { baseWeight: 18 }),
  triggerReference("trigger_financial_hide_from_lead", "relationship", "你不想让男主知道", ["financial", "relationship-progress"], "financial_crisis", { relationshipStages: noticedOnward }),
  triggerReference("trigger_financial_help_pride_conflict", "relationship", "男主若强行帮助，可能造成自尊冲突", ["financial", "relationship-progress"], "financial_crisis", { relationshipStages: interestedOnward }),

  triggerReference("trigger_company_formal_manager_talk", "company", "经纪人正式约谈", ["company-intervention", "high-risk"], "company_intervention", { baseWeight: 18 }),
  triggerReference("trigger_company_explain_relationship", "company", "公司要求男主交代关系", ["company-intervention", "relationship-progress", "high-risk"], "company_intervention", { relationshipStages: interestedOnward, baseWeight: 18 }),
  triggerReference("trigger_company_intense_schedule", "career", "男主被安排高强度行程", ["company-intervention", "overwork", "performance"], "company_intervention"),
  triggerReference("trigger_company_player_loses_opportunity", "company", "你被调离项目或失去工作机会", ["company-intervention", "work-contact", "high-risk"], "company_intervention", { oncePerSave: true }),
  triggerReference("trigger_company_career_or_relationship_choice", "crisis", "男主需要在事业和你之间做阶段性选择", ["company-intervention", "relationship-progress", "high-risk"], "company_intervention", { relationshipStages: committedOnward, oncePerSave: true }),

  triggerReference("trigger_career_stage_mistake", "career", "舞台失误", ["performance", "overwork", "high-risk"], "career_breakdown"),
  triggerReference("trigger_career_silent_live", "career", "直播沉默", ["live", "emotional", "high-risk"], "career_breakdown"),
  triggerReference("trigger_career_practice_overwork", "crisis", "练习室过劳", ["overwork", "performance", "high-risk"], "career_breakdown"),
  triggerReference("trigger_career_fan_attack", "publicOpinion", "粉丝攻击", ["fandom", "sns", "emotional", "high-risk"], "career_breakdown"),
  triggerReference("trigger_career_team_pressure", "career", "队内压力", ["member-awareness", "emotional", "performance"], "career_breakdown"),
  triggerReference("trigger_career_first_vulnerability", "relationship", "他第一次在你面前露出脆弱", ["emotional", "relationship-progress"], "career_breakdown", { relationshipStages: interestedOnward, oncePerSave: true }),
];

export const eventPool: EventTemplate[] = [...directedEventTemplates, ...triggerEventTemplates];

export function getEventTemplate(eventId: string): EventTemplate | undefined {
  return eventPool.find(({ id }) => id === eventId);
}

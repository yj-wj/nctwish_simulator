import { memoryImportanceRange, memoryRetrievalScoring } from "../config/memory.ts";
import type {
  EntityId,
  MemoryEffect,
  MemoryEntityRef,
  MemoryRecord,
  MemoryRetrievalQuery,
  MemoryWriteContext,
  ScoredMemory,
} from "../types/memory.ts";

function resolveEntity(ref: MemoryEntityRef, context: MemoryWriteContext): EntityId {
  return ref === "current_male_lead" ? context.maleLeadId : ref;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function assertMemoryEffect(effect: MemoryEffect): void {
  if (!effect.key.trim()) throw new Error("Memory effect key is required.");
  if (!effect.content.trim()) throw new Error("Memory content is required.");
  if (effect.importance < memoryImportanceRange.min || effect.importance > memoryImportanceRange.max) {
    throw new RangeError("Memory importance must be between 1 and 5.");
  }
}

function formatMemoryContent(content: string, context: MemoryWriteContext): string {
  return content.replaceAll("{week}", String(context.week)).trim();
}

export function createMemoryId(settlementId: string, memoryKey: string): string {
  return `${settlementId}:memory:${memoryKey}`;
}

export function hasMemoryFromSettlement(
  memories: MemoryRecord[],
  settlementId: string,
  memoryKey?: string,
): boolean {
  const expectedId = memoryKey ? createMemoryId(settlementId, memoryKey) : null;
  return memories.some((memory) =>
    expectedId ? memory.id === expectedId : memory.source.settlementId === settlementId);
}

export function addMemory(
  memories: MemoryRecord[],
  effect: MemoryEffect,
  context: MemoryWriteContext,
): MemoryRecord[] {
  assertMemoryEffect(effect);
  const id = createMemoryId(context.settlementId, effect.key);
  if (memories.some((memory) => memory.id === id)) return memories;

  const record: MemoryRecord = {
    id,
    gameId: context.gameId,
    week: context.week,
    type: effect.type,
    content: formatMemoryContent(effect.content, context),
    actors: unique(effect.actors.map((actor) => resolveEntity(actor, context))),
    tags: unique(effect.tags),
    importance: effect.importance,
    emotion: effect.emotion ?? null,
    visibility: effect.visibility,
    knownBy: unique(effect.knownBy.map((actor) => resolveEntity(actor, context))),
    source: {
      kind: effect.sourceKind ?? "outcome",
      eventId: context.eventId,
      choiceId: context.choiceId,
      settlementId: context.settlementId,
    },
    createdAtSequence: memories.reduce((max, memory) =>
      Math.max(max, memory.createdAtSequence), 0) + 1,
  };
  return [...memories, record];
}

export function addMemories(
  memories: MemoryRecord[],
  effects: MemoryEffect[],
  context: MemoryWriteContext,
): MemoryRecord[] {
  return effects.reduce((next, effect) => addMemory(next, effect, context), memories);
}

export function isMemoryVisibleTo(memory: MemoryRecord, viewerId: EntityId): boolean {
  if (memory.visibility === "player_known" && viewerId === "player") return true;
  return memory.knownBy.includes(viewerId);
}

export function getVisibleMemories(
  memories: MemoryRecord[],
  viewerId: EntityId,
): MemoryRecord[] {
  return memories.filter((memory) => isMemoryVisibleTo(memory, viewerId));
}

function newestFirst(left: MemoryRecord, right: MemoryRecord): number {
  return right.week - left.week || right.createdAtSequence - left.createdAtSequence;
}

export function getRecentMemories(
  memories: MemoryRecord[],
  options: { viewerId: EntityId; limit?: number },
): MemoryRecord[] {
  const limit = Math.max(0, options.limit ?? 5);
  return getVisibleMemories(memories, options.viewerId).sort(newestFirst).slice(0, limit);
}

export function getCharacterMemories(
  memories: MemoryRecord[],
  characterId: EntityId,
  viewerId: EntityId,
): MemoryRecord[] {
  return getVisibleMemories(memories, viewerId)
    .filter((memory) => memory.actors.includes(characterId))
    .sort(newestFirst);
}

export function scoreMemory(
  memory: MemoryRecord,
  query: MemoryRetrievalQuery,
): ScoredMemory {
  const actorOverlap = unique(query.actors ?? []).filter((actor) => memory.actors.includes(actor)).length;
  const tagOverlap = unique(query.tags ?? []).filter((tag) => memory.tags.includes(tag)).length;
  const age = Math.max(0, query.currentWeek - memory.week);
  const recency = Math.max(
    0,
    memoryRetrievalScoring.recencyMax - Math.floor(age / memoryRetrievalScoring.recencyWeeksPerPoint),
  );
  const breakdown = {
    actorMatch: actorOverlap * memoryRetrievalScoring.actorMatch,
    tagMatch: tagOverlap * memoryRetrievalScoring.tagMatch,
    importance: memory.importance * memoryRetrievalScoring.importanceMultiplier,
    recency,
    memoryType: memoryRetrievalScoring.typeBonus[memory.type],
  };
  return {
    memory,
    score: Object.values(breakdown).reduce((sum, value) => sum + value, 0),
    breakdown,
  };
}

export function getRelevantMemories(
  memories: MemoryRecord[],
  query: MemoryRetrievalQuery,
): ScoredMemory[] {
  const limit = Math.max(0, query.limit ?? 5);
  return getVisibleMemories(memories, query.viewerId)
    .filter((memory) => !query.memoryTypes?.length || query.memoryTypes.includes(memory.type))
    .filter((memory) => !query.visibility?.length || query.visibility.includes(memory.visibility))
    .map((memory) => scoreMemory(memory, query))
    .sort((left, right) =>
      right.score - left.score || newestFirst(left.memory, right.memory))
    .slice(0, limit);
}

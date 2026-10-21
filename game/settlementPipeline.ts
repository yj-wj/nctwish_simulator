import type { GameState } from "../types/game.ts";
import type { HistorySettlementInput } from "../types/history.ts";
import type { MemoryRecord } from "../types/memory.ts";
import { processHistorySettlement, type HistoryPipelineState } from "./historyEngine.ts";
import { addMemories } from "./memoryEngine.ts";

export interface StructuredSettlementState extends HistoryPipelineState {
  memories: MemoryRecord[];
}

export function processStructuredSettlement(
  current: StructuredSettlementState,
  gameStateAfter: GameState,
  input: HistorySettlementInput,
): StructuredSettlementState {
  if (current.processedSettlementIds.includes(input.settlementId)) return current;
  const history = processHistorySettlement(current, gameStateAfter, input);
  const memories = addMemories(current.memories, input.outcome.memoryEffects ?? [], {
    gameId: gameStateAfter.gameId,
    week: input.week,
    maleLeadId: gameStateAfter.maleLead,
    eventId: input.event.eventId,
    choiceId: input.choice.choiceId,
    settlementId: input.settlementId,
  });
  return { ...history, memories };
}

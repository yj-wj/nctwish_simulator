import type { GameSave, GameSaveData, SaveLoadErrorCode, SaveSummary } from "../types/save.ts";
import { GAME_SAVE_SCHEMA_VERSION } from "../types/save.ts";
import type { SaveStorageAdapter } from "./localStorageAdapter.ts";
import { gameSaveDataSchema, gameSaveSchema, saveEnvelopeSchema, saveIndexSchema } from "./saveSchema.ts";

export const SAVE_STORAGE_KEYS = {
  save: (saveId: string) => `garden:saves:v1:${saveId}`,
  index: "garden:save-index:v1",
  active: "garden:active-save:v1",
} as const;

export class SaveRepositoryError extends Error {
  readonly code: SaveLoadErrorCode;

  constructor(code: SaveLoadErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "SaveRepositoryError";
  }
}

function createSaveId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `garden-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toSummary(save: GameSave): SaveSummary {
  return {
    saveId: save.saveId,
    createdAt: save.createdAt,
    updatedAt: save.updatedAt,
    playerName: save.gameState.player.name,
    maleLead: save.gameState.maleLead,
    week: save.gameState.week,
  };
}

export function createSaveRepository(
  storage: SaveStorageAdapter,
  now: () => Date = () => new Date(),
) {
  const parseIndex = (): SaveSummary[] => {
    const raw = storage.getItem(SAVE_STORAGE_KEYS.index);
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new SaveRepositoryError("invalid_json", "Save index contains invalid JSON.");
    }
    const result = saveIndexSchema.safeParse(parsed);
    if (!result.success) {
      throw new SaveRepositoryError("invalid_schema", "Save index does not match the supported schema.");
    }
    return result.data;
  };

  const writeIndex = (summaries: SaveSummary[]) => {
    storage.setItem(
      SAVE_STORAGE_KEYS.index,
      JSON.stringify([...summaries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))),
    );
  };

  const upsertIndex = (save: GameSave) => {
    const summary = toSummary(save);
    writeIndex([summary, ...parseIndex().filter(({ saveId }) => saveId !== save.saveId)]);
  };

  const persistValidated = (save: GameSave): GameSave => {
    const result = gameSaveSchema.safeParse(save);
    if (!result.success) {
      throw new SaveRepositoryError("invalid_schema", `Game save does not match schema version ${GAME_SAVE_SCHEMA_VERSION}.`);
    }
    const validated = result.data as GameSave;
    storage.setItem(SAVE_STORAGE_KEYS.save(validated.saveId), JSON.stringify(validated));
    upsertIndex(validated);
    return validated;
  };

  const loadGame = (saveId: string): GameSave => {
    const raw = storage.getItem(SAVE_STORAGE_KEYS.save(saveId));
    if (!raw) throw new SaveRepositoryError("not_found", `Save ${saveId} does not exist.`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new SaveRepositoryError("invalid_json", `Save ${saveId} contains invalid JSON.`);
    }
    const envelope = saveEnvelopeSchema.safeParse(parsed);
    if (!envelope.success) {
      throw new SaveRepositoryError("invalid_schema", `Save ${saveId} is missing schemaVersion.`);
    }
    if (envelope.data.schemaVersion !== 1 && envelope.data.schemaVersion !== GAME_SAVE_SCHEMA_VERSION) {
      throw new SaveRepositoryError(
        "unsupported_version",
        `Save ${saveId} uses unsupported schema version ${envelope.data.schemaVersion}.`,
      );
    }
    const migrated = envelope.data.schemaVersion === 1 && parsed && typeof parsed === "object"
      ? { ...(parsed as Record<string, unknown>), schemaVersion: GAME_SAVE_SCHEMA_VERSION, chatThreads: [], chatMessages: [], chatTurns: [], incomingMessageTriggers: [] }
      : parsed;
    const result = gameSaveSchema.safeParse(migrated);
    if (!result.success) {
      throw new SaveRepositoryError("invalid_schema", `Save ${saveId} failed schema validation.`);
    }
    const validated = result.data as GameSave;
    if (envelope.data.schemaVersion === 1) storage.setItem(SAVE_STORAGE_KEYS.save(saveId), JSON.stringify(validated));
    return validated;
  };

  return {
    createSave(data: GameSaveData, requestedSaveId = createSaveId()): GameSave {
      const dataResult = gameSaveDataSchema.safeParse(data);
      if (!dataResult.success) {
        throw new SaveRepositoryError("invalid_schema", "Cannot create a save from invalid runtime data.");
      }
      if (storage.getItem(SAVE_STORAGE_KEYS.save(requestedSaveId))) {
        throw new SaveRepositoryError("invalid_schema", `Save ${requestedSaveId} already exists.`);
      }
      const timestamp = now().toISOString();
      const save = persistValidated({
        ...(dataResult.data as GameSaveData),
        schemaVersion: GAME_SAVE_SCHEMA_VERSION,
        saveId: requestedSaveId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      storage.setItem(SAVE_STORAGE_KEYS.active, save.saveId);
      return save;
    },

    saveGame(save: GameSave): GameSave {
      const existing = loadGame(save.saveId);
      return persistValidated({
        ...save,
        schemaVersion: GAME_SAVE_SCHEMA_VERSION,
        createdAt: existing.createdAt,
        updatedAt: now().toISOString(),
      });
    },

    loadGame,

    listSaves(): SaveSummary[] {
      return parseIndex();
    },

    deleteSave(saveId: string): void {
      storage.removeItem(SAVE_STORAGE_KEYS.save(saveId));
      writeIndex(parseIndex().filter((summary) => summary.saveId !== saveId));
      if (storage.getItem(SAVE_STORAGE_KEYS.active) === saveId) {
        storage.removeItem(SAVE_STORAGE_KEYS.active);
      }
    },

    getActiveSaveId(): string | null {
      return storage.getItem(SAVE_STORAGE_KEYS.active);
    },

    setActiveSaveId(saveId: string | null): void {
      if (saveId === null) {
        storage.removeItem(SAVE_STORAGE_KEYS.active);
        return;
      }
      if (!storage.getItem(SAVE_STORAGE_KEYS.save(saveId))) {
        throw new SaveRepositoryError("not_found", `Cannot activate missing save ${saveId}.`);
      }
      storage.setItem(SAVE_STORAGE_KEYS.active, saveId);
    },
  };
}

export type SaveRepository = ReturnType<typeof createSaveRepository>;

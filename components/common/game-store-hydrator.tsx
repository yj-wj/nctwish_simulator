"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/game-store";

export function GameStoreHydrator() {
  const saveError = useGameStore((state) => state.saveError);
  useEffect(() => {
    useGameStore.getState().initializePersistence();
  }, []);

  return saveError ? <div className="global-save-error" role="alert">{saveError}</div> : null;
}


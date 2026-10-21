"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/game-store";

export function GameStoreHydrator() {
  useEffect(() => {
    void useGameStore.persist.rehydrate();
  }, []);

  return null;
}


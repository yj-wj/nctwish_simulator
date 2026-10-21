"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/game-store";

export function GameStoreHydrator() {
  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        await useGameStore.persist.rehydrate();
      } finally {
        if (active) useGameStore.getState().setHydrated(true);
      }
    };
    void hydrate();
    return () => { active = false; };
  }, []);

  return null;
}


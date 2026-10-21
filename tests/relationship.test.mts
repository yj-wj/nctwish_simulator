import assert from "node:assert/strict";
import { test } from "node:test";
import { getRelationshipStage } from "../game/relationship.ts";

const boundaryCases = [
  [0, "陌生人"],
  [15, "陌生人"],
  [16, "有印象"],
  [30, "有印象"],
  [31, "产生兴趣"],
  [50, "产生兴趣"],
  [51, "暧昧期"],
  [65, "暧昧期"],
  [66, "确认关系"],
  [80, "确认关系"],
  [81, "热恋期"],
  [90, "热恋期"],
  [91, "考验期"],
  [100, "考验期"],
] as const;

test("getRelationshipStage maps every required boundary", () => {
  for (const [affection, expected] of boundaryCases) {
    assert.equal(getRelationshipStage(affection).name, expected, `affection=${affection}`);
  }
});

test("getRelationshipStage rejects values outside the specified 0–100 range", () => {
  assert.throws(() => getRelationshipStage(-1), RangeError);
  assert.throws(() => getRelationshipStage(101), RangeError);
  assert.throws(() => getRelationshipStage(Number.NaN), RangeError);
});


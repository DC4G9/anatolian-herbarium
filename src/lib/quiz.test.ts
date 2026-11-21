import { describe, it, expect } from "vitest";
import { judge, pickQuestions } from "./quiz";
const items = Array.from({ length: 126 }, (_, i) => i);
describe("quiz rules", () => {
  it("first try correct is green", () => expect(judge(true, 0)).toBe("green"));
  it("correct on 2nd or 3rd try is yellow", () => { expect(judge(true, 1)).toBe("yellow"); expect(judge(true, 2)).toBe("yellow"); });
  it("third miss turns red", () => { expect(judge(false, 1)).toBeNull(); expect(judge(false, 2)).toBe("red"); });
  it("round sizes 15/30/50/all without repeats", () => {
    for (const n of [15, 30, 50] as const) { const q = pickQuestions(items, n); expect(q).toHaveLength(n); expect(new Set(q).size).toBe(n); }
    expect(new Set(pickQuestions(items, "all")).size).toBe(126);
  });
});
import { points } from "./quiz";
describe("scoring", () => {
  it("first try is 100, later tries less, red is 0", () => { expect(points("green", 0, 1, 10)).toBe(100); expect(points("yellow", 1, 0, 10)).toBe(60); expect(points("yellow", 2, 0, 10)).toBe(30); expect(points("red", 2, 0, 1)).toBe(0); });
  it("streak bonus capped at +50 and speed bonus +20", () => { expect(points("green", 0, 3, 10)).toBe(120); expect(points("green", 0, 20, 10)).toBe(150); expect(points("green", 0, 1, 3)).toBe(120); });
});

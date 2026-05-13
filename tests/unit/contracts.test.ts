import { describe, expect, it } from "vitest";

import { mockThreads } from "@/features/study-threads/mock-data";

describe("study thread contracts", () => {
  it("uses thread-first statuses for mock dashboard data", () => {
    expect(mockThreads).toHaveLength(3);
    expect(mockThreads.map((thread) => thread.status)).toEqual([
      "ready",
      "processing",
      "needs_review",
    ]);
  });
});

import { describe, expect, it } from "vitest";

import { toKnowledgeRowContent } from "@/server/ai/study-extraction";

describe("study extraction AI helpers", () => {
  it("compacts nullable structured-output fields before persistence", () => {
    const content = toKnowledgeRowContent({
      title: null,
      term: "gehen",
      meaning: "to go",
      explanation: "",
      example: undefined,
      confidence: 0.92,
    });

    expect(content).toEqual({
      term: "gehen",
      meaning: "to go",
      confidence: 0.92,
      extraction_version: "real-ai-extraction.v1",
    });
  });
});

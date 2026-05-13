import { describe, expect, it } from "vitest";

import { buildExtractionStub } from "@/features/uploads/extraction-stub";

describe("extraction stub", () => {
  it("creates valid placeholder knowledge items for an upload", () => {
    const result = buildExtractionStub({
      fileName: "Kapitel 3 - Berufe.pdf",
      mimeType: "application/pdf",
    });

    expect(result.summary.vocabulary).toBeGreaterThan(0);
    expect(result.summary.detected_topic).toBe("Kapitel 3 Berufe");
    expect(result.items.map((item) => item.item_type)).toContain("topic_context");
    expect(result.items.every((item) => item.content.schema_version === "stub.v1")).toBe(
      true,
    );
  });
});

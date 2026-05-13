import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("px-2", true && "px-4", false && "hidden")).toContain("px-4");
    expect(cn("text-sm", "text-lg")).toContain("text-lg");
  });
});

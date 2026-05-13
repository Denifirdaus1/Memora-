import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      status: "not_implemented",
      message:
        "Review generation placeholder. Sprint 2+ will generate questions from thread context.",
    },
    { status: 501 },
  );
}

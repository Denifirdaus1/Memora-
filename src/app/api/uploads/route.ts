import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      status: "not_implemented",
      message:
        "Upload contract placeholder. Sprint 2 will create thread_uploads and upload_jobs.",
    },
    { status: 501 },
  );
}

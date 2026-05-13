import { notFound, redirect } from "next/navigation";

import { ReviewSessionShell } from "@/components/review/review-session-shell";
import { getReviewSessionDetail } from "@/server/queries/review";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const detail = await getReviewSessionDetail(sessionId);

  if (!detail) {
    notFound();
  }

  if (detail.stats.isComplete && !detail.currentQuestion) {
    redirect(`/review/${sessionId}/summary`);
  }

  return (
    <ReviewSessionShell
      session={detail.session}
      thread={detail.thread}
      question={detail.currentQuestion}
      answeredCount={detail.stats.answeredCount}
    />
  );
}

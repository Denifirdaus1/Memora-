import { cn } from "@/lib/utils";
import type { StudyThreadStatus } from "@/types/database";

const statusStyles: Record<StudyThreadStatus, string> = {
  empty: "bg-[#EEF2F7] text-[#526173]",
  processing: "bg-[#E5F6FF] text-[#0875A7]",
  ready: "bg-[#EAF2FF] text-[var(--accent-blue)]",
  needs_review: "bg-[#FFF3D6] text-[#946200]",
  archived: "bg-[#EEF2F7] text-[#7B8794]",
};

export function StatusPill({
  status,
  className,
}: {
  status: StudyThreadStatus;
  className?: string;
}) {
  const label = status.replace("_", " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold capitalize",
        statusStyles[status],
        className,
      )}
    >
      {label}
    </span>
  );
}

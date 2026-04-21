import { Badge } from "@/components/ui/badge"
import { TaskStatus } from "@/lib/db/schema"

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  [TaskStatus.PENDING]: { label: "Pending", variant: "secondary" },
  [TaskStatus.PROCESSING]: { label: "Processing", variant: "default" },
  [TaskStatus.COMPLETED]: { label: "Completed", variant: "outline" },
  [TaskStatus.FAILED]: { label: "Failed", variant: "destructive" },
  [TaskStatus.CANCELED]: { label: "Canceled", variant: "secondary" },
}

export function TaskStatusBadge({ status }: { status: string }) {
  const meta = STATUS_LABEL[status] ?? { label: status, variant: "secondary" as const }
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

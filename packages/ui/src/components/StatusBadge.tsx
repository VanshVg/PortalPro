import type {
  DeliverableStatus,
  InvoiceStatus,
  ProjectStatus,
  TaskStatus,
} from "@portalpro/types";

import { Badge, type BadgeProps } from "./Badge";

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: string;
  variant?: BadgeProps["variant"];
}

/** Generic status badge with automatic variant mapping. */
function StatusBadge({ status, variant, ...props }: StatusBadgeProps) {
  return (
    <Badge variant={variant ?? "default"} {...props}>
      {formatStatusLabel(status)}
    </Badge>
  );
}

/** Project status badge with color mapping. */
function ProjectStatusBadge({ status, ...props }: { status: ProjectStatus } & Omit<BadgeProps, "variant">) {
  const variantMap: Record<ProjectStatus, BadgeProps["variant"]> = {
    DRAFT: "default",
    ACTIVE: "success",
    ON_HOLD: "warning",
    COMPLETED: "info",
    ARCHIVED: "default",
  };

  return (
    <Badge variant={variantMap[status]} {...props}>
      {formatStatusLabel(status)}
    </Badge>
  );
}

/** Task status badge with color mapping. */
function TaskStatusBadge({ status, ...props }: { status: TaskStatus } & Omit<BadgeProps, "variant">) {
  const variantMap: Record<TaskStatus, BadgeProps["variant"]> = {
    TODO: "default",
    IN_PROGRESS: "info",
    IN_REVIEW: "warning",
    DONE: "success",
  };

  return (
    <Badge variant={variantMap[status]} {...props}>
      {formatStatusLabel(status)}
    </Badge>
  );
}

/** Invoice status badge with color mapping. */
function InvoiceStatusBadge({ status, ...props }: { status: InvoiceStatus } & Omit<BadgeProps, "variant">) {
  const variantMap: Record<InvoiceStatus, BadgeProps["variant"]> = {
    DRAFT: "default",
    SENT: "info",
    PAID: "success",
    OVERDUE: "error",
    CANCELLED: "default",
  };

  return (
    <Badge variant={variantMap[status]} {...props}>
      {formatStatusLabel(status)}
    </Badge>
  );
}

/** Converts UPPER_SNAKE_CASE to Title Case for display. */
function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export { StatusBadge, ProjectStatusBadge, TaskStatusBadge, InvoiceStatusBadge };

import { createFileRoute } from "@tanstack/react-router";
import { AuditLogPage } from "@/components/admin/audit-log/AuditLogPage";

export const Route = createFileRoute("/admin/audit-log")({
  component: AuditLogPage,
});

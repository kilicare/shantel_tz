import { ResourceWorkspace } from "@/components/ResourceWorkspace";
export default function AuditPage() { return <ResourceWorkspace eyebrow="Traceability" title="Audit" description="Integrity checks and accountability records for operational actions." endpoint="/audit/integrity/full-check" emptyLabel="No audit result returned." />; }

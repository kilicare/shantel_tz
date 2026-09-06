import { ResourceWorkspace } from "@/components/ResourceWorkspace";
export default function ApprovalsPage() { return <ResourceWorkspace eyebrow="Control room" title="Approvals" description="Review pending operational decisions with recorded accountability." endpoint="/approvals/pending?page=1&limit=50" emptyLabel="No pending approvals." />; }

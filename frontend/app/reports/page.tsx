import { ResourceWorkspace } from "@/components/ResourceWorkspace";
export default function ReportsPage() { return <ResourceWorkspace eyebrow="Business intelligence" title="Reports" description="Operational views for sales, customers, products, and inventory decisions." endpoint="/reports/dashboard/top-customers?limit=20" emptyLabel="No report data found." />; }

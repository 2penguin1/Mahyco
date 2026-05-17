import { PageHeader } from "@/components/ui/PageHeader";
import { BatchTab } from "@/components/ui/BatchTab";

export default function BatchProcessingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Batch Processing" />
      <BatchTab />
    </div>
  );
}

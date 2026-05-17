import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import * as api from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Clock, Download, FileText } from "lucide-react";
import toast from "react-hot-toast";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const navigate = useNavigate();

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return;
    try {
      const list = await api.getHistory(0, 50);
      setHistory(list);
      setHistoryLoaded(true);
    } catch {
      setHistory([]);
      setHistoryLoaded(true);
    }
  }, [historyLoaded]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const downloadReportData = async (id: string | number) => {
    try {
      await api.downloadReport(id);
      toast.success("Report downloaded successfully");
    } catch (err) {
      toast.error("Failed to download report");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="History" />
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Past Analyses</h3>
          
          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--text-primary)]">
                <thead className="bg-[var(--surface-raised)] text-[var(--text-muted)] text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 rounded-r-lg font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--surface-raised)]/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{item.original_filename}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.created_at}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.overall_health_score >= 70 ? "success" : item.overall_health_score >= 40 ? "warning" : "danger"}>
                          {item.overall_health_score}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => navigate(`/dashboard?analysisId=${item.id}`)}>
                          <FileText size={14} className="mr-1" /> View
                        </Button>
                        <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => downloadReportData(item.id)}>
                          <Download size={14} className="mr-1" /> JSON
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center flex flex-col items-center">
              <Clock size={32} className="text-[var(--text-muted)] mb-3" />
              <p className="text-[var(--text-muted)]">Your analyses will appear here.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

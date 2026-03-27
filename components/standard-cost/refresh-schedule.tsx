import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const upcomingRefreshes = [
  { date: "Feb 15", category: "RF Modules", parts: 48, status: "on-track" },
  { date: "Feb 22", category: "Processors", parts: 32, status: "on-track" },
  { date: "Feb 28", category: "Connectors", parts: 156, status: "on-track" },
  { date: "Mar 7", category: "PCBs", parts: 67, status: "at-risk" },
  { date: "Mar 14", category: "Labor", parts: 24, status: "on-track" },
  { date: "Mar 21", category: "RF Modules", parts: 52, status: "on-track" },
  { date: "Mar 28", category: "Processors", parts: 28, status: "on-track" },
  { date: "Apr 4", category: "Connectors", parts: 143, status: "overdue" },
]

export function RefreshSchedule() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Scheduled Refresh Cycle</h3>
      <div className="space-y-4">
        <div className="bg-[#EFF6FF] p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Next Portfolio Refresh</p>
          <p className="text-2xl font-bold text-[#1D4ED8]">2025-02-15</p>
        </div>

        <div className="space-y-3">
          {upcomingRefreshes.map((refresh, index) => (
            <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
              <div
                className={cn(
                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                  refresh.status === "on-track" ? "bg-[#059669]" : "",
                  refresh.status === "at-risk" ? "bg-[#F59E0B]" : "",
                  refresh.status === "overdue" ? "bg-[#DC2626]" : "",
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{refresh.date}</p>
                <p className="text-xs text-gray-600">{refresh.category}</p>
                <p className="text-xs text-gray-500">{refresh.parts} parts</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">Last refresh: Dec 1, 2025 (127 parts)</p>
        </div>
      </div>
    </Card>
  )
}

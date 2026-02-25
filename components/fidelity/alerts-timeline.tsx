"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const alertsData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - i))
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    critical: Math.floor(Math.random() * 5) + 2,
    warning: Math.floor(Math.random() * 8) + 3,
    info: Math.floor(Math.random() * 4) + 1,
  }
})

const recentAlerts = [
  {
    timestamp: "Dec 3, 2:15 PM",
    severity: "critical",
    message: "Part HR-PRO-0024 cost data > 180 days old",
    partNumber: "HR-PRO-0024",
  },
  {
    timestamp: "Dec 3, 1:45 PM",
    severity: "warning",
    message: "Quote Q-2025-00487 using 3 stale component costs",
    partNumber: "Q-2025-00487",
  },
  {
    timestamp: "Dec 3, 11:30 AM",
    severity: "critical",
    message: "Part HR-RF-0156 variance exceeds +15% threshold",
    partNumber: "HR-RF-0156",
  },
  {
    timestamp: "Dec 3, 10:20 AM",
    severity: "warning",
    message: "Supplier quote for Connectors expires in 5 days",
    partNumber: "—",
  },
  {
    timestamp: "Dec 3, 9:05 AM",
    severity: "info",
    message: "Scheduled refresh completed: 48 parts updated",
    partNumber: "—",
  },
  {
    timestamp: "Dec 2, 4:30 PM",
    severity: "critical",
    message: "Part HR-PCB-0089 missing cost data",
    partNumber: "HR-PCB-0089",
  },
  {
    timestamp: "Dec 2, 2:15 PM",
    severity: "warning",
    message: "High-spend part HR-RF-0012 approaching refresh due date",
    partNumber: "HR-RF-0012",
  },
  {
    timestamp: "Dec 2, 11:00 AM",
    severity: "info",
    message: "Low-priority refresh scheduled for Feb 15",
    partNumber: "—",
  },
  {
    timestamp: "Dec 2, 9:30 AM",
    severity: "critical",
    message: "Multiple quotes affected by stale RF Module costs",
    partNumber: "—",
  },
  {
    timestamp: "Dec 1, 3:45 PM",
    severity: "warning",
    message: "Part HR-CON-0234 variance at +12%",
    partNumber: "HR-CON-0234",
  },
]

export function AlertsTimeline() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Alert History (Last 30 Days)</h3>

      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={alertsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: "Alerts", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="critical" stackId="a" fill="#DC2626" name="Critical" />
            <Bar dataKey="warning" stackId="a" fill="#F59E0B" name="Warning" />
            <Bar dataKey="info" stackId="a" fill="#3B82F6" name="Info" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3">Recent Alerts (Last 10)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-2 font-medium text-gray-700">Timestamp</th>
                <th className="text-left p-2 font-medium text-gray-700">Severity</th>
                <th className="text-left p-2 font-medium text-gray-700">Alert Message</th>
                <th className="text-left p-2 font-medium text-gray-700">Part/Quote</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map((alert, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="p-2 text-gray-600">{alert.timestamp}</td>
                  <td className="p-2">
                    <Badge
                      className={
                        alert.severity === "critical"
                          ? "bg-[#DC2626] text-white"
                          : alert.severity === "warning"
                            ? "bg-[#F59E0B] text-white"
                            : "bg-blue-500 text-white"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </td>
                  <td className="p-2 text-gray-700">{alert.message}</td>
                  <td className="p-2 font-mono text-gray-600">{alert.partNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}

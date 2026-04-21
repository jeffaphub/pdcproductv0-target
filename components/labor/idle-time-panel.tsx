"use client"

import { Card } from "@/components/ui/card"

type IdleEvent = {
  date: string
  hours: number
  reason: string
  chargedToWorkOrderId: string
  impactComment: string
}

const mockIdleEvents: IdleEvent[] = [
  {
    date: "2025-01-20",
    hours: 4.5,
    reason: "Waiting for Material",
    chargedToWorkOrderId: "WO-2025-0847",
    impactComment: "Supplier delay on RF modules",
  },
  {
    date: "2025-01-19",
    hours: 3.0,
    reason: "Waiting for Engineering",
    chargedToWorkOrderId: "WO-2025-0846",
    impactComment: "Design clarification needed",
  },
  {
    date: "2025-01-18",
    hours: 2.0,
    reason: "Training",
    chargedToWorkOrderId: "–",
    impactComment: "New technician onboarding",
  },
  {
    date: "2025-01-17",
    hours: 5.5,
    reason: "Waiting for Material",
    chargedToWorkOrderId: "WO-2025-0845",
    impactComment: "Antenna components backordered",
  },
  {
    date: "2025-01-16",
    hours: 1.5,
    reason: "Capacity Buffer",
    chargedToWorkOrderId: "–",
    impactComment: "Between jobs",
  },
]

const weeklyData = [
  { week: "W1", waiting_material: 8, waiting_engineering: 4, training: 2, capacity: 3, other: 1 },
  { week: "W2", waiting_material: 12, waiting_engineering: 6, training: 0, capacity: 2, other: 2 },
  { week: "W3", waiting_material: 6, waiting_engineering: 3, training: 4, capacity: 4, other: 1 },
  { week: "W4", waiting_material: 10, waiting_engineering: 5, training: 1, capacity: 3, other: 2 },
]

export function IdleTimePanel() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Idle & Non-Productive Time Events</h3>

      {/* Stacked bar chart */}
      <div className="mb-4 space-y-2">
        {weeklyData.map((week) => {
          const total = week.waiting_material + week.waiting_engineering + week.training + week.capacity + week.other
          return (
            <div key={week.week} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-8">{week.week}</span>
              <div className="flex-1 h-6 flex rounded overflow-hidden">
                <div
                  className="bg-[#F59E0B]"
                  style={{ width: `${(week.waiting_material / total) * 100}%` }}
                  title={`Waiting for Material: ${week.waiting_material}h`}
                />
                <div
                  className="bg-[#DC2626]"
                  style={{ width: `${(week.waiting_engineering / total) * 100}%` }}
                  title={`Waiting for Engineering: ${week.waiting_engineering}h`}
                />
                <div
                  className="bg-[#1D4ED8]"
                  style={{ width: `${(week.training / total) * 100}%` }}
                  title={`Training: ${week.training}h`}
                />
                <div
                  className="bg-gray-400"
                  style={{ width: `${(week.capacity / total) * 100}%` }}
                  title={`Capacity Buffer: ${week.capacity}h`}
                />
                <div
                  className="bg-gray-300"
                  style={{ width: `${(week.other / total) * 100}%` }}
                  title={`Other: ${week.other}h`}
                />
              </div>
              <span className="text-xs text-gray-600 w-12 text-right">{total}h</span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#F59E0B] rounded" />
          <span className="text-gray-600">Waiting for Material</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#DC2626] rounded" />
          <span className="text-gray-600">Waiting for Engineering</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#1D4ED8] rounded" />
          <span className="text-gray-600">Training</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-400 rounded" />
          <span className="text-gray-600">Capacity Buffer</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-300 rounded" />
          <span className="text-gray-600">Other</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-600">
              <th className="text-left py-2 px-2 font-medium">Date</th>
              <th className="text-right py-2 px-2 font-medium">Hours</th>
              <th className="text-left py-2 px-2 font-medium">Reason</th>
              <th className="text-left py-2 px-2 font-medium">WO</th>
              <th className="text-left py-2 px-2 font-medium">Impact Comment</th>
            </tr>
          </thead>
          <tbody>
            {mockIdleEvents.map((event, idx) => (
              <tr
                key={idx}
                className={`border-b border-gray-100 ${event.chargedToWorkOrderId !== "–" ? "bg-blue-50" : ""}`}
              >
                <td className="py-2 px-2 text-xs text-gray-700">{event.date}</td>
                <td className="py-2 px-2 text-xs text-right text-gray-900 font-medium">{event.hours}</td>
                <td className="py-2 px-2 text-xs text-gray-700">{event.reason}</td>
                <td className="py-2 px-2 text-xs text-gray-700">{event.chargedToWorkOrderId}</td>
                <td className="py-2 px-2 text-xs text-gray-600">{event.impactComment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

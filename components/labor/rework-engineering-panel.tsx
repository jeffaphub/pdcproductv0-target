"use client"

import { Card } from "@/components/ui/card"

type ReworkEvent = {
  date: string
  workOrderId: string
  issueCategory: string
  laborHours: number
  laborCost: number
  technicianLevel: string
  timeToResolveHours: number
}

const mockReworkEvents: ReworkEvent[] = [
  {
    date: "2025-01-20",
    workOrderId: "WO-2025-0847",
    issueCategory: "Test Failure – Hardware",
    laborHours: 6.0,
    laborCost: 540,
    technicianLevel: "Senior Technician",
    timeToResolveHours: 8.5,
  },
  {
    date: "2025-01-19",
    workOrderId: "WO-2025-0846",
    issueCategory: "Design Issue",
    laborHours: 4.5,
    laborCost: 495,
    technicianLevel: "Engineer",
    timeToResolveHours: 6.0,
  },
  {
    date: "2025-01-18",
    workOrderId: "WO-2025-0845",
    issueCategory: "Test Failure – Software",
    laborHours: 3.0,
    laborCost: 240,
    technicianLevel: "Technician",
    timeToResolveHours: 4.0,
  },
  {
    date: "2025-01-17",
    workOrderId: "WO-2025-0844",
    issueCategory: "Field Return",
    laborHours: 8.0,
    laborCost: 880,
    technicianLevel: "Engineer",
    timeToResolveHours: 12.0,
  },
  {
    date: "2025-01-16",
    workOrderId: "WO-2025-0843",
    issueCategory: "Assembly Defect",
    laborHours: 2.5,
    laborCost: 200,
    technicianLevel: "Technician",
    timeToResolveHours: 3.0,
  },
]

const weeklyData = [
  { week: "W1", software: 5, hardware: 8, design: 4, field: 6, assembly: 3 },
  { week: "W2", software: 7, hardware: 12, design: 6, field: 8, assembly: 2 },
  { week: "W3", software: 4, hardware: 6, design: 3, field: 4, assembly: 4 },
  { week: "W4", software: 6, hardware: 10, design: 5, field: 7, assembly: 3 },
]

export function ReworkEngineeringPanel() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Rework & Engineering Support Labor</h3>

      {/* Stacked column chart */}
      <div className="flex items-end justify-between gap-2 h-[80px] mb-4">
        {weeklyData.map((week) => {
          const total = week.software + week.hardware + week.design + week.field + week.assembly
          return (
            <div key={week.week} className="flex flex-col items-center gap-1 flex-1">
              <div className="flex flex-col justify-end items-center w-full h-full">
                <div className="w-full flex flex-col justify-end h-full" style={{ height: `${(total / 50) * 100}%` }}>
                  <div className="bg-[#1D4ED8]" style={{ height: `${(week.software / total) * 100}%` }} />
                  <div className="bg-[#DC2626]" style={{ height: `${(week.hardware / total) * 100}%` }} />
                  <div className="bg-[#F59E0B]" style={{ height: `${(week.design / total) * 100}%` }} />
                  <div className="bg-[#9333EA]" style={{ height: `${(week.field / total) * 100}%` }} />
                  <div className="bg-[#059669]" style={{ height: `${(week.assembly / total) * 100}%` }} />
                </div>
              </div>
              <span className="text-xs text-gray-600">{week.week}</span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#1D4ED8] rounded" />
          <span className="text-gray-600">Software</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#DC2626] rounded" />
          <span className="text-gray-600">Hardware</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#F59E0B] rounded" />
          <span className="text-gray-600">Design</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#9333EA] rounded" />
          <span className="text-gray-600">Field Return</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#059669] rounded" />
          <span className="text-gray-600">Assembly</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-600">
              <th className="text-left py-2 px-2 font-medium">Date</th>
              <th className="text-left py-2 px-2 font-medium">WO</th>
              <th className="text-left py-2 px-2 font-medium">Issue Category</th>
              <th className="text-right py-2 px-2 font-medium">Hours</th>
              <th className="text-right py-2 px-2 font-medium">Cost</th>
              <th className="text-left py-2 px-2 font-medium">Level</th>
            </tr>
          </thead>
          <tbody>
            {mockReworkEvents.map((event, idx) => {
              const borderClass =
                event.issueCategory === "Test Failure – Hardware"
                  ? "border-l-4 border-l-red-400"
                  : event.issueCategory === "Field Return"
                    ? "border-l-4 border-l-red-600"
                    : ""

              return (
                <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${borderClass}`}>
                  <td className="py-2 px-2 text-xs text-gray-700">{event.date}</td>
                  <td className="py-2 px-2 text-xs text-blue-600">{event.workOrderId}</td>
                  <td className="py-2 px-2 text-xs text-gray-700">{event.issueCategory}</td>
                  <td className="py-2 px-2 text-xs text-right text-gray-900 font-medium">{event.laborHours}</td>
                  <td className="py-2 px-2 text-xs text-right text-gray-900 font-medium">
                    ${event.laborCost.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-700">{event.technicianLevel}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

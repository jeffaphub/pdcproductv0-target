"use client"

import type { GlobalFilterState } from "@/app/page"
import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { WorkOrderLaborTable } from "@/components/labor/work-order-labor-table"
import { IdleTimePanel } from "@/components/labor/idle-time-panel"
import { ReworkEngineeringPanel } from "@/components/labor/rework-engineering-panel"

type LaborCostTrackingProps = {
  filters: GlobalFilterState
}

export function LaborCostTracking({ filters }: LaborCostTrackingProps) {
  // Generate daily labor data for mini bar chart
  const dailyData = [
    { day: "Mon", planned: 40, actual: 48 },
    { day: "Tue", planned: 38, actual: 51 },
    { day: "Wed", planned: 42, actual: 49 },
    { day: "Thu", planned: 40, actual: 46 },
    { day: "Fri", planned: 35, actual: 48 },
  ]

  // Generate weekly variance data for sparkline
  const weeklyVariance = [
    { week: "W1", variance: 12 },
    { week: "W2", variance: 32 },
    { week: "W3", variance: 8 },
    { week: "W4", variance: 18 },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Labor Cost Tracking & Variance Analysis</h2>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* KPI 1: Planned vs Actual Labor */}
        <Card className="p-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Planned vs Actual Labor (This Week)</p>
            <div className="flex items-baseline justify-between">
              <p className="text-4xl font-bold text-gray-900">242h</p>
              <p className="text-lg text-gray-500">vs 195 planned</p>
            </div>
            <p className="text-xs text-[#DC2626] font-medium">+47 hours over (+24.1%)</p>
            {/* Mini bar chart */}
            <div className="flex items-end justify-between gap-1 h-[30px]">
              {dailyData.map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-0.5 flex-1">
                  <div className="flex items-end gap-0.5 h-full w-full">
                    <div className="bg-blue-200 w-1/2" style={{ height: `${(d.planned / 60) * 100}%` }} />
                    <div className="bg-blue-600 w-1/2" style={{ height: `${(d.actual / 60) * 100}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-500">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* KPI 2: Labor Variance Trend */}
        <Card className="p-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Labor Variance Trend (Last 4 Weeks)</p>
            <p className="text-4xl font-bold text-[#DC2626]">+18h/week</p>
            <p className="text-xs text-gray-500">Average weekly variance</p>
            {/* Sparkline */}
            <div className="relative h-[30px]">
              <svg width="100%" height="30" className="overflow-visible">
                <defs>
                  <linearGradient id="varianceGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 0,${30 - (weeklyVariance[0].variance / 40) * 30} ${weeklyVariance.map((v, i) => `L ${(i / (weeklyVariance.length - 1)) * 100},${30 - (v.variance / 40) * 30}`).join(" ")}`}
                  fill="url(#varianceGradient)"
                  stroke="#DC2626"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </Card>

        {/* KPI 3: Idle / Non-Productive Time */}
        <Card className="p-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Idle / Non-Productive Time as % of Total Labor</p>
            <p className="text-4xl font-bold text-[#DC2626]">8.3%</p>
            <p className="text-xs text-gray-500">Avg this week vs 5% target</p>
            <p className="text-xs text-[#DC2626] flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              1.2% above target
            </p>
            {/* Horizontal bar */}
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="absolute h-full bg-[#059669]" style={{ width: "91.7%" }} />
              <div className="absolute h-full w-0.5 bg-gray-700" style={{ left: "95%" }} />
            </div>
          </div>
        </Card>

        {/* KPI 4: Rework Labor */}
        <Card className="p-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Rework Labor as % of Total Labor</p>
            <p className="text-4xl font-bold text-[#DC2626]">12.1%</p>
            <p className="text-xs text-gray-500">Avg this week</p>
            <p className="text-xs text-[#059669] flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              -0.8% from last week
            </p>
            {/* Mini trend line */}
            <div className="relative h-[30px]">
              <svg width="100%" height="30">
                <line x1="0" y1="15" x2="100%" y2="15" stroke="#10B981" strokeWidth="1" strokeDasharray="2,2" />
                <path d="M 0,8 L 20,6 L 40,10 L 60,12 L 80,10 L 100,9" fill="none" stroke="#DC2626" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Work Order Labor Table */}
      <WorkOrderLaborTable />

      {/* Row 3: Two side-by-side tables */}
      <div className="grid grid-cols-2 gap-6">
        <IdleTimePanel />
        <ReworkEngineeringPanel />
      </div>
    </div>
  )
}

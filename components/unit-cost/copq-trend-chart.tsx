"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts"

const weeklyData = [
  { week: "W1", copqPct: 15.3, copqCost: 18500 },
  { week: "W2", copqPct: 13.8, copqCost: 16800 },
  { week: "W3", copqPct: 16.5, copqCost: 19500 },
  { week: "W4", copqPct: 14.5, copqCost: 17200 },
  { week: "W5", copqPct: 15.8, copqCost: 18900 },
  { week: "W6", copqPct: 13.4, copqCost: 15800 },
  { week: "W7", copqPct: 14.8, copqCost: 17500 },
  { week: "W8", copqPct: 13.1, copqCost: 15100 },
]

export function COPQTrendChart() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">COPQ % Trend vs 5% Target</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis domain={[0, 20]} label={{ value: "COPQ %", angle: -90, position: "insideLeft" }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="bg-white p-2 border border-gray-200 rounded shadow-sm text-xs">
                    <p className="font-medium">{data.week}</p>
                    <p className="text-red-600">COPQ: {data.copqPct.toFixed(1)}%</p>
                    <p className="text-gray-600">Cost: ${data.copqCost.toLocaleString()}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <ReferenceArea y1={0} y2={5} fill="#10B981" fillOpacity={0.1} />
          <ReferenceArea y1={5} y2={10} fill="#F59E0B" fillOpacity={0.1} />
          <ReferenceArea y1={10} y2={20} fill="#DC2626" fillOpacity={0.1} />
          <ReferenceLine y={5} stroke="#10B981" strokeDasharray="3 3" label="Target: 5%" />
          <Line type="monotone" dataKey="copqPct" stroke="#DC2626" strokeWidth={2.5} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Current COPQ %:</span>
          <span className="font-bold text-[#DC2626]">13.1%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">4-Week Average:</span>
          <span className="font-medium text-gray-900">14.2%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Trend:</span>
          <span className="flex items-center gap-1 text-[#DC2626]">
            <TrendingUp className="h-4 w-4" />
            Elevated
          </span>
        </div>
        <div className="text-xs text-gray-600 pt-2 border-t">Impact: $15,100 COPQ this week vs target $9,200</div>
      </div>
    </Card>
  )
}

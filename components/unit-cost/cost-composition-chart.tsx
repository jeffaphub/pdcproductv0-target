"use client"

import { Card } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line } from "recharts"

const weeklyData = [
  { week: "W1", material: 780, labor: 220, copq: 180, total: 1180 },
  { week: "W2", material: 795, labor: 235, copq: 165, total: 1195 },
  { week: "W3", material: 770, labor: 218, copq: 195, total: 1183 },
  { week: "W4", material: 785, labor: 228, copq: 172, total: 1185 },
  { week: "W5", material: 775, labor: 224, copq: 188, total: 1187 },
  { week: "W6", material: 790, labor: 232, copq: 158, total: 1180 },
  { week: "W7", material: 780, labor: 226, copq: 175, total: 1181 },
  { week: "W8", material: 775, labor: 224, copq: 150, total: 1149 },
]

export function CostCompositionChart() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Cost Composition Trend (Last 8 Weeks)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis label={{ value: "Cost per Unit (USD)", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="material" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Material" />
          <Area type="monotone" dataKey="labor" stackId="1" stroke="#6B7280" fill="#6B7280" name="Labor" />
          <Area type="monotone" dataKey="copq" stackId="1" stroke="#DC2626" fill="#DC2626" name="COPQ" />
          <Line type="monotone" dataKey="total" stroke="#1E40AF" strokeWidth={2} name="Total Cost" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

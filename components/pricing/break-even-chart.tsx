"use client"

import { Card } from "@/components/ui/card"
import type { QuantityTier } from "@/components/tabs/pricing-optimization"
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { useMemo } from "react"

type BreakEvenChartProps = {
  quantityTiers: QuantityTier[]
  carryingCostPct: number
  obsolescenceRiskPct: number
}

export function BreakEvenChart({ quantityTiers, carryingCostPct, obsolescenceRiskPct }: BreakEvenChartProps) {
  const chartData = useMemo(() => {
    return quantityTiers.map((tier) => {
      const totalCost = tier.quantity * tier.unitPrice
      const carryingCost = totalCost * (carryingCostPct / 100)
      const obsolescenceRiskCost = totalCost * (obsolescenceRiskPct / 100)
      const totalLandedCost = totalCost + carryingCost + obsolescenceRiskCost
      const adjustedCostPerUnit = totalLandedCost / tier.quantity

      return {
        quantity: tier.quantity,
        totalLandedCost,
        costPerUnit: adjustedCostPerUnit,
      }
    })
  }, [quantityTiers, carryingCostPct, obsolescenceRiskPct])

  // Find break-even point (where cost per unit starts to flatten)
  const breakEvenQty =
    chartData.length > 3 ? chartData[Math.floor(chartData.length / 2)].quantity : chartData[0].quantity

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Break-Even Analysis & Total Cost Curve</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="areaGreen" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                <stop offset="50%" stopColor="#059669" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="areaRed" x1="0" y1="0" x2="1" y2="0">
                <stop offset="50%" stopColor="#DC2626" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#DC2626" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="quantity" label={{ value: "Quantity", position: "insideBottom", offset: -5 }} />
            <YAxis yAxisId="left" label={{ value: "Total Landed Cost (USD)", angle: -90, position: "insideLeft" }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: "Cost Per Unit (USD)", angle: 90, position: "insideRight" }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              x={breakEvenQty}
              yAxisId="left"
              stroke="#6B7280"
              strokeDasharray="5 5"
              label={{ value: `Break-Even: ${breakEvenQty}`, position: "top" }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalLandedCost"
              stroke="#1D4ED8"
              strokeWidth={2}
              name="Total Landed Cost"
              dot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="costPerUnit"
              stroke="#0F766E"
              strokeWidth={2}
              name="Cost Per Unit"
              dot={{ r: 5, fill: "#0F766E" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

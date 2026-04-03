"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { QuantityTier } from "@/components/tabs/pricing-optimization"
import { cn } from "@/lib/utils"
import { useMemo } from "react"

type OptimizationAnalysisProps = {
  quantityTiers: QuantityTier[]
  carryingCostPct: number
  obsolescenceRiskPct: number
}

export function OptimizationAnalysis({
  quantityTiers,
  carryingCostPct,
  obsolescenceRiskPct,
}: OptimizationAnalysisProps) {
  const analysis = useMemo(() => {
    return quantityTiers.map((tier) => {
      const totalCost = tier.quantity * tier.unitPrice
      const carryingCost = totalCost * (carryingCostPct / 100)
      const obsolescenceRiskCost = totalCost * (obsolescenceRiskPct / 100)
      const totalLandedCost = totalCost + carryingCost + obsolescenceRiskCost
      const adjustedCostPerUnit = totalLandedCost / tier.quantity
      const buyToOrderCost = quantityTiers[0].unitPrice
      const savingsVsBuyToOrder = (buyToOrderCost - adjustedCostPerUnit) * tier.quantity
      const exposurePct = ((carryingCost + obsolescenceRiskCost) / totalLandedCost) * 100

      return {
        tier,
        totalCost,
        carryingCost,
        obsolescenceRiskCost,
        totalLandedCost,
        adjustedCostPerUnit,
        savingsVsBuyToOrder,
        exposurePct,
      }
    })
  }, [quantityTiers, carryingCostPct, obsolescenceRiskPct])

  const optimalIndex = analysis.reduce(
    (minIdx, curr, idx) => (curr.adjustedCostPerUnit < analysis[minIdx].adjustedCostPerUnit ? idx : minIdx),
    0,
  )

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Landed Cost Analysis by Quantity Tier</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-2 font-medium text-gray-700">Tier</th>
              <th className="text-right p-2 font-medium text-gray-700">Unit Cost</th>
              <th className="text-right p-2 font-medium text-gray-700">Total Cost</th>
              <th className="text-right p-2 font-medium text-gray-700">Carrying</th>
              <th className="text-right p-2 font-medium text-gray-700">Obsolescence</th>
              <th className="text-right p-2 font-medium text-gray-700">Total Landed</th>
              <th className="text-right p-2 font-medium text-gray-700">Cost/Unit</th>
              <th className="text-right p-2 font-medium text-gray-700">Savings</th>
            </tr>
          </thead>
          <tbody>
            {analysis.map((item, index) => (
              <tr
                key={index}
                className={cn(
                  "border-b border-gray-100",
                  index === optimalIndex ? "bg-green-50 font-semibold" : "",
                  item.exposurePct > 30 ? "bg-amber-50" : "",
                )}
              >
                <td className="p-2">
                  {index === optimalIndex && <Badge className="bg-[#059669] text-white mr-2">✓ Optimal</Badge>}
                  {item.exposurePct > 30 && <Badge className="bg-[#F59E0B] text-white mr-2">⚠</Badge>}
                  {item.tier.quantity}
                </td>
                <td className="p-2 text-right font-mono">${item.tier.unitPrice.toFixed(2)}</td>
                <td className="p-2 text-right font-mono">${item.totalCost.toFixed(2)}</td>
                <td className="p-2 text-right font-mono">${item.carryingCost.toFixed(2)}</td>
                <td className="p-2 text-right font-mono">${item.obsolescenceRiskCost.toFixed(2)}</td>
                <td className="p-2 text-right font-mono">${item.totalLandedCost.toFixed(2)}</td>
                <td className="p-2 text-right font-mono font-semibold">${item.adjustedCostPerUnit.toFixed(2)}</td>
                <td className="p-2 text-right font-mono text-[#059669]">
                  {item.savingsVsBuyToOrder > 0 ? "-" : ""}${Math.abs(item.savingsVsBuyToOrder).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-1">
        <p className="text-sm">
          <span className="font-semibold">Best Quantity Tier:</span> {analysis[optimalIndex].tier.quantity} units
          (cost/unit: ${analysis[optimalIndex].adjustedCostPerUnit.toFixed(2)})
        </p>
        <p className="text-sm">
          <span className="font-semibold">Maximum Exposure:</span> $
          {(analysis[optimalIndex].carryingCost + analysis[optimalIndex].obsolescenceRiskCost).toFixed(2)} (inventory +
          obsolescence risk)
        </p>
        <p className="text-sm">
          <span className="font-semibold">Savings vs Buy-to-Order:</span> $
          {analysis[optimalIndex].savingsVsBuyToOrder.toFixed(2)}
        </p>
      </div>
    </Card>
  )
}

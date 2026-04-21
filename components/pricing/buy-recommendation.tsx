"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { QuantityTier } from "@/components/tabs/pricing-optimization"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

type BuyRecommendationProps = {
  quantityTiers: QuantityTier[]
  carryingCostPct: number
  obsolescenceRiskPct: number
}

export function BuyRecommendation({ quantityTiers, carryingCostPct, obsolescenceRiskPct }: BuyRecommendationProps) {
  const [approved, setApproved] = useState(false)

  const recommendation = useMemo(() => {
    const analysis = quantityTiers.map((tier) => {
      const totalCost = tier.quantity * tier.unitPrice
      const carryingCost = totalCost * (carryingCostPct / 100)
      const obsolescenceRiskCost = totalCost * (obsolescenceRiskPct / 100)
      const totalLandedCost = totalCost + carryingCost + obsolescenceRiskCost
      const adjustedCostPerUnit = totalLandedCost / tier.quantity
      const exposure = carryingCost + obsolescenceRiskCost
      const exposurePct = (exposure / totalLandedCost) * 100

      return {
        tier,
        adjustedCostPerUnit,
        exposure,
        exposurePct,
        totalLandedCost,
      }
    })

    const optimalIndex = analysis.reduce(
      (minIdx, curr, idx) => (curr.adjustedCostPerUnit < analysis[minIdx].adjustedCostPerUnit ? idx : minIdx),
      0,
    )

    const optimal = analysis[optimalIndex]
    const buyToOrder = analysis[0]
    const savings = (buyToOrder.adjustedCostPerUnit - optimal.adjustedCostPerUnit) * optimal.tier.quantity
    const savingsPerUnit = buyToOrder.adjustedCostPerUnit - optimal.adjustedCostPerUnit
    const roi = (savings / optimal.exposure) * 100
    const annualDemand = 2400
    const breakEvenRatio = (optimal.tier.quantity / annualDemand) * 100

    let status: "good" | "moderate" | "avoid"
    if (breakEvenRatio <= 100 && optimal.exposurePct < 20) {
      status = "good"
    } else if (breakEvenRatio <= 120 && optimal.exposurePct < 35) {
      status = "moderate"
    } else {
      status = "avoid"
    }

    const riskScore = Math.min(
      100,
      Math.round(optimal.exposurePct * 2 + Math.max(0, (breakEvenRatio - 100) / 2) + (100 - roi)),
    )

    return {
      status,
      recommendedQty: optimal.tier.quantity,
      costPerUnit: optimal.adjustedCostPerUnit,
      savings,
      savingsPerUnit,
      exposure: optimal.exposure,
      exposurePct: optimal.exposurePct,
      roi,
      riskScore,
    }
  }, [quantityTiers, carryingCostPct, obsolescenceRiskPct])

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Buy Recommendation & Risk Assessment</h3>
      <div className="flex gap-6">
        {/* Left: Badge */}
        <div className="flex items-center justify-center w-1/3">
          <Badge
            className={cn(
              "text-2xl p-6 text-white",
              recommendation.status === "good"
                ? "bg-[#059669]"
                : recommendation.status === "moderate"
                  ? "bg-[#F59E0B]"
                  : "bg-[#DC2626]",
            )}
          >
            {recommendation.status === "good" && "✓ GOOD BUY"}
            {recommendation.status === "moderate" && "⚠ MODERATE RISK"}
            {recommendation.status === "avoid" && "✗ AVOID"}
          </Badge>
        </div>

        {/* Right: Summary */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Recommended Quantity:</span>
            <span className="text-sm font-semibold">{recommendation.recommendedQty} units</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Expected Savings:</span>
            <span className="text-sm font-semibold text-[#059669]">
              ${recommendation.savings.toFixed(2)} vs buy-to-order
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Savings Per Unit:</span>
            <span className="text-sm font-semibold">${recommendation.savingsPerUnit.toFixed(2)} per unit</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Inventory Exposure (Risk):</span>
            <span className="text-sm font-semibold">${recommendation.exposure.toFixed(2)} tied up</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Exposure as % of Total Cost:</span>
            <span className="text-sm font-semibold">{recommendation.exposurePct.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">ROI on Strategic Stock:</span>
            <span className="text-sm font-semibold text-[#059669]">{recommendation.roi.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Risk Score:</span>
            <span
              className={cn(
                "text-sm font-semibold",
                recommendation.riskScore < 30
                  ? "text-[#059669]"
                  : recommendation.riskScore < 60
                    ? "text-[#F59E0B]"
                    : "text-[#DC2626]",
              )}
            >
              {recommendation.riskScore}/100
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Payback Period:</span>
            <span className="text-sm font-semibold">~2.5 quarters</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox id="approve" checked={approved} onCheckedChange={(checked) => setApproved(checked as boolean)} />
          <label htmlFor="approve" className="text-sm cursor-pointer">
            I approve this quantity recommendation and authorize procurement to move forward.
          </label>
        </div>
        <Button disabled={!approved} className="w-full">
          Generate RFQ for Supplier
        </Button>
      </div>
    </Card>
  )
}

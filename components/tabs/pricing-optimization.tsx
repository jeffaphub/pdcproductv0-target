"use client"

import type { GlobalFilterState } from "@/app/page"
import { useState } from "react"
import { PartSelector } from "@/components/pricing/part-selector"
import { OptimizationAnalysis } from "@/components/pricing/optimization-analysis"
import { BreakEvenChart } from "@/components/pricing/break-even-chart"
import { BuyRecommendation } from "@/components/pricing/buy-recommendation"
import { mockComponents } from "@/lib/mock-data"

type PricingOptimizationProps = {
  filters: GlobalFilterState
}

export type QuantityTier = {
  quantity: number
  unitPrice: number
}

export function PricingOptimization({ filters }: PricingOptimizationProps) {
  const [selectedPart, setSelectedPart] = useState(mockComponents[0])
  const [quantityTiers, setQuantityTiers] = useState<QuantityTier[]>([
    { quantity: 1, unitPrice: 645 },
    { quantity: 5, unitPrice: 612 },
    { quantity: 10, unitPrice: 580 },
    { quantity: 25, unitPrice: 545 },
    { quantity: 50, unitPrice: 512 },
    { quantity: 100, unitPrice: 487.5 },
  ])
  const [carryingCostPct, setCarryingCostPct] = useState(15)
  const [obsolescenceRiskPct, setObsolescenceRiskPct] = useState(5)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Pricing & Quantity Optimization Tools</h2>

      <PartSelector
        components={mockComponents}
        selectedPart={selectedPart}
        onSelectPart={setSelectedPart}
        quantityTiers={quantityTiers}
        onUpdateTiers={setQuantityTiers}
        carryingCostPct={carryingCostPct}
        onUpdateCarryingCost={setCarryingCostPct}
        obsolescenceRiskPct={obsolescenceRiskPct}
        onUpdateObsolescenceRisk={setObsolescenceRiskPct}
      />

      <OptimizationAnalysis
        quantityTiers={quantityTiers}
        carryingCostPct={carryingCostPct}
        obsolescenceRiskPct={obsolescenceRiskPct}
      />

      <BreakEvenChart
        quantityTiers={quantityTiers}
        carryingCostPct={carryingCostPct}
        obsolescenceRiskPct={obsolescenceRiskPct}
      />

      <BuyRecommendation
        quantityTiers={quantityTiers}
        carryingCostPct={carryingCostPct}
        obsolescenceRiskPct={obsolescenceRiskPct}
      />
    </div>
  )
}

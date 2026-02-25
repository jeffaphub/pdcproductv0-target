"use client"

import type { GlobalFilterState } from "@/app/page"
import { UnitEconomicsCards } from "@/components/unit-cost/unit-economics-cards"
import { CostBreakdownTable } from "@/components/unit-cost/cost-breakdown-table"
import { CostCompositionChart } from "@/components/unit-cost/cost-composition-chart"
import { COPQTrendChart } from "@/components/unit-cost/copq-trend-chart"

type UnitCostCOPQProps = {
  filters: GlobalFilterState
}

export function UnitCostCOPQ({ filters }: UnitCostCOPQProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Unit Cost, Margin, and Cost of Poor Quality (COPQ)</h2>

      {/* Row 1: Unit Economics Cards */}
      <UnitEconomicsCards />

      {/* Row 2: Cost Breakdown Table */}
      <CostBreakdownTable />

      {/* Row 3: Trend Charts */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <CostCompositionChart />
        </div>
        <div>
          <COPQTrendChart />
        </div>
      </div>
    </div>
  )
}

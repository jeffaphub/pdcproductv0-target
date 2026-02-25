"use client"

import type { GlobalFilterState } from "@/app/page"
import { CostTrendChart } from "@/components/cost-trend/cost-trend-chart"
import { CostTrendSummary } from "@/components/cost-trend/cost-trend-summary"
import { TopCostMovers } from "@/components/cost-trend/top-cost-movers"
import { QuotedVsActualVariance } from "@/components/cost-trend/quoted-vs-actual-variance"
import { mockComponentHistory } from "@/lib/mock-data"

type CostTrendVarianceProps = {
  filters: GlobalFilterState
}

export function CostTrendVariance({ filters }: CostTrendVarianceProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Component Cost Trends & Variance Analysis</h2>

      {/* Row 1: Chart and Summary */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <CostTrendChart history={mockComponentHistory} />
        </div>
        <div>
          <CostTrendSummary />
        </div>
      </div>

      {/* Row 2: Two tables side by side */}
      <div className="grid grid-cols-2 gap-6">
        <TopCostMovers />
        <QuotedVsActualVariance />
      </div>
    </div>
  )
}

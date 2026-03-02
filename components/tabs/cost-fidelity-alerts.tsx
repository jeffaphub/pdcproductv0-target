"use client"

import type { GlobalFilterState } from "@/app/page"
import { Card } from "@/components/ui/card"
import { mockComponents } from "@/lib/mock-data"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useMemo } from "react"
import { ComponentStatusDetails } from "@/components/fidelity/component-status-details"
import { RiskAlertsSidebar } from "@/components/fidelity/risk-alerts-sidebar"
import { AlertsTimeline } from "@/components/fidelity/alerts-timeline"

type CostFidelityAlertsProps = {
  filters: GlobalFilterState
}

export function CostFidelityAlerts({ filters }: CostFidelityAlertsProps) {
  const components = useMemo(() => mockComponents, [])

  const freshCount = components.filter((c) => c.freshnessStatus === "Fresh").length
  const atRiskCount = components.filter((c) => c.freshnessStatus === "At Risk").length
  const criticalCount = components.filter(
    (c) => c.freshnessStatus === "Critical" || c.freshnessStatus === "Stale",
  ).length
  const freshPercentage = Math.round((freshCount / components.length) * 100)

  const quotesAtRisk = 8
  const pipelineValue = 2.4

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Cost Fidelity Monitoring & Alerts</h2>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">% BOM with Fresh Costs (≤ 90 days)</p>
            <p className="text-4xl font-bold text-gray-900">{freshPercentage}%</p>
            <p className="text-xs text-gray-500">Target ≥ 90%</p>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute h-full ${freshPercentage >= 90 ? "bg-[#059669]" : "bg-[#F59E0B]"}`}
                style={{ width: `${freshPercentage}%` }}
              />
              <div className="absolute h-full w-0.5 bg-gray-700" style={{ left: "90%" }} />
            </div>
            <p className="text-xs text-[#059669] flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +4% from last month
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Parts At Risk (90–180 days old)</p>
            <p className="text-4xl font-bold text-gray-900">{atRiskCount}</p>
            <p className="text-xs text-gray-500">Require refresh within 30 days</p>
            <p className="text-xs text-[#DC2626] flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +12 parts from last week
            </p>
          </div>
        </Card>

        <Card className="p-6 bg-[#FEE2E2]">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Parts Critical (≥ 180 days OR &gt;10% variance)</p>
            <p className="text-4xl font-bold text-[#DC2626]">{criticalCount}</p>
            <p className="text-xs text-gray-600">Immediate attention</p>
            <p className="text-xs text-[#059669] flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              -3 parts from last week
            </p>
          </div>
        </Card>

        <Card className="p-6 border-2 border-[#DC2626]">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Quotes At Risk (using stale/missing costs)</p>
            <p className="text-4xl font-bold text-[#DC2626]">{quotesAtRisk}</p>
            <p className="text-xs text-gray-600">May have pricing errors</p>
            <p className="text-xs text-gray-500">Affecting estimated ${pipelineValue}M pipeline</p>
          </div>
        </Card>
      </div>

      {/* Row 2: Component Status Table */}
      <ComponentStatusDetails components={components} />

      {/* Row 3: Risk Alerts Sidebar + Timeline */}
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          <AlertsTimeline />
        </div>
        <div>
          <RiskAlertsSidebar components={components} />
        </div>
      </div>
    </div>
  )
}

"use client"

// Unit Cost Req Dashboard
import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { GlobalFilters } from "@/components/global-filters"
import { StandardCostGovernance } from "@/components/tabs/standard-cost-governance"
import { QuoteTracker } from "@/components/tabs/quote-tracker"
import { QuotesToInvestigate } from "@/components/tabs/quotes-to-investigate"
import { ProductCostAnalysis } from "@/components/tabs/product-cost-analysis"
import { PricingOptimization } from "@/components/tabs/pricing-optimization"
import { QuoteDataHub } from "@/components/tabs/quote-data-hub"
import { CostFidelityAlerts } from "@/components/tabs/cost-fidelity-alerts"
import { LaborCostTracking } from "@/components/tabs/labor-cost-tracking"
import { UnitCostCOPQ } from "@/components/tabs/unit-cost-copq"
import { ScheduleMaterialRisk } from "@/components/tabs/schedule-material-risk"
import { QuotesForReview } from "@/components/tabs/quotes-for-review"
import { LineOfBalance } from "@/components/tabs/line-of-balance"
import { BuildPlan } from "@/components/tabs/build-plan"
import { SupplierOTD } from "@/components/tabs/supplier-otd"
import { SupplyRisk } from "@/components/tabs/supply-risk"
import { FPY } from "@/components/tabs/fpy"
import { CriticalPath } from "@/components/tabs/critical-path"
import { LongLeadShortageRisk } from "@/components/tabs/long-lead-shortage-risk"
import { MaterialMonitoring } from "@/components/tabs/material-monitoring"
import { ScheduleRiskRegistry } from "@/components/tabs/schedule-risk-registry"
import { RiskMitigation } from "@/components/tabs/risk-mitigation"
import { ReadyToWork } from "@/components/tabs/ready-to-work"
import { SIOPDashboard } from "@/components/tabs/siop"
import { OpsUnitCost } from "@/components/tabs/ops-unit-cost"
import { OpsShopFloor } from "@/components/tabs/ops-shop-floor"
import { OpsEnterpriseIntel } from "@/components/tabs/ops-enterprise-intel"
import { OTDTracking } from "@/components/tabs/otd-tracking"
import { ShelfLifeTracking } from "@/components/tabs/shelf-life-tracking"
import { MaterialLineOfBalance } from "@/components/tabs/material-line-of-balance"
import { CBOMLifecycle } from "@/components/tabs/cbom-lifecycle"

export type TabId =
  | "standard-cost"
  | "quotes-review"
  | "quote-tracker"
  | "quotes-investigate"
  | "product-cost-analysis"
  | "pricing"
  | "quote-hub"
  | "cost-fidelity"
  | "labor"
  | "unit-cost"
  | "schedule-risk"
  | "line-of-balance"
  | "build-plan"
  | "supplier-otd"
  | "supply-risk"
  | "fpy"
  | "critical-path"
  | "long-lead-shortage"
  | "material-monitoring"
  | "schedule-risk-registry"
  | "risk-mitigation"
  | "ready-to-work"
  | "siop"
  | "ops-unit-cost"
  | "ops-shop-floor"
  | "ops-enterprise-intel"
  | "otd-tracking"
  | "shelf-life"
  | "material-lob"
  | "cbom-lifecycle"

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("standard-cost")
  const [dateRange, setDateRange] = useState({ from: new Date(2024, 0, 1), to: new Date() })
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex flex-col">
        <GlobalFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedCommodities={selectedCommodities}
          onCommoditiesChange={setSelectedCommodities}
          selectedSuppliers={selectedSuppliers}
          onSuppliersChange={setSelectedSuppliers}
        />

        <main className="flex-1 p-6">
          {activeTab === "standard-cost" && <StandardCostGovernance />}
          {activeTab === "quotes-review" && <QuotesForReview />}
          {activeTab === "quote-tracker" && <QuoteTracker />}
          {activeTab === "quotes-investigate" && <QuotesToInvestigate />}
          {activeTab === "product-cost-analysis" && <ProductCostAnalysis />}
          {activeTab === "pricing" && <PricingOptimization />}
          {activeTab === "quote-hub" && <QuoteDataHub />}
          {activeTab === "cost-fidelity" && <CostFidelityAlerts />}
          {activeTab === "labor" && <LaborCostTracking />}
          {activeTab === "unit-cost" && <UnitCostCOPQ />}
          {activeTab === "schedule-risk" && <ScheduleMaterialRisk />}
          {activeTab === "line-of-balance" && <LineOfBalance />}
          {activeTab === "build-plan" && <BuildPlan />}
          {activeTab === "supplier-otd" && <SupplierOTD />}
          {activeTab === "supply-risk" && <SupplyRisk />}
          {activeTab === "fpy" && <FPY />}
          {activeTab === "critical-path" && <CriticalPath />}
          {activeTab === "long-lead-shortage" && <LongLeadShortageRisk />}
          {activeTab === "material-monitoring" && <MaterialMonitoring />}
          {activeTab === "schedule-risk-registry" && <ScheduleRiskRegistry />}
          {activeTab === "risk-mitigation" && <RiskMitigation />}
          {activeTab === "ready-to-work" && <ReadyToWork />}
          {activeTab === "siop" && <SIOPDashboard />}
          {activeTab === "ops-unit-cost" && <OpsUnitCost />}
          {activeTab === "ops-shop-floor" && <OpsShopFloor />}
          {activeTab === "ops-enterprise-intel" && <OpsEnterpriseIntel />}
          {activeTab === "otd-tracking" && <OTDTracking />}
          {activeTab === "shelf-life" && <ShelfLifeTracking />}
        {activeTab === "material-lob" && <MaterialLineOfBalance />}
          {activeTab === "cbom-lifecycle" && <CBOMLifecycle />}
        </main>
      </div>
    </div>
  )
}

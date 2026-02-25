"use client"

import type { TabId } from "@/app/page"
import { cn } from "@/lib/utils"

type Tab = {
  id: TabId
  label: string
}

const tabs: Tab[] = [
  { id: "standard-cost", label: "Standard Cost Governance" },
  { id: "quotes-review", label: "Quotes for Review" },
  { id: "quote-tracker", label: "Quote Tracker" },
  { id: "quotes-investigate", label: "Quotes to Investigate" },
  { id: "quote-hub", label: "Quote Data Hub" },
  { id: "product-cost-analysis", label: "Product Cost Analysis" },
  { id: "pricing", label: "Pricing & Qty Optimization" },
  { id: "cost-fidelity", label: "Cost Fidelity & Alerts" },
  { id: "labor", label: "Labor Cost Tracking" },
  { id: "unit-cost", label: "Unit Cost & COPQ" },
  { id: "schedule-risk", label: "Schedule & Material Risk" },
  { id: "line-of-balance", label: "Line of Balance" },
  { id: "build-plan", label: "Build Plan" },
  { id: "supplier-otd", label: "Supplier OTD" },
  { id: "supply-risk", label: "Supply Risk & Material Availability" },
  { id: "fpy", label: "FPY" },
  { id: "critical-path", label: "Critical Path" },
  { id: "long-lead-shortage", label: "Long-Lead & Shortage Risk" },
  { id: "material-monitoring", label: "Material Monitoring" },
  { id: "schedule-risk-registry", label: "Schedule Risk Registry" },
  { id: "risk-mitigation", label: "Risk Mitigation" },
  { id: "ready-to-work", label: "Ready to Work / Release" },
  { id: "siop", label: "SIOP" },
]

type SidebarProps = {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-[260px] bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-lg font-bold text-[#1D4ED8]">Unit Cost Intelligence – Handheld Radios</h1>
        <p className="text-xs text-gray-500 mt-1">Aerospace & Defense Manufacturing - Dummy Data</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                  activeTab === tab.id ? "bg-[#1D4ED8] text-white" : "text-gray-700 hover:bg-gray-100",
                )}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

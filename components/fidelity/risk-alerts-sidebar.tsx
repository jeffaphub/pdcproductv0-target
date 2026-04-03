import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Component } from "@/lib/mock-data"

type RiskAlertsSidebarProps = {
  components: Component[]
}

export function RiskAlertsSidebar({ components }: RiskAlertsSidebarProps) {
  const criticalParts = components
    .filter((c) => c.freshnessStatus === "Critical" || c.freshnessStatus === "Stale")
    .slice(0, 5)
  const atRiskParts = components.filter((c) => c.freshnessStatus === "At Risk").slice(0, 5)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Risk Alerts (Tiered)</h3>

      {/* Critical Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
          <span className="font-bold text-[#DC2626]">CRITICAL</span>
        </div>
        <p className="text-sm text-gray-600 mb-3">{criticalParts.length + 32} critical items</p>
        <div className="space-y-2">
          {criticalParts.map((part) => (
            <div key={part.partNumber} className="bg-red-50 p-2 rounded border border-red-200">
              <p className="text-xs font-mono font-semibold text-[#DC2626]">{part.partNumber}</p>
              <p className="text-xs text-gray-600">{part.daysSinceRefresh} days old</p>
              <p className="text-xs text-gray-600">
                {part.variancePct > 0 ? "+" : ""}
                {part.variancePct.toFixed(1)}% vs Oracle
              </p>
              <p className="text-xs text-gray-500">in 3 active BOMs</p>
            </div>
          ))}
        </div>
        <Button variant="link" size="sm" className="mt-2 p-0 text-[#DC2626]">
          View all critical (37)
        </Button>
      </div>

      {/* Warning Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
          <span className="font-bold text-[#F59E0B]">WARNING</span>
        </div>
        <p className="text-sm text-gray-600 mb-3">{atRiskParts.length + 19} at-risk items</p>
        <div className="space-y-2">
          {atRiskParts.slice(0, 3).map((part) => (
            <div key={part.partNumber} className="bg-amber-50 p-2 rounded border border-amber-200">
              <p className="text-xs font-mono font-semibold text-[#F59E0B]">{part.partNumber}</p>
              <p className="text-xs text-gray-600">High-spend: ${part.annualSpend.toLocaleString()}</p>
            </div>
          ))}
          <div className="bg-amber-50 p-2 rounded border border-amber-200">
            <p className="text-xs text-gray-700">RF Supplier quote expires in 5 days</p>
          </div>
        </div>
        <Button variant="link" size="sm" className="mt-2 p-0 text-[#F59E0B]">
          View all warnings (24)
        </Button>
      </div>

      {/* Info Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="font-bold text-blue-600">INFO</span>
        </div>
        <p className="text-sm text-gray-600 mb-3">12 info items</p>
        <div className="space-y-2">
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <p className="text-xs text-gray-700">Low-spend refresh due in 30 days</p>
          </div>
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <p className="text-xs text-gray-700">Scheduled refresh on track (48 parts)</p>
          </div>
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <p className="text-xs text-gray-700">Annual planning cycle starts Feb 1</p>
          </div>
        </div>
        <Button variant="link" size="sm" className="mt-2 p-0 text-blue-600">
          View all info (12)
        </Button>
      </div>
    </Card>
  )
}

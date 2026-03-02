"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

type ProductEconomics = {
  productFamily: string
  avgTotalUnitCost: number
  materialPct: number
  laborPct: number
  copqPct: number
  targetMarginPct: number
  actualMarginPct: number
  trend: "up" | "down"
  color: string
}

const productData: ProductEconomics[] = [
  {
    productFamily: "Manpack Radios",
    avgTotalUnitCost: 1245,
    materialPct: 62,
    laborPct: 18,
    copqPct: 12,
    targetMarginPct: 22,
    actualMarginPct: 19.5,
    trend: "down",
    color: "#1D4ED8",
  },
  {
    productFamily: "Vehicle Radios",
    avgTotalUnitCost: 2180,
    materialPct: 65,
    laborPct: 15,
    copqPct: 8,
    targetMarginPct: 25,
    actualMarginPct: 26.2,
    trend: "up",
    color: "#059669",
  },
  {
    productFamily: "Base Station Kits",
    avgTotalUnitCost: 4520,
    materialPct: 58,
    laborPct: 22,
    copqPct: 15,
    targetMarginPct: 20,
    actualMarginPct: 17.8,
    trend: "down",
    color: "#9333EA",
  },
]

export function UnitEconomicsCards() {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Unit Economics by Product Family</h3>
      <div className="grid grid-cols-3 gap-4">
        {productData.map((product) => (
          <Card key={product.productFamily} className="p-6" style={{ borderTop: `3px solid ${product.color}` }}>
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900">{product.productFamily}</h4>
                <Badge variant="outline" className="text-xs">
                  Last 12 months
                </Badge>
              </div>

              {/* Cost */}
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">${product.avgTotalUnitCost.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Avg Unit Cost</p>
              </div>

              {/* Cost breakdown badges */}
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Material {product.materialPct}%</Badge>
                <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Labor {product.laborPct}%</Badge>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">COPQ {product.copqPct}%</Badge>
              </div>

              {/* Donut chart */}
              <div className="flex justify-center">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="10"
                    strokeDasharray={`${(product.materialPct / 100) * 188.5} 188.5`}
                    transform="rotate(-90 40 40)"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    fill="none"
                    stroke="#6B7280"
                    strokeWidth="10"
                    strokeDasharray={`${(product.laborPct / 100) * 188.5} 188.5`}
                    strokeDashoffset={-((product.materialPct / 100) * 188.5)}
                    transform="rotate(-90 40 40)"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="10"
                    strokeDasharray={`${(product.copqPct / 100) * 188.5} 188.5`}
                    strokeDashoffset={-(((product.materialPct + product.laborPct) / 100) * 188.5)}
                    transform="rotate(-90 40 40)"
                  />
                </svg>
              </div>

              {/* Margin comparison */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Target: {product.targetMarginPct}%</span>
                  <span className="text-gray-900 font-medium">Actual: {product.actualMarginPct}%</span>
                </div>
                <div className="relative h-2 bg-gray-200 rounded-full">
                  <div
                    className={`absolute h-full rounded-full ${product.actualMarginPct >= product.targetMarginPct ? "bg-[#059669]" : "bg-[#DC2626]"}`}
                    style={{ width: `${(product.actualMarginPct / 30) * 100}%` }}
                  />
                  <div
                    className="absolute h-full w-0.5 bg-gray-700"
                    style={{ left: `${(product.targetMarginPct / 30) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {product.actualMarginPct >= product.targetMarginPct ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-[#059669]" />
                      <span className="text-[#059669]">Above target</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-[#DC2626]" />
                      <span className="text-[#DC2626]">
                        {(product.targetMarginPct - product.actualMarginPct).toFixed(1)}% below target
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

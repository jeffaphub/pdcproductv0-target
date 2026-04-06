"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  ChevronRight,
  ArrowLeft,
  Calendar,
} from "lucide-react"
import {
  generateProductsInProduction,
  generateAssemblyQuotes,
  generateComponents,
  generateDrillDownData,
} from "@/lib/mock-data"
import type { ProductInProduction, SubAssemblyBreakdown } from "@/lib/mock-data"

const components = generateComponents()
const assemblyQuotes = generateAssemblyQuotes(components)
const productsData = generateProductsInProduction(assemblyQuotes, components)

type ViewMode =
  | "table"
  | "chart"
  | "subassembly"
  | "component-detail"
  | "labor-drilldown"
  | "non-labor-drilldown"
  | "trend-view"

export function ProductCostAnalysis() {
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [selectedProduct, setSelectedProduct] = useState<ProductInProduction | null>(null)
  const [selectedSubAssembly, setSelectedSubAssembly] = useState<SubAssemblyBreakdown | null>(null)
  const [selectedProductsForChart, setSelectedProductsForChart] = useState<string[]>([])
  const [laborDrilldownCategory, setLaborDrilldownCategory] = useState<string | null>(null)
  const [nonLaborDrilldownCategory, setNonLaborDrilldownCategory] = useState<string | null>(null)
  const [trendDateRange, setTrendDateRange] = useState<string>("6")
  const [drilldownData, setDrilldownData] = useState<any>(null)

  // Calculate insights
  const insights = useMemo(() => {
    const highVarianceProducts = productsData
      .filter((p) => Math.abs(((p.avgCostPerUnit - p.targetCostPerUnit) / p.targetCostPerUnit) * 100) > 10)
      .sort(
        (a, b) => Math.abs(b.avgCostPerUnit - b.targetCostPerUnit) - Math.abs(a.avgCostPerUnit - a.targetCostPerUnit),
      )
      .slice(0, 3)

    const avgCostTrend =
      productsData.reduce((sum, p) => {
        if (!p.costHistory || p.costHistory.length < 6) return sum
        const recent = p.costHistory.slice(-3).reduce((s, h) => s + (h?.costPerUnit || 0), 0) / 3
        const older = p.costHistory.slice(0, 3).reduce((s, h) => s + (h?.costPerUnit || 0), 0) / 3
        if (older === 0) return sum
        return sum + ((recent - older) / older) * 100
      }, 0) / productsData.length

    const materialHeavyProducts = productsData
      .map((p) => ({
        product: p,
        materialPct:
          (p.subAssemblies.reduce((sum, s) => sum + (s.nonLaborBreakdown?.material || 0), 0) /
            (p.subAssemblies.reduce((sum, s) => sum + (s.laborCost || 0) + (s.nonLaborCost || 0), 0) || 1)) *
          100,
      }))
      .sort((a, b) => b.materialPct - a.materialPct)
      .slice(0, 3)

    return { highVarianceProducts, avgCostTrend, materialHeavyProducts }
  }, [])

  // Generate AI insights for selected sub-assembly
  const generateSubAssemblyInsights = (subAssembly: SubAssemblyBreakdown) => {
    const totalLabor = Object.values(subAssembly.laborBreakdown || {}).reduce((a, b) => a + (b || 0), 0)
    const reworkPct = totalLabor > 0 ? ((subAssembly.laborBreakdown?.rework || 0) / totalLabor) * 100 : 0

    const biggestNonLabor = Object.entries(subAssembly.nonLaborBreakdown || {}).sort(
      (a, b) => (b[1] || 0) - (a[1] || 0),
    )[0] || ["material", 0]

    return {
      laborInsight:
        reworkPct > 15
          ? `Labor cost escalating primarily due to rework (${(reworkPct || 0).toFixed(1)}%). Consider process improvements.`
          : `Labor cost driven by complexity. Current efficiency is ${(((subAssembly.laborBreakdown?.target || 0) / (totalLabor || 1)) * 100 || 0).toFixed(0)}% of target. Automation opportunity exists.`,
      nonLaborInsight: `${biggestNonLabor[0]} is the single biggest cost lever at $${((biggestNonLabor[1] || 0) as number).toFixed(1)}. ${
        biggestNonLabor[0] === "material"
          ? "Focus on supplier negotiations and alternative materials."
          : biggestNonLabor[0] === "scrap"
            ? "Quality improvements could significantly reduce waste costs."
            : "Consider process optimization to reduce this overhead."
      }`,
    }
  }

  const handleProductSelect = (product: ProductInProduction) => {
    setSelectedProduct(product)
    setViewMode("subassembly")
    setSelectedSubAssembly(null)
  }

  const handleSubAssemblySelect = (subAssembly: SubAssemblyBreakdown) => {
    setSelectedSubAssembly(subAssembly)
    setViewMode("component-detail")
  }

  const toggleProductForChart = (partNumber: string) => {
    setSelectedProductsForChart((prev) =>
      prev.includes(partNumber) ? prev.filter((p) => p !== partNumber) : [...prev, partNumber],
    )
  }

  const handleLaborDrilldown = (category: string) => {
    if (!selectedSubAssembly) return
    const keyMap: Record<string, keyof typeof selectedSubAssembly.laborBreakdown> = {
      "Direct Labor": "directLabor",
      "Indirect Labor": "indirectLabor",
      Rework: "rework",
      Benefits: "benefits",
    }
    const key = keyMap[category]
    if (!key) {
      console.error("[v0] Unknown labor category:", category)
      return
    }
    const parentCost = selectedSubAssembly.laborBreakdown[key] as number
    console.log("[v0] Labor drill-down:", { category, key, parentCost })
    const data = generateDrillDownData(category, parentCost)
    console.log("[v0] Generated drill-down data:", data)
    setDrilldownData(data)
    setLaborDrilldownCategory(category)
    setViewMode("labor-drilldown")
  }

  const handleNonLaborDrilldown = (category: string) => {
    if (!selectedSubAssembly) return
    const keyMap: Record<string, keyof typeof selectedSubAssembly.nonLaborBreakdown> = {
      Material: "material",
      Freight: "freight",
      Overhead: "overhead",
      Scrap: "scrap",
      Quality: "quality",
    }
    const key = keyMap[category]
    if (!key) {
      console.error("[v0] Unknown non-labor category:", category)
      return
    }
    const parentCost = selectedSubAssembly.nonLaborBreakdown[key] as number
    console.log("[v0] Non-labor drill-down:", { category, key, parentCost })
    const data = generateDrillDownData(category, parentCost)
    console.log("[v0] Generated drill-down data:", data)
    setDrilldownData(data)
    setNonLaborDrilldownCategory(category)
    setViewMode("non-labor-drilldown")
  }

  return (
    <div className="space-y-6">
      {/* View Mode Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={viewMode === "table" ? "default" : "outline"}
          onClick={() => {
            setViewMode("table")
            setSelectedProduct(null)
            setSelectedSubAssembly(null)
          }}
        >
          Table View
        </Button>
        <Button
          variant={viewMode === "chart" ? "default" : "outline"}
          onClick={() => setViewMode("chart")}
          disabled={selectedProductsForChart.length === 0}
        >
          Chart View ({selectedProductsForChart.length})
        </Button>
        {selectedProduct && (
          <Button variant="outline" onClick={() => setViewMode("subassembly")}>
            {selectedProduct.partDescription} - Sub-Assemblies
          </Button>
        )}
        {selectedSubAssembly && (
          <>
            <Button variant="outline" onClick={() => setViewMode("component-detail")}>
              {selectedSubAssembly.name} - Detail
            </Button>
            <Button variant="outline" onClick={() => setViewMode("trend-view")}>
              <Calendar className="w-4 h-4 mr-2" />
              Trend View
            </Button>
          </>
        )}
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Products in Production</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <input type="checkbox" className="mr-2" />
                      </TableHead>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Plant</TableHead>
                      <TableHead>Units Produced</TableHead>
                      <TableHead>Target Units</TableHead>
                      <TableHead>Variance %</TableHead>
                      <TableHead>Avg Cost/Unit</TableHead>
                      <TableHead>Target Cost/Unit</TableHead>
                      <TableHead>Cost Variance</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Quote Price</TableHead>
                      <TableHead>Remaining Units</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsData.map((product) => {
                      const costVariance =
                        ((product.avgCostPerUnit - product.targetCostPerUnit) / product.targetCostPerUnit) * 100
                      const isHighVariance = Math.abs(costVariance) > 10

                      return (
                        <TableRow
                          key={product.partNumber}
                          className={`cursor-pointer hover:bg-muted/50 ${isHighVariance ? "bg-red-50" : ""}`}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedProductsForChart.includes(product.partNumber)}
                              onChange={() => toggleProductForChart(product.partNumber)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{product.partNumber}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{product.partDescription}</TableCell>
                          <TableCell>{product.plant}</TableCell>
                          <TableCell>{product.unitsProduced}</TableCell>
                          <TableCell>{product.targetUnits}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {product.varianceToTarget < -5 ? (
                                <ArrowDownRight className="w-4 h-4 text-red-500" />
                              ) : product.varianceToTarget > 0 ? (
                                <ArrowUpRight className="w-4 h-4 text-green-500" />
                              ) : (
                                <Minus className="w-4 h-4 text-gray-400" />
                              )}
                              <span className={product.varianceToTarget < -10 ? "text-red-600 font-medium" : ""}>
                                {(product.varianceToTarget || 0).toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>${(product.avgCostPerUnit || 0).toFixed(1)}</TableCell>
                          <TableCell>${(product.targetCostPerUnit || 0).toFixed(1)}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                costVariance > 0
                                  ? "bg-red-100 text-red-800 border-red-300"
                                  : "bg-green-100 text-green-800 border-green-300"
                              }
                            >
                              {costVariance > 0 ? "+" : ""}
                              {(costVariance || 0).toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            $
                            {(product.totalCostCurrent || 0).toLocaleString("en-US", {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </TableCell>
                          <TableCell>${(product.quotePrice || 0).toFixed(1)}</TableCell>
                          <TableCell>
                            <span className={product.remainingUnits < 50 ? "text-orange-600 font-medium" : ""}>
                              {product.remainingUnits}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleProductSelect(product)}>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* AI Insights Panel */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">AI Insights</h3>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-blue-900 mb-2">High Variance Products</p>
                  <ul className="space-y-2">
                    {insights.highVarianceProducts.map((p) => (
                      <li key={p.partNumber} className="text-blue-800">
                        <span className="font-medium">{p.partNumber}</span>
                        <br />
                        <span className="text-xs">
                          ${(Math.abs((p.avgCostPerUnit || 0) - (p.targetCostPerUnit || 0)) || 0).toFixed(1)}
                          {p.avgCostPerUnit > p.targetCostPerUnit ? " over" : " under"} target
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="font-medium text-blue-900 mb-2">Cost Trend Analysis</p>
                  <div className="flex items-center gap-2">
                    {insights.avgCostTrend > 0 ? (
                      <TrendingUp className="w-4 h-4 text-red-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-blue-800">
                      Costs are {insights.avgCostTrend > 0 ? "rising" : "falling"} by{" "}
                      {(Math.abs(insights.avgCostTrend) || 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">Based on 3-month rolling average across all products</p>
                </div>

                <div>
                  <p className="font-medium text-blue-900 mb-2">Material-Heavy Products</p>
                  <p className="text-xs text-blue-700 mb-2">Focus on supplier negotiations:</p>
                  <ul className="space-y-1">
                    {insights.materialHeavyProducts.map(({ product, materialPct }) => (
                      <li key={product.partNumber} className="text-xs text-blue-800">
                        {product.partNumber} ({(materialPct || 0).toFixed(0)}% material)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Chart View */}
      {viewMode === "chart" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Cost Trend Comparison</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: "Cost per Unit ($)", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value: number) => `$${(value || 0 || 0).toFixed(1)}`} />
                  <Legend />
                  {selectedProductsForChart.map((pn, idx) => {
                    const product = productsData.find((p) => p.partNumber === pn)
                    if (!product || !product.costHistory) return null
                    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]
                    return (
                      <Line
                        key={pn}
                        type="monotone"
                        dataKey="costPerUnit"
                        data={product.costHistory}
                        name={pn}
                        stroke={colors[idx % colors.length]}
                        strokeWidth={2}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Chart Insights</h3>
              </div>

              <div className="space-y-3 text-sm text-blue-800">
                <p>Selected {selectedProductsForChart.length} product(s) for comparison</p>
                {selectedProductsForChart.length > 0 && (
                  <div>
                    <p className="font-medium">Volatility Analysis:</p>
                    <ul className="mt-2 space-y-1 text-xs">
                      {selectedProductsForChart.map((pn) => {
                        const product = productsData.find((p) => p.partNumber === pn)
                        if (!product || !product.costHistory || product.costHistory.length === 0) return null
                        const costs = product.costHistory.map((h) => h?.costPerUnit || 0).filter((c) => c > 0)
                        if (costs.length === 0) return null
                        const volatility = costs.length > 0 ? Math.max(...costs) - Math.min(...costs) : 0
                        return (
                          <li key={pn}>
                            {pn}: ${(volatility || 0).toFixed(1)} range
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Sub-Assembly Breakdown View */}
      {viewMode === "subassembly" && selectedProduct && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-2">{selectedProduct.partDescription}</h2>
            <p className="text-sm text-gray-600 mb-4">Cost Breakdown by Major Sub-Assembly (Average per unit)</p>

            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={selectedProduct.subAssemblies}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
                <YAxis label={{ value: "Cost ($)", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="laborCost" stackId="a" fill="#3B82F6" name="Labor Cost" />
                <Bar dataKey="nonLaborCost" stackId="a" fill="#10B981" name="Non-Labor Cost" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 grid grid-cols-5 gap-4">
              {selectedProduct.subAssemblies.map((sub) => (
                <Button
                  key={sub.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubAssemblySelect(sub)}
                  className="h-auto py-3 flex flex-col items-start"
                >
                  <span className="font-medium text-xs">{sub.name}</span>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900">Total per Unit</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ${((sub.laborCost || 0) + (sub.nonLaborCost || 0) || 0).toFixed(1)}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Component Detail View */}
      {viewMode === "component-detail" && selectedSubAssembly && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Labor Breakdown */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Labor Cost Breakdown - {selectedSubAssembly.name}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      name: "Direct Labor",
                      value: selectedSubAssembly.laborBreakdown?.directLabor || 0,
                      target: (selectedSubAssembly.laborBreakdown?.target || 0) * 0.5,
                    },
                    {
                      name: "Indirect Labor",
                      value: selectedSubAssembly.laborBreakdown?.indirectLabor || 0,
                      target: (selectedSubAssembly.laborBreakdown?.target || 0) * 0.15,
                    },
                    {
                      name: "Rework",
                      value: selectedSubAssembly.laborBreakdown?.rework || 0,
                      target: (selectedSubAssembly.laborBreakdown?.target || 0) * 0.1,
                    },
                    {
                      name: "Benefits",
                      value: selectedSubAssembly.laborBreakdown?.benefits || 0,
                      target: (selectedSubAssembly.laborBreakdown?.target || 0) * 0.1,
                    },
                  ].sort((a, b) => a.value - b.value)}
                  layout="vertical"
                  onClick={(data) => {
                    if (data && data.activeLabel) {
                      handleLaborDrilldown(data.activeLabel)
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value: number) => `$${(value || 0).toFixed(1)}`} />
                  <Legend />
                  <Bar dataKey="value" fill="#3B82F6" name="Actual Cost" cursor="pointer" />
                  <Line dataKey="target" stroke="#EF4444" strokeWidth={2} name="Target" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2">Click on any bar to see detailed breakdown</p>
            </Card>

            {/* Non-Labor Breakdown */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Non-Labor Cost Breakdown - {selectedSubAssembly.name}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: "Material", value: selectedSubAssembly.nonLaborBreakdown?.material || 0 },
                    { name: "Freight", value: selectedSubAssembly.nonLaborBreakdown?.freight || 0 },
                    { name: "Scrap", value: selectedSubAssembly.nonLaborBreakdown?.scrap || 0 },
                    { name: "Overhead", value: selectedSubAssembly.nonLaborBreakdown?.overhead || 0 },
                    { name: "Quality", value: selectedSubAssembly.nonLaborBreakdown?.quality || 0 },
                  ].sort((a, b) => a.value - b.value)}
                  layout="vertical"
                  onClick={(data) => {
                    if (data && data.activeLabel) {
                      handleNonLaborDrilldown(data.activeLabel)
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value: number) => `$${(value || 0).toFixed(1)}`} />
                  <Bar dataKey="value" fill="#10B981" name="Cost" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2">Click on any bar to see detailed breakdown</p>

              {/* Material by Supplier Drill-down */}
              {selectedSubAssembly.nonLaborBreakdown?.materialBySupplier && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Material Cost by Supplier</h4>
                  <div className="space-y-2">
                    {selectedSubAssembly.nonLaborBreakdown.materialBySupplier.map((supplier) => (
                      <div key={supplier.supplier} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-sm">{supplier.supplier}</p>
                          <p className="text-xs text-gray-600">{supplier.parts.join(", ")}</p>
                        </div>
                        <span className="font-medium">${(supplier.cost || 0).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrap by Material */}
              {selectedSubAssembly.nonLaborBreakdown?.scrapByMaterial && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Scrap Cost Breakdown</h4>
                  <div className="space-y-2">
                    {selectedSubAssembly.nonLaborBreakdown.scrapByMaterial.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded">
                        <div>
                          <p className="font-medium text-sm">{item.material}</p>
                          <p className="text-xs text-gray-600">{item.supplier}</p>
                        </div>
                        <span className="font-medium text-red-600">${(item.cost || 0).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* AI Insights for Component */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Component Insights</h3>
              </div>

              {(() => {
                const insights = generateSubAssemblyInsights(selectedSubAssembly)
                return (
                  <div className="space-y-4 text-sm text-blue-800">
                    <div>
                      <p className="font-medium text-blue-900 mb-2">Labor Analysis</p>
                      <p className="text-xs leading-relaxed">{insights.laborInsight}</p>
                    </div>

                    <div>
                      <p className="font-medium text-blue-900 mb-2">Non-Labor Analysis</p>
                      <p className="text-xs leading-relaxed">{insights.nonLaborInsight}</p>
                    </div>

                    <div>
                      <p className="font-medium text-blue-900 mb-2">Cost Optimization</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>
                          Total component cost: $
                          {((selectedSubAssembly.laborCost || 0) + (selectedSubAssembly.nonLaborCost || 0)).toFixed(1)}
                        </li>
                        <li>
                          Labor represents{" "}
                          {(selectedSubAssembly.laborCost || 0) + (selectedSubAssembly.nonLaborCost || 0) > 0
                            ? (
                                ((selectedSubAssembly.laborCost || 0) /
                                  ((selectedSubAssembly.laborCost || 0) + (selectedSubAssembly.nonLaborCost || 0))) *
                                  100 || 0
                              ).toFixed(1)
                            : "0"}
                          % of cost
                        </li>
                        <li>
                          Target gap: $
                          {(
                            (Object.values(selectedSubAssembly.laborBreakdown || {}).reduce(
                              (a, b) => (a || 0) + (b || 0),
                              0,
                            ) || 0) - (selectedSubAssembly.laborBreakdown?.target || 0)
                          ).toFixed(1)}
                        </li>
                      </ul>
                    </div>
                  </div>
                )
              })()}
            </Card>
          </div>
        </div>
      )}

      {/* Labor Drill-down View */}
      {viewMode === "labor-drilldown" && selectedSubAssembly && laborDrilldownCategory && drilldownData && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setViewMode("component-detail")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Component Detail
            </Button>
            <h2 className="text-lg font-semibold">
              {laborDrilldownCategory} - {selectedSubAssembly.name}
            </h2>
          </div>

          <Card className="p-6">
            {laborDrilldownCategory === "Direct Labor" && (
              <div>
                <h3 className="font-semibold mb-4">Workstation Breakdown</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workstation ID</TableHead>
                      <TableHead>Workstation Name</TableHead>
                      <TableHead>Target Time/Unit (Secs)</TableHead>
                      <TableHead>Actual Cycle Time (Secs)</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                      <TableHead>Efficiency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drilldownData.map((ws: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {ws.id || `WS-${String(idx + 1).padStart(3, "0")}`}
                        </TableCell>
                        <TableCell>{ws.name}</TableCell>
                        <TableCell>{ws.targetTimePerUnit?.toFixed(0) || "0"} sec</TableCell>
                        <TableCell>{ws.actualCycleTime?.toFixed(0) || "0"} sec</TableCell>
                        <TableCell>${ws.cost?.toFixed(1) || "0.0"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              (ws.efficiency || 0) >= 90
                                ? "default"
                                : (ws.efficiency || 0) >= 80
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {ws.efficiency || 0}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {laborDrilldownCategory === "Indirect Labor" && (
              <div>
                <h3 className="font-semibold mb-4">Indirect Labor Categories</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drilldownData.map((cat: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>{cat.description || "N/A"}</TableCell>
                        <TableCell>${cat.cost?.toFixed(1) || "0.0"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {laborDrilldownCategory === "Rework" && (
              <div>
                <h3 className="font-semibold mb-4">Rework Categories</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Defect Type</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drilldownData.map((rework: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{rework.name}</TableCell>
                        <TableCell>
                          <Badge variant={rework.frequency === "High" ? "destructive" : "secondary"}>
                            {rework.frequency || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>${rework.cost?.toFixed(1) || "0.0"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {laborDrilldownCategory === "Benefits" && (
              <div>
                <h3 className="font-semibold mb-4">Benefits Breakdown</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benefit Type</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drilldownData.map((benefit: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{benefit.name}</TableCell>
                        <TableCell>${benefit.cost?.toFixed(1) || "0.0"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Non-Labor Drill-down View */}
      {viewMode === "non-labor-drilldown" && selectedSubAssembly && nonLaborDrilldownCategory && drilldownData && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setViewMode("component-detail")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Component Detail
            </Button>
            <h2 className="text-lg font-semibold">
              {nonLaborDrilldownCategory} - {selectedSubAssembly.name}
            </h2>
          </div>

          <Card className="p-6">
            {nonLaborDrilldownCategory === "Material" && (
              <div>
                <h3 className="font-semibold mb-4">Material Cost by Supplier</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Parts</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                      <TableHead>% of Material Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drilldownData.map((supplier: any, idx: number) => {
                      const totalMaterialCost = drilldownData.reduce((sum: number, s: any) => sum + (s.cost || 0), 0)
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{supplier.supplier}</TableCell>
                          <TableCell className="max-w-md">
                            <div className="flex flex-wrap gap-1">
                              {supplier.parts?.map((part: string, pidx: number) => (
                                <Badge key={pidx} variant="outline" className="text-xs">
                                  {part}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>${(supplier.cost || 0).toFixed(1)}</TableCell>
                          <TableCell>
                            {totalMaterialCost > 0
                              ? (((supplier.cost || 0) / totalMaterialCost) * 100).toFixed(1)
                              : "0.0"}
                            %
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {(nonLaborDrilldownCategory === "Overhead" ||
              nonLaborDrilldownCategory === "Scrap" ||
              nonLaborDrilldownCategory === "Quality" ||
              nonLaborDrilldownCategory === "Freight") && (
              <div>
                <h3 className="font-semibold mb-4">{nonLaborDrilldownCategory} Breakdown</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Cost/Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drilldownData.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.name || "N/A"}</TableCell>
                        <TableCell>{item.description || item.frequency || "N/A"}</TableCell>
                        <TableCell>${(item.cost || 0).toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {viewMode === "trend-view" && selectedSubAssembly && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setViewMode("component-detail")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Component Detail
              </Button>
              <h2 className="text-lg font-semibold">Cost Trends - {selectedSubAssembly.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Date Range:</span>
              <Select value={trendDateRange} onValueChange={setTrendDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Labor Cost Trends</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={Array.from({ length: Number.parseInt(trendDateRange) }, (_, i) => {
                  const date = new Date()
                  date.setMonth(date.getMonth() - (Number.parseInt(trendDateRange) - 1 - i))
                  return {
                    date: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
                    directLabor: selectedSubAssembly.laborBreakdown.directLabor * (0.9 + Math.random() * 0.2),
                    indirectLabor: selectedSubAssembly.laborBreakdown.indirectLabor * (0.9 + Math.random() * 0.2),
                    rework: selectedSubAssembly.laborBreakdown.rework * (0.8 + Math.random() * 0.4),
                    benefits: selectedSubAssembly.laborBreakdown.benefits * (0.95 + Math.random() * 0.1),
                  }
                })}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "Cost ($)", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value: number) => `$${value.toFixed(1)}`} />
                <Legend />
                <Line type="monotone" dataKey="directLabor" stroke="#3B82F6" strokeWidth={2} name="Direct Labor" />
                <Line type="monotone" dataKey="indirectLabor" stroke="#10B981" strokeWidth={2} name="Indirect Labor" />
                <Line type="monotone" dataKey="rework" stroke="#EF4444" strokeWidth={2} name="Rework" />
                <Line type="monotone" dataKey="benefits" stroke="#F59E0B" strokeWidth={2} name="Benefits" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Non-Labor Cost Trends</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={Array.from({ length: Number.parseInt(trendDateRange) }, (_, i) => {
                  const date = new Date()
                  date.setMonth(date.getMonth() - (Number.parseInt(trendDateRange) - 1 - i))
                  return {
                    date: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
                    material: selectedSubAssembly.nonLaborBreakdown.material * (0.9 + Math.random() * 0.2),
                    freight: selectedSubAssembly.nonLaborBreakdown.freight * (0.85 + Math.random() * 0.3),
                    scrap: selectedSubAssembly.nonLaborBreakdown.scrap * (0.8 + Math.random() * 0.4),
                    overhead: selectedSubAssembly.nonLaborBreakdown.overhead * (0.95 + Math.random() * 0.1),
                    quality: selectedSubAssembly.nonLaborBreakdown.quality * (0.9 + Math.random() * 0.2),
                  }
                })}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: "Cost ($)", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value: number) => `$${value.toFixed(1)}`} />
                <Legend />
                <Line type="monotone" dataKey="material" stroke="#8B5CF6" strokeWidth={2} name="Material" />
                <Line type="monotone" dataKey="freight" stroke="#EC4899" strokeWidth={2} name="Freight" />
                <Line type="monotone" dataKey="scrap" stroke="#EF4444" strokeWidth={2} name="Scrap" />
                <Line type="monotone" dataKey="overhead" stroke="#F59E0B" strokeWidth={2} name="Overhead" />
                <Line type="monotone" dataKey="quality" stroke="#14B8A6" strokeWidth={2} name="Quality" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Trend Insights</h3>
            </div>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• Rework costs show high volatility - consider implementing process improvements</p>
              <p>• Material costs trending upward - review supplier contracts and alternative sources</p>
              <p>• Scrap rates fluctuating - investigate quality issues and operator training needs</p>
              <p>• Freight costs spiking - evaluate consolidation opportunities and shipping schedules</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

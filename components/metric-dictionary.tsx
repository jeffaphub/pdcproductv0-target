"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MetricDictionaryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedMetric?: string
}

const metrics = {
  cost: [
    {
      id: "cpu",
      name: "CPU (Cost Per Unit)",
      meaning: "Total cost divided by equivalent units delivered",
      units: "$/unit",
      formula: "CPU = Total Cost / Equivalent Units Delivered",
      interpretation: "Lower CPU indicates better cost efficiency. Track trends to identify cost drivers.",
      edgeCases: "Zero units delivered results in undefined CPU. Use equivalent units for mixed configurations."
    },
    {
      id: "etc",
      name: "ETC (Estimate to Complete)",
      meaning: "Remaining expected cost from current month onward",
      units: "$",
      formula: "ETC = Total Forecasted Cost - Actuals ITD",
      interpretation: "Higher ETC indicates more work/spend remaining. Compare to budget to identify overruns.",
      edgeCases: "Requires forecast data. If unavailable, ETC cannot be calculated."
    },
    {
      id: "eac",
      name: "EAC (Estimate at Completion)",
      meaning: "Total expected cost at program completion",
      units: "$",
      formula: "EAC = Actuals ITD + ETC",
      interpretation: "Compare EAC to budget to assess overall program cost performance.",
      edgeCases: "Accuracy depends on ETC forecast quality."
    },
    {
      id: "ppv",
      name: "PPV (Purchase Price Variance)",
      meaning: "Difference between actual and standard material unit price",
      units: "$",
      formula: "PPV = (Actual Unit Price - Standard Unit Price) × Quantity",
      interpretation: "Negative PPV indicates paying more than standard. Positive PPV indicates savings.",
      edgeCases: "Requires standard price baseline. Missing standards result in N/A."
    }
  ],
  labor: [
    {
      id: "hpu",
      name: "HPU (Hours Per Unit)",
      meaning: "Labor hours required to produce one equivalent unit",
      units: "hours/unit",
      formula: "HPU = Total Hours / Equivalent Units",
      interpretation: "Lower HPU indicates better labor efficiency. Track by workstream to identify bottlenecks.",
      edgeCases: "Zero units results in undefined HPU. Exclude rework hours for baseline HPU."
    },
    {
      id: "touch-hpu",
      name: "Touch HPU",
      meaning: "Direct touch labor hours per equivalent unit",
      units: "hours/unit",
      formula: "Touch HPU = Touch Hours / Equivalent Units",
      interpretation: "Measures direct labor efficiency without support overhead.",
      edgeCases: "Does not include support, rework, or wait time."
    },
    {
      id: "support-ratio",
      name: "Support Ratio",
      meaning: "Ratio of support hours to touch hours",
      units: "ratio",
      formula: "Support Ratio = Support Hours / Touch Hours",
      interpretation: "Higher ratio indicates more overhead. Industry benchmark varies by complexity.",
      edgeCases: "Zero touch hours results in undefined ratio."
    },
    {
      id: "eps",
      name: "EPs (Equivalent People)",
      meaning: "Full-time equivalent headcount based on hours worked",
      units: "people",
      formula: "EP = Hours / Standard Hours Per Person Period (default 160 hrs/month)",
      interpretation: "Provides headcount view of labor capacity. Compare to authorized headcount.",
      edgeCases: "Standard hours may vary by site or contract terms."
    }
  ],
  material: [
    {
      id: "gap-days",
      name: "Gap Days",
      meaning: "Days between supplier promise date and customer need date",
      units: "days",
      formula: "Gap Days = Promise Date - Need Date",
      interpretation: "Negative gap means supplier is promising late. Positive gap provides buffer.",
      edgeCases: "Missing dates result in N/A. Reschedules change gap dynamically."
    },
    {
      id: "supplier-otd",
      name: "Supplier OTD%",
      meaning: "Percentage of receipts delivered on or before need date",
      units: "%",
      formula: "OTD% = Count(Receipt Date ≤ Need Date) / Total Receipts",
      interpretation: "Higher OTD indicates reliable supplier. Target varies by material criticality.",
      edgeCases: "Partial deliveries counted as single receipt. Early deliveries count as on-time."
    },
    {
      id: "attrition",
      name: "Material Attrition",
      meaning: "Material loss due to scrap, obsolescence, or yield loss",
      units: "$",
      formula: "Attrition Cost = Scrap Cost + Obsolescence + Yield Loss",
      interpretation: "Higher attrition indicates quality or planning issues. Track by supplier/part.",
      edgeCases: "Includes material scrapped at receiving, WIP, or final test."
    }
  ],
  quality: [
    {
      id: "nc-backlog",
      name: "NC Backlog",
      meaning: "Count of open non-conformances",
      units: "count",
      formula: "NC Backlog = Count(NC where Close Date is null)",
      interpretation: "Higher backlog indicates unresolved quality issues. Track aging distribution.",
      edgeCases: "Includes NCs across all stages (receiving, WIP, final test)."
    },
    {
      id: "copq",
      name: "COPQ (Cost of Poor Quality)",
      meaning: "Total cost impact of quality issues",
      units: "$",
      formula: "COPQ = Rework Labor + Scrap + MRB + RTV + Expedite Costs",
      interpretation: "Higher COPQ indicates quality problems. Target is <2% of total program cost.",
      edgeCases: "Indirect costs (delays, reputation) not captured in formula."
    },
    {
      id: "avg-nc-age",
      name: "Avg Open NC Age",
      meaning: "Average days open NCs have been unresolved",
      units: "days",
      formula: "Avg Age = Average(Today - NC Open Date) for Open NCs",
      interpretation: "Higher age indicates slow resolution. Target varies by NC severity.",
      edgeCases: "Excludes closed NCs. Zero open NCs results in N/A."
    }
  ],
  schedule: [
    {
      id: "critical-flag",
      name: "Critical Activity",
      meaning: "Activity on the critical path with zero or negative float",
      units: "boolean",
      formula: "Critical = (Total Float Days ≤ 0) OR Critical Flag = true",
      interpretation: "Delays to critical activities directly impact program finish date.",
      edgeCases: "Near-critical activities (float ≤ 10 days) also require monitoring."
    },
    {
      id: "schedule-controlling",
      name: "Schedule-Controlling Material",
      meaning: "Material pegged to critical/near-critical activities with late promise dates",
      units: "boolean",
      formula: "Schedule-Controlling = (Linked to Critical Activity) AND (Gap Days < 0)",
      interpretation: "Late material on critical path directly impacts deliveries. Prioritize resolution.",
      edgeCases: "Requires schedule-material pegging data. If unavailable, flag is disabled."
    }
  ]
}

export function MetricDictionary({ open, onOpenChange, selectedMetric }: MetricDictionaryProps) {
  const [search, setSearch] = useState("")

  const filteredMetrics = Object.entries(metrics).reduce((acc, [category, items]) => {
    const filtered = items.filter(
      m => m.name.toLowerCase().includes(search.toLowerCase()) ||
           m.meaning.toLowerCase().includes(search.toLowerCase())
    )
    if (filtered.length > 0) {
      acc[category] = filtered
    }
    return acc
  }, {} as Record<string, typeof metrics.cost>)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[700px]">
        <SheetHeader>
          <SheetTitle>Metric Dictionary</SheetTitle>
        </SheetHeader>
        
        <div className="mt-4">
          <Input 
            placeholder="Search metrics..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />
          
          <ScrollArea className="h-[calc(100vh-150px)]">
            {Object.entries(filteredMetrics).map(([category, items]) => (
              <div key={category} className="mb-6">
                <h3 className="text-lg font-semibold capitalize mb-3 text-blue-700">{category}</h3>
                {items.map((metric) => (
                  <div 
                    key={metric.id} 
                    className={`p-4 border rounded-lg mb-3 ${selectedMetric === metric.id ? 'bg-blue-50 border-blue-500' : 'bg-white'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-gray-900">{metric.name}</h4>
                      <Badge variant="outline">{metric.units}</Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2"><strong>Meaning:</strong> {metric.meaning}</p>
                    <p className="text-sm text-blue-600 mb-2 font-mono bg-blue-50 p-2 rounded">{metric.formula}</p>
                    <p className="text-sm text-gray-700 mb-2"><strong>Interpretation:</strong> {metric.interpretation}</p>
                    <p className="text-xs text-gray-500"><strong>Edge Cases:</strong> {metric.edgeCases}</p>
                  </div>
                ))}
              </div>
            ))}
            
            {Object.keys(filteredMetrics).length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                No metrics found matching "{search}"
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}

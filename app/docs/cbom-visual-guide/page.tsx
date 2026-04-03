"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CBOMVisualGuidePage() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print-friendly header */}
      <div className="print:hidden bg-gray-900 text-white p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline" size="sm" className="text-white border-white hover:bg-white hover:text-gray-900">
              <Printer className="w-4 h-4 mr-2" />
              Print / Save as PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-4">
        {/* Title Page */}
        <div className="text-center mb-12 print:mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">CBOM - BOM Lifecycle</h1>
          <h2 className="text-2xl text-gray-600 mb-2">Visual Guide and Tab Descriptions</h2>
          <p className="text-gray-500">Unit Cost Requirements Dashboard</p>
          <p className="text-sm text-gray-400 mt-4">Generated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Executive Summary */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">Executive Summary</h2>
          <p className="text-gray-700 leading-relaxed">
            The CBOM - BOM Lifecycle module provides comprehensive visibility into how Bill of Materials costs evolve 
            from proposal through production. It enables program managers, cost analysts, and finance teams to track 
            cost variance drivers, trace changes across lifecycle stages, and ensure alignment between BOM costs and 
            financial forecasts (EAC).
          </p>
        </section>

        {/* Tab 1: Program Cost Overview */}
        <Card className="mb-8 break-inside-avoid">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-xl text-blue-900">Tab 1: Program Cost Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 italic mb-4">Executive-level dashboard showing program cost health at a glance</p>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-gray-900">KPI Cards</h4>
                <p className="text-gray-700 text-sm">Current BOM Cost, Proposal Baseline, Total Delta, and Delta % provide instant visibility into where the program stands versus its original cost baseline.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Are we over or under our proposed cost, and by how much?"</p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-gray-900">Lifecycle Stage Ribbon</h4>
                <p className="text-gray-700 text-sm">Horizontal flow showing cost at each BOM stage: Proposal, eBOM, mBOM, Current. Arrows between stages show incremental deltas.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "How did cost evolve through each lifecycle gate?"</p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold text-gray-900">Cost Delta Waterfall Chart</h4>
                <p className="text-gray-700 text-sm">Bridges from Proposal Baseline to Current Cost, breaking down contributors (Engineering, Supplier, Quantity, Manufacturing changes).</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "What drove the cost change from proposal to current?"</p>
              </div>

              <div className="border-l-4 border-amber-500 pl-4">
                <h4 className="font-semibold text-gray-900">Cost Trend Over Time</h4>
                <p className="text-gray-700 text-sm">Line chart tracking BOM cost evolution over 12 months with baseline reference line.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Is cost trending up or stabilizing over time?"</p>
              </div>

              <div className="border-l-4 border-red-500 pl-4">
                <h4 className="font-semibold text-gray-900">Top Cost Variance Contributors</h4>
                <p className="text-gray-700 text-sm">Table listing the top 5 assemblies/items contributing most to cost variance, with baseline, current, delta, and driver category.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Which specific items should we focus on for cost control?"</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab 2: Costed BOM Explorer */}
        <Card className="mb-8 break-inside-avoid">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-xl text-green-900">Tab 2: Costed BOM Explorer</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 italic mb-4">Interactive hierarchical view for drilling into BOM structure and costs</p>
            
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-gray-900">Expandable Tree Table</h4>
                <p className="text-gray-700 text-sm">Hierarchical BOM structure (Program, Assembly, Sub-Assembly, Part) with expand/collapse controls. Each row shows part number, quantity, unit cost, extended cost, and cost delta.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Where exactly in the product structure is cost variance occurring?"</p>
              </div>

              <div className="border-l-4 border-teal-500 pl-4">
                <h4 className="font-semibold text-gray-900">Color-Coded Change Indicators</h4>
                <p className="text-gray-700 text-sm">Visual badges showing change type (Quantity, Substitution, Price, Supplier) and cost direction (red for increase, green for decrease).</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "What type of change caused each cost impact?"</p>
              </div>

              <div className="border-l-4 border-cyan-500 pl-4">
                <h4 className="font-semibold text-gray-900">Item Detail Drawer</h4>
                <p className="text-gray-700 text-sm">Slide-out panel showing complete item details: specifications, supplier info, cost breakdown, change history, and related documents.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Give me all the details on this specific item."</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab 3: Cost Variance & Drivers */}
        <Card className="mb-8 break-inside-avoid">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-xl text-purple-900">Tab 3: Cost Variance and Drivers</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 italic mb-4">Analytical breakdown of what is driving cost variance</p>
            
            <div className="space-y-4">
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold text-gray-900">Variance by Driver Category (Donut Chart)</h4>
                <p className="text-gray-700 text-sm">Pie/donut chart showing cost variance distribution across driver types: Quantity, Substitution, Supplier Price, Make/Buy, Routing/Labor, etc.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Which categories of change are driving the most variance?"</p>
              </div>

              <div className="border-l-4 border-indigo-500 pl-4">
                <h4 className="font-semibold text-gray-900">Variance by BOM Level (Horizontal Bar)</h4>
                <p className="text-gray-700 text-sm">Horizontal bars comparing variance at Assembly, Sub-Assembly, and Part levels.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Is variance concentrated at high-level assemblies or lower-level parts?"</p>
              </div>

              <div className="border-l-4 border-violet-500 pl-4">
                <h4 className="font-semibold text-gray-900">Variance Trend Over Time (Area Chart)</h4>
                <p className="text-gray-700 text-sm">Stacked area chart showing how different driver categories have contributed to variance over time.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Are certain driver types becoming more or less significant?"</p>
              </div>

              <div className="border-l-4 border-fuchsia-500 pl-4">
                <h4 className="font-semibold text-gray-900">Detailed Driver Analysis Table</h4>
                <p className="text-gray-700 text-sm">Comprehensive table with all cost drivers, showing item, level, baseline, current, delta, delta %, category, detail, revision, and date. Includes summary row showing total aligns with program-level delta.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "List every driver so I can analyze root causes."</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab 4: BOM Cost Change Traceability */}
        <Card className="mb-8 break-inside-avoid">
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-xl text-amber-900">Tab 4: BOM Cost Change Traceability</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 italic mb-4">Audit trail of all BOM cost changes across lifecycle</p>
            
            <div className="space-y-4">
              <div className="border-l-4 border-amber-500 pl-4">
                <h4 className="font-semibold text-gray-900">BOM Cost Change Timeline</h4>
                <p className="text-gray-700 text-sm">Visual timeline showing lifecycle stage progression (Proposal, eBOM, mBOM, Current) with costs at each stage and deltas between stages. Individual change events displayed as clickable nodes.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Show me the chronological flow of how cost changed."</p>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold text-gray-900">Transition Summary Cards</h4>
                <p className="text-gray-700 text-sm">Four cards showing cost delta and event count for each lifecycle transition: Proposal to eBOM, Within eBOM, eBOM to mBOM, mBOM to Current.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Which lifecycle transition had the biggest cost impact?"</p>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4">
                <h4 className="font-semibold text-gray-900">Change Event History Table</h4>
                <p className="text-gray-700 text-sm">Detailed table of all change events with ID, type, date, source/target BOM, description, cost impact, and status. Clickable rows open event detail drawer.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Give me the complete audit trail of every change."</p>
              </div>

              <div className="border-l-4 border-lime-500 pl-4">
                <h4 className="font-semibold text-gray-900">Change Event Detail Drawer</h4>
                <p className="text-gray-700 text-sm">Slide-out panel with full event details: before/after comparison (quantity, unit cost, supplier), EAC alignment status, approver, and affected nodes.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "What exactly changed in this specific event?"</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab 5: EAC / Forecast Alignment */}
        <Card className="mb-8 break-inside-avoid">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-xl text-red-900">Tab 5: EAC / Forecast Alignment</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 italic mb-4">Ensures BOM cost changes are reflected in financial forecasts</p>
            
            <div className="space-y-4">
              <div className="border-l-4 border-red-500 pl-4">
                <h4 className="font-semibold text-gray-900">Alignment KPIs</h4>
                <p className="text-gray-700 text-sm">Cards showing BOM Cost, EAC, Variance, CPI, Approved Changes, Incorporated in EAC, and Unincorporated Changes (with formula breakdown).</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "How aligned is our BOM cost with the financial forecast?"</p>
              </div>

              <div className="border-l-4 border-rose-500 pl-4">
                <h4 className="font-semibold text-gray-900">BOM Cost vs EAC Trend (Line Chart)</h4>
                <p className="text-gray-700 text-sm">Dual-line chart comparing BOM Cost (solid) vs EAC (dashed) over time with zoomed Y-axis to highlight differences.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Is the gap between BOM and EAC growing or shrinking?"</p>
              </div>

              <div className="border-l-4 border-pink-500 pl-4">
                <h4 className="font-semibold text-gray-900">Cost Change Incorporation Funnel</h4>
                <p className="text-gray-700 text-sm">Horizontal funnel showing: Identified Changes, Validated, Approved, Incorporated into EAC, and Unincorporated Gap. Values derived from actual change event data.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "How many changes are stuck in the pipeline?"</p>
              </div>

              <div className="border-l-4 border-red-400 pl-4">
                <h4 className="font-semibold text-gray-900">Unaligned Cost Changes Table</h4>
                <p className="text-gray-700 text-sm">Table listing BOM changes not yet reflected in EAC, with Event ID (clickable for details), description, cost impact, EAC status, BOM status, reason not in EAC, and risk level.</p>
                <p className="text-gray-500 text-xs mt-1"><strong>Story:</strong> "Which specific changes need finance attention?"</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role-Based Summary */}
        <section className="mb-10 break-inside-avoid">
          <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">Role-Based Tab Recommendations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Role</th>
                  <th className="border border-gray-300 p-2 text-left">Primary Tabs</th>
                  <th className="border border-gray-300 p-2 text-left">Key Questions Answered</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2 font-medium">Program Manager</td>
                  <td className="border border-gray-300 p-2">Overview, EAC Alignment</td>
                  <td className="border border-gray-300 p-2">Are we on budget? What is the forecast risk?</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 p-2 font-medium">Cost Analyst</td>
                  <td className="border border-gray-300 p-2">Variance and Drivers, Traceability</td>
                  <td className="border border-gray-300 p-2">What is driving variance? Can I trace each change?</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-medium">BOM Manager</td>
                  <td className="border border-gray-300 p-2">Explorer, Traceability</td>
                  <td className="border border-gray-300 p-2">Where in the structure is the issue? What changed?</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 p-2 font-medium">Finance Controller</td>
                  <td className="border border-gray-300 p-2">EAC Alignment</td>
                  <td className="border border-gray-300 p-2">Are BOM changes in the forecast? What is the gap?</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-medium">Engineering Lead</td>
                  <td className="border border-gray-300 p-2">Explorer, Variance and Drivers</td>
                  <td className="border border-gray-300 p-2">Which designs are driving cost? What can we optimize?</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-400 text-sm mt-12 pt-4 border-t border-gray-200">
          <p>CBOM - BOM Lifecycle Visual Guide</p>
          <p>Unit Cost Requirements Dashboard</p>
        </footer>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .break-inside-avoid { break-inside: avoid; }
          .print\\:mb-8 { margin-bottom: 2rem; }
          .print\\:p-4 { padding: 1rem; }
        }
      `}</style>
    </div>
  )
}

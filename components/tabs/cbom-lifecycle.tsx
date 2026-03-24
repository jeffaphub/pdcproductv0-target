"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Treemap, Cell, ComposedChart, Area, ReferenceLine } from "recharts"
import { ChevronRight, ChevronDown, Filter, Download, Share2, RefreshCw, AlertTriangle, CheckCircle, Clock, ArrowUpRight, ArrowDownRight, Minus, FileText, GitBranch, DollarSign, TrendingUp, Layers, History, Target, Info, ArrowRight, Diff, Plus, Trash2 } from "lucide-react"
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// ===== TYPES =====
type BOMType = "Proposal" | "eBOM" | "mBOM" | "Current"
type CompareMode = "baseline" | "prior-revision" | "prior-period" | "eac"
type LifecycleComparePath = "proposal-ebom" | "ebom-mbom" | "mbom-current" | "proposal-current"

// Lifecycle stage data
interface LifecycleStage {
  id: BOMType
  label: string
  fullLabel: string
  effectiveDate: Date
  revision: string
  rolledUpCost: number
  hasChanges: boolean
}
type DriverCategory = "Quantity" | "Substitution" | "Supplier Price" | "Make/Buy" | "Routing/Labor" | "Overhead" | "Scrap/Yield" | "Engineering" | "Manufacturing" | "Actuals"

interface BOMNode {
  id: string
  name: string
  partNumber: string
  level: "program" | "assembly" | "sub-assembly" | "part"
  parentId: string | null
  quantity: number
  quantityBaseline: number
  unitCost: number
  unitCostBaseline: number
  extendedCost: number
  extendedCostBaseline: number
  rolledUpCost: number
  rolledUpCostBaseline: number
  bomSource: BOMType
  revision: string
  commodity: string
  supplier: string
  makeOrBuy: "Make" | "Buy"
  lastChangedDate: Date
  changeType: "none" | "quantity" | "substitution" | "new" | "deleted" | "supplier" | "price"
  children: BOMNode[]
}

interface ChangeEvent {
  id: string
  eventType: "ECO" | "Substitution" | "Price Update" | "Quantity Change" | "Sourcing Change" | "Revision Release" | "Routing Update" | "Scrap Update"
  date: Date
  sourceBOM: BOMType
  targetBOM: BOMType
  affectedNodes: string[]
  costImpact: number
  description: string
  approver: string
  status: "Approved" | "Pending" | "Effective"
  // Extended fields for before/after mechanics
  qtyBefore?: number
  qtyAfter?: number
  unitCostBefore?: number
  unitCostAfter?: number
  supplierBefore?: string
  supplierAfter?: string
  includedInCurrent: boolean
  reflectedInEAC: "Yes" | "No" | "Partial"
  lifecycleTransition: "within-ebom" | "ebom-to-mbom" | "mbom-to-current" | "proposal-assumptions"
}

interface CostDriver {
  item: string
  level: string
  baselineCost: number
  currentCost: number
  delta: number
  deltaPercent: number
  driverCategory: DriverCategory
  driverDetail: string
  sourceBOM: BOMType
  targetBOM: BOMType
  revision: string
  effectiveDate: Date
}

// ===== CONSTANTS =====
const programs = ["F-35 Lightning II", "AH-64E Apache", "CH-47F Chinook", "UH-60M Black Hawk"]
const commodities = ["Structural", "Electrical", "Hydraulic", "Avionics", "Propulsion", "Landing Gear"]
const suppliers = ["L3Harris", "Northrop Grumman", "BAE Systems", "Raytheon", "Collins Aerospace", "Honeywell"]
const assemblies = ["Forward Fuselage", "Center Fuselage", "Aft Fuselage", "Wing Assembly", "Empennage", "Landing Gear", "Avionics Bay", "Engine Mount"]

const COLORS = {
  primary: "#1e3a5f",
  positive: "#16a34a",
  negative: "#dc2626",
  warning: "#f59e0b",
  neutral: "#6b7280",
  blue: "#2563eb",
  purple: "#7c3aed",
  cyan: "#0891b2"
}

// KPI Definitions for tooltips
const KPI_DEFINITIONS: Record<string, { title: string; description: string; factors?: string[] }> = {
  "forecast-credibility": {
    title: "Forecast Credibility Score",
    description: "Measures alignment between costed BOM changes and current EAC forecast. A higher score indicates better forecast reliability.",
    factors: [
      "Incorporation rate: % of validated BOM cost changes in EAC (35%)",
      "Forecast lag: Time from approved change to forecast update (20%)",
      "Open change exposure: $ value of unincorporated changes (20%)",
      "Revision stability: Consistency of revision-to-revision cost movement (25%)"
    ]
  },
  "bom-eac-delta": {
    title: "BOM vs EAC Delta",
    description: "Difference between current rolled-up BOM cost and Estimate at Completion. Positive = BOM exceeds EAC; Negative = EAC exceeds BOM.",
  },
  "material-cost-change": {
    title: "Material Cost Change",
    description: "Percentage change in material cost component from Proposal Baseline to Current Released State.",
  },
  "open-ecos": {
    title: "Open ECOs with Cost Impact",
    description: "Count of Engineering Change Orders that have quantified cost impact but are not yet in 'Effective' status.",
  },
  "variance-baseline": {
    title: "Variance vs Proposal Baseline",
    description: "Total cost variance comparing Current Released Costed BOM to original Proposal Baseline Costed BOM.",
  },
  "unincorporated-changes": {
    title: "Unincorporated Changes",
    description: "Cost-impacting BOM changes that have been approved but not yet reflected in the current EAC forecast.",
  }
}

// ===== SEEDED RANDOM =====
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

// ===== DATA GENERATION =====
function generateBOMHierarchy(program: string): BOMNode[] {
  const seed = program.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const nodes: BOMNode[] = []
  
  // First, generate all assemblies and their costs to properly roll up to program level
  const assemblyData: { asm: string; asmSeed: number; baselineCost: number; currentCost: number; qty: number; qtyBaseline: number }[] = []
  let totalAssemblyCurrentCost = 0
  let totalAssemblyBaselineCost = 0
  
  assemblies.forEach((asm, i) => {
    const asmSeed = seed + i * 100
    const baselineCost = 3000000 + seededRandom(asmSeed) * 4000000
    // Allow both increases and decreases vs baseline (0.85 to 1.15 multiplier)
    const currentCost = baselineCost * (0.85 + seededRandom(asmSeed + 1) * 0.30)
    const qty = 1 + Math.floor(seededRandom(asmSeed + 2) * 3)
    const qtyBaseline = 1 + Math.floor(seededRandom(asmSeed + 3) * 3)
    
    totalAssemblyCurrentCost += currentCost * qty
    totalAssemblyBaselineCost += baselineCost * qtyBaseline
    
    assemblyData.push({ asm, asmSeed, baselineCost, currentCost, qty, qtyBaseline })
  })
  
  // Program level - use actual rolled-up costs from assemblies
  const programNode: BOMNode = {
    id: "prog-1",
    name: program,
    partNumber: "PROG-001",
    level: "program",
    parentId: null,
    quantity: 1,
    quantityBaseline: 1,
    unitCost: 0,
    unitCostBaseline: 0,
    extendedCost: 0,
    extendedCostBaseline: 0,
    rolledUpCost: totalAssemblyCurrentCost,
    rolledUpCostBaseline: totalAssemblyBaselineCost,
    bomSource: "Current",
    revision: "Rev C",
    commodity: "System",
    supplier: "Prime",
    makeOrBuy: "Make",
    lastChangedDate: new Date(Date.now() - seededRandom(seed + 2) * 30 * 24 * 60 * 60 * 1000),
    changeType: "none",
    children: []
  }
  nodes.push(programNode)
  
// Assemblies - use pre-calculated data
  assemblyData.forEach(({ asm, asmSeed, baselineCost, currentCost, qty, qtyBaseline }, i) => {
    const changeTypes: BOMNode["changeType"][] = ["none", "quantity", "substitution", "supplier", "price"]
    
    const asmNode: BOMNode = {
      id: `asm-${i}`,
      name: asm,
      partNumber: `ASM-${1000 + i}`,
      level: "assembly",
      parentId: "prog-1",
      quantity: qty,
      quantityBaseline: qtyBaseline,
      unitCost: currentCost,
      unitCostBaseline: baselineCost,
      extendedCost: currentCost * qty,
      extendedCostBaseline: baselineCost * qtyBaseline,
      rolledUpCost: currentCost * qty,
      rolledUpCostBaseline: baselineCost * qtyBaseline,
      bomSource: ["Proposal", "eBOM", "mBOM", "Current"][Math.floor(seededRandom(asmSeed + 4) * 4)] as BOMType,
      revision: `Rev ${String.fromCharCode(65 + Math.floor(seededRandom(asmSeed + 5) * 5))}`,
      commodity: commodities[i % commodities.length],
      supplier: suppliers[Math.floor(seededRandom(asmSeed + 6) * suppliers.length)],
      makeOrBuy: seededRandom(asmSeed + 7) > 0.3 ? "Make" : "Buy",
      lastChangedDate: new Date(Date.now() - seededRandom(asmSeed + 8) * 90 * 24 * 60 * 60 * 1000),
      changeType: changeTypes[Math.floor(seededRandom(asmSeed + 9) * changeTypes.length)],
      children: []
    }
    nodes.push(asmNode)
    
    // Sub-assemblies
    const subAsmCount = 2 + Math.floor(seededRandom(asmSeed + 10) * 4)
    for (let j = 0; j < subAsmCount; j++) {
      const subSeed = asmSeed + j * 50
      const subBaselineCost = 200000 + seededRandom(subSeed) * 500000
      const subCurrentCost = subBaselineCost * (0.85 + seededRandom(subSeed + 1) * 0.35)
      
      const subAsmNode: BOMNode = {
        id: `sub-${i}-${j}`,
        name: `${asm} Sub-Asm ${j + 1}`,
        partNumber: `SUB-${1000 + i * 10 + j}`,
        level: "sub-assembly",
        parentId: `asm-${i}`,
        quantity: 1 + Math.floor(seededRandom(subSeed + 2) * 4),
        quantityBaseline: 1 + Math.floor(seededRandom(subSeed + 3) * 4),
        unitCost: subCurrentCost,
        unitCostBaseline: subBaselineCost,
        extendedCost: subCurrentCost,
        extendedCostBaseline: subBaselineCost,
        rolledUpCost: subCurrentCost,
        rolledUpCostBaseline: subBaselineCost,
        bomSource: ["Proposal", "eBOM", "mBOM", "Current"][Math.floor(seededRandom(subSeed + 4) * 4)] as BOMType,
        revision: `Rev ${String.fromCharCode(65 + Math.floor(seededRandom(subSeed + 5) * 5))}`,
        commodity: commodities[Math.floor(seededRandom(subSeed + 6) * commodities.length)],
        supplier: suppliers[Math.floor(seededRandom(subSeed + 7) * suppliers.length)],
        makeOrBuy: seededRandom(subSeed + 8) > 0.5 ? "Make" : "Buy",
        lastChangedDate: new Date(Date.now() - seededRandom(subSeed + 9) * 60 * 24 * 60 * 60 * 1000),
        changeType: changeTypes[Math.floor(seededRandom(subSeed + 10) * changeTypes.length)],
        children: []
      }
      nodes.push(subAsmNode)
      
      // Parts
      const partCount = 3 + Math.floor(seededRandom(subSeed + 11) * 6)
      for (let k = 0; k < partCount; k++) {
        const partSeed = subSeed + k * 20
        const partBaselineCost = 5000 + seededRandom(partSeed) * 50000
        const partCurrentCost = partBaselineCost * (0.8 + seededRandom(partSeed + 1) * 0.45)
        
        const partNode: BOMNode = {
          id: `part-${i}-${j}-${k}`,
          name: `Component ${String.fromCharCode(65 + k)}`,
          partNumber: `PN-${10000 + Math.floor(seededRandom(partSeed + 2) * 90000)}`,
          level: "part",
          parentId: `sub-${i}-${j}`,
          quantity: 1 + Math.floor(seededRandom(partSeed + 3) * 10),
          quantityBaseline: 1 + Math.floor(seededRandom(partSeed + 4) * 10),
          unitCost: partCurrentCost,
          unitCostBaseline: partBaselineCost,
          extendedCost: partCurrentCost * (1 + Math.floor(seededRandom(partSeed + 3) * 10)),
          extendedCostBaseline: partBaselineCost * (1 + Math.floor(seededRandom(partSeed + 4) * 10)),
          rolledUpCost: partCurrentCost,
          rolledUpCostBaseline: partBaselineCost,
          bomSource: ["Proposal", "eBOM", "mBOM", "Current"][Math.floor(seededRandom(partSeed + 5) * 4)] as BOMType,
          revision: `Rev ${String.fromCharCode(65 + Math.floor(seededRandom(partSeed + 6) * 5))}`,
          commodity: commodities[Math.floor(seededRandom(partSeed + 7) * commodities.length)],
          supplier: suppliers[Math.floor(seededRandom(partSeed + 8) * suppliers.length)],
          makeOrBuy: seededRandom(partSeed + 9) > 0.6 ? "Make" : "Buy",
          lastChangedDate: new Date(Date.now() - seededRandom(partSeed + 10) * 45 * 24 * 60 * 60 * 1000),
          changeType: changeTypes[Math.floor(seededRandom(partSeed + 11) * changeTypes.length)],
          children: []
        }
        nodes.push(partNode)
      }
    }
  })
  
  return nodes
}

function generateChangeEvents(program: string): ChangeEvent[] {
  const seed = program.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const events: ChangeEvent[] = []
  const eventTypes: ChangeEvent["eventType"][] = ["ECO", "Substitution", "Price Update", "Quantity Change", "Sourcing Change", "Revision Release", "Routing Update", "Scrap Update"]
  const bomTypes: BOMType[] = ["Proposal", "eBOM", "mBOM", "Current"]
  const lifecycleTransitions: ChangeEvent["lifecycleTransition"][] = ["within-ebom", "ebom-to-mbom", "mbom-to-current", "proposal-assumptions"]
  
  for (let i = 0; i < 20; i++) {
    const eSeed = seed + i * 77
    const sourceBOM = bomTypes[Math.floor(seededRandom(eSeed) * 3)]
    const targetIdx = Math.min(bomTypes.indexOf(sourceBOM) + 1, 3)
    const qtyBefore = 1 + Math.floor(seededRandom(eSeed + 10) * 5)
    const qtyAfter = qtyBefore + Math.floor(seededRandom(eSeed + 11) * 4) - 1
    const unitCostBefore = 5000 + seededRandom(eSeed + 12) * 20000
    const unitCostAfter = unitCostBefore * (0.85 + seededRandom(eSeed + 13) * 0.35)
    
    events.push({
      id: `ECO-2024-${100 + i}`,
      eventType: eventTypes[Math.floor(seededRandom(eSeed + 1) * eventTypes.length)],
      date: new Date(Date.now() - (180 - i * 8) * 24 * 60 * 60 * 1000),
      sourceBOM,
      targetBOM: bomTypes[targetIdx],
      affectedNodes: Array.from({ length: 1 + Math.floor(seededRandom(eSeed + 2) * 5) }, (_, j) => `asm-${j}`),
      costImpact: (seededRandom(eSeed + 3) - 0.4) * 500000,
      description: [
        "Engineering Change Order: Weight reduction redesign",
        "Supplier price renegotiation effective Q2",
        "Quantity adjustment per customer contract mod",
        "Alternate source qualification complete",
        "Manufacturing process improvement - routing",
        "Scrap/yield rate update based on actuals",
        "Material substitution for supply chain risk",
        "Routing optimization - labor hours reduced"
      ][Math.floor(seededRandom(eSeed + 4) * 8)],
      approver: ["J. Smith", "M. Johnson", "R. Williams", "S. Davis"][Math.floor(seededRandom(eSeed + 5) * 4)],
      status: ["Approved", "Pending", "Effective"][Math.floor(seededRandom(eSeed + 6) * 3)] as ChangeEvent["status"],
      qtyBefore,
      qtyAfter,
      unitCostBefore,
      unitCostAfter,
      supplierBefore: suppliers[Math.floor(seededRandom(eSeed + 14) * suppliers.length)],
      supplierAfter: suppliers[Math.floor(seededRandom(eSeed + 15) * suppliers.length)],
      includedInCurrent: seededRandom(eSeed + 16) > 0.3,
      reflectedInEAC: ["Yes", "No", "Partial"][Math.floor(seededRandom(eSeed + 17) * 3)] as ChangeEvent["reflectedInEAC"],
      lifecycleTransition: lifecycleTransitions[Math.floor(seededRandom(eSeed + 18) * lifecycleTransitions.length)]
    })
  }
  
  return events.sort((a, b) => b.date.getTime() - a.date.getTime())
}

function generateCostDrivers(program: string): CostDriver[] {
  const seed = program.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const drivers: CostDriver[] = []
  const categories: DriverCategory[] = ["Quantity", "Substitution", "Supplier Price", "Make/Buy", "Routing/Labor", "Overhead", "Scrap/Yield", "Engineering", "Manufacturing", "Actuals"]
  const levels = ["Assembly", "Sub-Assembly", "Part"]
  
  for (let i = 0; i < 30; i++) {
    const dSeed = seed + i * 43
    const baselineCost = 50000 + seededRandom(dSeed) * 500000
    const currentCost = baselineCost * (0.75 + seededRandom(dSeed + 1) * 0.5)
    const delta = currentCost - baselineCost
    
    drivers.push({
      item: `${assemblies[i % assemblies.length]} ${i < 10 ? "" : `Sub-Asm ${Math.floor(i / 10)}`}`,
      level: levels[Math.floor(seededRandom(dSeed + 2) * 3)],
      baselineCost,
      currentCost,
      delta,
      deltaPercent: (delta / baselineCost) * 100,
      driverCategory: categories[Math.floor(seededRandom(dSeed + 3) * categories.length)],
      driverDetail: [
        "Qty increased from 2 to 4",
        "Substituted alternate part",
        "Supplier price increase +8%",
        "Changed from Buy to Make",
        "New routing added 2 ops",
        "Overhead rate adjustment",
        "Scrap rate improved 3%",
        "ECO-2024-156 redesign",
        "MFG process change",
        "Actuals true-up Q3"
      ][Math.floor(seededRandom(dSeed + 4) * 10)],
      sourceBOM: "Proposal",
      targetBOM: "Current",
      revision: `ECO-2024-${100 + i}`,
      effectiveDate: new Date(Date.now() - seededRandom(dSeed + 5) * 90 * 24 * 60 * 60 * 1000)
    })
  }
  
  return drivers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

// ===== FORMATTING =====
function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

// ===== SUB-COMPONENTS =====

// KPI Card with optional definition tooltip
function KPICard({ title, value, delta, deltaLabel, icon: Icon, trend, definitionKey }: {
  title: string
  value: string
  delta?: string
  deltaLabel?: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
  definitionKey?: string
}) {
  const definition = definitionKey ? KPI_DEFINITIONS[definitionKey] : null
  
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
              {definition && (
                <UITooltip>
                  <TooltipTrigger asChild>
                    <button className="p-0.5 hover:bg-gray-100 rounded">
                      <Info className="w-3 h-3 text-gray-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs bg-gray-900 text-white p-3">
                    <p className="font-semibold text-xs mb-1">{definition.title}</p>
                    <p className="text-xs text-gray-300">{definition.description}</p>
                    {definition.factors && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[10px] text-gray-400 font-semibold">CALCULATION FACTORS:</p>
                        {definition.factors.map((f, i) => (
                          <p key={i} className="text-[10px] text-gray-300">• {f}</p>
                        ))}
                      </div>
                    )}
                  </TooltipContent>
                </UITooltip>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {delta && (
              <div className="flex items-center gap-1 mt-1">
                {trend === "up" && <ArrowUpRight className="w-3 h-3 text-red-600" />}
                {trend === "down" && <ArrowDownRight className="w-3 h-3 text-green-600" />}
                {trend === "neutral" && <Minus className="w-3 h-3 text-gray-500" />}
                <span className={`text-xs font-medium ${trend === "up" ? "text-red-600" : trend === "down" ? "text-green-600" : "text-gray-500"}`}>
                  {delta}
                </span>
                {deltaLabel && <span className="text-xs text-gray-400">{deltaLabel}</span>}
              </div>
            )}
          </div>
          <div className="p-2 bg-gray-100 rounded-lg">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// BOM Tree Node
function BOMTreeNode({ node, allNodes, level, expandedIds, onToggle, onSelect, selectedId }: {
  node: BOMNode
  allNodes: BOMNode[]
  level: number
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onSelect: (node: BOMNode) => void
  selectedId: string | null
}) {
  const children = allNodes.filter(n => n.parentId === node.id)
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const delta = node.rolledUpCost - node.rolledUpCostBaseline
  const deltaPercent = (delta / node.rolledUpCostBaseline) * 100
  
  const changeTypeBadge = {
    none: null,
    quantity: <Badge className="text-[9px] bg-blue-100 text-blue-700">QTY</Badge>,
    substitution: <Badge className="text-[9px] bg-purple-100 text-purple-700">SUB</Badge>,
    new: <Badge className="text-[9px] bg-green-100 text-green-700">NEW</Badge>,
    deleted: <Badge className="text-[9px] bg-red-100 text-red-700">DEL</Badge>,
    supplier: <Badge className="text-[9px] bg-orange-100 text-orange-700">SUPP</Badge>,
    price: <Badge className="text-[9px] bg-amber-100 text-amber-700">PRICE</Badge>
  }
  
  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-2 cursor-pointer hover:bg-blue-50 border-l-2 ${isSelected ? "bg-blue-50 border-l-blue-600" : "border-l-transparent"}`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); onToggle(node.id) }} className="p-0.5 hover:bg-gray-200 rounded">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">{node.name}</span>
            <span className="text-xs text-gray-400 font-mono">{node.partNumber}</span>
            {changeTypeBadge[node.changeType]}
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-right">
          <div className="w-24">
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(node.rolledUpCost)}</p>
            <p className="text-xs text-gray-400">{formatCurrency(node.rolledUpCostBaseline)}</p>
          </div>
          <div className="w-20">
            <p className={`text-sm font-medium ${delta > 0 ? "text-red-600" : delta < 0 ? "text-green-600" : "text-gray-500"}`}>
              {formatCurrency(delta)}
            </p>
            <p className={`text-xs ${delta > 0 ? "text-red-500" : delta < 0 ? "text-green-500" : "text-gray-400"}`}>
              {formatPercent(deltaPercent)}
            </p>
          </div>
          <div className="w-16 text-center">
            <Badge variant="outline" className="text-[9px]">{node.revision}</Badge>
          </div>
        </div>
      </div>
      
      {isExpanded && children.map(child => (
        <BOMTreeNode
          key={child.id}
          node={child}
          allNodes={allNodes}
          level={level + 1}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  )
}

// ===== MAIN COMPONENT =====
export function CBOMLifecycle() {
  // State
  const [activeTab, setActiveTab] = useState<"overview" | "explorer" | "variance" | "traceability" | "eac">("overview")
  const [selectedProgram, setSelectedProgram] = useState(programs[0])
  const [selectedBOMType, setSelectedBOMType] = useState<BOMType>("Current")
  const [compareMode, setCompareMode] = useState<CompareMode>("baseline")
  const [selectedNode, setSelectedNode] = useState<BOMNode | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["prog-1"]))
  const [lifecycleComparePath, setLifecycleComparePath] = useState<LifecycleComparePath>("proposal-current")
  const [selectedChangeEvent, setSelectedChangeEvent] = useState<ChangeEvent | null>(null)
  const [changeCompareDrawerOpen, setChangeCompareDrawerOpen] = useState(false)
  
  // Data generation
  const bomNodes = useMemo(() => generateBOMHierarchy(selectedProgram), [selectedProgram])
  const changeEvents = useMemo(() => generateChangeEvents(selectedProgram), [selectedProgram])
  const costDrivers = useMemo(() => generateCostDrivers(selectedProgram), [selectedProgram])
  
  // Computed data
  const programNode = bomNodes.find(n => n.level === "program")!
  const assemblyNodes = bomNodes.filter(n => n.level === "assembly")
  
  // Lifecycle stages for the ribbon
  const lifecycleStages: LifecycleStage[] = useMemo(() => {
    const seed = selectedProgram.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const proposalCost = programNode.rolledUpCostBaseline * 0.95
    const eBOMCost = programNode.rolledUpCostBaseline * 0.98
    const mBOMCost = programNode.rolledUpCostBaseline * 1.02
    const currentCost = programNode.rolledUpCost
    
    return [
      {
        id: "Proposal" as BOMType,
        label: "Proposal",
        fullLabel: "Proposal Baseline Costed BOM",
        effectiveDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        revision: "Rev A",
        rolledUpCost: proposalCost,
        hasChanges: false
      },
      {
        id: "eBOM" as BOMType,
        label: "eBOM",
        fullLabel: "Engineering BOM (eBOM)",
        effectiveDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        revision: "Rev B",
        rolledUpCost: eBOMCost,
        hasChanges: true
      },
      {
        id: "mBOM" as BOMType,
        label: "mBOM",
        fullLabel: "Manufacturing BOM (mBOM)",
        effectiveDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        revision: "Rev B",
        rolledUpCost: mBOMCost,
        hasChanges: true
      },
      {
        id: "Current" as BOMType,
        label: "Current",
        fullLabel: "Current Released Costed BOM",
        effectiveDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        revision: "Rev C",
        rolledUpCost: currentCost,
        hasChanges: true
      }
    ]
  }, [selectedProgram, programNode])
  
  // Get compare path labels
  const getComparePathLabel = (path: LifecycleComparePath): { source: string; target: string } => {
    switch (path) {
      case "proposal-ebom": return { source: "Proposal Baseline", target: "Engineering BOM" }
      case "ebom-mbom": return { source: "Engineering BOM", target: "Manufacturing BOM" }
      case "mbom-current": return { source: "Manufacturing BOM", target: "Current Released" }
      case "proposal-current": return { source: "Proposal Baseline", target: "Current Released" }
    }
  }
  
  const totalCost = programNode.rolledUpCost
  // Use the actual Proposal stage cost (which is rolledUpCostBaseline * 0.95) to match what's shown in the lifecycle ribbon
  const proposalBaselineCost = programNode.rolledUpCostBaseline * 0.95
  const baselineCost = proposalBaselineCost
  const totalDelta = totalCost - baselineCost
  const totalDeltaPercent = (totalDelta / baselineCost) * 100
  
  // Waterfall data - proper floating bar structure
  const waterfallData = useMemo(() => {
    const seed = selectedProgram.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    
    // Generate change values that sum to the difference between baseline and current
    const engineering = seededRandom(seed) * 1500000 - 500000
    const manufacturing = seededRandom(seed + 1) * 800000 - 200000
    const supplierPricing = seededRandom(seed + 2) * 2000000
    const quantity = seededRandom(seed + 3) * 1000000 - 300000
    const substitutions = seededRandom(seed + 4) * 500000 - 400000
    
    // Adjust actuals to make the sum equal to totalDelta
    const changesSum = engineering + manufacturing + supplierPricing + quantity + substitutions
    const actuals = totalDelta - changesSum
    
    // Build waterfall with running total for base positioning
    let runningTotal = baselineCost
    
    const data = [
      { name: "Baseline", base: 0, value: baselineCost, fill: COLORS.primary, isTotal: true },
    ]
    
    // Add intermediate changes as floating bars
    const changes = [
      { name: "Engineering", delta: engineering, fill: COLORS.blue },
      { name: "Manufacturing", delta: manufacturing, fill: COLORS.purple },
      { name: "Supplier Pricing", delta: supplierPricing, fill: COLORS.warning },
      { name: "Quantity", delta: quantity, fill: COLORS.cyan },
      { name: "Substitutions", delta: substitutions, fill: COLORS.positive },
      { name: "Actuals", delta: actuals, fill: COLORS.neutral },
    ]
    
    changes.forEach(change => {
      if (change.delta >= 0) {
        // Positive change: bar starts at runningTotal and goes up
        data.push({
          name: change.name,
          base: runningTotal,
          value: change.delta,
          fill: change.fill,
          isTotal: false
        })
      } else {
        // Negative change: bar starts at runningTotal + delta (lower) and goes up to runningTotal
        data.push({
          name: change.name,
          base: runningTotal + change.delta,
          value: Math.abs(change.delta),
          fill: COLORS.negative, // Red for negative
          isTotal: false
        })
      }
      runningTotal += change.delta
    })
    
    // Final total
    data.push({ name: "Current", base: 0, value: totalCost, fill: COLORS.primary, isTotal: true })
    
    return data
  }, [selectedProgram, baselineCost, totalCost, totalDelta])
  
  // Cost trend data - must align with lifecycle stages (Proposal -> Current)
  const costTrendData = useMemo(() => {
    const seed = selectedProgram.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const months = 12
    
    // Calculate interpolation from Proposal cost to Current cost over 12 months
    // This ensures the final point matches totalCost exactly
    return Array.from({ length: months }, (_, i) => {
      const month = new Date(Date.now() - (months - 1 - i) * 30 * 24 * 60 * 60 * 1000)
      const progress = i / (months - 1) // 0 to 1
      
      // Current line: interpolate from Proposal (baselineCost) to Current (totalCost)
      // Add small random variation except for last point which must be exact
      const isLastPoint = i === months - 1
      const currentValue = isLastPoint 
        ? totalCost 
        : baselineCost + (totalCost - baselineCost) * progress * (0.85 + seededRandom(seed + i) * 0.25)
      
      // EAC slightly above current, converging at the end
      const eacValue = currentValue * (1.02 - progress * 0.015) + seededRandom(seed + i + 30) * 500000
      
      return {
        month: month.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        baseline: baselineCost,
        current: currentValue,
        material: currentValue * 0.6,
        labor: currentValue * 0.25,
        eac: isLastPoint ? totalCost * 1.01 : eacValue
      }
    })
  }, [selectedProgram, baselineCost, totalCost])
  
  // Treemap data
  const treemapData = useMemo(() => {
    return assemblyNodes.map(asm => ({
      name: asm.name,
      value: asm.rolledUpCost,
      delta: asm.rolledUpCost - asm.rolledUpCostBaseline
    }))
  }, [assemblyNodes])
  
  // Handlers
  const handleToggleExpand = (id: string) => {
    const newSet = new Set(expandedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedIds(newSet)
  }
  
  const handleSelectNode = (node: BOMNode) => {
    setSelectedNode(node)
    setDrawerOpen(true)
  }
  
  // Variance by driver data
  const varianceByDriver = useMemo(() => {
    const driverSums: Record<DriverCategory, number> = {
      "Quantity": 0, "Substitution": 0, "Supplier Price": 0, "Make/Buy": 0,
      "Routing/Labor": 0, "Overhead": 0, "Scrap/Yield": 0, "Engineering": 0,
      "Manufacturing": 0, "Actuals": 0
    }
    costDrivers.forEach(d => {
      driverSums[d.driverCategory] += d.delta
    })
    return Object.entries(driverSums).map(([driver, value]) => ({ driver, value })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  }, [costDrivers])
  
  // EAC alignment data
  const eacData = useMemo(() => {
    const seed = selectedProgram.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return {
      bomCost: totalCost,
      eac: totalCost * (1.02 + seededRandom(seed) * 0.05),
      cpi: 0.92 + seededRandom(seed + 1) * 0.15,
      credibilityScore: 75 + Math.floor(seededRandom(seed + 2) * 20),
      unincorporatedChanges: 3 + Math.floor(seededRandom(seed + 3) * 5),
      highRiskChanges: Math.floor(seededRandom(seed + 4) * 3)
    }
  }, [selectedProgram, totalCost])
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Costed BOM Lifecycle Cockpit</h1>
              <p className="text-sm text-gray-500">Configuration-controlled BOM lifecycle with cost traceability and EAC alignment</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Last refresh: {new Date().toLocaleTimeString()}</span>
              <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
              <Button variant="outline" size="sm"><Share2 className="w-4 h-4 mr-1" /> Share</Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Filters:</span>
            </div>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {programs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedBOMType} onValueChange={(v) => setSelectedBOMType(v as BOMType)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Proposal">Proposal Baseline BOM</SelectItem>
                <SelectItem value="eBOM">Engineering BOM (eBOM)</SelectItem>
                <SelectItem value="mBOM">Manufacturing BOM (mBOM)</SelectItem>
                <SelectItem value="Current">Current Released BOM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* LIFECYCLE COMPARE RIBBON */}
        <div className="px-6 py-3 bg-gradient-to-r from-slate-50 to-blue-50 border-t border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">BOM Lifecycle Progression</span>
            <span className="text-xs text-gray-500">Click stages or arrows to compare lifecycle transitions</span>
          </div>
          <div className="flex items-center justify-between">
            {lifecycleStages.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                {/* Stage Box */}
                <button
                  onClick={() => setSelectedBOMType(stage.id)}
                  className={`relative px-4 py-2 rounded-lg border-2 transition-all hover:shadow-md ${
                    selectedBOMType === stage.id 
                      ? "bg-blue-600 border-blue-600 text-white shadow-md" 
                      : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                  }`}
                >
                  <p className="text-sm font-bold">{stage.label}</p>
                  <p className={`text-[10px] ${selectedBOMType === stage.id ? "text-blue-100" : "text-gray-500"}`}>
                    {stage.revision} • {stage.effectiveDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                  </p>
                  <p className={`text-xs font-semibold mt-0.5 ${selectedBOMType === stage.id ? "text-white" : "text-gray-800"}`}>
                    {formatCurrency(stage.rolledUpCost)}
                  </p>
                  {stage.hasChanges && index > 0 && (
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${selectedBOMType === stage.id ? "bg-amber-300" : "bg-amber-500"}`} />
                  )}
                </button>
                
                {/* Arrow/Compare Link */}
                {index < lifecycleStages.length - 1 && (
                  <button
                    onClick={() => {
                      const paths: LifecycleComparePath[] = ["proposal-ebom", "ebom-mbom", "mbom-current"]
                      setLifecycleComparePath(paths[index])
                    }}
                    className={`mx-2 flex items-center gap-1 px-2 py-1 rounded transition-all ${
                      (index === 0 && lifecycleComparePath === "proposal-ebom") ||
                      (index === 1 && lifecycleComparePath === "ebom-mbom") ||
                      (index === 2 && lifecycleComparePath === "mbom-current")
                        ? "bg-blue-100 text-blue-700"
                        : "hover:bg-gray-100 text-gray-400"
                    }`}
                  >
                    <ArrowRight className="w-5 h-5" />
                    <span className={`text-[10px] font-medium ${
                      (lifecycleStages[index + 1].rolledUpCost - stage.rolledUpCost) > 0 ? "text-red-600" : "text-green-600"
                    }`}>
                      {formatCurrency(lifecycleStages[index + 1].rolledUpCost - stage.rolledUpCost)}
                    </span>
                  </button>
                )}
              </div>
            ))}
            
            {/* Full Path Compare Button */}
            <div className="ml-4 pl-4 border-l border-gray-300">
              <button
                onClick={() => setLifecycleComparePath("proposal-current")}
                className={`px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                  lifecycleComparePath === "proposal-current"
                    ? "bg-purple-600 border-purple-600 text-white"
                    : "bg-white border-purple-300 text-purple-700 hover:border-purple-500"
                }`}
              >
                Full Path Compare
                <p className={`text-[10px] font-normal ${lifecycleComparePath === "proposal-current" ? "text-purple-200" : "text-purple-500"}`}>
                  Proposal → Current
                </p>
              </button>
            </div>
          </div>
          
          {/* Selected Compare Path Indicator */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">Current comparison:</span>
            <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
              {getComparePathLabel(lifecycleComparePath).source} → {getComparePathLabel(lifecycleComparePath).target}
            </Badge>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-6 border-t border-gray-100">
          <div className="flex gap-1">
            {[
              { id: "overview", label: "Program Cost Overview", icon: TrendingUp },
              { id: "explorer", label: "Costed BOM Explorer", icon: Layers },
              { id: "variance", label: "Cost Variance & Drivers", icon: GitBranch },
              { id: "traceability", label: "BOM Cost Change Traceability", icon: History },
              { id: "eac", label: "EAC / Forecast Alignment", icon: Target }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600 border-blue-600 bg-blue-50/50"
                    : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* TAB 1: Program Cost Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Compare Path Banner */}
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Diff className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Current comparison: {getComparePathLabel(lifecycleComparePath).source} → {getComparePathLabel(lifecycleComparePath).target}
              </span>
              <span className="text-xs text-blue-600">
                (All cost deltas shown below reflect this lifecycle transition)
              </span>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-5 gap-4">
              <KPICard title="Current Rolled-Up Cost" value={formatCurrency(totalCost)} icon={DollarSign} />
              <KPICard 
                title="Variance vs Proposal Baseline" 
                value={formatCurrency(totalDelta)} 
                delta={formatPercent(totalDeltaPercent)} 
                trend={totalDelta > 0 ? "up" : "down"} 
                icon={TrendingUp}
                definitionKey="variance-baseline"
              />
              <KPICard 
                title="Material Cost Change" 
                value={formatPercent(totalDeltaPercent * 0.7)} 
                trend={totalDeltaPercent > 0 ? "up" : "down"} 
                icon={Layers}
                definitionKey="material-cost-change"
              />
              <KPICard 
                title="Open ECOs with Cost Impact" 
                value={changeEvents.filter(e => e.status !== "Effective").length.toString()} 
                icon={FileText}
                definitionKey="open-ecos"
              />
              <KPICard 
                title="Forecast Credibility" 
                value={`${eacData.credibilityScore}%`} 
                delta={eacData.credibilityScore > 80 ? "Good" : "At Risk"} 
                trend={eacData.credibilityScore > 80 ? "down" : "up"} 
                icon={Target}
                definitionKey="forecast-credibility"
              />
            </div>
            
            {/* Main Visuals Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Cost Roll-Up Waterfall - Custom SVG implementation */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-gray-800">Program Cost Roll-Up (Waterfall)</CardTitle>
                    <Badge className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                      {getComparePathLabel(lifecycleComparePath).source} → {getComparePathLabel(lifecycleComparePath).target}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[300px] relative">
                    {(() => {
                      // Calculate max value for scaling
                      const maxValue = Math.max(baselineCost, totalCost) * 1.1
                      const chartHeight = 240
                      const chartWidth = 600
                      const barWidth = 50
                      const barGap = 25
                      const leftMargin = 60
                      const bottomMargin = 50
                      
                      // Y-axis scale
                      const scaleY = (val: number) => chartHeight - (val / maxValue) * chartHeight
                      
                      // Generate Y-axis ticks
                      const yTicks = [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue]
                      
                      return (
                        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + leftMargin + 20} ${chartHeight + bottomMargin + 10}`} preserveAspectRatio="xMidYMid meet">
                          {/* Grid lines */}
                          {yTicks.map((tick, i) => (
                            <g key={i}>
                              <line 
                                x1={leftMargin} 
                                y1={scaleY(tick)} 
                                x2={chartWidth + leftMargin} 
                                y2={scaleY(tick)} 
                                stroke="#e5e7eb" 
                                strokeDasharray="3 3" 
                              />
                              <text 
                                x={leftMargin - 8} 
                                y={scaleY(tick) + 4} 
                                fontSize="10" 
                                textAnchor="end" 
                                fill="#6b7280"
                              >
                                {`$${(tick / 1000000).toFixed(0)}M`}
                              </text>
                            </g>
                          ))}
                          
                          {/* Bars */}
                          {waterfallData.map((item, index) => {
                            const x = leftMargin + index * (barWidth + barGap) + barGap / 2
                            const y1 = scaleY(item.base + item.value) // Top of bar
                            const y2 = scaleY(item.base) // Bottom of bar
                            const barHeight = y2 - y1
                            
                            return (
                              <g key={item.name}>
                                {/* Bar */}
                                <rect
                                  x={x}
                                  y={y1}
                                  width={barWidth}
                                  height={Math.max(barHeight, 2)}
                                  fill={item.fill}
                                  rx={4}
                                  ry={4}
                                />
                                {/* Connector line to next bar (except for last) */}
                                {index < waterfallData.length - 1 && !waterfallData[index + 1].isTotal && (
                                  <line
                                    x1={x + barWidth}
                                    y1={scaleY(item.base + item.value)}
                                    x2={x + barWidth + barGap}
                                    y2={scaleY(item.base + item.value)}
                                    stroke="#94a3b8"
                                    strokeWidth={1}
                                    strokeDasharray="4 2"
                                  />
                                )}
                                {/* X-axis label */}
                                <text
                                  x={x + barWidth / 2}
                                  y={chartHeight + 15}
                                  fontSize="9"
                                  textAnchor="end"
                                  fill="#374151"
                                  transform={`rotate(-30, ${x + barWidth / 2}, ${chartHeight + 15})`}
                                >
                                  {item.name}
                                </text>
                                {/* Value label on bar */}
                                <text
                                  x={x + barWidth / 2}
                                  y={y1 - 5}
                                  fontSize="8"
                                  textAnchor="middle"
                                  fill={item.isTotal ? "#1e3a5f" : item.fill === COLORS.negative ? "#dc2626" : "#059669"}
                                  fontWeight="bold"
                                >
                                  {item.isTotal ? "" : (item.fill === COLORS.negative ? "-" : "+")}{formatCurrency(item.value)}
                                </text>
                              </g>
                            )
                          })}
                        </svg>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>
              
              {/* Cost Trend */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Rolled-Up Cost by Revision / Period</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={costTrendData} margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis 
                          tick={{ fontSize: 10 }} 
                          tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`}
                          domain={[
                            (dataMin: number) => Math.floor(dataMin * 0.9 / 5000000) * 5000000,
                            (dataMax: number) => Math.ceil(dataMax * 1.05 / 5000000) * 5000000
                          ]}
                        />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="baseline" name="Baseline" stroke={COLORS.neutral} strokeDasharray="5 5" dot={false} />
                        <Line type="monotone" dataKey="current" name="Current" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="eac" name="EAC" stroke={COLORS.warning} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Bottom Row */}
            <div className="grid grid-cols-3 gap-6">
              {/* Treemap */}
              <Card className="col-span-1 border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Cost by Assembly</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <Treemap
                        data={treemapData}
                        dataKey="value"
                        aspectRatio={4 / 3}
                        stroke="#fff"
                        content={({ x, y, width, height, name, value }: any) => (
                          <g>
                            <rect x={x} y={y} width={width} height={height} fill={COLORS.primary} opacity={0.7 + (value / totalCost) * 0.3} stroke="#fff" />
                            {width > 60 && height > 30 && (
                              <>
                                <text x={x + 4} y={y + 14} fill="#fff" fontSize={10} fontWeight="bold">{name}</text>
                                <text x={x + 4} y={y + 26} fill="#fff" fontSize={9}>{formatCurrency(value)}</text>
                              </>
                            )}
                          </g>
                        )}
                      />
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Top Variance Contributors */}
              <Card className="col-span-2 border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Top Cost Variance Contributors</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[250px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-3 font-semibold text-gray-700">Assembly / Part</th>
                          <th className="text-right p-3 font-semibold text-gray-700">Current</th>
                          <th className="text-right p-3 font-semibold text-gray-700">Baseline</th>
                          <th className="text-right p-3 font-semibold text-gray-700">Delta</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Driver</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Revision</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {costDrivers.slice(0, 8).map((d, i) => (
                          <tr key={i} className="hover:bg-blue-50 cursor-pointer" onClick={() => setActiveTab("variance")}>
                            <td className="p-3 font-medium text-gray-900">{d.item}</td>
                            <td className="p-3 text-right text-gray-700">{formatCurrency(d.currentCost)}</td>
                            <td className="p-3 text-right text-gray-500">{formatCurrency(d.baselineCost)}</td>
                            <td className={`p-3 text-right font-medium ${d.delta > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(d.delta)}</td>
                            <td className="p-3"><Badge variant="outline" className="text-[10px]">{d.driverCategory}</Badge></td>
                            <td className="p-3 text-gray-500 text-xs">{d.revision}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* TAB 2: Costed BOM Explorer */}
        {activeTab === "explorer" && (
          <div className="space-y-4">
            {/* Secondary Header - Compare Context */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">
                  Viewing structural and cost differences across:
                </span>
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  {getComparePathLabel(lifecycleComparePath).source} → {getComparePathLabel(lifecycleComparePath).target}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-green-600"><Plus className="w-3 h-3" /> Added</span>
                <span className="flex items-center gap-1 text-red-600"><Trash2 className="w-3 h-3" /> Removed</span>
                <span className="flex items-center gap-1 text-amber-600"><Diff className="w-3 h-3" /> Changed</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              {/* BOM Tree */}
              <Card className="col-span-2 border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold text-gray-800">Costed BOM Hierarchy</CardTitle>
                    <Badge variant="outline" className="text-[9px] bg-gray-50">{selectedProgram}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">Current Cost</Badge>
                    <Badge variant="outline" className="text-[10px] text-gray-400">Baseline</Badge>
                    <Badge variant="outline" className="text-[10px] text-red-600">+Delta</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[600px] overflow-auto">
                    {bomNodes.filter(n => n.parentId === null).map(node => (
                      <BOMTreeNode
                        key={node.id}
                        node={node}
                        allNodes={bomNodes}
                        level={0}
                        expandedIds={expandedIds}
                        onToggle={handleToggleExpand}
                        onSelect={handleSelectNode}
                        selectedId={selectedNode?.id || null}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            
            {/* Selected Node Summary with Before/After Mechanics */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">
                    {selectedNode ? selectedNode.name : "Select a BOM Item"}
                  </CardTitle>
                  {selectedNode && (
                    <p className="text-xs text-gray-500 font-mono">{selectedNode.partNumber}</p>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  {selectedNode ? (
                    <div className="space-y-4">
                      {/* Breadcrumb */}
                      <div className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span>Program</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className="capitalize">{selectedNode.level === "program" ? selectedNode.name : "Major Assembly"}</span>
                        {selectedNode.level !== "program" && selectedNode.level !== "assembly" && (
                          <>
                            <ChevronRight className="w-3 h-3" />
                            <span className="capitalize">{selectedNode.level === "sub-assembly" ? "Sub-Assembly" : "Part"}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Change Badges */}
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.quantity !== selectedNode.quantityBaseline && (
                          <Badge className="text-[9px] bg-blue-100 text-blue-700">Qty Changed</Badge>
                        )}
                        {selectedNode.unitCost !== selectedNode.unitCostBaseline && (
                          <Badge className="text-[9px] bg-amber-100 text-amber-700">Unit Cost Changed</Badge>
                        )}
                        {selectedNode.changeType === "substitution" && (
                          <Badge className="text-[9px] bg-purple-100 text-purple-700">Substituted</Badge>
                        )}
                        {selectedNode.changeType === "supplier" && (
                          <Badge className="text-[9px] bg-orange-100 text-orange-700">Supplier Changed</Badge>
                        )}
                        {selectedNode.changeType === "new" && (
                          <Badge className="text-[9px] bg-green-100 text-green-700">Added</Badge>
                        )}
                        {selectedNode.changeType === "deleted" && (
                          <Badge className="text-[9px] bg-red-100 text-red-700">Removed</Badge>
                        )}
                      </div>
                      
                      {/* Before / After Mechanics Section */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1">
                          <Diff className="w-3 h-3" /> Before / After Mechanics
                        </p>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div className="font-semibold text-gray-600">Attribute</div>
                            <div className="font-semibold text-gray-600 text-center">Before</div>
                            <div className="font-semibold text-gray-600 text-center">After</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs border-t border-slate-200 pt-2">
                            <div className="text-gray-600">Quantity</div>
                            <div className="text-center text-gray-500">{selectedNode.quantityBaseline}</div>
                            <div className={`text-center font-medium ${selectedNode.quantity !== selectedNode.quantityBaseline ? "text-amber-600" : "text-gray-700"}`}>
                              {selectedNode.quantity}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-gray-600">Unit Cost</div>
                            <div className="text-center text-gray-500">{formatCurrency(selectedNode.unitCostBaseline)}</div>
                            <div className={`text-center font-medium ${selectedNode.unitCost !== selectedNode.unitCostBaseline ? "text-amber-600" : "text-gray-700"}`}>
                              {formatCurrency(selectedNode.unitCost)}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-gray-600">Extended Cost</div>
                            <div className="text-center text-gray-500">{formatCurrency(selectedNode.extendedCostBaseline)}</div>
                            <div className={`text-center font-medium ${selectedNode.extendedCost !== selectedNode.extendedCostBaseline ? "text-amber-600" : "text-gray-700"}`}>
                              {formatCurrency(selectedNode.extendedCost)}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-gray-600">BOM State</div>
                            <div className="text-center text-gray-500">Proposal</div>
                            <div className="text-center font-medium text-gray-700">{selectedNode.bomSource}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-gray-600">Revision</div>
                            <div className="text-center text-gray-500">Rev A</div>
                            <div className="text-center font-medium text-gray-700">{selectedNode.revision}</div>
                          </div>
                        </div>
                        
                        {/* Delta Explanation */}
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-[10px] font-semibold text-slate-600 mb-1">Cost Delta Explanation:</p>
                          <p className="text-[10px] text-slate-700 leading-relaxed">
                            {selectedNode.quantity !== selectedNode.quantityBaseline ? 
                              `Cost change driven by quantity change from ${selectedNode.quantityBaseline} to ${selectedNode.quantity}` :
                              selectedNode.unitCost !== selectedNode.unitCostBaseline ?
                              `Cost change driven by unit price change from ${formatCurrency(selectedNode.unitCostBaseline)} to ${formatCurrency(selectedNode.unitCost)}` :
                              "No significant cost drivers identified for this node."
                            }
                            {selectedNode.bomSource !== "Proposal" && ` during ${selectedNode.bomSource === "eBOM" ? "Proposal → eBOM" : selectedNode.bomSource === "mBOM" ? "eBOM → mBOM" : "mBOM → Current"} transition.`}
                          </p>
                        </div>
                      </div>
                      
                      {/* Structure Diff Block */}
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-bold text-gray-700 mb-2">Structure Diff</p>
                        <div className="flex items-center gap-2 text-xs">
                          {selectedNode.changeType === "none" ? (
                            <span className="text-gray-500">No structure change - cost-only change</span>
                          ) : selectedNode.changeType === "new" ? (
                            <span className="text-green-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Part added to structure</span>
                          ) : selectedNode.changeType === "deleted" ? (
                            <span className="text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Part removed from structure</span>
                          ) : selectedNode.changeType === "substitution" ? (
                            <span className="text-purple-600 flex items-center gap-1"><GitBranch className="w-3 h-3" /> Part substituted</span>
                          ) : (
                            <span className="text-amber-600 flex items-center gap-1"><Diff className="w-3 h-3" /> Attribute change only</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Node Attributes */}
                      <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500">Supplier</p>
                          <p className="text-sm">{selectedNode.supplier}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Make/Buy</p>
                          <Badge variant="outline" className="text-[10px]">{selectedNode.makeOrBuy}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Commodity</p>
                          <p className="text-sm">{selectedNode.commodity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Effective Date</p>
                          <p className="text-sm">{selectedNode.lastChangedDate.toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Click a node in the BOM hierarchy to view before/after mechanics</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* TAB 3: Cost Variance & Drivers */}
        {activeTab === "variance" && (
          <div className="space-y-6">
            {/* Top Row Charts */}
            <div className="grid grid-cols-3 gap-6">
              {/* Variance by Driver */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Variance by Driver</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={varianceByDriver.slice(0, 8)} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="driver" tick={{ fontSize: 10 }} width={80} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {varianceByDriver.slice(0, 8).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.value > 0 ? COLORS.negative : COLORS.positive} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Variance by Level */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Variance by Level</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { level: "Program", delta: totalDelta * 0.15 },
                        { level: "Assembly", delta: totalDelta * 0.45 },
                        { level: "Sub-Assembly", delta: totalDelta * 0.25 },
                        { level: "Part", delta: totalDelta * 0.15 }
                      ]} margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="level" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="delta" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Variance Over Time */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Variance Trend</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={costTrendData.map(d => ({ ...d, delta: d.current - d.baseline }))} margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="delta" name="Cumulative Delta" stroke={COLORS.negative} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Driver Analysis Table */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Detailed Driver Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 font-semibold text-gray-700">Item / Node</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Level</th>
                        <th className="text-right p-3 font-semibold text-gray-700">Baseline</th>
                        <th className="text-right p-3 font-semibold text-gray-700">Current</th>
                        <th className="text-right p-3 font-semibold text-gray-700">Delta</th>
                        <th className="text-right p-3 font-semibold text-gray-700">Delta %</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Driver</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Detail</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Revision</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Effective</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {costDrivers.map((d, i) => (
                        <tr key={i} className="hover:bg-blue-50">
                          <td className="p-3 font-medium text-gray-900">{d.item}</td>
                          <td className="p-3 text-gray-600">{d.level}</td>
                          <td className="p-3 text-right text-gray-500">{formatCurrency(d.baselineCost)}</td>
                          <td className="p-3 text-right text-gray-700">{formatCurrency(d.currentCost)}</td>
                          <td className={`p-3 text-right font-medium ${d.delta > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(d.delta)}</td>
                          <td className={`p-3 text-right ${d.deltaPercent > 0 ? "text-red-600" : "text-green-600"}`}>{formatPercent(d.deltaPercent)}</td>
                          <td className="p-3"><Badge variant="outline" className="text-[10px]">{d.driverCategory}</Badge></td>
                          <td className="p-3 text-gray-600 text-xs max-w-[150px] truncate">{d.driverDetail}</td>
                          <td className="p-3 text-gray-500 text-xs font-mono">{d.revision}</td>
                          <td className="p-3 text-gray-500 text-xs">{d.effectiveDate.toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* TAB 4: BOM Cost Change Traceability */}
        {activeTab === "traceability" && (
          <div className="space-y-6">
            {/* Lifecycle State Context */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">
                  BOM Cost Change Event History
                </span>
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  Showing changes: {getComparePathLabel(lifecycleComparePath).source} → {getComparePathLabel(lifecycleComparePath).target}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">Click any row to view structural compare details</span>
            </div>
            
            {/* Timeline */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">BOM Cost Change Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative">
                  <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200" />
                  <div className="flex justify-between relative">
                    {changeEvents.slice(0, 8).map((event, i) => (
                      <div 
                        key={event.id} 
                        className="flex flex-col items-center cursor-pointer hover:opacity-80" 
                        style={{ width: "12%" }}
                        onClick={() => {
                          setSelectedChangeEvent(event)
                          setChangeCompareDrawerOpen(true)
                        }}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                          event.status === "Effective" ? "bg-green-500" : event.status === "Approved" ? "bg-blue-500" : "bg-amber-500"
                        }`}>
                          {event.eventType === "ECO" && <FileText className="w-4 h-4 text-white" />}
                          {event.eventType === "Substitution" && <GitBranch className="w-4 h-4 text-white" />}
                          {event.eventType === "Price Update" && <DollarSign className="w-4 h-4 text-white" />}
                          {!["ECO", "Substitution", "Price Update"].includes(event.eventType) && <Clock className="w-4 h-4 text-white" />}
                        </div>
                        <div className="mt-2 text-center">
                          <p className="text-xs font-medium text-gray-900">{event.eventType}</p>
                          <p className="text-[10px] text-gray-500">{event.date.toLocaleDateString()}</p>
                          <p className={`text-[10px] font-medium ${event.costImpact > 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(event.costImpact)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Change Events Table - Enhanced with before/after columns */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-800">BOM Cost Change Event History</CardTitle>
                <div className="flex items-center gap-2">
                  {/* Lifecycle state filter badges */}
                  {["within-ebom", "ebom-to-mbom", "mbom-to-current", "proposal-assumptions"].map(transition => (
                    <Badge 
                      key={transition}
                      variant="outline" 
                      className={`text-[9px] cursor-pointer hover:bg-blue-50 ${
                        transition === "within-ebom" ? "border-blue-300" :
                        transition === "ebom-to-mbom" ? "border-purple-300" :
                        transition === "mbom-to-current" ? "border-green-300" : "border-gray-300"
                      }`}
                    >
                      {transition === "within-ebom" ? "Within eBOM" :
                       transition === "ebom-to-mbom" ? "eBOM → mBOM" :
                       transition === "mbom-to-current" ? "mBOM → Current" : "Proposal"}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2 font-semibold text-gray-700 text-xs">Event ID</th>
                        <th className="text-left p-2 font-semibold text-gray-700 text-xs">Type</th>
                        <th className="text-left p-2 font-semibold text-gray-700 text-xs">Lifecycle</th>
                        <th className="text-center p-2 font-semibold text-gray-700 text-xs">Qty Before</th>
                        <th className="text-center p-2 font-semibold text-gray-700 text-xs">Qty After</th>
                        <th className="text-center p-2 font-semibold text-gray-700 text-xs">Unit Before</th>
                        <th className="text-center p-2 font-semibold text-gray-700 text-xs">Unit After</th>
                        <th className="text-right p-2 font-semibold text-gray-700 text-xs">Cost Impact</th>
                        <th className="text-center p-2 font-semibold text-gray-700 text-xs">In Current?</th>
                        <th className="text-center p-2 font-semibold text-gray-700 text-xs">In EAC?</th>
                        <th className="text-left p-2 font-semibold text-gray-700 text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {changeEvents.map((event) => (
                        <tr 
                          key={event.id} 
                          className="hover:bg-blue-50 cursor-pointer"
                          onClick={() => {
                            setSelectedChangeEvent(event)
                            setChangeCompareDrawerOpen(true)
                          }}
                        >
                          <td className="p-2 font-mono text-blue-600 text-xs">{event.id}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[9px]">{event.eventType}</Badge>
                          </td>
                          <td className="p-2">
                            <Badge className={`text-[9px] ${
                              event.lifecycleTransition === "within-ebom" ? "bg-blue-100 text-blue-700" :
                              event.lifecycleTransition === "ebom-to-mbom" ? "bg-purple-100 text-purple-700" :
                              event.lifecycleTransition === "mbom-to-current" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            }`}>
                              {event.lifecycleTransition === "within-ebom" ? "In eBOM" :
                               event.lifecycleTransition === "ebom-to-mbom" ? "eBOM→mBOM" :
                               event.lifecycleTransition === "mbom-to-current" ? "mBOM→Curr" : "Proposal"}
                            </Badge>
                          </td>
                          <td className="p-2 text-center text-gray-500 text-xs">{event.qtyBefore}</td>
                          <td className={`p-2 text-center text-xs ${event.qtyAfter !== event.qtyBefore ? "text-amber-600 font-medium" : "text-gray-700"}`}>
                            {event.qtyAfter}
                          </td>
                          <td className="p-2 text-center text-gray-500 text-xs">{formatCurrency(event.unitCostBefore || 0)}</td>
                          <td className={`p-2 text-center text-xs ${event.unitCostAfter !== event.unitCostBefore ? "text-amber-600 font-medium" : "text-gray-700"}`}>
                            {formatCurrency(event.unitCostAfter || 0)}
                          </td>
                          <td className={`p-2 text-right font-medium text-xs ${event.costImpact > 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(event.costImpact)}
                          </td>
                          <td className="p-2 text-center">
                            <Badge className={`text-[9px] ${event.includedInCurrent ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {event.includedInCurrent ? "Yes" : "No"}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            <Badge className={`text-[9px] ${
                              event.reflectedInEAC === "Yes" ? "bg-green-100 text-green-700" :
                              event.reflectedInEAC === "Partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                            }`}>
                              {event.reflectedInEAC}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Badge className={`text-[9px] ${
                              event.status === "Effective" ? "bg-green-100 text-green-700" :
                              event.status === "Approved" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                            }`}>{event.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* Change Event Structural Compare Drawer */}
            <Sheet open={changeCompareDrawerOpen} onOpenChange={setChangeCompareDrawerOpen}>
              <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
                {selectedChangeEvent && (
                  <>
                    <SheetHeader className="pb-4 border-b border-gray-200">
                      <SheetTitle className="text-lg font-bold text-gray-900">Change Event Structural Compare</SheetTitle>
                      <p className="text-sm text-gray-500 font-mono">{selectedChangeEvent.id}</p>
                    </SheetHeader>
                    
                    <div className="mt-4 space-y-4">
                      {/* Event Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Event Type</p>
                          <Badge className="text-xs mt-1">{selectedChangeEvent.eventType}</Badge>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Lifecycle Transition</p>
                          <Badge className={`text-xs mt-1 ${
                            selectedChangeEvent.lifecycleTransition === "within-ebom" ? "bg-blue-100 text-blue-700" :
                            selectedChangeEvent.lifecycleTransition === "ebom-to-mbom" ? "bg-purple-100 text-purple-700" :
                            selectedChangeEvent.lifecycleTransition === "mbom-to-current" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          }`}>
                            {selectedChangeEvent.lifecycleTransition === "within-ebom" ? "Within eBOM" :
                             selectedChangeEvent.lifecycleTransition === "ebom-to-mbom" ? "eBOM → mBOM" :
                             selectedChangeEvent.lifecycleTransition === "mbom-to-current" ? "mBOM → Current" : "From Proposal"}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Side-by-Side Compare */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Source State */}
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <p className="text-xs font-bold text-slate-600 mb-3">SOURCE STATE</p>
                          <Badge className="mb-3 bg-gray-100 text-gray-700">{selectedChangeEvent.sourceBOM}</Badge>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Quantity</span>
                              <span className="font-medium">{selectedChangeEvent.qtyBefore}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Unit Cost</span>
                              <span className="font-medium">{formatCurrency(selectedChangeEvent.unitCostBefore || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Supplier</span>
                              <span className="font-medium text-xs">{selectedChangeEvent.supplierBefore}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Target State */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs font-bold text-blue-600 mb-3">TARGET STATE</p>
                          <Badge className="mb-3 bg-blue-100 text-blue-700">{selectedChangeEvent.targetBOM}</Badge>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Quantity</span>
                              <span className={`font-medium ${selectedChangeEvent.qtyAfter !== selectedChangeEvent.qtyBefore ? "text-amber-600" : ""}`}>
                                {selectedChangeEvent.qtyAfter}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Unit Cost</span>
                              <span className={`font-medium ${selectedChangeEvent.unitCostAfter !== selectedChangeEvent.unitCostBefore ? "text-amber-600" : ""}`}>
                                {formatCurrency(selectedChangeEvent.unitCostAfter || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Supplier</span>
                              <span className={`font-medium text-xs ${selectedChangeEvent.supplierAfter !== selectedChangeEvent.supplierBefore ? "text-amber-600" : ""}`}>
                                {selectedChangeEvent.supplierAfter}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Change Summary */}
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs font-bold text-amber-700 mb-2">CHANGE SUMMARY</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-amber-800">Event Cost Impact</span>
                            <span className={`font-bold ${selectedChangeEvent.costImpact > 0 ? "text-red-600" : "text-green-600"}`}>
                              {formatCurrency(selectedChangeEvent.costImpact)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-amber-800">Included in Current Cost Roll-up?</span>
                            <Badge className={`text-[10px] ${selectedChangeEvent.includedInCurrent ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {selectedChangeEvent.includedInCurrent ? "Yes" : "No"}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-amber-800">Reflected in EAC Forecast?</span>
                            <Badge className={`text-[10px] ${
                              selectedChangeEvent.reflectedInEAC === "Yes" ? "bg-green-100 text-green-700" :
                              selectedChangeEvent.reflectedInEAC === "Partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                            }`}>
                              {selectedChangeEvent.reflectedInEAC}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs font-bold text-gray-600 mb-2">DESCRIPTION</p>
                        <p className="text-sm text-gray-700">{selectedChangeEvent.description}</p>
                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                          <span>Approved by: {selectedChangeEvent.approver}</span>
                          <span>Date: {selectedChangeEvent.date.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>
          </div>
        )}
        
        {/* TAB 5: EAC / Forecast Alignment */}
        {activeTab === "eac" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-6 gap-4">
              <KPICard title="Current Rolled-Up BOM Cost" value={formatCurrency(eacData.bomCost)} icon={DollarSign} />
              <KPICard title="Current EAC" value={formatCurrency(eacData.eac)} icon={Target} />
              <KPICard 
                title="BOM vs EAC Delta" 
                value={formatCurrency(eacData.bomCost - eacData.eac)} 
                delta={eacData.bomCost > eacData.eac ? "BOM exceeds EAC" : "EAC exceeds BOM"}
                trend={eacData.bomCost > eacData.eac ? "up" : "down"} 
                icon={TrendingUp}
                definitionKey="bom-eac-delta"
              />
              <KPICard title="CPI" value={eacData.cpi.toFixed(2)} delta={eacData.cpi >= 1 ? "On Track" : "At Risk"} trend={eacData.cpi >= 1 ? "down" : "up"} icon={TrendingUp} />
              <KPICard 
                title="Unincorporated Changes" 
                value={eacData.unincorporatedChanges.toString()} 
                icon={AlertTriangle}
                definitionKey="unincorporated-changes"
              />
              <KPICard 
                title="Forecast Credibility" 
                value={`${eacData.credibilityScore}%`} 
                delta={eacData.credibilityScore > 80 ? "Good" : "Review"} 
                trend={eacData.credibilityScore > 80 ? "down" : "up"} 
                icon={CheckCircle}
                definitionKey="forecast-credibility"
              />
            </div>
            
            {/* Main Charts */}
            <div className="grid grid-cols-2 gap-6">
              {/* BOM Cost vs EAC Trend */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">BOM Cost vs EAC Trend</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={costTrendData} margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Area type="monotone" dataKey="current" name="BOM Cost" fill={COLORS.primary} fillOpacity={0.2} stroke={COLORS.primary} strokeWidth={2} />
                        <Line type="monotone" dataKey="eac" name="EAC" stroke={COLORS.warning} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Incorporation Funnel */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Cost Change Incorporation Funnel</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {[
                      { label: "Identified BOM Cost Changes", value: 24, pct: 100, color: "bg-blue-500" },
                      { label: "Validated Changes", value: 20, pct: 83, color: "bg-blue-400" },
                      { label: "Approved Changes", value: 17, pct: 71, color: "bg-green-500" },
                      { label: "Incorporated into EAC", value: 14, pct: 58, color: "bg-green-600" },
                      { label: "Remaining Gap", value: 10, pct: 42, color: "bg-amber-500" }
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-48 text-sm text-gray-700">{step.label}</div>
                        <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                          <div className={`h-full ${step.color} transition-all`} style={{ width: `${step.pct}%` }} />
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-800">
                            {step.value} ({step.pct}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Unaligned Changes Table */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Unaligned Cost Changes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 font-semibold text-gray-700">Change Event / Node</th>
                        <th className="text-right p-3 font-semibold text-gray-700">BOM Cost Impact</th>
                        <th className="text-center p-3 font-semibold text-gray-700">Reflected in EAC?</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Financial Owner</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Forecast Cycle</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Credibility Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {changeEvents.filter(e => e.status !== "Effective").slice(0, 10).map((event) => (
                        <tr key={event.id} className="hover:bg-blue-50">
                          <td className="p-3 font-medium text-gray-900">{event.description.slice(0, 30)}...</td>
                          <td className={`p-3 text-right font-medium ${event.costImpact > 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(event.costImpact)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={`text-[10px] ${Math.random() > 0.5 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {Math.random() > 0.5 ? "Yes" : "No"}
                            </Badge>
                          </td>
                          <td className="p-3 text-gray-600">{event.approver}</td>
                          <td className="p-3 text-gray-600">Q1 2025</td>
                          <td className="p-3"><Badge variant="outline" className="text-[10px]">{event.status}</Badge></td>
                          <td className="p-3">
                            <Badge className={`text-[10px] ${Math.abs(event.costImpact) > 200000 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {Math.abs(event.costImpact) > 200000 ? "High" : "Medium"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* Forecast Credibility Scorecard */}
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader className="py-3 px-4 border-b border-blue-200">
                <CardTitle className="text-sm font-bold text-gray-800">Forecast Credibility Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{eacData.credibilityScore}%</div>
                    <p className="text-sm text-gray-600 mt-1">BOM changes reflected in EAC</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-600">12 days</div>
                    <p className="text-sm text-gray-600 mt-1">Avg lag: BOM change to forecast</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{eacData.unincorporatedChanges}</div>
                    <p className="text-sm text-gray-600 mt-1">Open cost-impacting changes</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{eacData.highRiskChanges}</div>
                    <p className="text-sm text-gray-600 mt-1">High-risk unincorporated drivers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          {selectedNode && (
            <>
              <SheetHeader className="pb-4 border-b border-gray-200">
                <SheetTitle className="text-lg font-bold text-gray-900">{selectedNode.name}</SheetTitle>
                <p className="text-sm text-gray-500 font-mono">{selectedNode.partNumber}</p>
              </SheetHeader>
              
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="cost" className="text-xs">Cost</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                  <TabsTrigger value="supplier" className="text-xs">Supplier</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Level</p>
                      <p className="font-medium capitalize">{selectedNode.level}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">BOM Source</p>
                      <Badge className="text-xs bg-blue-100 text-blue-700">{selectedNode.bomSource}</Badge>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Revision</p>
                      <p className="font-medium">{selectedNode.revision}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Make/Buy</p>
                      <Badge variant="outline" className="text-xs">{selectedNode.makeOrBuy}</Badge>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="font-medium">{selectedNode.quantity}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Last Changed</p>
                      <p className="font-medium">{selectedNode.lastChangedDate.toLocaleDateString()}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="cost" className="mt-4 space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Current Cost</span>
                      <span className="text-xl font-bold text-gray-900">{formatCurrency(selectedNode.rolledUpCost)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Baseline Cost</span>
                      <span className="text-lg text-gray-500">{formatCurrency(selectedNode.rolledUpCostBaseline)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                      <span className="text-sm text-gray-600">Delta</span>
                      <span className={`text-lg font-bold ${selectedNode.rolledUpCost - selectedNode.rolledUpCostBaseline > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(selectedNode.rolledUpCost - selectedNode.rolledUpCostBaseline)}
                      </span>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="history" className="mt-4">
                  <div className="space-y-3">
                    {changeEvents.slice(0, 5).map(event => (
                      <div key={event.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="text-[10px]">{event.eventType}</Badge>
                          <span className="text-xs text-gray-500">{event.date.toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{event.description}</p>
                        <p className={`text-sm font-medium mt-1 ${event.costImpact > 0 ? "text-red-600" : "text-green-600"}`}>
                          {formatCurrency(event.costImpact)}
                        </p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="supplier" className="mt-4 space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Current Supplier</p>
                    <p className="font-medium text-gray-900">{selectedNode.supplier}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Commodity</p>
                    <p className="font-medium text-gray-900">{selectedNode.commodity}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Treemap, Cell, ComposedChart, Area, ReferenceLine } from "recharts"
import { ChevronRight, ChevronDown, Filter, Download, Share2, RefreshCw, AlertTriangle, CheckCircle, Clock, ArrowUpRight, ArrowDownRight, Minus, FileText, GitBranch, DollarSign, TrendingUp, Layers, History, Target } from "lucide-react"

// ===== TYPES =====
type BOMType = "Proposal" | "eBOM" | "mBOM" | "Current"
type CompareMode = "baseline" | "prior-revision" | "prior-period" | "eac"
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
  eventType: "ECO" | "Substitution" | "Price Update" | "Quantity Change" | "Sourcing Change" | "Release"
  date: Date
  sourceBOM: BOMType
  targetBOM: BOMType
  affectedNodes: string[]
  costImpact: number
  description: string
  approver: string
  status: "Approved" | "Pending" | "Effective"
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

// ===== SEEDED RANDOM =====
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

// ===== DATA GENERATION =====
function generateBOMHierarchy(program: string): BOMNode[] {
  const seed = program.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const nodes: BOMNode[] = []
  
  // Program level
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
    rolledUpCost: 45000000 + seededRandom(seed) * 15000000,
    rolledUpCostBaseline: 42000000 + seededRandom(seed + 1) * 12000000,
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
  
  // Assemblies
  assemblies.forEach((asm, i) => {
    const asmSeed = seed + i * 100
    const baselineCost = 3000000 + seededRandom(asmSeed) * 4000000
    const currentCost = baselineCost * (0.9 + seededRandom(asmSeed + 1) * 0.25)
    const changeTypes: BOMNode["changeType"][] = ["none", "quantity", "substitution", "supplier", "price"]
    
    const asmNode: BOMNode = {
      id: `asm-${i}`,
      name: asm,
      partNumber: `ASM-${1000 + i}`,
      level: "assembly",
      parentId: "prog-1",
      quantity: 1 + Math.floor(seededRandom(asmSeed + 2) * 3),
      quantityBaseline: 1 + Math.floor(seededRandom(asmSeed + 3) * 3),
      unitCost: currentCost,
      unitCostBaseline: baselineCost,
      extendedCost: currentCost,
      extendedCostBaseline: baselineCost,
      rolledUpCost: currentCost,
      rolledUpCostBaseline: baselineCost,
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
  const eventTypes: ChangeEvent["eventType"][] = ["ECO", "Substitution", "Price Update", "Quantity Change", "Sourcing Change", "Release"]
  const bomTypes: BOMType[] = ["Proposal", "eBOM", "mBOM", "Current"]
  
  for (let i = 0; i < 20; i++) {
    const eSeed = seed + i * 77
    const sourceBOM = bomTypes[Math.floor(seededRandom(eSeed) * 3)]
    const targetIdx = Math.min(bomTypes.indexOf(sourceBOM) + 1, 3)
    
    events.push({
      id: `evt-${i}`,
      eventType: eventTypes[Math.floor(seededRandom(eSeed + 1) * eventTypes.length)],
      date: new Date(Date.now() - (180 - i * 8) * 24 * 60 * 60 * 1000),
      sourceBOM,
      targetBOM: bomTypes[targetIdx],
      affectedNodes: Array.from({ length: 1 + Math.floor(seededRandom(eSeed + 2) * 5) }, (_, j) => `asm-${j}`),
      costImpact: (seededRandom(eSeed + 3) - 0.4) * 500000,
      description: [
        "Engineering redesign for weight reduction",
        "Supplier price renegotiation",
        "Quantity adjustment per customer change",
        "Alternate source qualification",
        "Manufacturing process improvement",
        "Scrap rate update based on actuals",
        "Material substitution for availability",
        "Routing optimization"
      ][Math.floor(seededRandom(eSeed + 4) * 8)],
      approver: ["J. Smith", "M. Johnson", "R. Williams", "S. Davis"][Math.floor(seededRandom(eSeed + 5) * 4)],
      status: ["Approved", "Pending", "Effective"][Math.floor(seededRandom(eSeed + 6) * 3)] as ChangeEvent["status"]
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

// KPI Card
function KPICard({ title, value, delta, deltaLabel, icon: Icon, trend }: {
  title: string
  value: string
  delta?: string
  deltaLabel?: string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
}) {
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
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
  
  // Data generation
  const bomNodes = useMemo(() => generateBOMHierarchy(selectedProgram), [selectedProgram])
  const changeEvents = useMemo(() => generateChangeEvents(selectedProgram), [selectedProgram])
  const costDrivers = useMemo(() => generateCostDrivers(selectedProgram), [selectedProgram])
  
  // Computed data
  const programNode = bomNodes.find(n => n.level === "program")!
  const assemblyNodes = bomNodes.filter(n => n.level === "assembly")
  
  const totalCost = programNode.rolledUpCost
  const baselineCost = programNode.rolledUpCostBaseline
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
  
  // Cost trend data
  const costTrendData = useMemo(() => {
    const seed = selectedProgram.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return Array.from({ length: 12 }, (_, i) => {
      const month = new Date(Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000)
      const baseValue = baselineCost * (1 + i * 0.005)
      return {
        month: month.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        baseline: baselineCost,
        current: baseValue + seededRandom(seed + i) * 2000000,
        material: baseValue * 0.6 + seededRandom(seed + i + 10) * 500000,
        labor: baseValue * 0.25 + seededRandom(seed + i + 20) * 200000,
        eac: baseValue * 1.02 + seededRandom(seed + i + 30) * 1000000
      }
    })
  }, [selectedProgram, baselineCost])
  
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
              <h1 className="text-2xl font-bold text-gray-900">Costed BOM Cockpit</h1>
              <p className="text-sm text-gray-500">Integrated BOM lifecycle with cost traceability and EAC alignment</p>
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
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Proposal", "eBOM", "mBOM", "Current"] as BOMType[]).map(t => <SelectItem key={t} value={t}>{t} BOM</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={compareMode} onValueChange={(v) => setCompareMode(v as CompareMode)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baseline">vs Proposal Baseline</SelectItem>
                <SelectItem value="prior-revision">vs Prior Revision</SelectItem>
                <SelectItem value="prior-period">vs Prior Period</SelectItem>
                <SelectItem value="eac">vs EAC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-6 border-t border-gray-100">
          <div className="flex gap-1">
            {[
              { id: "overview", label: "Program Cost Overview", icon: TrendingUp },
              { id: "explorer", label: "Costed BOM Explorer", icon: Layers },
              { id: "variance", label: "Cost Variance & Drivers", icon: GitBranch },
              { id: "traceability", label: "Change Traceability", icon: History },
              { id: "eac", label: "EAC / EV Alignment", icon: Target }
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
            {/* KPI Cards */}
            <div className="grid grid-cols-5 gap-4">
              <KPICard title="Current Rolled-Up Cost" value={formatCurrency(totalCost)} icon={DollarSign} />
              <KPICard title="Variance vs Baseline" value={formatCurrency(totalDelta)} delta={formatPercent(totalDeltaPercent)} trend={totalDelta > 0 ? "up" : "down"} icon={TrendingUp} />
              <KPICard title="Material Cost Change" value={formatPercent(totalDeltaPercent * 0.7)} trend={totalDeltaPercent > 0 ? "up" : "down"} icon={Layers} />
              <KPICard title="Open ECOs w/ Impact" value={changeEvents.filter(e => e.status !== "Effective").length.toString()} icon={FileText} />
              <KPICard title="Forecast Credibility" value={`${eacData.credibilityScore}%`} delta={eacData.credibilityScore > 80 ? "Good" : "At Risk"} trend={eacData.credibilityScore > 80 ? "down" : "up"} icon={Target} />
            </div>
            
            {/* Main Visuals Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Cost Roll-Up Waterfall - Custom SVG implementation */}
              <Card className="border border-gray-200">
                <CardHeader className="py-3 px-4 border-b border-gray-100">
                  <CardTitle className="text-sm font-bold text-gray-800">Program Cost Roll-Up (Waterfall)</CardTitle>
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
                  <CardTitle className="text-sm font-bold text-gray-800">Cost Trend Over Time</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={costTrendData} margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
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
          <div className="grid grid-cols-3 gap-6">
            {/* BOM Tree */}
            <Card className="col-span-2 border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-gray-800">BOM Hierarchy</CardTitle>
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
            
            {/* Selected Node Summary */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">
                  {selectedNode ? selectedNode.name : "Select a Node"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {selectedNode ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Part Number</p>
                        <p className="font-mono font-medium">{selectedNode.partNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Level</p>
                        <p className="capitalize">{selectedNode.level}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Current Cost</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(selectedNode.rolledUpCost)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Baseline Cost</p>
                        <p className="text-gray-600">{formatCurrency(selectedNode.rolledUpCostBaseline)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Delta</p>
                        <p className={`font-medium ${selectedNode.rolledUpCost - selectedNode.rolledUpCostBaseline > 0 ? "text-red-600" : "text-green-600"}`}>
                          {formatCurrency(selectedNode.rolledUpCost - selectedNode.rolledUpCostBaseline)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Delta %</p>
                        <p className={`font-medium ${selectedNode.rolledUpCost - selectedNode.rolledUpCostBaseline > 0 ? "text-red-600" : "text-green-600"}`}>
                          {formatPercent(((selectedNode.rolledUpCost - selectedNode.rolledUpCostBaseline) / selectedNode.rolledUpCostBaseline) * 100)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p>{selectedNode.quantity} {selectedNode.quantity !== selectedNode.quantityBaseline && <span className="text-orange-600">(was {selectedNode.quantityBaseline})</span>}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Make/Buy</p>
                        <Badge variant="outline" className="text-[10px]">{selectedNode.makeOrBuy}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Supplier</p>
                        <p>{selectedNode.supplier}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Commodity</p>
                        <p>{selectedNode.commodity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">BOM Source</p>
                        <Badge className="text-[10px] bg-blue-100 text-blue-700">{selectedNode.bomSource}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Last Changed</p>
                        <p>{selectedNode.lastChangedDate.toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    {/* Mini cost composition chart */}
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Cost Composition</p>
                      <div className="space-y-2">
                        {[
                          { label: "Material", pct: 60, color: "bg-blue-500" },
                          { label: "Labor/Routing", pct: 25, color: "bg-purple-500" },
                          { label: "Overhead", pct: 10, color: "bg-gray-400" },
                          { label: "Other", pct: 5, color: "bg-gray-300" }
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-20">{item.label}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 w-8">{item.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Click a node in the BOM tree to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
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
        
        {/* TAB 4: Change Traceability */}
        {activeTab === "traceability" && (
          <div className="space-y-6">
            {/* Timeline */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">BOM Change Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative">
                  <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200" />
                  <div className="flex justify-between relative">
                    {changeEvents.slice(0, 8).map((event, i) => (
                      <div key={event.id} className="flex flex-col items-center" style={{ width: "12%" }}>
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
            
            {/* Change Events Table */}
            <Card className="border border-gray-200">
              <CardHeader className="py-3 px-4 border-b border-gray-100">
                <CardTitle className="text-sm font-bold text-gray-800">Change Event History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 font-semibold text-gray-700">Event ID</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Type</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Date</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Source</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Target</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Affected</th>
                        <th className="text-right p-3 font-semibold text-gray-700">Cost Impact</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Description</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Approver</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {changeEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-blue-50 cursor-pointer">
                          <td className="p-3 font-mono text-blue-600">{event.id.toUpperCase()}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px]">{event.eventType}</Badge>
                          </td>
                          <td className="p-3 text-gray-600">{event.date.toLocaleDateString()}</td>
                          <td className="p-3"><Badge className="text-[10px] bg-gray-100 text-gray-700">{event.sourceBOM}</Badge></td>
                          <td className="p-3"><Badge className="text-[10px] bg-blue-100 text-blue-700">{event.targetBOM}</Badge></td>
                          <td className="p-3 text-gray-600">{event.affectedNodes.length} nodes</td>
                          <td className={`p-3 text-right font-medium ${event.costImpact > 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(event.costImpact)}
                          </td>
                          <td className="p-3 text-gray-600 text-xs max-w-[200px] truncate">{event.description}</td>
                          <td className="p-3">
                            <Badge className={`text-[10px] ${
                              event.status === "Effective" ? "bg-green-100 text-green-700" :
                              event.status === "Approved" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                            }`}>{event.status}</Badge>
                          </td>
                          <td className="p-3 text-gray-600">{event.approver}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* TAB 5: EAC / EV Alignment */}
        {activeTab === "eac" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-6 gap-4">
              <KPICard title="BOM Rolled-Up Cost" value={formatCurrency(eacData.bomCost)} icon={DollarSign} />
              <KPICard title="Current EAC" value={formatCurrency(eacData.eac)} icon={Target} />
              <KPICard title="BOM vs EAC Delta" value={formatCurrency(eacData.bomCost - eacData.eac)} trend={eacData.bomCost > eacData.eac ? "up" : "down"} icon={TrendingUp} />
              <KPICard title="CPI" value={eacData.cpi.toFixed(2)} delta={eacData.cpi >= 1 ? "On Track" : "At Risk"} trend={eacData.cpi >= 1 ? "down" : "up"} icon={TrendingUp} />
              <KPICard title="Unincorporated Changes" value={eacData.unincorporatedChanges.toString()} icon={AlertTriangle} />
              <KPICard title="Forecast Credibility" value={`${eacData.credibilityScore}%`} delta={eacData.credibilityScore > 80 ? "Good" : "Review"} trend={eacData.credibilityScore > 80 ? "down" : "up"} icon={CheckCircle} />
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

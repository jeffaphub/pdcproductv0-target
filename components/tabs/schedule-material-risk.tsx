"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react"
import { mockProgramData, type Operation, type MaterialShortage } from "@/lib/mock-data"
import { format, addMonths, eachMonthOfInterval, differenceInDays } from "date-fns"

export function ScheduleMaterialRisk() {
  const programs = mockProgramData
  const [selectedProgram, setSelectedProgram] = useState<string>("all")
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["PROG-001"]))
  const [hoveredOperation, setHoveredOperation] = useState<string | null>(null)
  const [selectedShortage, setSelectedShortage] = useState<{
    operation: Operation
    shortage: MaterialShortage
    x: number
    y: number
  } | null>(null)

  // Calculate timeline range
  const today = new Date()
  const timelineStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const timelineEnd = addMonths(timelineStart, 8)
  const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd })

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  // Calculate position on timeline
  const getTimelinePosition = (date: Date) => {
    const totalDays = differenceInDays(timelineEnd, timelineStart)
    const daysFromStart = differenceInDays(date, timelineStart)
    return (daysFromStart / totalDays) * 100
  }

  const getOperationWidth = (startDate: Date, endDate: Date) => {
    const totalDays = differenceInDays(timelineEnd, timelineStart)
    const opDays = differenceInDays(endDate, startDate)
    return (opDays / totalDays) * 100
  }

  // Count stats
  const allOperations = programs.flatMap((p) => p.subassemblies.flatMap((s) => s.operations))
  const atRiskCount = allOperations.filter((op) => op.status === "At Risk" || op.status === "Delayed").length
  const lateSupplyCount = allOperations.filter((op) => op.materialShortages.length > 0).length
  const criticalPathCount = allOperations.filter((op) => op.isCriticalPath).length

  const getStatusColor = (status: string) => {
    switch (status) {
      case "On Track":
        return "bg-blue-500"
      case "At Risk":
        return "bg-yellow-500"
      case "Delayed":
        return "bg-orange-500"
      case "Blocked":
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 bg-gray-700 p-4 rounded-lg">
        <Select value={selectedProgram} onValueChange={setSelectedProgram}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.programId} value={p.programId}>
                {p.programName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {Array.from(new Set(programs.map((p) => p.supplier))).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="On Track">On Track</SelectItem>
            <SelectItem value="At Risk">At Risk</SelectItem>
            <SelectItem value="Delayed">Delayed</SelectItem>
            <SelectItem value="Blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gantt Chart Container */}
      <Card>
        <CardContent className="p-0">
          <div className="flex">
            {/* Left: Tree Structure */}
            <div className="w-80 border-r bg-gray-50 overflow-y-auto" style={{ maxHeight: "600px" }}>
              <div className="sticky top-0 bg-gray-100 border-b p-3 font-semibold text-sm">Program / Assembly</div>
              <div className="divide-y">
                {programs.map((program) => (
                  <div key={program.programId}>
                    {/* Program Level */}
                    <div
                      className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => toggleExpand(program.programId)}
                    >
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mr-1">
                        {expandedItems.has(program.programId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                      <span className="font-semibold text-sm">{program.programName}</span>
                    </div>

                    {/* Subassemblies */}
                    {expandedItems.has(program.programId) &&
                      program.subassemblies.map((subassembly) => (
                        <div key={subassembly.subassemblyId}>
                          <div
                            className="flex items-center p-2 pl-8 hover:bg-gray-100 cursor-pointer"
                            onClick={() => toggleExpand(subassembly.subassemblyId)}
                          >
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mr-1">
                              {expandedItems.has(subassembly.subassemblyId) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <span className="text-sm">S {subassembly.subassemblyName}</span>
                          </div>

                          {/* Operations */}
                          {expandedItems.has(subassembly.subassemblyId) &&
                            subassembly.operations.map((operation) => (
                              <div
                                key={operation.operationId}
                                className="flex items-center p-2 pl-14 hover:bg-gray-100 cursor-pointer text-sm"
                                onMouseEnter={() => setHoveredOperation(operation.operationId)}
                                onMouseLeave={() => setHoveredOperation(null)}
                              >
                                <span className="w-4 mr-1">
                                  {operation.isCriticalPath && (
                                    <div className="w-2 h-2 bg-blue-600 rounded-full" title="Critical Path" />
                                  )}
                                </span>
                                <span className="text-xs">{operation.operationName}</span>
                              </div>
                            ))}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Timeline */}
            <div className="flex-1 overflow-x-auto relative">
              {/* Timeline Header */}
              <div className="sticky top-0 bg-white border-b z-10">
                <div className="flex h-12 border-b">
                  {months.map((month, idx) => (
                    <div key={idx} className="flex-1 text-center border-r p-2 text-xs font-semibold">
                      {format(month, "MMM yyyy")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Bars */}
              <div className="relative" style={{ minHeight: "600px", minWidth: "800px" }}>
                {/* Vertical grid lines */}
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 border-l border-gray-200"
                    style={{ left: `${(idx / months.length) * 100}%` }}
                  />
                ))}

                {/* Operation Bars */}
                {programs.map((program, programIdx) => {
                  let rowIndex = 0
                  return (
                    <div key={program.programId}>
                      {/* Program row (spacer) */}
                      <div style={{ height: "40px" }} />
                      {rowIndex++}

                      {expandedItems.has(program.programId) &&
                        program.subassemblies.map((subassembly) => {
                          return (
                            <div key={subassembly.subassemblyId}>
                              {/* Subassembly row (spacer) */}
                              <div style={{ height: "40px" }} />
                              {rowIndex++}

                              {expandedItems.has(subassembly.subassemblyId) &&
                                subassembly.operations.map((operation) => {
                                  const startPos = getTimelinePosition(operation.startDate)
                                  const width = getOperationWidth(operation.startDate, operation.endDate)
                                  const top = rowIndex * 40 + 8

                                  return (
                                    <div key={operation.operationId}>
                                      <div
                                        className={`absolute rounded-md h-6 ${getStatusColor(operation.status)} ${
                                          hoveredOperation === operation.operationId
                                            ? "opacity-90 ring-2 ring-blue-600"
                                            : "opacity-75"
                                        } ${operation.isCriticalPath ? "ring-2 ring-blue-600" : ""}`}
                                        style={{
                                          left: `${startPos}%`,
                                          width: `${width}%`,
                                          top: `${top}px`,
                                        }}
                                        onMouseEnter={() => setHoveredOperation(operation.operationId)}
                                        onMouseLeave={() => setHoveredOperation(null)}
                                      >
                                        {/* Material Risk Indicator */}
                                        {operation.materialShortages.length > 0 && (
                                          <div
                                            className="absolute -right-1 -top-1 cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setSelectedShortage({
                                                operation,
                                                shortage: operation.materialShortages[0],
                                                x: e.clientX,
                                                y: e.clientY,
                                              })
                                            }}
                                          >
                                            <div className="bg-red-600 rounded-full p-1">
                                              <AlertTriangle className="h-3 w-3 text-white" />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ height: "40px" }} />
                                      {rowIndex++}
                                    </div>
                                  )
                                })}
                            </div>
                          )
                        })}
                    </div>
                  )
                })}

                {/* Today Line */}
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-red-500 z-20"
                  style={{ left: `${getTimelinePosition(today)}%` }}
                >
                  <div className="absolute -top-6 -left-8 bg-red-500 text-white text-xs px-2 py-1 rounded">Today</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-12">
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{atRiskCount}</div>
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span>At risk</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{lateSupplyCount}</div>
              <div className="text-sm text-gray-600">Late du supply</div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">Critical path</div>
              <div className="text-3xl font-bold text-blue-600">{criticalPathCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shortage Popup */}
      {selectedShortage && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSelectedShortage(null)} />
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border-2 border-gray-200 p-4 w-80"
            style={{
              left: `${selectedShortage.x - 160}px`,
              top: `${selectedShortage.y - 100}px`,
            }}
          >
            <div className="space-y-2">
              <div className="font-semibold text-sm border-b pb-2">
                {selectedShortage.shortage.partNumber} {selectedShortage.operation.operationName}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-600">Shortage</div>
                  <div className="font-semibold">{selectedShortage.shortage.shortageQty} part</div>
                </div>
                <div>
                  <div className="text-gray-600">Required by</div>
                  <div className="font-semibold">{format(selectedShortage.shortage.requiredBy, "MM/dd/yyyy")}</div>
                </div>
                <div>
                  <div className="text-gray-600">Days to start</div>
                  <div className="font-semibold">{selectedShortage.shortage.impactDays} days</div>
                </div>
                <div>
                  <div className="text-gray-600">Supplier</div>
                  <div className="font-semibold">{selectedShortage.shortage.supplier}</div>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-gray-600">Root cause</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="text-xs bg-red-100 text-red-800">{selectedShortage.shortage.rootCause}</Badge>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { LaborProcess } from "@/lib/mock-data"
import type { Component } from "@/lib/mock-data"

type LaborAllocationTableProps = {
  processes: LaborProcess[]
  allComponents: Component[]
  efficiencyPercent: number
  indirectPercent: number
}

export function LaborAllocationTable({
  processes,
  allComponents,
  efficiencyPercent,
  indirectPercent,
}: LaborAllocationTableProps) {
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set())
  const [editedValues, setEditedValues] = useState<Record<string, Partial<LaborProcess>>>({})

  const toggleExpand = (processId: string) => {
    const newExpanded = new Set(expandedProcesses)
    if (newExpanded.has(processId)) {
      newExpanded.delete(processId)
    } else {
      newExpanded.add(processId)
    }
    setExpandedProcesses(newExpanded)
  }

  const handleValueChange = (processId: string, field: keyof LaborProcess, value: number) => {
    setEditedValues((prev) => ({
      ...prev,
      [processId]: {
        ...prev[processId],
        [field]: value,
      },
    }))
  }

  const getProcessValue = (process: LaborProcess, field: keyof LaborProcess): number => {
    const edited = editedValues[process.processId]
    if (edited && edited[field] !== undefined) {
      return edited[field] as number
    }
    return process[field] as number
  }

  const calculateCostPerUnit = (process: LaborProcess): number => {
    const targetTime = getProcessValue(process, "targetTimePerUnitSecs")
    const laborRate = getProcessValue(process, "laborRate")
    const headCount = getProcessValue(process, "headCountRequired")

    // Base direct labor cost
    const directLaborCost = (laborRate / 3600) * targetTime * headCount

    // Apply efficiency multiplier (if efficiency is 95%, actual time is higher, so cost increases)
    const efficiencyMultiplier = efficiencyPercent > 0 ? 100 / efficiencyPercent : 1
    const adjustedDirectCost = directLaborCost * efficiencyMultiplier

    // Add indirect labor only
    const indirectCost = adjustedDirectCost * (indirectPercent / 100)

    return adjustedDirectCost + indirectCost
  }

  const totalDirectLaborCost = processes.reduce((sum, process) => {
    const targetTime = getProcessValue(process, "targetTimePerUnitSecs")
    const laborRate = getProcessValue(process, "laborRate")
    const headCount = getProcessValue(process, "headCountRequired")
    const directLaborCost = (laborRate / 3600) * targetTime * headCount
    const efficiencyMultiplier = efficiencyPercent > 0 ? 100 / efficiencyPercent : 1
    return sum + directLaborCost * efficiencyMultiplier
  }, 0)

  const totalIndirectLaborCost = totalDirectLaborCost * (indirectPercent / 100)
  const totalLaborCost = totalDirectLaborCost + totalIndirectLaborCost

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-blue-50">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">Total Labor Cost</p>
            <p className="text-2xl font-bold text-gray-900">
              $
              {totalLaborCost.toLocaleString("en-US", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Total Direct Labor</p>
            <p className="text-2xl font-bold text-gray-900">
              $
              {totalDirectLaborCost.toLocaleString("en-US", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Indirect Labor</p>
            <p className="text-2xl font-bold text-gray-900">
              $
              {totalIndirectLaborCost.toLocaleString("en-US", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Sequence</TableHead>
              <TableHead>Process Name</TableHead>
              <TableHead>Workstation</TableHead>
              <TableHead>Plant</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Target Time/Unit (sec)</TableHead>
              <TableHead>Labor Rate ($/hr)</TableHead>
              <TableHead>Head Count</TableHead>
              <TableHead>Cost/Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processes.map((process) => (
              <>
                <TableRow key={process.processId} className="hover:bg-gray-50">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(process.processId)}
                      className="p-0 h-6 w-6"
                    >
                      {expandedProcesses.has(process.processId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{process.sequenceOrder}</TableCell>
                  <TableCell className="font-semibold">{process.processName}</TableCell>
                  <TableCell>{process.workstationId}</TableCell>
                  <TableCell>{process.plant}</TableCell>
                  <TableCell>{process.plantLocation}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={getProcessValue(process, "targetTimePerUnitSecs")}
                      onChange={(e) =>
                        handleValueChange(process.processId, "targetTimePerUnitSecs", Number.parseFloat(e.target.value))
                      }
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={getProcessValue(process, "laborRate").toFixed(1)}
                      onChange={(e) =>
                        handleValueChange(process.processId, "laborRate", Number.parseFloat(e.target.value))
                      }
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={getProcessValue(process, "headCountRequired")}
                      onChange={(e) =>
                        handleValueChange(process.processId, "headCountRequired", Number.parseInt(e.target.value))
                      }
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell className="font-bold">${calculateCostPerUnit(process).toFixed(1)}</TableCell>
                </TableRow>
                {expandedProcesses.has(process.processId) && (
                  <TableRow>
                    <TableCell colSpan={10} className="bg-gray-50 p-4">
                      <div className="space-y-2">
                        <p className="font-semibold text-sm text-gray-700">
                          BOM Parts Required ({process.bomPartsRequired.length} parts):
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {process.bomPartsRequired.map((partNumber) => {
                            const component = allComponents.find((c) => c.partNumber === partNumber)
                            return (
                              <div key={partNumber} className="text-xs bg-white p-2 rounded border">
                                <p className="font-semibold">{partNumber}</p>
                                {component && <p className="text-gray-600">{component.description}</p>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

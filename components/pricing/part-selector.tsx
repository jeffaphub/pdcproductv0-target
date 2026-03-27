"use client"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Component } from "@/lib/mock-data"
import type { QuantityTier } from "@/components/tabs/pricing-optimization"
import { Plus, X } from "lucide-react"

type PartSelectorProps = {
  components: Component[]
  selectedPart: Component
  onSelectPart: (part: Component) => void
  quantityTiers: QuantityTier[]
  onUpdateTiers: (tiers: QuantityTier[]) => void
  carryingCostPct: number
  onUpdateCarryingCost: (pct: number) => void
  obsolescenceRiskPct: number
  onUpdateObsolescenceRisk: (pct: number) => void
}

export function PartSelector({
  components,
  selectedPart,
  onSelectPart,
  quantityTiers,
  onUpdateTiers,
  carryingCostPct,
  onUpdateCarryingCost,
  obsolescenceRiskPct,
  onUpdateObsolescenceRisk,
}: PartSelectorProps) {
  const addTier = () => {
    const lastTier = quantityTiers[quantityTiers.length - 1]
    onUpdateTiers([...quantityTiers, { quantity: lastTier.quantity * 2, unitPrice: lastTier.unitPrice * 0.95 }])
  }

  const removeTier = (index: number) => {
    if (quantityTiers.length > 2) {
      onUpdateTiers(quantityTiers.filter((_, i) => i !== index))
    }
  }

  const updateTierPrice = (index: number, price: string) => {
    const newTiers = [...quantityTiers]
    newTiers[index].unitPrice = Number.parseFloat(price) || 0
    onUpdateTiers(newTiers)
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Part Selection & Quantity Scenarios</h3>
      <div className="grid grid-cols-5 gap-6">
        {/* Left: Part Selection */}
        <div className="col-span-2 space-y-4">
          <div>
            <Label htmlFor="part-select">Select Component</Label>
            <Select
              value={selectedPart.partNumber}
              onValueChange={(value) => {
                const part = components.find((c) => c.partNumber === value)
                if (part) onSelectPart(part)
              }}
            >
              <SelectTrigger id="part-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {components.slice(0, 50).map((component) => (
                  <SelectItem key={component.partNumber} value={component.partNumber}>
                    {component.partNumber} - {component.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Description:</span>
              <span className="text-sm font-medium">{selectedPart.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Commodity:</span>
              <span className="text-sm font-medium">{selectedPart.commodity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Supplier:</span>
              <span className="text-sm font-medium">{selectedPart.supplier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current Standard Cost:</span>
              <span className="text-sm font-medium font-mono">${selectedPart.standardCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Typical Lead Time:</span>
              <span className="text-sm font-medium">45 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Annual Demand Forecast:</span>
              <span className="text-sm font-medium">2,400 units</span>
            </div>
          </div>
        </div>

        {/* Right: Quantity Tiers */}
        <div className="col-span-3 space-y-4">
          <Label>Quantity Tiers & Supplier Pricing</Label>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-2 font-medium text-gray-700">Quantity</th>
                  <th className="text-left p-2 font-medium text-gray-700">Unit Price</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {quantityTiers.map((tier, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="p-2 font-mono">{tier.quantity}</td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={tier.unitPrice}
                        onChange={(e) => updateTierPrice(index, e.target.value)}
                        className="w-32"
                        step="0.01"
                      />
                    </td>
                    <td className="p-2">
                      {quantityTiers.length > 2 && (
                        <Button variant="ghost" size="sm" onClick={() => removeTier(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" size="sm" onClick={addTier}>
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Tier
          </Button>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <Label htmlFor="carrying-cost">Carrying Cost %</Label>
              <Input
                id="carrying-cost"
                type="number"
                value={carryingCostPct}
                onChange={(e) => onUpdateCarryingCost(Number.parseFloat(e.target.value) || 0)}
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">Annual cost to hold inventory as % of inventory value</p>
            </div>
            <div>
              <Label htmlFor="obsolescence-risk">Obsolescence Risk %</Label>
              <Input
                id="obsolescence-risk"
                type="number"
                value={obsolescenceRiskPct}
                onChange={(e) => onUpdateObsolescenceRisk(Number.parseFloat(e.target.value) || 0)}
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">Risk of component becoming unsaleable before use</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

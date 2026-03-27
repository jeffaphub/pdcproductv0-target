import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { mockComponents } from "@/lib/mock-data"

export function QuotedVsActualVariance() {
  // Generate quoted vs actual data
  const varianceData = mockComponents
    .slice(0, 15)
    .map((c) => {
      const quotedCost = c.standardCost * (Math.random() * 0.3 + 0.9) // 90%-120% of standard
      const actualCost = c.avgRecentPOCost
      const variancePct = ((actualCost - quotedCost) / quotedCost) * 100
      const varianceStatus =
        quotedCost > actualCost * 1.1 ? "Over-bid" : quotedCost < actualCost * 0.9 ? "Under-bid" : "On-Target"

      return {
        partNumber: c.partNumber,
        description: c.description,
        lastBidDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        quotedCost,
        actualCost,
        variancePct,
        varianceStatus,
      }
    })
    .sort((a, b) => b.variancePct - a.variancePct)

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Quoted vs Actual Cost Variance (Last 90 Days)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-2 font-medium text-gray-700">Part #</th>
              <th className="text-left p-2 font-medium text-gray-700">Description</th>
              <th className="text-left p-2 font-medium text-gray-700">Bid Date</th>
              <th className="text-right p-2 font-medium text-gray-700">Quoted</th>
              <th className="text-right p-2 font-medium text-gray-700">Actual</th>
              <th className="text-right p-2 font-medium text-gray-700">Var %</th>
              <th className="text-center p-2 font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {varianceData.map((item) => (
              <tr
                key={item.partNumber}
                className={cn(
                  "border-b border-gray-100",
                  item.varianceStatus === "Over-bid"
                    ? "bg-blue-50"
                    : item.varianceStatus === "Under-bid"
                      ? "bg-red-50"
                      : "",
                )}
              >
                <td className="p-2 font-mono">{item.partNumber}</td>
                <td className="p-2 text-gray-700">{item.description}</td>
                <td className="p-2 text-gray-600">{item.lastBidDate.toLocaleDateString()}</td>
                <td className="p-2 text-right font-mono">${item.quotedCost.toFixed(2)}</td>
                <td className="p-2 text-right font-mono">${item.actualCost.toFixed(2)}</td>
                <td
                  className={cn(
                    "p-2 text-right font-mono font-semibold",
                    item.variancePct > 0 ? "text-[#DC2626]" : "text-[#059669]",
                  )}
                >
                  {item.variancePct > 0 ? "+" : ""}
                  {item.variancePct.toFixed(1)}%
                </td>
                <td className="p-2 text-center">
                  <Badge
                    className={cn(
                      "text-xs",
                      item.varianceStatus === "Over-bid"
                        ? "bg-blue-500 text-white"
                        : item.varianceStatus === "Under-bid"
                          ? "bg-[#DC2626] text-white"
                          : "bg-gray-200 text-gray-700",
                    )}
                  >
                    {item.varianceStatus}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

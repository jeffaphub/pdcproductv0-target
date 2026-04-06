# Migration Report: Operations / Unit Cost

## Status: COMPLETE -- all files present, wired, and verified

## Added Files

| Path | Purpose |
|---|---|
| `lib/ops-unit-cost-data.ts` | Data layer for Product Unit Cost tab (types + mock generators) |
| `lib/ops-shop-floor-data.ts` | Data layer for Shop Floor Operations tab |
| `lib/ops-enterprise-intel-data.ts` | Data layer for Enterprise Intelligence tab |
| `components/tabs/ops-unit-cost.tsx` | Product Unit Cost tab component (stacked bar, sunburst, treemap, cost trend, indented BOM, data table, drilldown) |
| `components/tabs/ops-shop-floor.tsx` | Shop Floor Operations tab component (KPIs, product portfolio, Pareto, OEE, capacity, labor mix) |
| `components/tabs/ops-enterprise-intel.tsx` | Enterprise Intelligence tab component (capability heatmap, capacity planning, scenario forecast, bid pipeline, workload, market intel) |

## Modified Files

| Path | Change |
|---|---|
| `app/page.tsx` | Added 3 imports, 3 TabId union members (`ops-unit-cost`, `ops-shop-floor`, `ops-enterprise-intel`), 3 conditional renders |
| `components/sidebar.tsx` | Restructured from flat `tabs[]` to `sections[]` with "Unit Cost Intelligence" and "Operations / Unit Cost" groups |
| `lib/utils.ts` | Added `toSlug()` and `formatCurrency()` helper functions |

## Tab Registry

| Tab Name | TabId | Component Export |
|---|---|---|
| Product Unit Cost | `ops-unit-cost` | `OpsUnitCost` |
| Shop Floor Operations | `ops-shop-floor` | `OpsShopFloor` |
| Enterprise Intelligence | `ops-enterprise-intel` | `OpsEnterpriseIntel` |

## Navigation Wiring

- **Sidebar section**: Defined in `components/sidebar.tsx` at line ~46 as `{ title: "Operations / Unit Cost", tabs: [...] }`
- **Tab routing**: Conditional renders in `app/page.tsx` at lines ~105-107

## Collision Audit

| Check | Result |
|---|---|
| TabId uniqueness | PASS -- 26 unique IDs; `ops-unit-cost` does not collide with existing `unit-cost` |
| Component export names | PASS -- `OpsUnitCost`, `OpsShopFloor`, `OpsEnterpriseIntel` are unique |
| Data namespace isolation | PASS -- all 3 tabs import only from `@/lib/ops-*-data.ts`; no cross-imports with `lib/mock-data.tsx` |
| CSS/global style leakage | PASS -- no global CSS added; all styling is Tailwind utility classes scoped to component JSX |
| `/_imports/` references | PASS -- none exist; migration was done inline without external repo imports |

## TODOs for Future Parity

- **Backend/API**: All data is currently client-side mock generators. When a real backend is available, replace the `generate*()` functions in the 3 `ops-*-data.ts` files with API calls or SWR hooks.
- **Auth/RLS**: No authentication or row-level security is in place. If database integration is added, ensure the ops data endpoints are protected.
- **Environment variables**: None required currently (no external services). Will be needed when backend is connected.
- **Dead files to clean up**: `styles/globals.css` (stale duplicate of `app/globals.css`) and `lib/types.ts` (stale TabId with only 7 values) should be removed.

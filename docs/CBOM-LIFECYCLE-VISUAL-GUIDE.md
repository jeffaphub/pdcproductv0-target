# CBOM Lifecycle Visual Guide

## Overview
The CBOM (Costed Bill of Materials) Lifecycle module provides comprehensive visibility into program cost evolution across the BOM lifecycle stages: Proposal, eBOM, mBOM, and Current. This guide describes the visuals and insights available in each tab.

---

## Tab 1: Program Cost Overview

**Purpose**: Executive-level dashboard providing at-a-glance program cost health and key metrics.

### Visuals

| Visual | Description | Story It Tells |
|--------|-------------|----------------|
| **Lifecycle Comparison Ribbon** | Horizontal flow showing Proposal → eBOM → mBOM → Current with costs at each stage | Reveals how program cost evolved through each lifecycle gate, highlighting where significant changes occurred |
| **KPI Cards** (5 metrics) | Current Rolled-Up Cost, Variance vs Baseline, Material Cost Change, Open ECOs, Forecast Credibility | Provides instant program health assessment - are we over/under baseline? How credible is our forecast? |
| **Program Cost Waterfall Chart** | Bar chart showing baseline cost + incremental changes by driver category = current cost | Decomposes the total variance into actionable categories (Quantity, Substitution, Price, etc.) to pinpoint root causes |
| **Cost Trend Over Lifecycle** | Line chart with baseline (dashed) vs current (solid) cost progression | Shows cost trajectory and when/where deviations from baseline began |
| **Top Cost Variance Contributors Table** | Ranked list of assemblies/parts with largest cost deltas | Identifies the specific items driving program cost variance for targeted investigation |

---

## Tab 2: Costed BOM Explorer

**Purpose**: Interactive drill-down into the hierarchical BOM structure with cost visibility at every level.

### Visuals

| Visual | Description | Story It Tells |
|--------|-------------|----------------|
| **Compare Context Banner** | Shows active comparison path (e.g., "Proposal → Current") with change indicators | Reminds user which lifecycle states are being compared |
| **Costed BOM Hierarchy Tree** | Expandable tree view: Program → Assemblies → Sub-Assemblies → Parts, each with current cost, baseline, and delta | Enables drill-down to find exactly where in the product structure cost changes occurred |
| **Selected Node Summary Panel** | Detailed card showing selected item's attributes: quantity, unit cost, supplier, make/buy, revision | Provides full context for the selected BOM item including before/after values |
| **Change Type Badges** | Color-coded badges: Qty Changed, Unit Cost Changed, Substituted, Supplier Changed, Added, Removed | Quick visual identification of what type of change affected each item |
| **Detail Drawer** (on item click) | Slide-out panel with 4 sub-tabs: Overview, Cost, History, Supplier | Deep-dive into individual item details including cost breakdown, change history, and supplier information |

---

## Tab 3: Cost Variance & Drivers

**Purpose**: Analytical view for understanding the composition and root causes of cost variance.

### Visuals

| Visual | Description | Story It Tells |
|--------|-------------|----------------|
| **Variance by Driver Chart** | Horizontal bar chart showing variance amount by driver category (Quantity, Substitution, Supplier Price, etc.) | Answers "What types of changes are driving our cost variance?" - enables targeted corrective action |
| **Variance by Level Chart** | Vertical bar chart showing variance distribution: Program, Assembly, Sub-Assembly, Part levels | Shows where in the product hierarchy variance is concentrated |
| **Variance Trend Chart** | Line chart showing cumulative delta over time with zero reference line | Reveals whether variance is growing, stabilizing, or being recovered |
| **Detailed Driver Analysis Table** | Comprehensive table with Item, Level, Baseline Cost, Current Cost, Delta, %, Driver Category, Detail, Revision, Date | Full audit trail of every cost driver with drill-down capability |
| **Summary Footer Row** | Sum of drivers vs. program-level total | Validates that individual drivers reconcile to total program variance |

---

## Tab 4: BOM Cost Change Traceability

**Purpose**: Audit trail and timeline view of all cost-impacting BOM changes.

### Visuals

| Visual | Description | Story It Tells |
|--------|-------------|----------------|
| **Lifecycle Cost Progression Panel** | Four-box flow: Proposal → eBOM → mBOM → Current with costs and inter-stage deltas | Shows exact cost at each lifecycle gate and the delta between each transition |
| **Change Event Timeline** | Horizontal timeline with clickable event nodes (ECO, Substitution, Price Update, etc.) | Visualizes the sequence and density of changes over time |
| **Transition Summary Cards** | Four cards showing delta and event count for each lifecycle transition | Summarizes cost impact by lifecycle phase (e.g., "eBOM → mBOM: +$2.3M, 5 events") |
| **BOM Cost Change Event History Table** | Detailed table with Event ID, Type, Lifecycle, Before/After values, Cost Impact, Status, Approver | Complete audit trail with before/after mechanics for every change |
| **Lifecycle Filter Badges** | Clickable badges to filter by transition: Within eBOM, eBOM → mBOM, mBOM → Current | Enables focused analysis of specific lifecycle phases |
| **Change Event Detail Drawer** (on row click) | Slide-out panel showing full event details, before/after comparison, cost impact breakdown | Deep-dive into individual change events with structural compare |

---

## Tab 5: EAC / Forecast Alignment

**Purpose**: Validates alignment between BOM costs and financial forecast (EAC), identifies gaps.

### Visuals

| Visual | Description | Story It Tells |
|--------|-------------|----------------|
| **EAC KPI Cards** (8 metrics) | BOM Cost, EAC, BOM vs EAC Delta, CPI, Approved Changes, Incorporated in EAC, Unincorporated Changes, Forecast Credibility | Shows whether BOM cost reality matches financial forecast expectations |
| **BOM Cost vs EAC Trend Chart** | Dual-line chart (BOM Cost solid, EAC dashed) with zoomed Y-axis | Tracks divergence between actual BOM costs and EAC over time - are they converging or diverging? |
| **Cost Change Incorporation Funnel** | Horizontal funnel: Identified → Validated → Approved → Incorporated → Unincorporated Gap | Shows the "leakage" in the cost incorporation process - how many approved changes haven't made it to EAC? |
| **Unaligned Cost Changes Table** | Table of changes not yet reflected in EAC with Event ID, Description, Impact, Status, Reason, Risk Level | Actionable list of specific changes requiring attention to close the BOM-EAC gap |
| **Total Unaligned Impact Footer** | Sum of unaligned cost impact vs. program delta | Quantifies the financial risk from unincorporated changes |

---

## Cross-Tab Navigation

- **Clickable KPIs**: Many KPI cards navigate to related tabs for deeper analysis
- **Clickable Table Rows**: Tables across tabs open detail drawers with full context
- **Lifecycle Comparison Selector**: Available on all tabs to change the comparison baseline
- **Program Selector**: Switch between programs while maintaining tab context

---

## Key Insights by User Role

| Role | Primary Tabs | Key Questions Answered |
|------|--------------|------------------------|
| **Program Manager** | Overview, EAC Alignment | Is my program on cost track? What's my forecast credibility? |
| **Cost Analyst** | Variance & Drivers, Traceability | What's driving variance? Which ECOs had the biggest impact? |
| **BOM Manager** | Costed BOM Explorer, Traceability | What changed in my BOM? Where are the structural differences? |
| **Finance Controller** | EAC Alignment | Are all approved changes reflected in EAC? What's the unincorporated risk? |
| **Engineering Lead** | Costed BOM Explorer, Variance | Which design changes drove cost? What substitutions were made? |

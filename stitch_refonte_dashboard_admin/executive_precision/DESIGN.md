---
name: Executive Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#6f001c'
  on-tertiary: '#ffffff'
  tertiary-container: '#9a002b'
  on-tertiary-container: '#ffa2a7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b6'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#920028'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  numeric-kpi:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.025em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an institutional-grade, modern enterprise SaaS environment tailored for executive oversight, fintech administration, and corporate asset governance. It draws inspiration from the structured efficiency of modern financial platforms like Stripe and Linear while reflecting the visual identity of Business Investment Meeting.

### Design Philosophy & Aesthetic Movement
- **Movement:** Modern Corporate Minimalism with High-Density FinTech Clarity.
- **Atmosphere:** Rigorous, disciplined, transparent, and authoritative. It strips away ornamental noise in favor of optical alignment, high-contrast numeric data, and instant visual triage.
- **Core Principles:**
  - **Information Architecture First:** High scannability of KPIs, operational queues, and multidimensional administrative tables.
  - **Calibrated Semantics:** Strict, unambiguous color logic for financial statuses (approvals, pending requests, and cancellations).
  - **Subtle Surface Geometry:** Delicate 1px borders, gentle card containment, and low-amplitude interactive elevations.

## Colors

The palette balances institutional royal blue with slate neutrals and targeted status semantics.

### Color Tokens & Roles
- **Primary (`#1E40AF` / Accent `#2563EB`):** Anchors brand touchpoints, primary call-to-actions, active navigation highlights, and selected tab states.
- **Secondary (`#0F172A` / `#1E293B`):** Deep slate tones for high-emphasis typography, primary labels, and dark container accents.
- **Tertiary (`#E11D48`):** Sourced from the tie motif in the BIM emblem; used sparingly for critical warnings, deletion actions, and high-priority rejection triggers.
- **Neutral & Canvas Surfaces:**
  - `canvas-default`: `#F8FAFC` (App background providing crisp contrast against white modules)
  - `surface-elevated`: `#FFFFFF` (Card surfaces, modals, popovers, and table rows)
  - `border-subtle`: `#E2E8F0` (Default 1px dividers, card boundaries, input strokes)
  - `border-strong`: `#CBD5E1` (Hover states, focused borders)
  - `text-primary`: `#0F172A`
  - `text-secondary`: `#475569`
  - `text-muted`: `#94A3B8`

### Semantic Feedback Roles
- **Success / Validated (`#059669` / bg: `#ECFDF5`):** Processed recharges, active accounts ("Actif"), completed transactions.
- **Warning / Pending (`#D97706` / bg: `#FFFBEB`):** "En attente", pending reconciliations, verification alerts.
- **Danger / Destructive (`#DC2626` / bg: `#FEF2F2`):** Blocked accounts, rejected transactions, account suspensions.

## Typography

The typography system uses `Inter` across all structural tiers to deliver maximum legibility in dense data matrices, financial balance tables, and French enterprise copy.

### Hierarchy & Typesetting Guidelines
- **Numeric Values:** Always enable tabular numbers (`font-variant-numeric: tabular-nums`) for currency (e.g., `0,043 EC`), percentages, and operational counts so that vertical columns align without jitter.
- **Section Headers:** Set main dashboard titles (`Tableau de bord`, `Gestion`) in `headline-lg` with tight tracking (`-0.015em`) paired immediately with a `body-sm` description in `text-muted`.
- **Navigation & Labels:** Category super-headers (e.g., `TABLEAU DE BORD`, `GESTION`, `FINANCE & SUPPORT`) utilize `label-md` with uppercase transformation and `0.04em` letter spacing for crisp categorization.

## Layout & Spacing

The layout is built around a persistent, fixed-width navigational rail paired with an adaptive fluid canvas.

### Layout Geometry
- **Sidebar Navigation:** Fixed width of `260px` with a persistent border-r of `1px solid #E2E8F0` and vertical item spacing of `0.25rem`.
- **Top Utility Bar:** Fixed height of `64px` with edge-to-edge alignment, anchoring global branding, search, language selectors, and session profile controls.
- **Main Canvas:** Fluid viewport width with a maximum container limit of `1600px` for ultra-wide screens to maintain eye tracking across horizontal data structures.
- **Grid Structure:**
  - **KPI Matrix:** 4-column responsive grid (`repeat(4, minmax(0, 1fr))`) collapsing to 2 columns on tablet and 1 column on mobile screens.
  - **Data Rows & Lists:** Full-width single-column stacked containers with `0.75rem` vertical spacing.

### Responsive Breakpoints
- **Mobile (`< 768px`):** Sidebar docks into an off-canvas drawer; top navbar retains quick-action triggers; metrics stack vertically.
- **Tablet (`768px - 1024px`):** Sidebar collapses to an icon rail (`72px`); KPI metrics form a 2x2 matrix.
- **Desktop (`> 1024px`):** Full sidebar visibility; multi-column KPI grids; complete expanded data tables.

## Elevation & Depth

This design system rejects heavy, dramatic drop shadows in favor of subtle border boundaries and diffuse, multi-layered ambient elevations.

### Surface Elevation Hierarchy
- **Level 0 (Flat / Canvas):** Applied to the base canvas (`#F8FAFC`). No shadow, no outline.
- **Level 1 (Card & Module Shells):** Applied to KPI tiles, account items, and list enclosures.
  - Stroke: `1px solid #E2E8F0`
  - Shadow: `0px 1px 3px rgba(15, 23, 42, 0.04), 0px 1px 2px rgba(15, 23, 42, 0.02)`
- **Level 2 (Active & Hover Cards):** Applied during hover transitions on clickable data items.
  - Stroke: `1px solid #CBD5E1`
  - Shadow: `0px 4px 6px -1px rgba(15, 23, 42, 0.06), 0px 2px 4px -2px rgba(15, 23, 42, 0.04)`
- **Level 3 (Overlays, Flyouts & Modals):**
  - Stroke: `1px solid #E2E8F0`
  - Shadow: `0px 20px 25px -5px rgba(15, 23, 42, 0.08), 0px 8px 10px -6px rgba(15, 23, 42, 0.04)`
  - Backdrop Blur: `backdrop-filter: blur(8px)` with `rgba(15, 23, 42, 0.4)` scrim.

## Shapes

A balanced `roundedness: 2` (base `8px` / `0.5rem`) is utilized throughout interactive surfaces, creating a refined aesthetic that bridges technical discipline with modern software usability.

### Corner Radius Allocations
- **Form Controls & Micro-Badges (`4px` / `rounded-sm`):** Status pills, table tags, small tooltips.
- **Buttons, Inputs & Table Cards (`8px` / `rounded-md`):** Core interactive buttons, text inputs, user account list items.
- **Structural Containers (`12px` / `rounded-lg`):** KPI summary cards, filter bars, large metric modules.
- **Pills & Avatars (`9999px` / `rounded-full`):** User profile avatars, circular action icons, status indicator dots.

## Components

### Buttons
- **Primary:** Background `#1E40AF`, text `#FFFFFF`, border `transparent`. Hover `#1D4ED8`. Active `#1E3A8A`. Height `38px`, padding `0 1rem`, typography `14px / font-weight: 500`.
- **Secondary / Outline:** Background `#FFFFFF`, text `#0F172A`, border `1px solid #E2E8F0`. Hover `#F8FAFC` with border `#CBD5E1`.
- **Icon Actions (Quick Approvals/Rejections):**
  - Approve: Circular button, height `32px`, width `32px`, border `1px solid #A7F3D0`, background `#ECFDF5`, icon color `#059669`. Hover `#D1FAE5`.
  - Reject: Circular button, height `32px`, width `32px`, border `1px solid #FECDD3`, background `#FFF1F2`, icon color `#E11D48`. Hover `#FFE4E6`.

### KPI & Metric Cards
- **Structure:** Clean white background (`#FFFFFF`), `1px solid #E2E8F0`, padding `1.25rem`.
- **Layout:** Flex header with metric title (`body-sm`, `#64748B`) and categorized icon badge (e.g., `#EFF6FF` container with `#2563EB` icon). Main value rendered in `numeric-kpi` (`28px bold`, `#0F172A`), followed by comparative trend badge or secondary meta (e.g., `288 actifs`).

### Account & Record Cards
- **Structure:** Encapsulated row/card layout with `1px solid #E2E8F0`, padding `1rem`, rounded `8px`.
- **User Block:** Avatar initial circle (`36px`, soft slate fill `#F1F5F9`, bold dark blue text `#1E40AF`), name in `14px / 600`, email in `12px / #64748B`.
- **Status Tags:** Pill badge with `padding: 2px 8px`, `font-size: 11px`, `font-weight: 600`.
  - "Actif": text `#059669`, background `#ECFDF5`.
  - "BIM Admin": text `#991B1B`, background `#FEE2E2`.
  - "Admin Entreprise": text `#1D4ED8`, background `#EFF6FF`.

### Input Fields & Search Bars
- **Design:** Background `#FFFFFF`, height `40px`, border `1px solid #E2E8F0`, radius `8px`, typography `14px`. Left-aligned search icon in `#94A3B8`.
- **Focus State:** Border `#2563EB`, outer ring `3px rgba(37, 99, 235, 0.12)`, text `#0F172A`.

### Horizontal Filter Tabs
- **Design:** Sub-navigation tab bar with transparent background and bottom border `1px solid #E2E8F0`.
- **Tab Items:** `padding: 0.75rem 1rem`, typography `14px / font-weight: 500`, color `#64748B`.
- **Active Tab:** Color `#1E40AF`, relative bottom indicator line `2px solid #1E40AF` overlapping container border.
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import apiClient from '@/api/client'
import { useToast } from '@/composables/useToast'
import SectionTabs from '@/components/SectionTabs.vue'

const toast = useToast()

const statsSectionTabs = [
  { key: 'summary', label: 'Récapitulatif', icon: 'summarize' },
  { key: 'analytics', label: 'Analyses', icon: 'insights' },
  { key: 'operations', label: 'Opérations majeures', icon: 'receipt_long' }
]
const statsSection = ref('summary')

const PERIODS = [
  { label: "Aujourd'hui", value: 'daily' },
  { label: 'Semaine', value: 'weekly' },
  { label: 'Mois', value: 'monthly' },
  { label: 'Trimestre', value: 'quarterly' },
  { label: 'Semestre', value: 'semiannual' },
  { label: 'Année', value: 'annual' }
]
const period = ref('monthly')
const periodLabel = computed(() => PERIODS.find((p) => p.value === period.value)?.label ?? '')

const loading = ref(false)
const recharges = ref({ total: 0, totalAmount: 0, rows: [] })
const retraits = ref({ total: 0, totalAmount: 0, rows: [] })
const paiements = ref({ total: 0, totalAmount: 0, rows: [] })

async function loadStats() {
  loading.value = true
  try {
    const [r1, r2, r3] = await Promise.all([
      apiClient.get('/tsx/admin/recharges', { params: { status: 'success', period: period.value, pageSize: 10 } }),
      apiClient.get('/tsx/admin/retraits', { params: { period: period.value, pageSize: 10 } }),
      apiClient.get('/tsx/admin/paiements', { params: { period: period.value, pageSize: 50 } })
    ])
    recharges.value = { total: r1.data?.total ?? 0, totalAmount: Number(r1.data?.totalAmount ?? 0), rows: r1.data?.data ?? [] }
    retraits.value = { total: r2.data?.total ?? 0, totalAmount: Number(r2.data?.totalAmount ?? 0), rows: r2.data?.data ?? [] }
    paiements.value = { total: r3.data?.total ?? 0, totalAmount: Number(r3.data?.totalAmount ?? 0), rows: r3.data?.data ?? [] }
  } catch {
    toast.error('Impossible de charger les statistiques financières.')
  } finally {
    loading.value = false
  }
}
watch(period, loadStats)

const cdfRate = ref(null)
async function loadCdfRate() {
  try {
    const { data } = await apiClient.get('/currency')
    const cdf = (data?.data ?? []).find((c) => c.code === 'CDF')
    if (cdf?.rate) cdfRate.value = Number(cdf.rate)
  } catch {
    /* non bloquant */
  }
}

const netBalance = computed(() => recharges.value.totalAmount - retraits.value.totalAmount - paiements.value.totalAmount)
function fmtEC(n) {
  return Number(n ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' EC'
}
function fmtFc(ec) {
  if (!cdfRate.value) return '—'
  return Math.round(Number(ec ?? 0) * cdfRate.value).toLocaleString('fr-FR') + ' FC'
}
function formatDate(d) {
  return d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
}

const maxFlow = computed(() => Math.max(recharges.value.totalAmount, retraits.value.totalAmount, paiements.value.totalAmount, 1))
function barWidth(amount) {
  return Math.min(100, Math.round((amount / maxFlow.value) * 100))
}

/* Top entreprises par volume de paiements (réel, calculé côté client) */
const topCompanies = computed(() => {
  const byCompany = {}
  for (const row of paiements.value.rows) {
    const name = row.company?.name ?? 'Sans entreprise'
    byCompany[name] = (byCompany[name] ?? 0) + Number(row.amount ?? 0)
  }
  return Object.entries(byCompany)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
})
const maxCompanyAmount = computed(() => Math.max(...topCompanies.value.map((c) => c.amount), 1))

/* Opérations majeures : fusion recharges + retraits + paiements, triées par montant */
const majorOperations = computed(() => {
  const ops = [
    ...recharges.value.rows.map((r) => ({ kind: 'Recharge', color: 'text-primary', dot: 'bg-primary', ref: r.reference ?? `RCH-${r.id}`, name: r.user?.username ?? '—', sub: r.telephone ?? r.paymentMethod ?? '—', amount: Number(r.amount ?? 0), sign: 1, date: r.createdAt, status: 'Approuvée' })),
    ...retraits.value.rows.map((r) => ({ kind: 'Retrait', color: 'text-tertiary-container', dot: 'bg-tertiary-container', ref: `RET-${r.id}`, name: r.sender?.username ?? '—', sub: r.sender?.email ?? '—', amount: Number(r.amount ?? 0), sign: -1, date: r.createdAt, status: r.status ?? '—' })),
    ...paiements.value.rows.map((r) => ({ kind: 'Paiement', color: 'text-secondary', dot: 'bg-secondary', ref: `PAY-${r.id}`, name: r.company?.name ?? r.payer?.username ?? '—', sub: r.product?.name ?? r.description ?? '—', amount: Number(r.amount ?? 0), sign: -1, date: r.createdAt, status: 'Clôturé' }))
  ]
  return ops.sort((a, b) => b.amount - a.amount).slice(0, 12)
})

onMounted(() => {
  loadStats()
  loadCdfRate()
})
</script>

<template>
<div class="flex flex-col w-full">
<div class="bg-surface-container-lowest shadow-sm px-space-lg sticky top-16 z-20">
<div class="flex items-center overflow-x-auto no-scrollbar gap-1 py-1">
<RouterLink class="px-3.5 py-2.5 rounded-lg font-label-md text-label-md text-secondary hover:text-primary hover:bg-surface-container-low flex items-center gap-1.5 whitespace-nowrap transition-colors" to="/transactions">
<span class="material-symbols-outlined text-[16px]">sync_alt</span><span>Transactions</span>
</RouterLink>
<RouterLink class="px-3.5 py-2.5 rounded-lg font-label-md text-label-md text-secondary hover:text-primary hover:bg-surface-container-low flex items-center gap-1.5 whitespace-nowrap transition-colors" to="/recharges">
<span class="material-symbols-outlined text-[16px]">add_card</span><span>Recharges</span>
</RouterLink>
<RouterLink class="px-3.5 py-2.5 rounded-lg font-label-md text-label-md text-secondary hover:text-primary hover:bg-surface-container-low flex items-center gap-1.5 whitespace-nowrap transition-colors" to="/portefeuilles">
<span class="material-symbols-outlined text-[16px]">account_balance_wallet</span><span>Portefeuilles</span>
</RouterLink>
<a aria-current="page" class="px-3.5 py-2.5 rounded-lg font-label-md text-label-md text-primary font-bold bg-primary-fixed/30 border-b-2 border-primary flex items-center gap-1.5 whitespace-nowrap" href="#">
<span class="material-symbols-outlined text-[16px]">bar_chart_4_bars</span><span>Statistiques financières</span>
</a>
</div>
</div>

<div class="p-space-lg space-y-space-md max-w-[1500px] mx-auto w-full">
<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-space-md">
<div class="flex items-start gap-space-sm">
<div class="p-2.5 bg-primary-fixed/40 rounded-xl text-primary shadow-sm mt-0.5"><span class="material-symbols-outlined text-[24px]">bar_chart_4_bars</span></div>
<div>
<div class="flex items-center gap-2.5">
<h1 class="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">Statistiques financières</h1>
<span class="inline-flex items-center px-2 py-0.5 rounded font-label-sm text-label-sm font-medium bg-primary-fixed text-primary">Temps réel</span>
</div>
<p class="font-body-sm text-body-sm text-secondary mt-1">Flux de trésorerie réels de l'écosystème BIM NEXT sur la période sélectionnée.</p>
</div>
</div>
</div>

<div class="flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-lowest p-1 rounded-xl shadow-sm">
<div class="flex flex-wrap items-center gap-1 font-label-md text-label-md">
<button v-for="p in PERIODS" :key="p.value" class="px-3.5 py-1.5 rounded-lg font-semibold transition-colors" :class="period === p.value ? 'bg-primary-container text-on-primary shadow-sm' : 'text-secondary hover:text-on-surface hover:bg-surface-container'" type="button" @click="period = p.value">{{ p.label }}</button>
</div>
<button class="p-2 text-secondary hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors" title="Actualiser" type="button" @click="loadStats">
<span class="material-symbols-outlined text-[18px]" :class="{ 'animate-spin': loading }">refresh</span>
</button>
</div>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
<div class="bg-surface-container-lowest rounded-xl border-2 border-primary-container/40 p-space-lg shadow-sm flex flex-col justify-between">
<div>
<div class="flex items-center justify-between mb-3">
<span class="font-label-sm text-label-sm font-semibold text-secondary">Solde net ({{ periodLabel }})</span>
<div class="w-9 h-9 rounded-lg bg-primary-fixed/40 text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">account_balance_wallet</span></div>
</div>
<p class="font-numeric-kpi text-[22px] font-bold text-primary tracking-tight">{{ fmtEC(netBalance) }}</p>
<p class="font-label-sm text-label-sm text-secondary mt-1">≈ {{ fmtFc(netBalance) }}</p>
</div>
<div class="mt-4 pt-3 border-t border-surface-container font-label-sm text-label-sm text-secondary">recharges − retraits − paiements</div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between mb-3">
<span class="font-label-sm text-label-sm font-semibold text-secondary">Total recharges</span>
<div class="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">add_card</span></div>
</div>
<p class="font-numeric-kpi text-[22px] font-bold text-on-surface tracking-tight">{{ fmtEC(recharges.totalAmount) }}</p>
<div class="mt-4 pt-3 border-t border-surface-container flex items-center justify-between font-label-sm text-label-sm text-secondary"><span>{{ recharges.total }} opération(s)</span></div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between mb-3">
<span class="font-label-sm text-label-sm font-semibold text-secondary">Total retraits</span>
<div class="w-9 h-9 rounded-lg bg-tertiary-fixed text-tertiary-container flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">outbox</span></div>
</div>
<p class="font-numeric-kpi text-[22px] font-bold text-on-surface tracking-tight">{{ fmtEC(retraits.totalAmount) }}</p>
<div class="mt-4 pt-3 border-t border-surface-container flex items-center justify-between font-label-sm text-label-sm text-secondary"><span>{{ retraits.total }} opération(s)</span></div>
</div>
<div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div class="flex items-center justify-between mb-3">
<span class="font-label-sm text-label-sm font-semibold text-secondary">Total paiements</span>
<div class="w-9 h-9 rounded-lg bg-secondary-container text-on-secondary-fixed flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">shopping_cart_checkout</span></div>
</div>
<p class="font-numeric-kpi text-[22px] font-bold text-on-surface tracking-tight">{{ fmtEC(paiements.totalAmount) }}</p>
<div class="mt-4 pt-3 border-t border-surface-container flex items-center justify-between font-label-sm text-label-sm text-secondary"><span>{{ paiements.total }} opération(s)</span></div>
</div>
</div>

<SectionTabs v-model="statsSection" :tabs="statsSectionTabs" />

<!-- Récapitulatif -->
<section v-show="statsSection === 'summary'" class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-space-md">
<div class="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md border-b border-surface-container gap-2">
<div>
<h2 class="font-headline-md text-headline-md font-bold text-on-surface">Récapitulatif — {{ periodLabel }}</h2>
<p class="font-body-sm text-body-sm text-secondary">Distribution des flux entrants et sortants de la plateforme</p>
</div>
</div>
<div class="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
<div class="space-y-space-sm">
<div class="flex items-center justify-between">
<span class="flex items-center gap-2 font-label-md text-label-md font-semibold text-on-surface"><span class="w-5 h-5 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xs">+</span>Recharges</span>
<span class="px-2 py-0.5 font-label-sm text-label-sm font-bold rounded-full bg-primary-container text-on-primary">{{ recharges.total }}</span>
</div>
<p class="font-body-md text-body-md font-bold text-on-surface">{{ fmtEC(recharges.totalAmount) }}</p>
<div class="w-full bg-surface-container h-2.5 rounded-full overflow-hidden"><div class="bg-primary h-full rounded-full" :style="{ width: barWidth(recharges.totalAmount) + '%' }"></div></div>
</div>
<div class="space-y-space-sm">
<div class="flex items-center justify-between">
<span class="flex items-center gap-2 font-label-md text-label-md font-semibold text-on-surface"><span class="w-5 h-5 rounded-full bg-tertiary-fixed text-tertiary-container flex items-center justify-center font-bold text-xs">-</span>Retraits</span>
<span class="px-2 py-0.5 font-label-sm text-label-sm font-bold rounded-full bg-tertiary-container text-on-tertiary">{{ retraits.total }}</span>
</div>
<p class="font-body-md text-body-md font-bold text-on-surface">{{ fmtEC(retraits.totalAmount) }}</p>
<div class="w-full bg-surface-container h-2.5 rounded-full overflow-hidden"><div class="bg-tertiary-container h-full rounded-full" :style="{ width: barWidth(retraits.totalAmount) + '%' }"></div></div>
</div>
<div class="space-y-space-sm">
<div class="flex items-center justify-between">
<span class="flex items-center gap-2 font-label-md text-label-md font-semibold text-on-surface"><span class="material-symbols-outlined text-[16px] text-secondary">shopping_cart_checkout</span>Paiements</span>
<span class="px-2 py-0.5 font-label-sm text-label-sm font-bold rounded-full bg-secondary-container text-on-secondary-fixed">{{ paiements.total }}</span>
</div>
<p class="font-body-md text-body-md font-bold text-on-surface">{{ fmtEC(paiements.totalAmount) }}</p>
<div class="w-full bg-surface-container h-2.5 rounded-full overflow-hidden"><div class="bg-secondary h-full rounded-full" :style="{ width: barWidth(paiements.totalAmount) + '%' }"></div></div>
</div>
</div>
<div class="p-space-md rounded-xl bg-primary-fixed/20 flex flex-col md:flex-row md:items-center md:justify-between gap-space-sm">
<div class="flex items-center gap-space-sm">
<span class="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-xs">=</span>
<p class="font-label-md text-label-md font-semibold text-on-surface">Solde net <span class="text-secondary font-normal">(recharges − retraits − paiements)</span></p>
</div>
<div class="flex items-baseline gap-1.5 self-end md:self-center">
<span class="font-numeric-kpi text-[20px] font-extrabold text-primary">{{ netBalance >= 0 ? '+' : '' }}{{ fmtEC(netBalance) }}</span>
</div>
</div>
</section>

<!-- Analyses -->
<div v-show="statsSection === 'analytics'" class="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
<div class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-space-md">
<div class="pb-space-sm border-b border-surface-container">
<h3 class="font-headline-sm text-body-lg font-bold text-on-surface">Comparatif des flux</h3>
<p class="font-body-sm text-body-sm text-secondary">Recharges vs retraits vs paiements — {{ periodLabel }}</p>
</div>
<div class="space-y-space-md pt-space-sm">
<div>
<div class="flex justify-between font-label-md text-label-md mb-1"><span class="font-medium text-on-surface flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-primary"></span>Recharges</span><span class="font-mono font-semibold text-on-surface">{{ fmtEC(recharges.totalAmount) }}</span></div>
<div class="w-full bg-surface-container h-2 rounded-full overflow-hidden"><div class="bg-primary h-full rounded-full" :style="{ width: barWidth(recharges.totalAmount) + '%' }"></div></div>
</div>
<div>
<div class="flex justify-between font-label-md text-label-md mb-1"><span class="font-medium text-on-surface flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-tertiary-container"></span>Retraits</span><span class="font-mono font-semibold text-on-surface">{{ fmtEC(retraits.totalAmount) }}</span></div>
<div class="w-full bg-surface-container h-2 rounded-full overflow-hidden"><div class="bg-tertiary-container h-full rounded-full" :style="{ width: barWidth(retraits.totalAmount) + '%' }"></div></div>
</div>
<div>
<div class="flex justify-between font-label-md text-label-md mb-1"><span class="font-medium text-on-surface flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-secondary"></span>Paiements</span><span class="font-mono font-semibold text-on-surface">{{ fmtEC(paiements.totalAmount) }}</span></div>
<div class="w-full bg-surface-container h-2 rounded-full overflow-hidden"><div class="bg-secondary h-full rounded-full" :style="{ width: barWidth(paiements.totalAmount) + '%' }"></div></div>
</div>
</div>
</div>
<div class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-space-md">
<div class="pb-space-sm border-b border-surface-container">
<h3 class="font-headline-sm text-body-lg font-bold text-on-surface">Top entreprises par paiements reçus</h3>
<p class="font-body-sm text-body-sm text-secondary">{{ periodLabel }} — calculé sur les paiements chargés</p>
</div>
<div v-if="topCompanies.length === 0" class="text-center py-space-lg text-secondary font-body-sm text-body-sm">Aucun paiement sur cette période</div>
<div v-else class="space-y-space-sm pt-space-sm">
<div v-for="c in topCompanies" :key="c.name">
<div class="flex justify-between font-label-md text-label-md mb-1"><span class="font-medium text-on-surface truncate">{{ c.name }}</span><span class="font-mono font-semibold text-on-surface shrink-0">{{ fmtEC(c.amount) }}</span></div>
<div class="w-full bg-surface-container h-2 rounded-full overflow-hidden"><div class="bg-primary h-full rounded-full" :style="{ width: Math.round((c.amount / maxCompanyAmount) * 100) + '%' }"></div></div>
</div>
</div>
</div>
</div>

<!-- Opérations majeures -->
<section v-show="statsSection === 'operations'" class="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
<div class="p-space-lg border-b border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
<div>
<h3 class="font-headline-sm text-body-lg font-bold text-on-surface">Opérations financières les plus importantes</h3>
<p class="font-body-sm text-body-sm text-secondary">Triées par montant — {{ periodLabel }}</p>
</div>
</div>
<div v-if="majorOperations.length === 0" class="text-center py-space-xl text-secondary">
<span class="material-symbols-outlined text-[40px] mb-2 block opacity-30">receipt_long</span>
<p class="font-body-md text-body-md font-medium">Aucune opération sur cette période</p>
</div>
<div v-else class="overflow-x-auto">
<table class="w-full text-left font-body-sm text-body-sm text-secondary">
<thead class="bg-surface-container-low font-label-sm text-label-sm font-bold uppercase tracking-wider text-secondary">
<tr>
<th class="px-5 py-3">Référence / Date</th>
<th class="px-5 py-3">Type</th>
<th class="px-5 py-3">Bénéficiaire</th>
<th class="px-5 py-3">Détails</th>
<th class="px-5 py-3 text-right">Montant (EC)</th>
<th class="px-5 py-3 text-center">Statut</th>
</tr>
</thead>
<tbody class="divide-y divide-surface-container font-mono">
<tr v-for="(op, i) in majorOperations" :key="i" class="hover:bg-surface-container-low/60 transition-colors">
<td class="px-5 py-3.5">
<p class="font-bold text-on-surface">#{{ op.ref }}</p>
<p class="font-label-sm text-label-sm text-outline font-sans">{{ formatDate(op.date) }}</p>
</td>
<td class="px-5 py-3.5 font-sans"><span class="inline-flex items-center gap-1 font-semibold" :class="op.color"><span class="w-1.5 h-1.5 rounded-full" :class="op.dot"></span>{{ op.kind }}</span></td>
<td class="px-5 py-3.5 font-sans"><p class="font-medium text-on-surface">{{ op.name }}</p></td>
<td class="px-5 py-3.5 font-sans text-secondary">{{ op.sub }}</td>
<td class="px-5 py-3.5 text-right font-bold text-body-md" :class="op.sign > 0 ? 'text-on-surface' : 'text-tertiary-container'">{{ op.sign > 0 ? '+' : '-' }}{{ Number(op.amount).toLocaleString('fr-FR') }} EC</td>
<td class="px-5 py-3.5 text-center font-sans"><span class="inline-flex px-2 py-0.5 rounded font-label-sm text-[10px] font-semibold bg-surface-container text-secondary">{{ op.status }}</span></td>
</tr>
</tbody>
</table>
</div>
</section>
</div>
</div>
</template>

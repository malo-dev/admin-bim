<script setup>
// Onglets de sections internes à une page : seule la section sélectionnée est affichée.
// tabs : [{ key, label, icon?, count? }]
defineProps({
  tabs: { type: Array, required: true }
})
const active = defineModel({ type: String, required: true })
</script>

<template>
  <div class="bg-surface-container-lowest rounded-xl shadow-sm px-space-md pt-2">
    <div class="flex items-center gap-space-xs overflow-x-auto no-scrollbar" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="active === tab.key"
        class="relative flex items-center gap-2 py-3 px-space-md font-body-sm text-body-sm whitespace-nowrap transition-colors"
        :class="active === tab.key ? 'font-semibold text-primary' : 'font-medium text-secondary hover:text-on-surface'"
        @click="active = tab.key"
      >
        <span v-if="tab.icon" class="material-symbols-outlined text-[18px]">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.count !== undefined"
          class="px-2 py-0.5 rounded-full font-label-sm text-label-sm"
          :class="active === tab.key ? 'bg-primary-container text-on-primary font-bold' : 'bg-surface-container text-secondary'"
        >{{ tab.count }}</span>
        <span v-if="active === tab.key" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>
      </button>
    </div>
  </div>
</template>

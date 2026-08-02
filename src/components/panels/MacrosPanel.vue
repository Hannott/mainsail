<template>
    <panel
        v-if="klipperReadyForGui && macros.length > 0"
        :icon="mdiCodeTags"
        :title="$t('Panels.MacrosPanel.Headline')"
        :collapsible="true"
        card-class="macros-panel">
        <template #buttons>
            <v-btn icon tile :color="reorderMode ? 'primary' : ''" @click="toggleReorderMode">
                <v-tooltip top>
                    <template #activator="{ on, attrs }">
                        <v-icon v-bind="attrs" v-on="on">{{ mdiViewGridOutline }}</v-icon>
                    </template>
                    <span>{{ $t('Panels.MacrosPanel.Reorder') }}</span>
                </v-tooltip>
            </v-btn>
        </template>
        <v-card-text class="py-2">
            <v-row>
                <v-col class="text-center">
                    <draggable
                        v-model="macros"
                        ghost-class="ghost"
                        :force-fallback="true"
                        :fallback-on-body="true"
                        :disabled="!reorderMode"
                        class="d-inline-flex flex-wrap justify-center">
                        <div
                            v-for="(macro, index) in macros"
                            :key="'macro_' + index"
                            class="mx-1 my-1 d-inline-flex"
                            :class="{ 'macro-reorder-item': reorderMode }">
                            <macro-button :macro="macro" color="primary" />
                        </div>
                    </draggable>
                </v-col>
            </v-row>
        </v-card-text>
    </panel>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import BaseMixin from '../mixins/base'
import Panel from '@/components/ui/Panel.vue'
import MacroButton from '@/components/inputs/MacroButton.vue'
import draggable from 'vuedraggable'
import { mdiCodeTags, mdiViewGridOutline } from '@mdi/js'
import { PrinterStateMacro } from '@/store/printer/types'
@Component({
    components: { MacroButton, Panel, draggable },
})
export default class MacrosPanel extends Mixins(BaseMixin) {
    mdiCodeTags = mdiCodeTags
    mdiViewGridOutline = mdiViewGridOutline

    reorderMode = false

    get hiddenMacros() {
        return (this.$store.state.gui?.macros?.hiddenMacros ?? []).map((name: string) => name.toLowerCase())
    }

    get macroOrder(): string[] {
        return this.$store.state.gui?.macros?.macroOrder ?? []
    }

    get filteredMacros(): PrinterStateMacro[] {
        const macros = this.$store.getters['printer/getMacros']

        return macros.filter((macro: PrinterStateMacro) => !this.hiddenMacros.includes(macro.name.toLowerCase()))
    }

    get macros(): PrinterStateMacro[] {
        const order = this.macroOrder
        if (!order.length) return this.filteredMacros

        const remaining = [...this.filteredMacros]
        const ordered: PrinterStateMacro[] = []

        order.forEach((name) => {
            const index = remaining.findIndex((macro) => macro.name === name)
            if (index !== -1) ordered.push(remaining.splice(index, 1)[0])
        })

        return [...ordered, ...remaining]
    }

    set macros(newVal: PrinterStateMacro[]) {
        this.$store.dispatch('gui/macros/saveSetting', {
            name: 'macroOrder',
            value: newVal.map((macro) => macro.name),
        })
    }

    toggleReorderMode() {
        this.reorderMode = !this.reorderMode
    }
}
</script>

<style scoped>
.macro-reorder-item {
    outline: 2px dashed currentColor;
    outline-offset: 2px;
    border-radius: 4px;
    cursor: move;
}

.macro-reorder-item ::v-deep .v-item-group {
    transform: scale(0.92);
    opacity: 0.75;
    transition:
        transform 150ms,
        opacity 150ms;
}

.macro-reorder-item ::v-deep .v-btn {
    pointer-events: none;
}

.ghost {
    opacity: 0.3;
}
</style>

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

<template>
    <panel
        v-if="klipperReadyForGui && macros.length > 0 && macrogroupStatus"
        :icon="mdiCodeTags"
        :title="macrogroup.name"
        :collapsible="true"
        :card-class="'macrogroup_' + panelId + '_panel'">
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
                            :key="'macroparam_' + index"
                            class="mx-1 my-1 d-inline-flex"
                            :class="{ 'macro-reorder-item': reorderMode }">
                            <macro-button :macro="macro" :color="getColor(macro)" />
                        </div>
                    </draggable>
                </v-col>
            </v-row>
        </v-card-text>
    </panel>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import BaseMixin from '../mixins/base'
import Panel from '@/components/ui/Panel.vue'
import MacroButton from '@/components/inputs/MacroButton.vue'
import draggable from 'vuedraggable'
import { PrinterStateMacro } from '@/store/printer/types'
import { GuiMacrosStateMacrogroupMacro } from '@/store/gui/macros/types'
import { mdiCodeTags, mdiViewGridOutline } from '@mdi/js'
@Component({
    components: { MacroButton, Panel, draggable },
})
export default class MacrogroupPanel extends Mixins(BaseMixin) {
    mdiCodeTags = mdiCodeTags
    mdiViewGridOutline = mdiViewGridOutline

    reorderMode = false

    @Prop({ required: true }) declare panelId: string

    get macrogroup() {
        return this.$store.getters['gui/macros/getMacrogroup'](this.panelId)
    }

    get allMacros() {
        return this.$store.getters['printer/getMacros'] ?? []
    }

    get fullMacros(): GuiMacrosStateMacrogroupMacro[] {
        return [...(this.macrogroup?.macros ?? [])].sort(
            (a: GuiMacrosStateMacrogroupMacro, b: GuiMacrosStateMacrogroupMacro) => a.pos - b.pos
        )
    }

    isMacroVisible(macro: GuiMacrosStateMacrogroupMacro): boolean {
        if (
            !this.allMacros.find(
                (existMacro: PrinterStateMacro) => existMacro.name.toLowerCase() === macro.name.toLowerCase()
            )
        )
            return false

        return (
            (macro.showInStandby && ['standby', 'cancelled', 'complete', 'error'].includes(this.printer_state)) ||
            (macro.showInPause && this.printer_state === 'paused') ||
            (macro.showInPrinting && this.printer_state === 'printing')
        )
    }

    get macros(): GuiMacrosStateMacrogroupMacro[] {
        return this.fullMacros.filter((macro: GuiMacrosStateMacrogroupMacro) => this.isMacroVisible(macro))
    }

    set macros(newVal: GuiMacrosStateMacrogroupMacro[]) {
        let visibleIndex = 0
        const merged = this.fullMacros.map((macro: GuiMacrosStateMacrogroupMacro) =>
            this.isMacroVisible(macro) ? newVal[visibleIndex++] : macro
        )
        const reordered = merged.map((macro: GuiMacrosStateMacrogroupMacro, pos: number) => ({ ...macro, pos }))

        this.$store.dispatch('gui/macros/groupUpdate', {
            id: this.panelId,
            values: { macros: reordered },
        })
    }

    get macrogroupStatus() {
        return (
            (this.macrogroup.showInStandby &&
                ['standby', 'cancelled', 'complete', 'error'].includes(this.printer_state)) ||
            (this.macrogroup.showInPause && this.printer_state === 'paused') ||
            (this.macrogroup.showInPrinting && this.printer_state === 'printing')
        )
    }

    getColor(macro: GuiMacrosStateMacrogroupMacro) {
        if (macro.color === 'group') {
            if (this.macrogroup.color === 'custom') return this.macrogroup.colorCustom
            else return this.macrogroup.color
        }

        return macro.color
    }

    toggleReorderMode() {
        this.reorderMode = !this.reorderMode
    }
}
</script>

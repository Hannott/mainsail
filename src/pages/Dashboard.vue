<template>
    <div class="dashboard" :class="{ 'dashboard--dragging': dragging }">
        <v-row>
            <v-col v-for="column in columns" :key="`dashboard-column-${column.index}`" :class="column.class">
                <status-panel v-if="column.index < 2" />
                <draggable
                    :value="panelsByColumn[column.index]"
                    :group="dragGroup"
                    :handle="dragHandle"
                    :filter="dragFilter"
                    :prevent-on-filter="false"
                    :delay="dragDelay"
                    :delay-on-touch-only="false"
                    :touch-start-threshold="5"
                    :animation="200"
                    :force-fallback="true"
                    :fallback-on-body="true"
                    class="dashboard-dropzone"
                    ghost-class="dashboard-panel--placeholder"
                    drag-class="dashboard-panel--dragged"
                    fallback-class="dashboard-panel--dragged"
                    @choose="dragging = true"
                    @unchoose="dragging = false"
                    @end="dragging = false"
                    @input="saveColumn(column.index, $event)">
                    <component
                        :is="extractPanelName(component.name)"
                        v-for="component in panelsByColumn[column.index]"
                        :key="`dashboard-${viewport}-${column.index}-${component.name}`"
                        :panel-id="extractPanelId(component.name)"></component>
                </draggable>
            </v-col>
        </v-row>
    </div>
</template>

<script lang="ts">
import Component from 'vue-class-component'
import { Mixins } from 'vue-property-decorator'
import draggable from 'vuedraggable'
import AfcPanel from '@/components/panels/AfcPanel.vue'
import ExtruderControlPanel from '@/components/panels/ExtruderControlPanel.vue'
import DashboardMixin from '@/components/mixins/dashboard'
import KlippyStatePanel from '@/components/panels/KlippyStatePanel.vue'
import LedEffectsPanel from '@/components/panels/LedEffectsPanel.vue'
import MachineSettingsPanel from '@/components/panels/MachineSettingsPanel.vue'
import MacrogroupPanel from '@/components/panels/MacrogroupPanel.vue'
import MacrosPanel from '@/components/panels/MacrosPanel.vue'
import MiniconsolePanel from '@/components/panels/MiniconsolePanel.vue'
import MinSettingsPanel from '@/components/panels/MinSettingsPanel.vue'
import MiscellaneousPanel from '@/components/panels/MiscellaneousPanel.vue'
import SpoolmanPanel from '@/components/panels/SpoolmanPanel.vue'
import MmuPanel from '@/components/panels/MmuPanel.vue'
import StatusPanel from '@/components/panels/StatusPanel.vue'
import ToolheadControlPanel from '@/components/panels/ToolheadControlPanel.vue'
import TemperaturePanel from '@/components/panels/TemperaturePanel.vue'
import WebcamPanel from '@/components/panels/WebcamPanel.vue'
import { GuiStateLayoutoption } from '@/store/gui/types'

interface DashboardColumn {
    index: number
    class: string
}

@Component({
    components: {
        AfcPanel,
        draggable,
        ExtruderControlPanel,
        KlippyStatePanel,
        LedEffectsPanel,
        MachineSettingsPanel,
        MacrogroupPanel,
        MacrosPanel,
        MiniconsolePanel,
        MinSettingsPanel,
        MiscellaneousPanel,
        SpoolmanPanel,
        MmuPanel,
        StatusPanel,
        ToolheadControlPanel,
        TemperaturePanel,
        WebcamPanel,
    },
})
export default class PageDashboard extends Mixins(DashboardMixin) {
    // panels are grabbed by their toolbar, but the buttons inside of it must stay clickable
    dragHandle = '.panel-toolbar'
    dragFilter = '.v-btn, button, input, textarea, select, .v-input, .v-menu__content'

    // press and hold before a panel is picked up, to not interfere with clicking and scrolling
    dragDelay = 350

    dragging = false

    get columns(): DashboardColumn[] {
        switch (this.viewport) {
            case 'mobile':
                return [{ index: 0, class: '' }]

            case 'tablet':
                return [
                    { index: 1, class: 'col-6' },
                    { index: 2, class: 'col-6' },
                ]

            case 'desktop':
                return [
                    { index: 1, class: 'col-5' },
                    { index: 2, class: 'col-7' },
                ]

            default:
                return [
                    { index: 1, class: 'col-3' },
                    { index: 2, class: 'col-5' },
                    { index: 3, class: 'col-4' },
                ]
        }
    }

    get panelsByColumn(): Record<number, GuiStateLayoutoption[]> {
        const output: Record<number, GuiStateLayoutoption[]> = {}
        this.columns.forEach((column) => {
            output[column.index] = this.$store.getters['gui/getPanels'](this.viewport, column.index, true)
        })

        return output
    }

    // panels can only be dragged between the columns of the current viewport
    get dragGroup() {
        return `dashboard-${this.viewport}`
    }

    extractPanelName(name: string) {
        return name.split('_')[0] + '-panel'
    }

    extractPanelId(name: string) {
        return name.split('_')[1] ?? null
    }

    saveColumn(column: number, panels: GuiStateLayoutoption[]) {
        const layoutName = column ? `${this.viewport}Layout${column}` : `${this.viewport}Layout`
        const storedPanels = this.$store.getters['gui/getStoredPanels'](this.viewport, column)

        this.$store.dispatch('gui/saveSetting', {
            name: `dashboard.${layoutName}`,
            value: this.mergeLayout(storedPanels, this.panelsByColumn[column] ?? [], panels),
        })
    }
}
</script>

<style scoped>
.dashboard-dropzone {
    min-height: 64px;
    border-radius: 8px;
    outline: 2px dotted transparent;
    outline-offset: 6px;
    transition:
        outline-color 150ms ease-in-out,
        background-color 150ms ease-in-out;
}

/* highlight the columns as drop targets, as soon as a panel is picked up */
.dashboard--dragging .dashboard-dropzone {
    outline-color: var(--v-primary-base);
    background-color: rgba(125, 125, 125, 0.06);
}
</style>

<style>
.dashboard-dropzone .panel-toolbar {
    cursor: grab;
    /* a long press on the handle must not select text or open the context menu on touch devices */
    user-select: none;
    -webkit-touch-callout: none;
}

.dashboard--dragging .dashboard-dropzone .panel-toolbar {
    cursor: grabbing;
}

/* the empty slot which marks the current drop position */
.dashboard-panel--placeholder {
    background-color: transparent !important;
    box-shadow: none !important;
    outline: 2px dotted var(--v-primary-base);
    outline-offset: -2px;
}

.dashboard-panel--placeholder > * {
    visibility: hidden;
}

/* the panel which follows the cursor */
.dashboard-panel--dragged {
    cursor: grabbing !important;
    opacity: 0.9;
    box-shadow:
        0 0 0 1px var(--v-primary-base),
        0 12px 24px rgba(0, 0, 0, 0.4) !important;
    pointer-events: none;
}
</style>

import Component from 'vue-class-component'
import BaseMixin from '@/components/mixins/base'
import { capitalize } from '@/plugins/helpers'
import { GuiMacrosStateMacrogroup } from '@/store/gui/macros/types'
import {
    mdiArrowCollapseVertical,
    mdiCodeTags,
    mdiConsoleLine,
    mdiDipSwitch,
    mdiEngine,
    mdiGamepad,
    mdiInformation,
    mdiLedStrip,
    mdiPrinter3dNozzle,
    mdiThermometerLines,
    mdiWebcam,
    mdiAdjust,
    mdiMulticast,
} from '@mdi/js'
import { afcIconLogo } from '@/plugins/afcIcons'
import { GuiStateLayoutoption } from '@/store/gui/types'

// a panel of a stored layout which is not rendered on the dashboard, and therefore cannot be dragged
interface LayoutFixedPanel {
    panel: GuiStateLayoutoption
    predecessor: string | null
    successor: string | null
}

@Component
export default class DashboardMixin extends BaseMixin {
    get macrogroups() {
        return this.$store.getters['gui/macros/getAllMacrogroups'] ?? []
    }

    get webcams() {
        return this.$store.getters['gui/webcams/getWebcams'] ?? []
    }

    getPanelName(name: string) {
        if (name.startsWith('macrogroup_')) {
            const groupId = name.split('_')[1] ?? ''
            const group = this.macrogroups.find((group: GuiMacrosStateMacrogroup) => group.id === groupId)

            return group ? group.name : 'Macrogroup'
        }

        if (name.includes('-')) {
            let panelName = ''
            const subStrings = name.split('-')
            subStrings.forEach((subStr) => {
                panelName += capitalize(subStr)
            })
            return this.$t(`Panels.${panelName}Panel.Headline`)
        }

        return this.$t(`Panels.${capitalize(name)}Panel.Headline`)
    }

    convertPanelnameToIcon(name: string): string {
        if (name.startsWith('macrogroup_')) return mdiCodeTags

        switch (name) {
            case 'webcam':
                return mdiWebcam
            case 'zoffset':
                return mdiArrowCollapseVertical
            case 'toolhead-control':
                return mdiGamepad
            case 'macros':
                return mdiCodeTags
            case 'miscellaneous':
                return mdiDipSwitch
            case 'led-effects':
                return mdiLedStrip
            case 'temperature':
                return mdiThermometerLines
            case 'miniconsole':
                return mdiConsoleLine
            case 'machine-settings':
                return mdiEngine
            case 'extruder-control':
                return mdiPrinter3dNozzle
            case 'spoolman':
                return mdiAdjust
            case 'mmu':
                return mdiMulticast
            case 'afc':
                return afcIconLogo

            default:
                return mdiInformation
        }
    }

    /**
     * Merges a reordered list of visible panels back into a stored layout.
     *
     * The dashboard only renders the visible and currently available panels, so the stored layout
     * contains additional entries which cannot be reordered by drag and drop. To keep the layout of the
     * settings page intact, those entries are kept next to the neighbour they were stored next to.
     *
     * @param storedPanels the layout as it is stored in the database
     * @param oldPanels the visible panels of the column before the drag
     * @param newPanels the visible panels of the column after the drag
     */
    mergeLayout(
        storedPanels: GuiStateLayoutoption[],
        oldPanels: GuiStateLayoutoption[],
        newPanels: GuiStateLayoutoption[]
    ): GuiStateLayoutoption[] {
        const draggableNames = new Set(oldPanels.map((panel) => panel.name))
        const storedByName = new Map(storedPanels.map((panel) => [panel.name, panel]))

        // the dragged panels define the base order of the new layout
        const output = newPanels.map((panel) => storedByName.get(panel.name) ?? { name: panel.name, visible: true })
        const movableNames = new Set(output.map((panel) => panel.name))

        // collect all entries which are not draggable, together with their stored neighbours
        const fixedPanels: LayoutFixedPanel[] = []
        let predecessor: string | null = null
        storedPanels.forEach((panel) => {
            if (draggableNames.has(panel.name)) {
                // only the entries after the last draggable panel are still missing their successor
                fixedPanels.forEach((entry) => {
                    if (entry.successor === null) entry.successor = panel.name
                })

                predecessor = panel.name
                return
            }

            fixedPanels.push({ panel, predecessor, successor: null })
        })

        // put them back behind their predecessor, or in front of their successor if it moved away
        fixedPanels.forEach((entry) => {
            let index = output.length

            if (entry.predecessor !== null && movableNames.has(entry.predecessor)) {
                index = output.findIndex((panel) => panel.name === entry.predecessor) + 1

                // keep entries which share a predecessor in their stored order
                while (index < output.length && !movableNames.has(output[index].name)) index++
            } else if (entry.successor !== null && movableNames.has(entry.successor)) {
                index = output.findIndex((panel) => panel.name === entry.successor)
            }

            output.splice(index, 0, entry.panel)
        })

        return output
    }
}

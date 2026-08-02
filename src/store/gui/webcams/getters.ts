import { GetterTree } from 'vuex'
import { GuiWebcamState, GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { RootState } from '@/store/types'

const sortByOrder = (webcams: GuiWebcamStateWebcam[], order: string[]): GuiWebcamStateWebcam[] => {
    const rank = (name: string) => {
        const index = order.indexOf(name)
        return index === -1 ? order.length : index
    }

    return [...webcams].sort((a, b) => rank(a.name) - rank(b.name))
}

export const getters: GetterTree<GuiWebcamState, RootState> = {
    getAllWebcams: (state, getters, rootState) => {
        return sortByOrder(state.webcams, rootState.gui?.view?.webcam?.order ?? [])
    },

    getWebcams: (_, getters) => {
        return getters['getAllWebcams'].filter((webcam: GuiWebcamStateWebcam) => webcam.enabled)
    },

    getWebcam: (_, getters) => (name: string) => {
        const webcams = getters['getWebcams'] ?? []

        return webcams.find((webcam: GuiWebcamStateWebcam) => webcam.name === name)
    },
}

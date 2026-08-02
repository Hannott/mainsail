<template>
    <div>
        <v-divider v-if="boolBorderTop" class="my-2" />
        <v-row class="mx-0" :style="draggableBgStyle">
            <v-col class="col-auto pr-0 d-flex align-center">
                <v-icon class="handle">{{ mdiDragVertical }}</v-icon>
            </v-col>
            <v-col class="pl-0">
                <settings-row :title="webcam.name" :icon="icon" :sub-title="subtitle">
                    <template v-if="webcam.source === 'database'">
                        <v-btn
                            class="minwidth-0 px-2"
                            small
                            outlined
                            :color="webcam.enabled ? '' : 'secondary'"
                            @click="toogleStatus">
                            <v-icon small>{{ mdiLightbulbOutline }}</v-icon>
                        </v-btn>
                        <v-btn class="ml-3" small outlined @click="edit">
                            <v-icon small left>{{ mdiPencil }}</v-icon>
                            {{ $t('Settings.Edit') }}
                        </v-btn>
                        <v-btn small outlined class="ml-3 minwidth-0 px-2" color="error" @click="deleteWebcam">
                            <v-icon small>{{ mdiDelete }}</v-icon>
                        </v-btn>
                    </template>
                </settings-row>
            </v-col>
        </v-row>
    </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { mdiDelete, mdiDragVertical, mdiPencil, mdiLightbulbOutline } from '@mdi/js'
import WebcamMixin from '@/components/mixins/webcam'
import ThemeMixin from '@/components/mixins/theme'

@Component({
    components: {
        SettingsRow,
    },
})
export default class WebcamListEntry extends Mixins(BaseMixin, WebcamMixin, ThemeMixin) {
    mdiPencil = mdiPencil
    mdiDelete = mdiDelete
    mdiDragVertical = mdiDragVertical
    mdiLightbulbOutline = mdiLightbulbOutline

    @Prop({ type: Object, default: () => {} }) private webcam!: GuiWebcamStateWebcam
    @Prop({ type: Boolean, default: false }) private boolBorderTop!: boolean

    get icon() {
        return this.convertWebcamIcon(this.webcam.icon)
    }

    get subtitle() {
        if (this.webcam.service === 'mjpegstreamer-adaptive') return `URL: ${this.webcam.snapshot_url}`

        return `URL: ${this.webcam.stream_url}`
    }

    toogleStatus() {
        const webcam = { ...this.webcam }
        webcam.enabled = !webcam.enabled
        this.$store.dispatch('gui/webcams/update', { webcam: webcam, oldWebcamName: webcam.name })
    }

    edit() {
        this.$emit('edit-webcam', this.webcam)
    }

    deleteWebcam() {
        this.$store.dispatch('gui/webcams/delete', this.webcam.name)
    }
}
</script>

<style scoped></style>

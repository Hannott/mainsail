<template>
    <div ref="gcodeWrapper" class="gcode-command-field-wrapper">
        <v-textarea
            ref="gcodeCommandField"
            v-model="gcode"
            :items="items"
            :label="$t('Panels.MiniconsolePanel.SendCode')"
            solo
            class="gcode-command-field"
            autocomplete="off"
            no-resize
            auto-grow
            :rows="rows"
            hide-details
            outlined
            dense
            :prepend-icon="isTouchDevice ? mdiChevronDoubleRight : ''"
            :append-icon="mdiSend"
            @keydown.enter.prevent.stop="doSend"
            @keydown.up="onKeyUp"
            @keydown.down="onKeyDown"
            @keydown.tab="onTab"
            @keydown.right="onRightArrow"
            @keyup="onCursorActivity"
            @click="onCursorActivity"
            @click:prepend="onAutocomplete"
            @click:append="doSend" />
        <div
            v-if="activeParam || activeValueSuffix"
            class="gcode-ghost-overlay"
            :style="overlayStyle"
            aria-hidden="true">
            <span class="gcode-ghost-mirror">{{ gcode }}</span>
            <span class="gcode-ghost-text">{{ activeParam ? `${activeParam}=` : activeValueSuffix }}</span>
        </div>
    </div>
</template>
<script lang="ts">
import { Component, Mixins, Ref, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import ConsoleMixin from '@/components/mixins/console'
import { mdiSend, mdiChevronDoubleRight } from '@mdi/js'
import {
    PrinterStateGcodeCommand,
    PrinterStateGcodeCommandParam,
    PrinterStateMacro,
    PrinterStateMacroParam,
    VTextareaType,
} from '@/store/printer/types'
import { strLongestEqual } from '@/plugins/helpers'
import throttle from 'lodash.throttle'

@Component
export default class ConsoleTextarea extends Mixins(BaseMixin, ConsoleMixin) {
    mdiSend = mdiSend
    mdiChevronDoubleRight = mdiChevronDoubleRight

    @Ref() readonly gcodeCommandField!: VTextareaType

    gcode = ''
    lastCommandNumber: number | null = null
    items = []

    activeParam: string | null = null
    remainingParams: string[] = []
    activeParamIndex = 0

    activeValue: string | null = null
    activeValueSuffix: string | null = null
    matchingValues: string[] = []
    activeValueIndex = 0
    typedValuePrefix = ''

    overlayStyle: Record<string, string> = {}
    resizeObserver: ResizeObserver | null = null

    get rows(): number {
        return this.gcode?.split('\n').length ?? 1
    }

    @Watch('gcode')
    onGcodeChanged(): void {
        this.activeParamIndex = 0
        this.activeValueIndex = 0
        this.$nextTick(() => {
            this.refreshGhostParam()
            this.updateOverlayRect()
        })
    }

    mounted(): void {
        this.$nextTick(() => {
            const textarea = this.gcodeCommandField?.$refs?.input
            if (textarea) {
                this.resizeObserver = new ResizeObserver(throttle(() => this.updateOverlayRect(), 50))
                this.resizeObserver.observe(textarea)
            }
            this.updateOverlayRect()
        })
    }

    beforeDestroy(): void {
        this.resizeObserver?.disconnect()
    }

    getCurrentLine(): number {
        const textarea = this.gcodeCommandField.$refs.input
        const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart)
        return textBeforeCursor.split('\n').length
    }

    setGcode(gcode: string): void {
        this.gcode = gcode

        this.$nextTick(() => {
            this.gcodeCommandField.focus()
        })
    }

    onKeyUp(event: KeyboardEvent): void {
        const currentLine = this.getCurrentLine()
        if (this.rows > 1 && currentLine > 1) return

        event.preventDefault()
        if (this.lastCommandNumber === null && this.lastCommands.length) {
            this.lastCommandNumber = this.lastCommands.length - 1
            this.gcode = this.lastCommands[this.lastCommandNumber]
        } else if (this.lastCommandNumber && this.lastCommandNumber > 0) {
            this.lastCommandNumber--
            this.gcode = this.lastCommands[this.lastCommandNumber]
        }
    }

    onKeyDown(event: KeyboardEvent): void {
        const currentLine = this.getCurrentLine()
        if (this.rows > currentLine) return

        event.preventDefault()

        if (this.lastCommandNumber === null) return

        if (this.lastCommandNumber < this.lastCommands.length - 1) {
            this.lastCommandNumber++
            this.gcode = this.lastCommands[this.lastCommandNumber]
        } else if (this.lastCommandNumber === this.lastCommands.length - 1) {
            this.lastCommandNumber = null
            this.gcode = ''
        }
    }

    doSend(cmd: KeyboardEvent) {
        if (cmd.shiftKey) {
            this.gcode += '\n'
            return
        }

        if (this.gcode === '') return

        this.$store.dispatch('printer/sendGcode', this.gcode)
        this.$store.dispatch('gui/gcodehistory/addToHistory', this.gcode)
        this.gcode = ''
        this.lastCommandNumber = null
    }

    onAutocomplete(e: Event): void {
        e.preventDefault()

        if (!this.gcode.length) return

        const textarea = this.gcodeCommandField.$refs.input
        const currentPosition = textarea.selectionStart
        const beforeCursor = this.gcode.substring(0, currentPosition)
        const lastNewlineIndex = beforeCursor.lastIndexOf('\n')
        const currentLine = beforeCursor.substring(lastNewlineIndex + 1)

        const currentLineUpperCase = currentLine.toUpperCase()
        const commands = this.helplist.filter((element) => element.command.startsWith(currentLineUpperCase))

        if (commands.length === 0) return

        if (commands?.length === 1) {
            this.updateGcode(commands[0].command, lastNewlineIndex, currentPosition)
            return
        }

        const longestCommon = commands.reduce((acc, val) => {
            return strLongestEqual(acc, val.command)
        }, commands[0].command)

        let output = ''
        commands.forEach(
            (command) => (output += `<a class="command font-weight-bold">${command.command}</a>: ${command.help}<br />`)
        )

        this.$store.dispatch('server/addEvent', { message: output, type: 'autocomplete' })

        this.updateGcode(longestCommon, lastNewlineIndex, currentPosition)
    }

    updateGcode(text: string, start: number, end: number) {
        this.gcode = this.gcode.substring(0, start + 1) + text + this.gcode.substring(end)
    }

    onTab(e: KeyboardEvent): void {
        if (this.activeValue !== null && this.matchingValues.length) {
            e.preventDefault()
            const direction = e.shiftKey ? -1 : 1
            const length = this.matchingValues.length
            this.activeValueIndex = (this.activeValueIndex + direction + length) % length
            this.activeValue = this.matchingValues[this.activeValueIndex]
            this.activeValueSuffix = this.activeValue.substring(this.typedValuePrefix.length)
            return
        }

        if (this.activeParam !== null && this.remainingParams.length) {
            e.preventDefault()
            const direction = e.shiftKey ? -1 : 1
            const length = this.remainingParams.length
            this.activeParamIndex = (this.activeParamIndex + direction + length) % length
            this.activeParam = this.remainingParams[this.activeParamIndex]
            return
        }

        this.onAutocomplete(e)
    }

    onRightArrow(e: KeyboardEvent): void {
        if (this.activeValue !== null) {
            e.preventDefault()

            this.gcode = this.gcode.substring(0, this.gcode.length - this.typedValuePrefix.length) + this.activeValue

            this.$nextTick(() => {
                this.gcodeCommandField?.$refs?.input?.setSelectionRange(this.gcode.length, this.gcode.length)
            })
            return
        }

        if (this.activeParam === null) return

        e.preventDefault()

        this.gcode += `${this.activeParam}=`

        this.$nextTick(() => {
            this.gcodeCommandField?.$refs?.input?.setSelectionRange(this.gcode.length, this.gcode.length)
        })
    }

    onCursorActivity(): void {
        this.refreshGhostParam()
    }

    getParams(name: string): { [key: string]: PrinterStateGcodeCommandParam | PrinterStateMacroParam } | null {
        const command: PrinterStateGcodeCommand | undefined =
            this.$store.state.printer.gcode?.commands?.[name.toUpperCase()]
        const macro: PrinterStateMacro | undefined = this.$store.getters['printer/getMacro'](name)

        return command?.params ?? macro?.params ?? null
    }

    refreshGhostParam(): void {
        const textarea = this.gcodeCommandField?.$refs?.input
        if (!textarea) return

        const cursorAtEnd =
            textarea.selectionStart === textarea.selectionEnd && textarea.selectionStart === this.gcode.length

        const lastNewlineIndex = this.gcode.lastIndexOf('\n')
        const currentLine = this.gcode.substring(lastNewlineIndex + 1)
        const macroNameMatch = currentLine.match(/^(\S+)\s/)

        const params = cursorAtEnd && macroNameMatch ? this.getParams(macroNameMatch[1]) : null

        if (!cursorAtEnd || !macroNameMatch || !params) {
            this.activeParam = null
            this.remainingParams = []
            this.activeValue = null
            this.activeValueSuffix = null
            this.matchingValues = []
            return
        }

        const allParamNames = Object.keys(params).filter((paramName) => !paramName.startsWith('_'))
        const rest = currentLine.substring(macroNameMatch[1].length).trim()
        const tokens = rest.length ? rest.split(/\s+/) : []
        const provided = new Set(tokens.map((token) => token.split('=')[0].toUpperCase()))

        this.remainingParams = allParamNames.filter((name) => !provided.has(name.toUpperCase()))

        // Value-suggestion mode: cursor sits right after "KEY=", optionally with part of
        // the value already typed (eg "HEATER=ext"), so the line has no trailing space yet.
        const lastToken = tokens[tokens.length - 1] ?? ''
        const equalsIndex = lastToken.indexOf('=')

        if (!currentLine.endsWith(' ') && equalsIndex !== -1) {
            const key = lastToken.substring(0, equalsIndex).toUpperCase()
            const typedValue = lastToken.substring(equalsIndex + 1)
            const paramName = allParamNames.find((name) => name.toUpperCase() === key)
            const param = paramName ? params[paramName] : undefined
            const enumValues = param && 'enum' in param ? param.enum : undefined
            const matches = enumValues?.filter((value) => value.toLowerCase().startsWith(typedValue.toLowerCase()))

            if (matches?.length) {
                this.activeParam = null
                this.typedValuePrefix = typedValue
                this.matchingValues = matches
                this.activeValueIndex = this.activeValueIndex % matches.length
                this.activeValue = matches[this.activeValueIndex]
                this.activeValueSuffix = this.activeValue.substring(typedValue.length)
                return
            }
        }

        this.activeValue = null
        this.activeValueSuffix = null
        this.matchingValues = []

        if (!this.remainingParams.length || !currentLine.endsWith(' ')) {
            this.activeParam = null
            return
        }

        this.activeParamIndex = this.activeParamIndex % this.remainingParams.length
        this.activeParam = this.remainingParams[this.activeParamIndex]
    }

    updateOverlayRect(): void {
        const wrapper = this.$refs.gcodeWrapper as HTMLElement | undefined
        const textarea = this.gcodeCommandField?.$refs?.input
        if (!wrapper || !textarea) return

        const wrapperRect = wrapper.getBoundingClientRect()
        const textareaRect = textarea.getBoundingClientRect()
        const computed = window.getComputedStyle(textarea)

        this.overlayStyle = {
            top: `${textareaRect.top - wrapperRect.top}px`,
            left: `${textareaRect.left - wrapperRect.left}px`,
            width: `${textareaRect.width}px`,
            minHeight: `${textareaRect.height}px`,
            boxSizing: computed.boxSizing,
            padding: computed.padding,
            borderWidth: computed.borderWidth,
            borderStyle: 'solid',
            borderColor: 'transparent',
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            fontStyle: computed.fontStyle,
            lineHeight: computed.lineHeight,
            letterSpacing: computed.letterSpacing,
            wordSpacing: computed.wordSpacing,
        }
    }
}
</script>

<style scoped>
.gcode-command-field-wrapper {
    position: relative;
}

.gcode-command-field {
    font-family: 'Roboto Mono', monospace;
}

.gcode-ghost-overlay {
    position: absolute;
    overflow: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
    pointer-events: none;
    user-select: none;
}

.gcode-ghost-mirror {
    color: transparent;
}

.gcode-ghost-text {
    opacity: 0.5;
}
</style>

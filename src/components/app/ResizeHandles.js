import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class ResizeHandles extends LitElement {
    constructor() {
        super();
        this._activePointer = null;
        this._stopResize = this._stopResize.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener('blur', this._stopResize);
    }

    disconnectedCallback() {
        window.removeEventListener('blur', this._stopResize);
        this._stopResize();
        super.disconnectedCallback();
    }

    _startResize(edge, event) {
        if (event.button !== 0 || this._activePointer || !window.electronAPI) return;
        const handle = event.currentTarget;
        handle.setPointerCapture(event.pointerId);
        this._activePointer = { id: event.pointerId, handle };
        window.electronAPI.send('window-manual-resize-start', {
            edge,
            startX: event.screenX,
            startY: event.screenY,
        });
    }

    _onPointerMove(event) {
        if (event.pointerId !== this._activePointer?.id) return;
        window.electronAPI?.send('window-manual-resize-step', {
            dx: event.screenX,
            dy: event.screenY,
        });
    }

    _stopResize(event) {
        const pointer = this._activePointer;
        if (!pointer || (event?.pointerId !== undefined && event.pointerId !== pointer.id)) return;
        this._activePointer = null;
        if (pointer.handle.hasPointerCapture(pointer.id)) pointer.handle.releasePointerCapture(pointer.id);
        window.electronAPI?.send('window-manual-resize-end');
    }

    static styles = css`
        :host {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 99999;
        }
        .handle {
            position: absolute;
            pointer-events: auto;
            touch-action: none;
            -webkit-app-region: no-drag;
            background: var(--accent, #3b82f6);
            opacity: 0.7;
            border-radius: 2px;
            transition: opacity 0.15s;
        }
        .handle:hover {
            opacity: 1;
        }
        .handle-h {
            height: 8px;
            left: 0;
            right: 0;
            cursor: ns-resize;
        }
        .handle-v {
            width: 8px;
            top: 0;
            bottom: 0;
            cursor: ew-resize;
        }
        .handle-t {
            top: -4px;
        }
        .handle-b {
            bottom: -4px;
        }
        .handle-l {
            left: -4px;
        }
        .handle-r {
            right: -4px;
        }
        .handle-corner {
            width: 16px;
            height: 16px;
            z-index: 100000;
            background: var(--accent, #3b82f6);
            opacity: 0.9;
            cursor: nwse-resize;
        }
        .handle-tl {
            top: -8px;
            left: -8px;
            cursor: nwse-resize;
        }
        .handle-tr {
            top: -8px;
            right: -8px;
            cursor: nesw-resize;
        }
        .handle-bl {
            bottom: -8px;
            left: -8px;
            cursor: nesw-resize;
        }
        .handle-br {
            bottom: -8px;
            right: -8px;
            cursor: nwse-resize;
        }
    `;

    render() {
        return ['t', 'b', 'l', 'r', 'tl', 'tr', 'bl', 'br'].map(edge => {
            const kind = edge.length === 2 ? 'corner' : edge === 't' || edge === 'b' ? 'h' : 'v';
            return html`<div
                class="handle handle-${kind} handle-${edge}"
                @pointerdown=${event => this._startResize(edge, event)}
                @pointermove=${this._onPointerMove}
                @pointerup=${this._stopResize}
                @pointercancel=${this._stopResize}
                @lostpointercapture=${this._stopResize}
            ></div>`;
        });
    }
}

customElements.define('resize-handles', ResizeHandles);

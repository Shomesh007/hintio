import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
export const ICON_PATHS = {
    home: 'M3 10 12 3 21 10M5 9v12h5v-7h4v7h5V9',
    psychology: 'M9 18v3m6-3v3M8 18h8a3 3 0 0 0 3-3v-4a7 7 0 0 0-14 0v4a3 3 0 0 0 3 3ZM9 9h.01M15 9h.01M9 13h6',
    history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v6l4 2',
    tune: 'M4 6h5m4 0h7M4 12h9m4 0h3M4 18h2m4 0h10M9 3v6m4 0V3M13 9v6m4 0V9M6 15v6m4 0v-6',
    rate_review: 'M4 4h16v12H9l-5 5V4ZM8 8h8M8 12h5',
    help: 'M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    minimize: 'M5 12h14',
    close: 'M6 6l12 12M18 6 6 18',
    terminal: 'M4 4h16v16H4V4ZM7 8l3 3-3 3M12 16h5',
    content_copy: 'M8 8h12v13H8V8ZM16 4V2H3v14h2',
    chevron_left: 'M15 5l-7 7 7 7',
    chevron_right: 'M9 5l7 7-7 7',
    mic: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V5ZM5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8',
    translate: 'M3 5h12M9 2v3M5 5c1 6 4 9 9 11M13 5c-1 5-4 9-10 12M14 22l5-12 5 12M16 18h6',
    palette: 'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4 2 2 0 0 1 1-4h3a3 3 0 0 0 3-3c0-4-4-7-9-7ZM7 10h.01M10 6h.01M15 6h.01M17 10h.01',
    keyboard: 'M2 5h20v14H2V5ZM5 9h1m3 0h1m3 0h1m3 0h2M5 13h1m3 0h1m3 0h1m3 0h2M7 16h10',
    shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3ZM8 12l3 3 5-6',
    delete_forever: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M9 10l6 6m0-6-6 6',
    star: 'm12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1 3-7Z',
    label: 'M3 5h11l8 7-8 7H3V5ZM7 9h.01',
    edit_note: 'M4 5h10M4 10h8M4 15h5M13 15l6-6 3 3-6 6-4 1 1-4Z',
    send: 'm3 3 18 9-18 9 4-9-4-9ZM7 12h14',
    check_circle: 'M8 12l3 3 5-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    error: 'M12 7v6m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    lightbulb: 'M9 18h6m-6 3h6M8 15a7 7 0 1 1 8 0l-1 3H9l-1-3Z',
    mouse: 'M5 9a7 7 0 0 1 14 0v6a7 7 0 0 1-14 0V9ZM12 3v6M5 10h14',
    keyboard_tab: 'M3 12h14m-5-5 5 5-5 5M21 5v14',
    crop_free: 'M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5',
    auto_awesome: 'm12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6ZM20 2v4m-2-2h4M3 18v4m-2-2h4',
    bolt: 'm13 2-9 12h7l-1 8 10-13h-7l1-7Z',
    visibility_off: 'M3 3l18 18M9 5a11 11 0 0 1 13 7 13 13 0 0 1-4 5M6 6a14 14 0 0 0-4 6s4 7 10 7a12 12 0 0 0 4-1M10 10a3 3 0 0 0 4 4',
    arrow_forward: 'M4 12h16m-6-6 6 6-6 6',
    arrow_back: 'M20 12H4m6-6-6 6 6 6',
    menu_book: 'M12 6C8 3 4 3 2 4v15c3-1 6-1 10 2m0-15c4-3 8-3 10-2v15c-3-1-6-1-10 2V6Z',
    search: 'M10 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM15 15l6 6',
};
export class HintioIcon extends LitElement {
    static properties = { name: { type: String } };
    static styles = css`
        :host {
            display: inline-flex;
            width: 1em;
            height: 1em;
            vertical-align: -0.12em;
            flex-shrink: 0;
            line-height: 1;
        }
        svg {
            display: block;
            width: 100%;
            height: 100%;
            overflow: visible;
        }
    `;
    constructor() {
        super();
        this.name = 'help';
    }
    render() {
        return html`<svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            <path d=${ICON_PATHS[this.name] || ICON_PATHS.help}></path>
        </svg>`;
    }
}
customElements.define('hintio-icon', HintioIcon);

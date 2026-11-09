export type ShortcutGroup = 'Capture' | 'Responses' | 'Window' | 'Text';
export interface Shortcut {
    keys: string[];
    action: string;
    detail: string;
    group: ShortcutGroup;
    macKeys?: string[];
}
export const shortcuts: Shortcut[] = [
    {
        keys: ['Ctrl', 'Enter'],
        action: 'Analyze one screen',
        detail: 'During a live session. On the home screen, this starts your session instead.',
        group: 'Capture',
    },
    {
        keys: ['Ctrl', 'Shift', 'Enter'],
        action: 'Add a screenshot to the batch',
        detail: 'Collect up to three screenshots. The third sends automatically; the batch also sends after 20 seconds.',
        group: 'Capture',
    },
    { keys: ['Ctrl', 'Shift', 'F'], action: 'Send the batch early', detail: 'Capture at least two screens first.', group: 'Capture' },
    {
        keys: ['Ctrl', 'Shift', 'D'],
        action: 'Analyze a failed test screenshot',
        detail: 'Uses the screenshot and previous code context to help diagnose a failure.',
        group: 'Capture',
    },
    { keys: ['Ctrl', '['], action: 'Previous response', detail: 'Go back through the responses in your current session.', group: 'Responses' },
    { keys: ['Ctrl', ']'], action: 'Next response', detail: 'Move forward through the responses in your current session.', group: 'Responses' },
    {
        keys: ['Ctrl', 'Shift', '↑ / ↓'],
        action: 'Scroll through the response',
        detail: 'Read a longer answer without reaching for the mouse.',
        group: 'Responses',
    },
    {
        keys: ['Ctrl', '↑ / ↓ / ← / →'],
        macKeys: ['Option', '↑ / ↓ / ← / →'],
        action: 'Move the window',
        detail: 'Nudge Hintio around your desktop.',
        group: 'Window',
    },
    {
        keys: ['Ctrl', 'Shift', 'R'],
        action: 'Dock left + switch to Exam Assistant',
        detail: 'Changes the profile as well as the position of the window.',
        group: 'Window',
    },
    { keys: ['Ctrl', 'Shift', 'Q'], action: 'Dock right', detail: 'Place Hintio in a full-height panel on the right.', group: 'Window' },
    { keys: ['Ctrl', 'Shift', 'T'], action: 'Reset layout', detail: 'Return to the default size and top-center position.', group: 'Window' },
    {
        keys: ['Ctrl', 'M'],
        action: 'Toggle click-through',
        detail: 'In a live session, interact with the window behind Hintio. Press again to interact with Hintio.',
        group: 'Window',
    },
    { keys: ['Ctrl', '\\'], action: 'Show or hide Hintio', detail: 'Toggle the visibility of the app window.', group: 'Window' },
    { keys: ['Ctrl', 'Shift', 'Space'], action: 'Focus text input', detail: 'Expand and focus the live text input.', group: 'Text' },
    { keys: ['Ctrl', 'Alt', 'Enter'], action: 'Submit text input', detail: 'Send a typed follow-up from the live text input.', group: 'Text' },
];
export function platformKeys(shortcut: Shortcut, platform: 'windows' | 'mac'): string[] {
    if (platform === 'windows') return shortcut.keys;
    return shortcut.macKeys ?? shortcut.keys.map(key => (key === 'Ctrl' ? 'Cmd' : key === 'Alt' ? 'Option' : key));
}
export const profiles = ['Job Interview', 'Technical Interview', 'Sales Call', 'Business Meeting', 'Presentation', 'Negotiation', 'Exam Assistant'];

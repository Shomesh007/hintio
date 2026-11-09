import test from 'node:test';
import assert from 'node:assert/strict';
import { platformKeys, shortcuts } from '../src/marketing/shortcutData';

test('Mac window movement uses Option while capture uses Cmd', () => {
    const movement = shortcuts.find(item => item.action === 'Move the window')!;
    const capture = shortcuts.find(item => item.action === 'Add a screenshot to the batch')!;
    assert.deepEqual(platformKeys(movement, 'mac'), ['Option', '↑ / ↓ / ← / →']);
    assert.deepEqual(platformKeys(capture, 'mac'), ['Cmd', 'Shift', 'Enter']);
    assert.deepEqual(platformKeys(capture, 'windows'), ['Ctrl', 'Shift', 'Enter']);
});

test('switching platform does not mutate the Windows shortcut catalog', () => {
    const before = structuredClone(shortcuts);
    for (const item of shortcuts) platformKeys(item, 'mac');
    assert.deepEqual(shortcuts, before);
});

test('the guide does not assign one shortcut to conflicting actions', () => {
    for (const platform of ['windows', 'mac'] as const) {
        const combinations = shortcuts.map(item => platformKeys(item, platform).join('+'));
        assert.equal(new Set(combinations).size, combinations.length);
    }
});

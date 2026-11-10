const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function sourceFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? sourceFiles(full) : entry.name.endsWith('.js') ? [full] : [];
    });
}
test('UI icons have no network font or raw icon-name spans', () => {
    const files = [...sourceFiles(path.join(root, 'src/components')), path.join(root, 'src/index.html')];
    for (const file of files) {
        const source = fs.readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /Material Symbols|family=Material/, path.relative(root, file));
        assert.doesNotMatch(source, /<span\s+class="icon(?:\s[^"<>]*)?"[^<>]*>[a-z_]+<\/span>/, path.relative(root, file));
    }
});
test('the shared SVG set covers every literal icon and dynamic help/status icon', () => {
    const raw = fs.readFileSync(path.join(root, 'src/components/icons/HintioIcon.js'), 'utf8');
    const source = raw
        .replace(/^import .*;\r?\n/gm, '')
        .replace('export const ICON_PATHS', 'const ICON_PATHS')
        .replace('export class HintioIcon', 'class HintioIcon');
    const paths = vm.runInNewContext(source + '\nICON_PATHS;', { LitElement: class {}, css: () => '', customElements: { define() {} } });
    const names = new Set(['check_circle', 'error']);
    for (const file of sourceFiles(path.join(root, 'src/components'))) {
        const contents = fs.readFileSync(file, 'utf8');
        for (const pattern of [/name="([a-z_]+)"/g, /renderNavigationIcon\('([a-z_]+)'\)/g, /icon:\s*'([a-z_]+)'/g]) {
            for (const match of contents.matchAll(pattern)) names.add(match[1]);
        }
    }
    for (const name of names) assert.ok(typeof paths[name] === 'string' && paths[name].length > 0, 'Missing SVG icon: ' + name);
});

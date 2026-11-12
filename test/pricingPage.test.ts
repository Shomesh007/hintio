import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { productionRelease } from '../src/lib/productionRelease';

const localRequire = createRequire(import.meta.url);
const source = fs.readFileSync(new URL('../src/marketing/PricingPage.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const scope = {
    exports: {} as Record<string, any>,
    require: (name: string) => {
        if (name.endsWith('.css')) return {};
        if (name.includes('BillingManager')) return { default: () => null };
        if (name.includes('productionRelease')) return { productionRelease };
        return localRequire(name);
    },
};
vm.runInNewContext(compiled, scope);
type Element = { type?: string; props: { children?: unknown; onClick?: () => void; disabled?: boolean; href?: string } };
function elements(node: unknown): Element[] {
    if (Array.isArray(node)) return node.flatMap(elements);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const el = node as Element;
    return [el, ...elements(el.props.children)];
}
function text(node: unknown): string {
    if (Array.isArray(node)) return node.map(text).join('');
    if (typeof node === 'string') return node;
    if (node && typeof node === 'object' && 'props' in node) return text((node as Element).props.children);
    return '';
}
function fixture(loading = false) {
    const calls: string[] = [];
    const root = scope.exports.default({
        onDownload: () => calls.push('trial'),
        onUpgrade: (plan: string) => calls.push('buy:' + plan),
        onRecover: (plan: string) => calls.push('recover:' + plan),
        onMacDownload: () => calls.push('mac'),
        checkoutLoading: loading,
    });
    const nodes = elements(root);
    return {
        calls,
        nodes,
        button: (label: string) => {
            const button = nodes.find(n => n.type === 'button' && text(n.props.children).includes(label));
            assert(button, 'Missing action: ' + label);
            return button;
        },
    };
}
test('free trial action claims trial without opening paid checkout', () => {
    const f = fixture();
    f.button('Try Hintio free').props.onClick!();
    assert.deepEqual(f.calls, ['trial']);
});
test('each paid choice forwards the exact plan without claiming a trial', () => {
    const f = fixture();
    f.button('Choose monthly').props.onClick!();
    f.button('Choose yearly').props.onClick!();
    assert.deepEqual(f.calls, ['buy:monthly', 'buy:yearly']);
});
test('returning customers recover the matching plan without paying again', () => {
    const f = fixture();
    f.button('Retrieve monthly key').props.onClick!();
    f.button('Retrieve yearly key').props.onClick!();
    assert.deepEqual(f.calls, ['recover:monthly', 'recover:yearly']);
});
test('pending checkout disables both paid choices while retaining trial and recovery actions', () => {
    const f = fixture(true);
    const pending = f.nodes.filter(n => n.type === 'button' && text(n.props.children).includes('Opening checkout'));
    assert.equal(pending.length, 2);
    assert(pending.every(n => n.props.disabled));
    assert(!f.button('Try Hintio free').props.disabled);
    assert(!f.button('Retrieve monthly key').props.disabled);
});
test('existing key download stays on the stable installer independently of trial issuance', () => {
    const f = fixture();
    const a = f.nodes.find(n => n.type === 'a' && text(n.props.children).includes('Download Windows app'));
    assert.equal(a?.props.href, productionRelease.windowsDownloadUrl);
    assert.deepEqual(f.calls, []);
});

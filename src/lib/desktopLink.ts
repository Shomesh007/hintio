const linkCode = /(?:^#|&)hl=([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?=&|$)/;

// Removes a one-time desktop link code from a URL fragment. Returns the code and the fragment without it.
export function takeDesktopLinkCode(hash: string) {
    const match = hash.match(linkCode);
    if (!match) return { code: null, hash };
    const rest = hash
        .slice(1)
        .split('&')
        .filter(part => part !== `hl=${match[1]}`)
        .join('&');
    return { code: match[1], hash: rest ? `#${rest}` : '' };
}

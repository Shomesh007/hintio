// Public product support contacts. Keep these shared by desktop views.
export const SUPPORT_EMAIL = 'admin@builtbygsv.in';
export const SUPPORT_PHONE = '8438365095';
export const SUPPORT_PHONE_INTERNATIONAL = '+918438365095';
export const SUPPORT_EMAIL_URL = `mailto:${SUPPORT_EMAIL}`;
export const SUPPORT_WHATSAPP_URL = 'https://wa.me/918438365095';

// Opening a mail draft does not send a message. Users review and send it themselves.
export function makeSupportEmailDraft(subject, body) {
    const heading = String(subject || 'Hintio support')
        .replace(/[\r\n]/g, ' ')
        .slice(0, 100);
    let content = String(body || '').slice(0, 1600);
    let url;
    do {
        url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(heading)}&body=${encodeURIComponent(content)}`;
        if (url.length <= 1900) return url;
        content = content.slice(0, -100);
    } while (content.length);
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(heading)}`;
}

import { makeSupportEmailDraft, SUPPORT_EMAIL } from '../../utils/supportDetails.js';
import '../icons/HintioIcon.js';
import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class FeedbackView extends LitElement {
    static FEEDBACK_COOLDOWN_MS = 60 * 1000;
    static styles = [
        unifiedPageStyles,
        css`
            .icon {
                font-family: inherit;
                font-size: 20px;
                font-weight: normal;
                font-style: normal;
                line-height: 1;
                font-variation-settings:
                    'FILL' 1,
                    'wght' 400,
                    'GRAD' 0,
                    'opsz' 20;
                flex-shrink: 0;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            /* ── Rating stars ── */
            .rating-row {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .rating-label {
                font-size: 12px;
                color: var(--text-muted);
                margin-right: 4px;
            }

            .star-btn {
                background: none;
                border: none;
                cursor: pointer;
                padding: 2px;
                border-radius: 4px;
                color: var(--border-strong);
                font-family: inherit;
                font-size: 22px;
                font-weight: normal;
                line-height: 1;
                font-variation-settings:
                    'FILL' 0,
                    'wght' 400,
                    'GRAD' 0,
                    'opsz' 24;
                transition:
                    color var(--transition),
                    transform var(--transition);
            }

            .star-btn.active {
                color: #f59e0b;
                font-variation-settings:
                    'FILL' 1,
                    'wght' 400,
                    'GRAD' 0,
                    'opsz' 24;
            }

            .star-btn:hover {
                color: #f59e0b;
                transform: scale(1.2);
                font-variation-settings:
                    'FILL' 1,
                    'wght' 400,
                    'GRAD' 0,
                    'opsz' 24;
            }

            /* ── Category chips ── */
            .category-chips {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .chip {
                padding: 5px 12px;
                border: 1px solid var(--border);
                border-radius: 20px;
                background: var(--bg-elevated);
                color: var(--text-secondary);
                font-size: 12px;
                cursor: pointer;
                transition: all var(--transition);
                white-space: nowrap;
            }

            .chip:hover {
                border-color: #6366f1;
                color: var(--text-primary);
                background: rgba(99, 102, 241, 0.08);
            }

            .chip.selected {
                border-color: #6366f1;
                background: rgba(99, 102, 241, 0.15);
                color: #fff;
            }

            /* ── Textarea & inputs ── */
            .feedback-textarea {
                width: 100%;
                min-height: 120px;
                resize: vertical;
                padding: 10px 12px;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
                color: var(--text-primary);
                font-size: var(--font-size-sm);
                font-family: var(--font);
                line-height: 1.5;
                transition:
                    border-color var(--transition),
                    box-shadow var(--transition);
            }

            .feedback-textarea:focus {
                outline: none;
                border-color: #6366f1;
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
            }

            .feedback-textarea::placeholder {
                color: var(--text-muted);
            }

            .feedback-email {
                width: 100%;
                max-width: 300px;
                padding: 9px 12px;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
                color: var(--text-primary);
                font-size: var(--font-size-sm);
                font-family: var(--font);
                transition:
                    border-color var(--transition),
                    box-shadow var(--transition);
            }

            .feedback-email:focus {
                outline: none;
                border-color: #6366f1;
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
            }

            .feedback-email::placeholder {
                color: var(--text-muted);
            }

            /* ── Footer row ── */
            .footer-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-sm);
                flex-wrap: wrap;
            }

            .attach-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: var(--text-muted);
                cursor: pointer;
                user-select: none;
            }

            .attach-label input[type='checkbox'] {
                cursor: pointer;
                accent-color: #6366f1;
            }

            .char-count {
                font-size: 11px;
                color: var(--text-muted);
                font-family: var(--font-mono);
            }

            /* ── Submit button ── */
            .submit-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 9px 18px;
                border: none;
                border-radius: var(--radius-sm);
                background: #6366f1;
                color: #fff;
                font-size: var(--font-size-sm);
                font-weight: 600;
                cursor: pointer;
                transition:
                    background var(--transition),
                    box-shadow var(--transition),
                    transform var(--transition);
                box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
                white-space: nowrap;
            }

            .submit-btn:hover:not(:disabled) {
                background: #4f46e5;
                transform: translateY(-1px);
                box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
            }

            .submit-btn:disabled {
                opacity: 0.45;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            .submit-btn .icon {
                font-size: 16px;
                font-variation-settings:
                    'FILL' 1,
                    'wght' 400,
                    'GRAD' 0,
                    'opsz' 20;
            }

            /* ── Status message ── */
            .status-banner {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 14px;
                border-radius: var(--radius-sm);
                font-size: 13px;
                font-weight: 500;
            }

            .status-banner.success {
                background: rgba(34, 197, 94, 0.1);
                border: 1px solid rgba(34, 197, 94, 0.3);
                color: #4ade80;
            }

            .status-banner.error {
                background: rgba(239, 68, 68, 0.08);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #f87171;
            }
        `,
    ];

    static properties = {
        _feedbackText: { state: true },
        _feedbackEmail: { state: true },
        _feedbackStatus: { state: true },
        _feedbackSending: { state: true },
        _attachInfo: { state: true },
        _version: { state: true },
        _rating: { state: true },
        _selectedCategory: { state: true },
    };

    constructor() {
        super();
        this._feedbackText = '';
        this._feedbackEmail = '';
        this._feedbackStatus = '';
        this._feedbackSending = false;
        this._attachInfo = true;
        this._version = '';
        this._rating = 0;
        this._selectedCategory = '';
        this._loadVersion();
    }

    async _loadVersion() {
        try {
            this._version = await hintio.getVersion();
            this.requestUpdate();
        } catch (e) {}
    }

    _getOS() {
        const p = navigator.platform || '';
        if (p.includes('Mac')) return 'macOS';
        if (p.includes('Win')) return 'Windows';
        if (p.includes('Linux')) return 'Linux';
        return p;
    }

    async _submitFeedback() {
        const text = String(this._feedbackText || '').trim();
        if (!text || this._feedbackSending) return;
        const subject = this._selectedCategory ? 'Hintio feedback: ' + this._selectedCategory : 'Hintio feedback';
        const body =
            text +
            (this._rating ? '\nRating: ' + this._rating + '/5' : '') +
            (this._attachInfo ? '\nHintio ' + this._version + ' / ' + this._getOS() : '') +
            (this._feedbackEmail ? '\nReply contact: ' + this._feedbackEmail : '');
        this._feedbackSending = true;
        this._feedbackStatus = '';
        try {
            const result = await window.electronAPI.invoke('open-external', makeSupportEmailDraft(subject, body));
            if (!result?.success) throw new Error('Email app unavailable');
            this._feedbackStatus = 'success:Email draft opened. Review it and send it from your email app.';
        } catch {
            this._feedbackStatus = 'error:Could not open email. Contact ' + SUPPORT_EMAIL + ' directly.';
        } finally {
            this._feedbackSending = false;
        }
    }

    render() {
        const categories = ['Bug Report', 'Feature Request', 'Performance', 'UI/UX', 'Other'];
        const statusType = this._feedbackStatus.split(':')[0];
        const statusMsg = this._feedbackStatus.split(':').slice(1).join(':');
        const charCount = this._feedbackText.length;

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div class="page-title">Feedback & AI reports</div>
                    <p style="font-size:12px;color:var(--text-secondary);">
                        Opens a draft to admin@builtbygsv.in. Review and redact before sending; nothing is sent automatically. For an AI response
                        report, describe the issue or use Report response in the assistant.
                    </p>

                    <!-- Rating -->
                    <section class="surface">
                        <div class="surface-header">
                            <hintio-icon class="icon" style="font-size:16px;color:#F59E0B" name="star"></hintio-icon>
                            <div class="surface-title">How's your experience?</div>
                        </div>
                        <div class="rating-row">
                            <span class="rating-label">Overall rating</span>
                            ${[1, 2, 3, 4, 5].map(
                                n => html`
                                    <button
                                        class="star-btn ${this._rating >= n ? 'active' : ''}"
                                        @click=${() => {
                                            this._rating = n;
                                            this.requestUpdate();
                                        }}
                                    >
                                        star
                                    </button>
                                `
                            )}
                        </div>
                    </section>

                    <!-- Category -->
                    <section class="surface">
                        <div class="surface-header">
                            <hintio-icon class="icon" style="font-size:16px;color:#6366F1" name="label"></hintio-icon>
                            <div class="surface-title">Category</div>
                        </div>
                        <div class="category-chips">
                            ${categories.map(
                                cat => html`
                                    <button
                                        class="chip ${this._selectedCategory === cat ? 'selected' : ''}"
                                        @click=${() => {
                                            this._selectedCategory = this._selectedCategory === cat ? '' : cat;
                                            this.requestUpdate();
                                        }}
                                    >
                                        ${cat}
                                    </button>
                                `
                            )}
                        </div>
                    </section>

                    <!-- Message -->
                    <section class="surface">
                        <div class="surface-header">
                            <hintio-icon class="icon" style="font-size:16px;color:#6366F1" name="edit_note"></hintio-icon>
                            <div class="surface-title">Your message</div>
                        </div>
                        <textarea
                            class="feedback-textarea"
                            placeholder="Bug reports, feature requests, anything on your mind..."
                            .value=${this._feedbackText}
                            @input=${e => {
                                this._feedbackText = e.target.value;
                                this.requestUpdate();
                            }}
                            maxlength="2000"
                        ></textarea>
                        <input
                            class="feedback-email"
                            type="email"
                            placeholder="Email (optional, for follow-up)"
                            .value=${this._feedbackEmail}
                            @input=${e => {
                                this._feedbackEmail = e.target.value;
                            }}
                        />
                        <div class="footer-row">
                            <label class="attach-label">
                                <input
                                    type="checkbox"
                                    .checked=${this._attachInfo}
                                    @change=${e => {
                                        this._attachInfo = e.target.checked;
                                    }}
                                />
                                Attach OS &amp; version info
                            </label>
                            <span class="char-count">${charCount}/2000</span>
                            <button
                                class="submit-btn"
                                @click=${() => this._submitFeedback()}
                                ?disabled=${!this._feedbackText.trim() || this._feedbackSending}
                            >
                                <hintio-icon class="icon" name="send"></hintio-icon>
                                ${this._feedbackSending ? 'Sending…' : 'Open email draft'}
                            </button>
                        </div>
                        ${this._feedbackStatus
                            ? html`
                                  <div class="status-banner ${statusType}">
                                      <hintio-icon
                                          class="icon"
                                          style="font-size:16px"
                                          name=${statusType === 'success' ? 'check_circle' : 'error'}
                                      ></hintio-icon>
                                      ${statusMsg}
                                  </div>
                              `
                            : ''}
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('feedback-view', FeedbackView);

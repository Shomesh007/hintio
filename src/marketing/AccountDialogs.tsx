import { useId, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, Copy, Download, Loader2, X } from 'lucide-react';

function Wordmark() {
    return (
        <span className="account-brand">
            Hintio
            <span className="account-mark" aria-hidden="true">
                <i />
                <i />
                <i />
            </span>
        </span>
    );
}

function DialogFrame({
    open,
    title,
    description,
    label,
    onClose,
    children,
    footer,
    tone = 'standard',
}: {
    open: boolean;
    title: string;
    description?: string;
    label: string;
    onClose?: () => void;
    children: ReactNode;
    footer?: ReactNode;
    tone?: 'standard' | 'key';
}) {
    const titleId = useId();
    const descriptionId = useId();
    const reducedMotion = useReducedMotion();
    return (
        <AnimatePresence>
            {open && (
                <div className="account-layer">
                    <motion.div
                        className="account-scrim"
                        aria-hidden="true"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16 }}
                    />
                    <motion.section
                        className={`account-dialog account-dialog-${tone}`}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        aria-describedby={description ? descriptionId : undefined}
                        initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reducedMotion ? 0 : 5 }}
                        transition={{ duration: reducedMotion ? 0 : 0.2, ease: 'easeOut' }}
                    >
                        <header className="account-header">
                            <Wordmark />
                            <span className="account-header-label">{label}</span>
                            {onClose && (
                                <button className="account-close" onClick={onClose} aria-label="Close dialog">
                                    <X size={18} />
                                </button>
                            )}
                        </header>
                        <div className="account-body">
                            <h2 id={titleId}>{title}</h2>
                            {description && (
                                <p id={descriptionId} className="account-description">
                                    {description}
                                </p>
                            )}
                            {children}
                        </div>
                        {footer && <footer className="account-footer">{footer}</footer>}
                    </motion.section>
                </div>
            )}
        </AnimatePresence>
    );
}

function GoogleMark() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
            <path
                fill="#34A853"
                d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
            />
            <path
                fill="#FBBC05"
                d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.92V7.49H3.06A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.51l3.35-2.59Z"
            />
            <path
                fill="#EA4335"
                d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.35 2.59A5.99 5.99 0 0 1 12 5.96Z"
            />
        </svg>
    );
}

export function AuthGateModal({
    isOpen,
    onClose,
    onSignIn,
    isSigningIn,
    error,
    intent = 'download',
}: {
    isOpen: boolean;
    onClose: () => void;
    onSignIn: () => void;
    isSigningIn: boolean;
    error: string | null;
    intent?: 'download' | 'upgrade_monthly' | 'upgrade_yearly' | 'recover_monthly' | 'recover_yearly';
}) {
    const buying = intent !== 'download';
    const recovering = intent === 'recover_monthly' || intent === 'recover_yearly';
    const plan = intent === 'upgrade_yearly' || intent === 'recover_yearly' ? 'Yearly Pro' : 'Monthly Pro';
    return (
        <DialogFrame
            open={isOpen}
            onClose={onClose}
            label="YOUR ACCOUNT"
            title={recovering ? 'Welcome back. Get your key.' : buying ? 'Sign in to get your key.' : 'Your desktop, with Hintio.'}
            description={
                recovering
                    ? 'Use the same Google account you paid with. We’ll retrieve your existing key without opening checkout.'
                    : buying
                      ? 'Continue with Google, then review your plan in checkout.'
                      : 'Sign in with Google to download the Windows app.'
            }
            footer={
                <>
                    <span>You’ll return here after Google sign-in.</span>
                    <ArrowUpRight size={15} />
                </>
            }
        >
            <div className="account-intent">
                <div className="intent-glyph" aria-hidden="true">
                    {buying ? '↗' : '↓'}
                </div>
                <div>
                    <span>{buying ? 'YOUR SELECTED ACCESS' : 'YOUR DOWNLOAD'}</span>
                    <strong>{buying ? plan : 'Hintio for Windows'}</strong>
                </div>
                <span className="intent-detail">{buying ? 'Desktop app' : 'Windows installer'}</span>
            </div>
            <button className="account-google" onClick={onSignIn} disabled={isSigningIn}>
                {isSigningIn ? <Loader2 className="account-spin" size={20} /> : <GoogleMark />}
                <span>{isSigningIn ? 'Connecting to Google…' : 'Continue with Google'}</span>
                <ArrowRight size={18} />
            </button>
            {error && (
                <div className="account-error" role="alert">
                    <strong>Couldn’t continue</strong>
                    <p>{error}</p>
                </div>
            )}
            {buying && !recovering && (
                <ol className="account-progress" aria-label="Purchase steps">
                    <li aria-current="step">
                        <b>1</b>Sign in
                    </li>
                    <li>
                        <b>2</b>Checkout
                    </li>
                    <li>
                        <b>3</b>Your key
                    </li>
                </ol>
            )}
        </DialogFrame>
    );
}

function AccessKey({ value, isCopied, onCopy, label }: { value: string; isCopied: boolean; onCopy: () => void; label: string }) {
    return (
        <div className="access-key-ticket">
            <div className="access-key-label">
                <span>{label}</span>
                <span>DESKTOP ACCESS</span>
            </div>
            <code aria-label="Your access key">{value}</code>
            <button className="account-copy" onClick={onCopy}>
                {isCopied ? <Check size={17} /> : <Copy size={17} />}
                <span aria-live="polite">{isCopied ? 'Key copied' : 'Copy access key'}</span>
            </button>
        </div>
    );
}

export function TrialKeyModal({
    isOpen,
    trialKey,
    onCopy,
    onDone,
    isCopied,
}: {
    isOpen: boolean;
    trialKey: string;
    onCopy: () => void;
    onDone: () => void;
    isCopied: boolean;
}) {
    return (
        <DialogFrame
            open={isOpen}
            label="TRIAL ACCESS"
            tone="key"
            title="Your first three sessions."
            description="Three sessions, up to 15 minutes each. Save your key before continuing."
            footer={
                <>
                    <span>Keep your access key private.</span>
                    <span className="account-footer-dot" />
                </>
            }
        >
            <AccessKey value={trialKey} isCopied={isCopied} onCopy={onCopy} label="TRIAL KEY" />
            <p className="account-key-note">This key is shown once. Copy it somewhere you can find it again.</p>
            <button className="account-primary" onClick={onDone}>
                Continue to download <Download size={18} />
            </button>
        </DialogFrame>
    );
}

export function PaidLicenseModal({
    isOpen,
    plan,
    licenseKey,
    isCopied,
    onCopy,
    onDownload,
    onClose,
}: {
    isOpen: boolean;
    plan: 'monthly' | 'yearly';
    licenseKey: string;
    isCopied: boolean;
    onCopy: () => void;
    onDownload: () => void;
    onClose: () => void;
}) {
    return (
        <DialogFrame
            open={isOpen}
            onClose={onClose}
            label="PAYMENT COMPLETE"
            tone="key"
            title="Your key. Your next step."
            description="Save your access key, then paste it into the desktop app to start a session."
            footer={
                <>
                    <span className="payment-confirmed">
                        <Check size={14} /> Payment received
                    </span>
                    <span>{plan === 'monthly' ? 'Monthly Pro' : 'Yearly Pro'}</span>
                </>
            }
        >
            <AccessKey value={licenseKey} isCopied={isCopied} onCopy={onCopy} label={plan === 'monthly' ? 'MONTHLY PRO KEY' : 'YEARLY PRO KEY'} />
            <div className="key-next-step">
                <span>01</span>
                <p>
                    <strong>Copy your key.</strong> Keep it somewhere private.
                </p>
            </div>
            <div className="key-next-step">
                <span>02</span>
                <p>
                    <strong>Open Hintio.</strong> Paste it into the Access Token field.
                </p>
            </div>
            <div className="account-actions">
                <button className="account-primary" onClick={onDownload}>
                    Download for Windows <Download size={18} />
                </button>
                <button className="account-secondary" onClick={onClose}>
                    Done
                </button>
            </div>
        </DialogFrame>
    );
}

export function MacComingSoonModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <DialogFrame
            open={isOpen}
            onClose={onClose}
            label="PLATFORM AVAILABILITY"
            title="Windows is ready. Mac is on the way."
            description="The Mac installer isn’t available from this site yet. The Windows version is ready to download."
        >
            <div className="platform-availability">
                <div>
                    <span>Windows</span>
                    <strong>
                        <i />
                        Available
                    </strong>
                </div>
                <div>
                    <span>macOS</span>
                    <strong className="not-yet">Not available yet</strong>
                </div>
            </div>
            <button className="account-primary" onClick={onClose}>
                Back to Hintio <ArrowRight size={18} />
            </button>
        </DialogFrame>
    );
}

export function PaymentSupportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <DialogFrame
            open={isOpen}
            onClose={onClose}
            label="CHECKOUT HELP"
            title="Checkout couldn’t open."
            description="We couldn’t start the payment window. Close this panel and try again, or contact us if it keeps happening."
            footer={<span>Have a payment reference? Keep it handy when contacting support.</span>}
        >
            <div className="checkout-help">
                <span aria-hidden="true">↗</span>
                <div>
                    <strong>We can help you continue.</strong>
                    <p>Talk to Hintio support on WhatsApp.</p>
                </div>
            </div>
            <div className="account-actions">
                <a className="account-primary" href="https://wa.me/9174448865095" target="_blank" rel="noopener noreferrer">
                    Contact support <ArrowUpRight size={18} />
                </a>
                <button className="account-secondary" onClick={onClose}>
                    Back
                </button>
            </div>
        </DialogFrame>
    );
}

export function PendingLicenseModal({
    isOpen,
    isRecovering,
    reference,
    onDownload,
    onClose,
}: {
    isOpen: boolean;
    isRecovering: boolean;
    reference: string;
    onDownload: () => void;
    onClose: () => void;
}) {
    return (
        <DialogFrame
            open={isOpen}
            onClose={onClose}
            label="PAYMENT RECEIVED"
            title="Your key is on its way."
            description="Do not pay again. You can download Hintio while we retrieve your key. Keep this tab open; your key will appear here when it’s ready."
            footer={<span>{reference ? `Payment reference: ${reference}` : 'Your key is linked to the account you paid with.'}</span>}
        >
            <div className="checkout-help" role="status" aria-live="polite">
                {isRecovering ? <Loader2 className="account-spin" size={22} /> : <Check size={22} />}
                <div>
                    <strong>{isRecovering ? 'Checking for your access key' : 'Your key is still processing'}</strong>
                    <p>
                        {isRecovering
                            ? 'You can continue below. We’ll keep checking in this tab.'
                            : 'Automatic checks will resume shortly. There’s no need to pay again.'}
                    </p>
                </div>
            </div>
            <div className="account-actions">
                <button className="account-primary" onClick={onDownload}>
                    Download for Windows <Download size={18} />
                </button>
            </div>
            <a className="account-recovery-support" href="https://wa.me/9174448865095" target="_blank" rel="noopener noreferrer">
                Contact support <ArrowUpRight size={18} />
            </a>
        </DialogFrame>
    );
}

export function CheckoutStatus() {
    return (
        <div className="checkout-status" role="status">
            <Loader2 className="account-spin" size={19} />
            <div>
                <strong>Opening checkout</strong>
                <span>Keep this tab open.</span>
            </div>
        </div>
    );
}

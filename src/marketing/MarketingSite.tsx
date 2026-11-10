import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import {
    ArrowUpRight,
    ArrowRight,
    Check,
    ChevronDown,
    Menu,
    X,
    Mic,
    Monitor,
    MessageSquare,
    Settings,
    Search,
    Layers,
    KeyRound,
    History,
    FileText,
    Play,
    Volume2,
    Copy,
    Download,
    Minus,
    Square,
    AlertTriangle,
    Keyboard,
    CheckCircle2,
} from 'lucide-react';
import { shortcuts, profiles, platformKeys, type ShortcutGroup } from './shortcutData';
import './marketing.css';

interface Props {
    onDownload: () => void;
    onUpgrade: (plan: 'monthly' | 'yearly') => void;
    onRecover: (plan: 'monthly' | 'yearly') => void;
    onMacDownload: () => void;
    checkoutLoading: boolean;
}
type Page = '/' | '/workflows' | '/shortcuts' | '/get-started' | '/access' | '/privacy' | '/terms' | '/contact';
const support = 'https://wa.me/918438365095';
const supportEmail = 'admin@builtbygsv.in';
const titles: Record<Page, string> = {
    '/': 'Good answers. Right on cue.',
    '/workflows': 'Workflows',
    '/shortcuts': 'Keyboard shortcuts',
    '/get-started': 'Getting started',
    '/access': 'Desktop access',
    '/contact': 'Contact Hintio',
    '/privacy': 'Privacy & data',
    '/terms': 'Access information',
};
function currentPage(): Page {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    if (path === '/help') return '/shortcuts';
    return Object.hasOwn(titles, path) ? (path as Page) : '/';
}
export function Brand() {
    return (
        <span className="hi-brand">
            Hintio
            <span className="pixel-mark" aria-hidden="true">
                <i />
                <i />
                <i />
            </span>
        </span>
    );
}
function Button({
    children,
    onClick,
    tone = 'yellow',
    disabled = false,
}: {
    children: ReactNode;
    onClick?: () => void;
    tone?: 'yellow' | 'ink' | 'outline';
    disabled?: boolean;
}) {
    return (
        <button className={`hi-btn hi-btn-${tone}`} onClick={onClick} disabled={disabled}>
            {children}
        </button>
    );
}
function Keycaps({ keys }: { keys: string[] }) {
    return (
        <span className="key-combo">
            {keys.map((key, i) => (
                <span className="key-part" key={`${key}-${i}`}>
                    {i > 0 && (
                        <span className="key-plus" aria-hidden="true">
                            +
                        </span>
                    )}
                    <kbd>{key}</kbd>
                </span>
            ))}
        </span>
    );
}
function Waveform() {
    return (
        <span className="waveform" aria-hidden="true">
            {[8, 17, 12, 29, 38, 22, 15, 32, 46, 30, 18, 37, 24, 12, 28, 19, 8].map((height, i) => (
                <i key={i} style={{ height }} />
            ))}
        </span>
    );
}
function DesktopWindow({ children, label = 'live', className = '' }: { children: ReactNode; label?: string; className?: string }) {
    return (
        <div className={`desktop-window ${className}`}>
            <div className="desktop-title">
                <span>
                    <span className="mini-pixels" aria-hidden="true">
                        ▟
                    </span>{' '}
                    Hintio <em>/ {label}</em>
                </span>
                <span className="window-controls" aria-hidden="true">
                    <Minus size={13} />
                    <Square size={10} />
                    <X size={14} />
                </span>
            </div>
            {children}
        </div>
    );
}
function LivePreview({ compact = false, screen = false }: { compact?: boolean; screen?: boolean }) {
    return (
        <DesktopWindow className={compact ? 'compact-preview' : ''}>
            <div className="desktop-body">
                <aside className="desktop-tools" aria-hidden="true">
                    <span className="selected">
                        <Mic />
                    </span>
                    <span>
                        <Monitor />
                    </span>
                    <span>
                        <MessageSquare />
                    </span>
                    <span>
                        <Settings />
                    </span>
                </aside>
                <div className="desktop-answer">
                    <div className="listening">
                        <i /> Listening to the conversation
                    </div>
                    <h3>{screen ? 'Can you walk through what is on the screen?' : 'How would you explain a difficult trade-off?'}</h3>
                    <ul>
                        <li>{screen ? 'Identify the important details.' : 'Start with the goal.'}</li>
                        <li>{screen ? 'Connect the information across screens.' : 'Compare the options.'}</li>
                        <li>{screen ? 'Explain the next step.' : 'Explain your decision.'}</li>
                    </ul>
                    <div className="preview-input">
                        <span>Ask a follow-up…</span>
                        <kbd>Ctrl + Enter</kbd>
                    </div>
                </div>
            </div>
        </DesktopWindow>
    );
}
function ContextPreview() {
    return (
        <DesktopWindow label="AI Context" className="context-preview">
            <div className="context-fields">
                <label>
                    Session profile
                    <span>
                        Technical Interview <ChevronDown size={14} />
                    </span>
                </label>
                <label>
                    Resume
                    <span>
                        <FileText size={16} /> Resume.pdf <small>LOADED</small>
                        <Check size={14} />
                    </span>
                </label>
                <label>
                    Interview domain<span>Frontend engineering</span>
                </label>
                <label>
                    Custom instructions<span className="textarea-look">Focus on accessibility and system design.</span>
                </label>
                <p>Context is included when your session starts.</p>
            </div>
        </DesktopWindow>
    );
}
function HistoryPreview() {
    return (
        <DesktopWindow label="History" className="history-preview">
            <div className="history-body">
                <aside>
                    <strong>Sessions</strong>
                    <span className="active-history">
                        Technical Interview<small>Today</small>
                    </span>
                    <span>
                        Sales Call<small>Yesterday</small>
                    </span>
                    <span>
                        Business Meeting<small>Earlier this week</small>
                    </span>
                </aside>
                <div>
                    <div className="history-tabs">
                        <span>Conversation</span>
                        <span>Screen analysis</span>
                        <Copy size={14} />
                        <Download size={14} />
                    </div>
                    <h4>How would you explain a trade-off?</h4>
                    <p>
                        Start with the goal and constraints.
                        <br />
                        Compare the options with clear trade-offs.
                        <br />
                        Explain your decision and expected impact.
                    </p>
                </div>
            </div>
        </DesktopWindow>
    );
}
function ScreenshotStack() {
    return (
        <div className="screenshot-stack" aria-label="Three illustrative screenshots combined for one answer">
            {[1, 2, 3].map(n => (
                <div className={`screen-piece screen-piece-${n}`} key={n}>
                    <b>{n}</b>
                    <div className="screen-dots">● ● ●</div>
                    {n === 1 ? (
                        <pre>{'function decide(options) {\n  return options.filter(\n    option => option.isValid\n  );\n}'}</pre>
                    ) : n === 2 ? (
                        <div className="mock-browser">
                            <i />
                            <i />
                            <i />
                        </div>
                    ) : (
                        <div className="mock-diagram">
                            <span />
                            <span />
                            <span />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
function FAQ({ items }: { items?: [string, string][] }) {
    const faqs: [string, string][] = items ?? [
        [
            'How do I activate my key?',
            'Open Hintio, paste the complete access key, and choose Start Session. Once validated, you go straight to the assistant. There is no voice calibration step.',
        ],
        [
            'Which desktop platform can I download?',
            'The Windows installer is available from this site. The Mac download currently opens the existing availability notice.',
        ],
        [
            'When does my access expire?',
            'Each key has an expiry timestamp and a session allowance. Your key must be active, unexpired, and have sessions remaining. A manually issued 28-day key starts when it is issued.',
        ],
        [
            'Can I customize the shortcuts?',
            'Yes. Open Settings → Keyboard Shortcuts in the desktop app. Your saved shortcuts override the defaults shown in our guide.',
        ],
    ];
    return (
        <section className="hi-faq wrap">
            <div className="section-label">A FEW GOOD QUESTIONS</div>
            <h2>Before you jump in.</h2>
            {faqs.map(([question, answer]) => (
                <details key={question}>
                    <summary>
                        {question}
                        <span aria-hidden="true">+</span>
                    </summary>
                    <p>{answer}</p>
                </details>
            ))}
        </section>
    );
}
function Home({ onDownload, go }: Pick<Props, 'onDownload'> & { go: (page: Page) => void }) {
    return (
        <>
            <section className="hi-hero wrap">
                <div className="hero-copy">
                    <span className="eyebrow">YOUR DESKTOP + AI</span>
                    <h1>
                        Good answers.
                        <br />
                        <mark>Right on cue.</mark>
                    </h1>
                    <p>Stay with the conversation. Hintio brings real-time voice and screen context to your desktop.</p>
                    <div className="hero-actions">
                        <Button tone="ink" onClick={() => go('/access')}>
                            Get your access key <ArrowUpRight size={19} />
                        </Button>
                        <Button tone="outline" onClick={() => go('/workflows')}>
                            <Play size={16} /> See how it works
                        </Button>
                    </div>
                    <span className="micro-copy">
                        Windows desktop <span>•</span> Activate with a key
                    </span>
                </div>
                <div className="hero-product">
                    <span className="yellow-offset offset-top" />
                    <span className="yellow-offset offset-bottom" />
                    <LivePreview />
                    <div className="transcript-float">
                        <div>
                            <strong>
                                <i />
                                Live transcript
                            </strong>
                            <span>…so the main trade-off is speed versus accuracy…</span>
                        </div>
                        <Waveform />
                    </div>
                    <span className="preview-caption">ILLUSTRATIVE DESKTOP PREVIEW</span>
                </div>
            </section>
            <section className="feature-band">
                <div className="wrap">
                    <h2>
                        Small window.
                        <br />
                        Clearer thinking.
                    </h2>
                    <div>
                        <Mic />
                        <strong>
                            Live
                            <br />
                            voice context
                        </strong>
                    </div>
                    <div>
                        <Monitor />
                        <strong>
                            Screen
                            <br />
                            understanding
                        </strong>
                    </div>
                    <div>
                        <KeyRound />
                        <strong>
                            Instant
                            <br />
                            key activation
                        </strong>
                    </div>
                </div>
            </section>
            <section className="product-story wrap">
                <div>
                    <span className="section-label">BUILT FOR THE LIVE MOMENT</span>
                    <h2>
                        Keep the context.
                        <br />
                        Find the words.
                    </h2>
                    <p>Add the background that matters. Let Hintio help turn a conversation or a complex screen into something you can work with.</p>
                    <a
                        href="/workflows"
                        onClick={e => {
                            e.preventDefault();
                            go('/workflows');
                        }}
                        className="text-link"
                    >
                        Find your workflow <ArrowUpRight />
                    </a>
                </div>
                <ContextPreview />
            </section>
            <section className="yellow-section">
                <div className="wrap home-steps">
                    <h2>
                        From download
                        <br />
                        to dialogue.
                    </h2>
                    <ol>
                        <li>
                            <b>01</b>
                            <div>
                                <h3>Get the desktop app.</h3>
                                <p>Download and install the complete Windows release.</p>
                            </div>
                        </li>
                        <li>
                            <b>02</b>
                            <div>
                                <h3>Bring your context.</h3>
                                <p>Choose a profile. Add your resume or instructions.</p>
                            </div>
                        </li>
                        <li>
                            <b>03</b>
                            <div>
                                <h3>Paste your key. Go live.</h3>
                                <p>Approved keys open the assistant directly.</p>
                            </div>
                        </li>
                    </ol>
                </div>
            </section>
            <section className="wrap access-teaser">
                <div>
                    <span className="section-label">A LITTLE CLARITY GOES A LONG WAY</span>
                    <h2>
                        Your next conversation
                        <br />
                        starts here.
                    </h2>
                    <p>Get the app, choose your access, and make room for clearer thinking.</p>
                    <div className="hero-actions">
                        <Button onClick={() => go('/access')}>
                            Explore desktop access <ArrowUpRight size={18} />
                        </Button>
                        <Button tone="outline" onClick={onDownload}>
                            Download for Windows <Download size={17} />
                        </Button>
                    </div>
                </div>
                <div className="giant-key" aria-hidden="true">
                    <KeyRound />
                </div>
            </section>
            <FAQ />
        </>
    );
}
function Workflows({ go }: { go: (page: Page) => void }) {
    return (
        <>
            <section className="wrap workflow-hero page-hero">
                <div>
                    <span className="eyebrow">FIND YOUR FLOW</span>
                    <h1>
                        One desktop.
                        <br />
                        <mark>Every kind of</mark>
                        <br />
                        conversation.
                    </h1>
                    <p>
                        Set the context. Choose a profile.
                        <br />
                        Bring Hintio into the moment.
                    </p>
                </div>
                <div className="workflow-preview">
                    <LivePreview compact />
                    <div className="profile-tags">
                        {profiles.map(profile => (
                            <span key={profile} className={profile === 'Technical Interview' ? 'active-tag' : ''}>
                                {profile}
                            </span>
                        ))}
                    </div>
                </div>
            </section>
            <section className="dark-section workflow-context">
                <div className="wrap">
                    <h2>
                        <span>01 /</span> A conversation with context.
                    </h2>
                    <div className="preview-pair">
                        <ContextPreview />
                        <ArrowRight className="connector" />
                        <LivePreview compact />
                    </div>
                    <p className="center-copy">Add a PDF or DOCX resume, your interview domain, and your own instructions before you start.</p>
                </div>
            </section>
            <section className="wrap screenshot-story">
                <h2>
                    <span className="yellow-number">02 /</span> A screen worth understanding.
                </h2>
                <p>Capture up to three screens together. Send after two, or capture a third to send automatically.</p>
                <div className="preview-pair">
                    <ScreenshotStack />
                    <ArrowRight className="connector" />
                    <LivePreview compact screen />
                </div>
                <div className="capture-instructions">
                    <div>
                        <Keycaps keys={['Ctrl', 'Shift', 'Enter']} />
                        <span>Add a screenshot to the batch.</span>
                    </div>
                    <div>
                        <Keycaps keys={['Ctrl', 'Shift', 'F']} />
                        <span>Send early with at least two screens.</span>
                    </div>
                </div>
                <div className="hint-strip">
                    <Monitor size={19} /> One screen? <strong>Ctrl + Enter</strong> during a live session. Batches also send after 20 seconds.
                </div>
            </section>
            <section className="yellow-section">
                <div className="wrap scenario-band">
                    <h2>
                        Your meeting.
                        <br />
                        Your pitch.
                        <br />
                        Your point.
                    </h2>
                    <div>
                        <p>
                            <strong>Business Meeting</strong>
                            <br />
                            Work through decisions and next steps.
                        </p>
                        <p>
                            <strong>Sales Call</strong>
                            <br />
                            Get support responding to objections.
                        </p>
                        <p>
                            <strong>Presentation + Negotiation</strong>
                            <br />
                            Keep the point clear as the conversation changes.
                        </p>
                    </div>
                </div>
            </section>
            <section className="dark-section">
                <div className="wrap history-story">
                    <h2>
                        <span>03 /</span> Keep the useful parts.
                    </h2>
                    <HistoryPreview />
                    <p className="center-copy">Revisit responses and screen analyses in History. Copy or save what you need.</p>
                </div>
            </section>
            <Closing
                title="Find your flow with Hintio."
                action="Explore shortcuts"
                onClick={() => go('/shortcuts')}
                secondary={() => go('/access')}
            />
        </>
    );
}
function ShortcutsPage() {
    const [query, setQuery] = useState('');
    const [group, setGroup] = useState<ShortcutGroup | 'All'>('All');
    const [platform, setPlatform] = useState<'windows' | 'mac'>('windows');
    const filtered = shortcuts.filter(
        item =>
            (group === 'All' || item.group === group) &&
            `${item.action} ${item.detail} ${item.keys.join(' ')}`.toLowerCase().includes(query.toLowerCase())
    );
    return (
        <>
            <section className="wrap shortcuts-hero page-hero">
                <div>
                    <span className="eyebrow">{platform === 'windows' ? 'WINDOWS' : 'MAC'} DEFAULTS</span>
                    <h1>
                        Less reaching.
                        <br />
                        <mark>More doing.</mark>
                    </h1>
                    <p>The desktop controls that keep you in your flow.</p>
                    <div className="giant-keys" aria-hidden="true">
                        <kbd>{platform === 'windows' ? 'Ctrl' : 'Cmd'}</kbd>
                        <kbd>Enter ↵</kbd>
                    </div>
                </div>
                <div className="shortcut-context">
                    <div>
                        <Monitor />
                        <p>
                            On the home screen <ArrowRight size={16} />
                            <strong>Start session</strong>
                        </p>
                    </div>
                    <div>
                        <Play />
                        <p>
                            In a live session <ArrowRight size={16} />
                            <strong>Analyze current screen</strong>
                        </p>
                    </div>
                    <small>Saved custom shortcuts override these defaults.</small>
                    <div className="platform-toggle" aria-label="Shortcut platform">
                        {(['windows', 'mac'] as const).map(os => (
                            <button key={os} aria-pressed={platform === os} onClick={() => setPlatform(os)}>
                                {os === 'windows' ? 'Windows' : 'Mac'}
                            </button>
                        ))}
                    </div>
                </div>
            </section>
            <section className="shortcut-toolbar wrap">
                <label className="shortcut-search">
                    <Search size={20} />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a shortcut…" aria-label="Find a shortcut" />
                    {query && (
                        <button aria-label="Clear search" onClick={() => setQuery('')}>
                            <X size={16} />
                        </button>
                    )}
                </label>
                <div className="filter-tabs" aria-label="Shortcut categories">
                    {(['All', 'Capture', 'Responses', 'Window', 'Text'] as const).map(tab => (
                        <button key={tab} aria-pressed={group === tab} onClick={() => setGroup(tab)}>
                            {tab}
                        </button>
                    ))}
                </div>
            </section>
            <div aria-live="polite" className="sr-only">
                {filtered.length} shortcuts found
            </div>
            {(['Capture', 'Responses', 'Window', 'Text'] as const).map(category => {
                const items = filtered.filter(item => item.group === category);
                if (!items.length) return null;
                return (
                    <section
                        key={category}
                        className={`shortcut-section ${category === 'Capture' || category === 'Text' ? 'dark-section' : category === 'Window' ? 'yellow-section' : ''}`}
                    >
                        <div className="wrap">
                            <span className="section-label">{category.toUpperCase()}</span>
                            <h2>
                                {
                                    {
                                        Capture: 'See it. Ask about it.',
                                        Responses: 'Read at your own pace.',
                                        Window: 'Put Hintio where you need it.',
                                        Text: 'Keep the conversation going.',
                                    }[category]
                                }
                            </h2>
                            <div className="shortcut-list">
                                {items.map(item => (
                                    <div className="shortcut-row" key={item.action}>
                                        <Keycaps keys={platformKeys(item, platform)} />
                                        <div>
                                            <h3>{item.action}</h3>
                                            <p>{item.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {category === 'Capture' && (
                                <div className="screen-queue" aria-hidden="true">
                                    {[1, 2, 3].map(n => (
                                        <span key={n}>
                                            <b>{n}</b>
                                            <Monitor />
                                        </span>
                                    ))}
                                    <p>
                                        Three screens.
                                        <br />
                                        One complete picture.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                );
            })}
            {!filtered.length && (
                <div className="wrap no-results">
                    <Search size={32} />
                    <h2>No matching shortcuts.</h2>
                    <p>Try a different word or category.</p>
                    <Button
                        tone="ink"
                        onClick={() => {
                            setQuery('');
                            setGroup('All');
                        }}
                    >
                        Show all shortcuts
                    </Button>
                </div>
            )}
            <section className="wrap shortcut-customize">
                <div>
                    <span className="section-label">YOUR KEYS, YOUR WAY</span>
                    <h2>
                        Make the
                        <br />
                        controls yours.
                    </h2>
                    <p>Change bindings in Settings → Keyboard Shortcuts. If another app already uses a combination, choose a different one.</p>
                </div>
                <div className="bindings-preview">
                    <Keyboard />
                    <strong>Keyboard Shortcuts</strong>
                    {shortcuts.slice(0, 4).map(item => (
                        <div key={item.action}>
                            <span>{item.action}</span>
                            <code>{platformKeys(item, platform).join(' + ')}</code>
                        </div>
                    ))}
                </div>
            </section>
            <div className="wrap destructive-note">
                <AlertTriangle size={20} />
                <p>
                    <strong>Know before you press:</strong> {platform === 'windows' ? 'Ctrl' : 'Cmd'} + Shift + X clears local app data and quits
                    Hintio. This is destructive; save anything you need first.
                </p>
            </div>
        </>
    );
}
function GetStarted({ onDownload, go }: Pick<Props, 'onDownload'> & { go: (page: Page) => void }) {
    return (
        <>
            <section className="wrap page-hero getting-hero">
                <span className="eyebrow">THE QUICK-START GUIDE</span>
                <h1>
                    Your first session,
                    <br />
                    <mark>without the guesswork.</mark>
                </h1>
                <p>Download Hintio. Add your context. Activate your key.</p>
                <ol className="setup-progress">
                    {['Install', 'Set context', 'Activate', 'Go live'].map((step, i) => (
                        <li key={step}>
                            <b>0{i + 1}</b>
                            {step}
                            {i < 3 && <ArrowRight size={20} />}
                        </li>
                    ))}
                </ol>
                <div className="download-banner">
                    <Monitor />
                    <div>
                        <h3>Hintio for Windows</h3>
                        <p>Install the complete release package.</p>
                    </div>
                    <Button onClick={onDownload}>
                        Download desktop app <ArrowUpRight size={19} />
                    </Button>
                </div>
            </section>
            <section className="wrap setup-step">
                <div className="setup-copy">
                    <b className="step-index">01</b>
                    <h2>
                        Install and
                        <br />
                        open Hintio.
                    </h2>
                    <p>
                        Use the full installer or portable bundle, rather than a copied EXE. The app needs the runtime files included in the complete
                        release.
                    </p>
                </div>
                <DesktopWindow label="Setup">
                    <div className="install-preview">
                        <Monitor size={40} />
                        <div>
                            <h3>Install Hintio</h3>
                            <p>Set up Hintio on your computer.</p>
                            <span className="mock-button">Windows desktop application</span>
                        </div>
                    </div>
                </DesktopWindow>
            </section>
            <section className="wrap setup-step">
                <div className="setup-copy">
                    <b className="step-index">02</b>
                    <h2>
                        Give it the
                        <br />
                        right context.
                    </h2>
                    <p>On first launch, complete setup. Add context now or later in AI Context. Choose the profile that fits your conversation.</p>
                    <div className="profile-tags">
                        {profiles.map(p => (
                            <span key={p}>{p}</span>
                        ))}
                    </div>
                </div>
                <ContextPreview />
            </section>
            <section className="yellow-section">
                <div className="wrap setup-step">
                    <div className="setup-copy">
                        <b className="step-index">03</b>
                        <h2>
                            Your access key
                            <br />
                            is the way in.
                        </h2>
                        <p>Paste the complete key and choose Start Session. Once approved, Hintio opens the assistant directly.</p>
                        <span className="setup-pill">
                            <CheckCircle2 size={17} /> No voice calibration step
                        </span>
                        <p className="small-copy">
                            Your key has its own expiry and session allowance. A manually issued 28-day key starts when issued.
                        </p>
                    </div>
                    <DesktopWindow label="Activate">
                        <div className="activation-preview">
                            <KeyRound />
                            <h3>Activate Hintio</h3>
                            <p>Enter your access key to start a session.</p>
                            <label>
                                Access Token<span>SKI-••••••••••••••••••••••••</span>
                            </label>
                            <span className="mock-button">Start Session</span>
                        </div>
                    </DesktopWindow>
                </div>
            </section>
            <section className="dark-section">
                <div className="wrap setup-step">
                    <div className="setup-copy">
                        <b className="step-index">04</b>
                        <h2>
                            Choose what
                            <br />
                            Hintio listens to.
                        </h2>
                        <p>
                            Start with Speaker Only, the default source for the other side of your conversation. Other modes are available in
                            Settings.
                        </p>
                    </div>
                    <div className="audio-preview">
                        <span className="section-label">AUDIO SOURCE</span>
                        {['Speaker Only (Interviewer)', 'Microphone Only (Me)', 'Both Speaker and Microphone', 'No Audio (Screenshots Only)'].map(
                            (mode, i) => (
                                <div className={i === 0 ? 'selected-audio' : ''} key={mode}>
                                    {i === 0 ? <Check size={18} /> : <Volume2 size={18} />}
                                    {mode}
                                </div>
                            )
                        )}
                    </div>
                </div>
                <div className="wrap">
                    <div className="hint-strip">
                        <Monitor size={20} />
                        <span>
                            Screenshots only? Choose No Audio, then use <strong>Ctrl + Enter</strong> in a live session.
                        </span>
                    </div>
                </div>
            </section>
            <section className="wrap setup-step">
                <div>
                    <h2>
                        You are ready
                        <br />
                        to go live.
                    </h2>
                    <p>
                        Speak naturally, analyze a screen, or type a follow-up. End returns you to the home screen. History lets you revisit, copy, or
                        save responses and screen analyses.
                    </p>
                </div>
                <LivePreview compact />
            </section>
            <FAQ
                items={[
                    [
                        'Key rejected?',
                        'Check that you copied the full key without spaces. It must be active, unexpired, and have sessions remaining. Contact support if you need help with your access.',
                    ],
                    [
                        'No voice context?',
                        'Check the audio mode in Settings and the capture permissions requested by the desktop app. Speaker Only is the recommended starting point.',
                    ],
                    [
                        'Shortcut conflict?',
                        'Change the binding in Settings → Keyboard Shortcuts, then try again. The shortcut guide shows the default combinations.',
                    ],
                ]}
            />
            <Closing
                title="Open Hintio. Keep your flow."
                action="View all shortcuts"
                onClick={() => go('/shortcuts')}
                secondary={() => go('/access')}
            />
        </>
    );
}
function Access({ onDownload, onUpgrade, onRecover, onMacDownload, checkoutLoading }: Props) {
    const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
    return (
        <>
            <section className="wrap access-page page-hero">
                <div>
                    <span className="eyebrow">HINTIO DESKTOP ACCESS</span>
                    <h1>
                        One key.
                        <br />
                        <mark>A clearer next step.</mark>
                    </h1>
                    <p>Bring real-time voice and screen context into your conversations. Choose the access that fits your plans.</p>
                    <div className="access-plan-toggle" aria-label="Billing plan">
                        {(['monthly', 'yearly'] as const).map(p => (
                            <button key={p} onClick={() => setPlan(p)} aria-pressed={plan === p}>
                                {p === 'monthly' ? 'Monthly' : 'Yearly'}
                            </button>
                        ))}
                    </div>
                    <p className="small-copy">Review your final price, currency, and plan details in Razorpay before paying.</p>
                    <div className="access-download">
                        <Monitor />
                        <div>
                            <strong>Already have your key?</strong>
                            <button onClick={onDownload}>
                                Download for Windows <ArrowUpRight size={15} />
                            </button>
                        </div>
                    </div>
                    <button className="text-link" onClick={onMacDownload}>
                        Looking for Mac? <ArrowUpRight size={16} />
                    </button>
                </div>
                <div className="access-ticket">
                    <div className="ticket-top">
                        <KeyRound />
                        <span>{plan === 'monthly' ? 'MONTHLY' : 'YEARLY'} DESKTOP ACCESS</span>
                    </div>
                    <h2>{plan === 'monthly' ? 'Monthly Pro.' : 'Yearly Pro.'}</h2>
                    <p>A little clarity goes a long way.</p>
                    <ul>
                        {[
                            'Live voice context',
                            'On-demand screen analysis',
                            'Seven session profiles',
                            'Resume and custom context',
                            'Session history with copy and save',
                            'Customizable keyboard shortcuts',
                        ].map(feature => (
                            <li key={feature}>
                                <Check size={18} />
                                {feature}
                            </li>
                        ))}
                    </ul>
                    <Button tone="ink" disabled={checkoutLoading} onClick={() => onUpgrade(plan)}>
                        {checkoutLoading ? 'Opening checkout…' : 'Get your access key'}
                        <ArrowUpRight size={19} />
                    </Button>
                    <button className="access-recover" onClick={() => onRecover(plan)}>
                        Already paid? Retrieve my key <ArrowRight size={15} />
                    </button>
                    <small>Sign in with Google to continue. Your key is shown after the payment flow completes.</small>
                </div>
            </section>
            <section className="dark-section">
                <div className="wrap purchase-steps">
                    <div>
                        <span>01</span>
                        <h3>Choose your access.</h3>
                        <p>Choose monthly or yearly desktop access.</p>
                    </div>
                    <div>
                        <span>02</span>
                        <h3>Review and pay.</h3>
                        <p>Confirm the final amount and terms in Razorpay.</p>
                    </div>
                    <div>
                        <span>03</span>
                        <h3>Copy your key.</h3>
                        <p>Download the app and paste the key to start your session.</p>
                    </div>
                </div>
            </section>
            <FAQ />
        </>
    );
}
function Closing({ title, action, onClick, secondary }: { title: string; action: string; onClick: () => void; secondary: () => void }) {
    return (
        <section className="wrap closing">
            <h2>{title}</h2>
            <div className="hero-actions">
                <Button tone="outline" onClick={onClick}>
                    {action}
                    <ArrowUpRight size={18} />
                </Button>
                <Button onClick={secondary}>
                    Get your access key <KeyRound size={17} />
                </Button>
            </div>
        </section>
    );
}
function Contact() {
    return <section className="wrap contact-page page-hero">
        <span className="eyebrow">HINTIO / CONTACT</span>
        <h1>A direct line.<br /><mark>A clearer next step.</mark></h1>
        <p className="contact-intro">Get help with setup, desktop access, a bug, or a question about your data.</p>
        <address className="contact-directory">
            <div><span>Email</span><a href={`mailto:${supportEmail}`}>{supportEmail}<ArrowUpRight size={24} /></a><p>For product support and privacy or data requests.</p></div>
            <div><span>Phone / WhatsApp</span><a href="tel:+918438365095">8438365095<ArrowUpRight size={24} /></a><p>Call us, or <a href={support} target="_blank" rel="noreferrer">open a WhatsApp conversation</a>.</p></div>
        </address>
        <div className="contact-guide"><h2>Help us find the issue.</h2><p>Include your app version, operating system, what you expected, and the steps that caused the problem. For an access issue, describe the error shown in Hintio.</p><p>Keep API keys, access tokens, payment details, and private conversations out of your message. Redact screenshots before sharing them.</p></div>
    </section>;
}
function Info({ type }: { type: 'privacy' | 'terms' }) {
    return (
        <section className="wrap info-page page-hero">
            <span className="eyebrow">HINTIO / INFORMATION</span>
            <h1>{type === 'privacy' ? 'Your context.\nKnow the flow.' : 'Before you\nget access.'}</h1>
            {type === 'privacy' ? (
                <>
                    <p className="info-lead">Understand what Hintio captures, where your context is processed, and which controls are available in the desktop app.</p>
                    <div className="information-note">This page describes the product's data flow. Provider retention and processing terms depend on the service and mode you use.</div>
                    <h2>01 / What enters a session</h2>
                    <p>Your audio mode can use speaker output, microphone input, both, or no audio. Screen analysis uses the screen content you choose to capture. Resume text, your domain, and custom instructions can also become session context.</p>
                    <p>Review the selected audio source and screen controls before starting. Only capture conversations and content you have permission to use.</p>
                    <h2>02 / Where processing happens</h2>
                    <dl className="processing-list">
                        <div><dt>Cloud AI</dt><dd>Session context sent to a cloud provider can include audio or transcripts, screenshots, resume text, and custom instructions. The selected provider's terms apply to its processing.</dd></div>
                        <div><dt>Bring your own key</dt><dd>BYOK connects your selected provider using your key. It does not mean the context stays on your computer.</dd></div>
                        <div><dt>Local mode</dt><dd>Ollama and on-device transcription support local inference after setup. Access validation, model downloads, and other connected services can still need an internet connection.</dd></div>
                    </dl>
                    <h2>03 / What stays on your device</h2>
                    <p>Hintio stores configuration, provider credentials, preferences, and session history in its local <code>hintio-config</code> folder. History can include responses, transcripts, and screen analyses. Treat this folder and any exported copies as private.</p>
                    <p>Microsoft Store builds protect local records with AES-256-GCM encryption and a key protected by Windows data protection. This protects stored files from other Windows accounts; it does not isolate them from every program running as the same user. Exported files are separate and may be unencrypted. EXE builds use local JSON files without application encryption.</p>
                    <h2>04 / Your desktop controls</h2>
                    <p>Settings → Privacy &amp; Data explains the data flow and provides separate controls for restoring settings and deleting local data. Each asks for confirmation. Restoring settings resets preferences, shortcuts, resume text, and custom instructions; session history is retained.</p>
                    <p>Deleting local data resets the Hintio configuration folder, including saved credentials and local history, then closes the app. It does not remove exported copies or data held by an AI, sign-in, or payment provider.</p>
                    <p>Cloud processing requires opt-in consent in the desktop app. Withdraw it in Settings to stop a session and return to the privacy step; saved records are retained. Only share third-party content with the required permission.</p>
                    <h2>AI responses and reports</h2><p>Hintio uses live generative AI, which can produce inaccurate or inappropriate content. Review responses before relying on them. Report response by email opens a draft to admin@builtbygsv.in with an excerpt for review and redaction. Nothing is sent until you send the email. Feedback and reports can include information you choose to provide and are used for support, safety review and response. Contact support about retention or deletion; provider records are subject to the provider's policies.</p>
                    <h2>Website sign-in and checkout</h2>
                    <p>The website uses Supabase for Google sign-in and access-key services, and Razorpay for checkout. Those services process information needed for their respective flows. Check the details shown by the service before signing in or confirming a payment.</p>
                    <h2>Questions or a data request?</h2>
                    <p>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or contact us on <a href="tel:+918438365095">8438365095</a>. Describe the request without sending API keys, access keys, payment credentials, or private session content. We can help identify whether the request concerns local Hintio records or a connected provider.</p>
                </>
            ) : (
                <>
                    <p>
                        Choose a plan and review the current price, currency, billing terms, and payment details in the checkout before confirming
                        your purchase.
                    </p>
                    <h2>Your access key</h2>
                    <p>
                        Keep your key private. Access depends on its active status, expiry timestamp, and remaining session allowance. A custom 28-day
                        key is distinct from the website’s monthly and yearly checkout options.
                    </p>
                    <h2>Purchase questions</h2>
                    <p>Contact Hintio support for the applicable purchase terms, renewal, cancellation, and refund details before paying.</p>
                </>
            )}
            <a className="hi-btn hi-btn-ink" href={support} target="_blank" rel="noreferrer">
                Contact support <ArrowUpRight size={18} />
            </a>
        </section>
    );
}

export default function MarketingSite(props: Props) {
    const [page, setPage] = useState<Page>(currentPage);
    const [menuOpen, setMenuOpen] = useState(false);
    const mainRef = useRef<HTMLElement>(null);
    const go = (next: Page) => {
        if (window.location.pathname !== next) window.history.pushState({}, '', next);
        setPage(next);
        setMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
        requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
    };
    useEffect(() => {
        const pop = () => {
            setPage(currentPage());
            setMenuOpen(false);
        };
        window.addEventListener('popstate', pop);
        return () => window.removeEventListener('popstate', pop);
    }, []);
    useEffect(() => {
        document.title = `Hintio — ${titles[page]}`;
        const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (canonical) canonical.href = `https://www.hintio.tech${page === '/' ? '/' : page}`;
    }, [page]);
    const clickLink = (event: MouseEvent<HTMLAnchorElement>, next: Page) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        go(next);
    };
    const nav: [Page, string][] = [
        ['/workflows', 'Workflows'],
        ['/shortcuts', 'Shortcuts'],
        ['/get-started', 'Get started'],
        ['/access', 'Access'],
        ['/contact', 'Contact'],
    ];
    return (
        <div className="hintio-site">
            <a className="skip-link" href="#main-content">
                Skip to content
            </a>
            <header className="hi-header">
                <div className="wrap hi-nav">
                    <a href="/" aria-label="Hintio home" onClick={e => clickLink(e, '/')}>
                        <Brand />
                    </a>
                    <nav aria-label="Main navigation" className={menuOpen ? 'mobile-open' : ''}>
                        {nav.map(([href, label]) => (
                            <a key={href} href={href} aria-current={page === href ? 'page' : undefined} onClick={e => clickLink(e, href)}>
                                {label}
                            </a>
                        ))}
                    </nav>
                    <Button onClick={props.onDownload}>
                        Download for Windows <ArrowUpRight size={17} />
                    </Button>
                    <button
                        className="mobile-menu-toggle"
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </header>
            <main id="main-content" ref={mainRef} tabIndex={-1}>
                {page === '/' ? (
                    <Home onDownload={props.onDownload} go={go} />
                ) : page === '/workflows' ? (
                    <Workflows go={go} />
                ) : page === '/shortcuts' ? (
                    <ShortcutsPage />
                ) : page === '/get-started' ? (
                    <GetStarted onDownload={props.onDownload} go={go} />
                ) : page === '/contact' ? (
                    <Contact />
                ) : page === '/access' ? (
                    <Access {...props} />
                ) : (
                    <Info type={page === '/privacy' ? 'privacy' : 'terms'} />
                )}
            </main>
            <footer className="hi-footer">
                <div className="wrap">
                    <a href="/" onClick={e => clickLink(e, '/')}>
                        <Brand />
                    </a>
                    <p>A little clarity. Right on cue.</p>
                    <div>
                        <a href="/contact" onClick={e => clickLink(e, '/contact')}>Contact</a>
                        <a href="/privacy" onClick={e => clickLink(e, '/privacy')}>
                            Privacy & data
                        </a>
                        <a href="/terms" onClick={e => clickLink(e, '/terms')}>
                            Access information
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

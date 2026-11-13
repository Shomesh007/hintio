import { ArrowUpRight, Check, Mic, Monitor, Layers } from 'lucide-react';
import { productionRelease } from '../lib/productionRelease';
import BillingManager from './BillingManager';
import './pricing.css';

export interface PricingPageProps {
    onDownload: () => void;
    onUpgrade: (plan: 'monthly' | 'yearly') => void;
    onRecover: (plan: 'monthly' | 'yearly') => void;
    onMacDownload: () => void;
    checkoutLoading: boolean;
}

function AssistantStrip() {
    return (
        <div className="plan-assistant" aria-hidden="true">
            <span className="plan-assistant-brand">
                <i /> Hintio
            </span>
            <span className="plan-assistant-wave">
                {[9, 18, 26, 15, 22, 10, 6].map((height, i) => (
                    <i key={i} style={{ height }} />
                ))}
            </span>
            <Monitor size={17} />
            <span className="plan-assistant-status">Voice + screenshots</span>
        </div>
    );
}

export default function PricingPage({ onDownload, onUpgrade, onRecover, onMacDownload, checkoutLoading }: PricingPageProps) {
    return (
        <>
            <section className="wrap pricing-page" aria-labelledby="pricing-title">
                <header className="pricing-intro">
                    <span className="pricing-kicker">
                        <i /> HINTIO DESKTOP ACCESS
                    </span>
                    <h1 id="pricing-title">
                        Choose your <span>Hintio plan.</span>
                    </h1>
                    <p>Get a key for the Windows app. Every plan includes voice, screenshot and typed-question assistance.</p>
                </header>
                <div className="pricing-stage" aria-label="Choose your Hintio plan">
                    <article className="plan-panel plan-trial" aria-labelledby="trial-title">
                        <div className="plan-label">
                            <span>Try the core features</span>
                            <span>No card needed</span>
                        </div>
                        <h2 id="trial-title">Free trial</h2>
                        <div className="plan-price">
                            <strong>₹0</strong>
                            <span>to try Hintio</span>
                        </div>
                        <p className="plan-description">
                            Test voice and screen assistance.
                            <br />
                            Three sessions, no payment card.
                        </p>
                        <button className="plan-action plan-action-outline" onClick={onDownload}>
                            Try Hintio free <ArrowUpRight size={18} />
                        </button>
                        <p className="plan-signin">Google sign-in · No payment card</p>
                        <ul className="plan-features">
                            <li>
                                <Check />3 sessions, up to 15 minutes each
                            </li>
                            <li>
                                <Check />
                                Voice and screenshot assistance
                            </li>
                            <li>
                                <Check />
                                Resume and custom instructions
                            </li>
                        </ul>
                        <p className="plan-footnote">
                            Google sign-in required. Trial access expires after 30 days. One trial per account, public IP and browser identifier.
                        </p>
                    </article>
                    <article className="plan-panel plan-monthly" aria-labelledby="monthly-title">
                        <AssistantStrip />
                        <div className="plan-label">
                            <span>Monthly subscription</span>
                        </div>
                        <h2 id="monthly-title">Monthly</h2>
                        <div className="plan-price">
                            <strong>₹2,049</strong>
                            <span>/ month</span>
                        </div>
                        <p className="plan-description">
                            Use voice and screen assistance.
                            <br />
                            Renews monthly until cancelled.
                        </p>
                        <button className="plan-action plan-action-lime" disabled={checkoutLoading} onClick={() => onUpgrade('monthly')}>
                            {checkoutLoading ? 'Opening checkout…' : 'Choose monthly'}
                            <ArrowUpRight size={18} />
                        </button>
                        <p className="plan-signin">Sign in with Google before secure checkout</p>
                        <ul className="plan-features">
                            <li>
                                <Check />
                                Voice, screenshots & typed questions
                            </li>
                            <li>
                                <Check />
                                No fixed number of sessions
                            </li>
                            <li>
                                <Check />
                                Cancel future renewal anytime
                            </li>
                        </ul>
                        <p className="plan-footnote">
                            ₹2,049 billed monthly. Renews until cancelled, up to 120 cycles. Cancel future renewal in Manage billing below.
                        </p>
                        <button className="plan-recover" onClick={() => onRecover('monthly')}>
                            Already paid? Retrieve monthly key <ArrowUpRight size={13} />
                        </button>
                    </article>
                    <article className="plan-panel plan-yearly" aria-labelledby="yearly-title">
                        <div className="plan-label">
                            <span>Yearly prepaid access</span>
                            <span className="plan-year-saving">Save ₹10,588*</span>
                        </div>
                        <h2 id="yearly-title">Yearly</h2>
                        <div className="plan-price">
                            <strong>₹14,000</strong>
                            <span>/ year</span>
                        </div>
                        <p className="plan-description">
                            The same assistant, paid yearly.
                            <br />
                            365 days. No automatic renewal.
                        </p>
                        <button className="plan-action plan-action-outline" disabled={checkoutLoading} onClick={() => onUpgrade('yearly')}>
                            {checkoutLoading ? 'Opening checkout…' : 'Choose yearly'}
                            <ArrowUpRight size={18} />
                        </button>
                        <p className="plan-signin">Sign in with Google before secure checkout</p>
                        <ul className="plan-features">
                            <li>
                                <Check />
                                Voice, screenshots & typed questions
                            </li>
                            <li>
                                <Check />
                                365 days of prepaid access
                            </li>
                            <li>
                                <Check />
                                No automatic renewal
                            </li>
                        </ul>
                        <p className="plan-footnote">
                            ₹14,000 paid once. Renew manually when you need to. *Compared with 12 monthly payments of ₹2,049.
                        </p>
                        <button className="plan-recover" onClick={() => onRecover('yearly')}>
                            Already paid? Retrieve yearly key <ArrowUpRight size={13} />
                        </button>
                    </article>
                </div>
                <div className="pricing-shared" aria-label="Included in every plan">
                    <div>
                        <Mic />
                        <span>
                            <strong>Voice transcription</strong>
                            <small>Turn selected audio into AI replies.</small>
                        </span>
                    </div>
                    <div>
                        <Monitor />
                        <span>
                            <strong>Screenshot analysis</strong>
                            <small>Ask about what is on screen.</small>
                        </span>
                    </div>
                    <div>
                        <Layers />
                        <span>
                            <strong>Resume & instructions</strong>
                            <small>Bring your resume and instructions.</small>
                        </span>
                    </div>
                </div>
                <div className="pricing-existing">
                    <span>Already have a key?</span>
                    <a href={productionRelease.windowsDownloadUrl}>
                        Download Windows app <ArrowUpRight size={16} />
                    </a>
                    <button onClick={onMacDownload}>Looking for Mac?</button>
                </div>
                <aside className="pricing-compatibility" aria-label="Before purchasing">
                    <strong>Try it on your PC first.</strong>
                    <p>
                        The current Windows release ({productionRelease.version}) is unsigned. Smart App Control may block installation; the Microsoft
                        Store release is pending. Confirm Hintio opens before purchasing. Prices are in INR. Review the final amount in Razorpay
                        before paying.
                    </p>
                </aside>
            </section>
            <section className="pricing-questions wrap" aria-labelledby="pricing-questions-title">
                <div>
                    <span className="pricing-kicker">A FEW USEFUL DETAILS</span>
                    <h2 id="pricing-questions-title">
                        Plan details
                        <br />
                        before you pay.
                    </h2>
                    <p>How keys, renewal and recovery work.</p>
                </div>
                <div className="pricing-answers">
                    <details>
                        <summary>What happens after I choose a plan?</summary>
                        <p>
                            Sign in with Google. For paid plans, review and pay securely through Razorpay. After full captured payment, copy your
                            access key into Hintio. The free trial does not require a payment card.
                        </p>
                    </details>
                    <details>
                        <summary>Does monthly access renew automatically?</summary>
                        <p>
                            Yes. The monthly plan is ₹2,049 per billing cycle, recurring for up to 120 cycles. Use Manage billing below to cancel
                            future renewals. You retain the current paid period. Cancellation does not itself refund a payment.
                        </p>
                    </details>
                    <details>
                        <summary>Will the yearly plan charge me again?</summary>
                        <p>No. ₹14,000 is a single payment for 365 days. It does not renew automatically. Renew manually when you want more time.</p>
                    </details>
                    <details>
                        <summary>Are paid sessions limited?</summary>
                        <p>
                            Paid access has no fixed number of sessions or fixed active-session duration. Service-protection limits, provider
                            availability and network conditions still apply. Each free trial session lasts up to 15 minutes, with three sessions in
                            total.
                        </p>
                    </details>
                    <details>
                        <summary>Can I recover a key or ask about a refund?</summary>
                        <p>
                            Use the monthly or yearly key-recovery link above with the same Google account used at checkout. For payment or refund
                            help, contact <a href="mailto:admin@builtbygsv.in">admin@builtbygsv.in</a>. Applicable statutory rights still apply.
                        </p>
                    </details>
                </div>
            </section>
            <BillingManager />
        </>
    );
}

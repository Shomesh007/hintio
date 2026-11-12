/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { supabase, missingSupabaseEnvVars, billingTestMode } from './lib/supabase';
import { billingTestUrl, checkoutMatchesEnvironment } from './lib/billingTestRouting';
import { readPendingLicense, rememberPendingLicense, forgetPendingLicense, pendingPaymentReference, type PendingLicense } from './lib/pendingLicense';
import {
    abortable,
    withDeadline,
    createCheckoutScriptLoader,
    continueAfterSignIn,
    recoverLicenseKeyAutomatically,
    REQUEST_TIMEOUT_MS,
    LICENSE_LOOKUP_TIMEOUT_MS,
    CHECKOUT_TIMEOUT_MS,
} from './lib/checkoutReliability';
import MarketingSite from './marketing/MarketingSite';
import { productionRelease } from './lib/productionRelease';
import { getTrialDeviceId } from './lib/trialDevice';
import './marketing/account-dialogs.css';

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    }
}

import {
    AuthGateModal,
    TrialKeyModal,
    MacComingSoonModal,
    PaymentSupportModal,
    PaidLicenseModal,
    PendingLicenseModal,
    CheckoutStatus,
} from './marketing/AccountDialogs';

export default function App() {
    const windowsDownloadUrl = productionRelease.windowsDownloadUrl;
    const defaultSupabaseUrl = 'https://vsybqtunyuanxspxhzue.supabase.co';
    const supabaseFunctionsBaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    type AuthIntent = 'download' | 'upgrade_monthly' | 'upgrade_yearly' | 'recover_monthly' | 'recover_yearly';
    const AUTH_INTENT_STORAGE_KEY = 'hintio_auth_intent';
    const checkoutInFlightRef = useRef(false);
    const checkoutScriptLoaderRef = useRef<(() => Promise<boolean>) | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authIntent, setAuthIntent] = useState<AuthIntent>('download');
    const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
    const [trialKey, setTrialKey] = useState('');
    const [isKeyCopied, setIsKeyCopied] = useState(false);
    const [isMacModalOpen, setIsMacModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
    const [isPaidLicenseModalOpen, setIsPaidLicenseModalOpen] = useState(false);
    const [paidLicenseKey, setPaidLicenseKey] = useState('');
    const [paidLicensePlan, setPaidLicensePlan] = useState<'monthly' | 'yearly'>('monthly');
    const [isPaidLicenseCopied, setIsPaidLicenseCopied] = useState(false);
    const [pendingLicense, setPendingLicense] = useState<PendingLicense | null>(() => {
        try {
            return readPendingLicense(window.localStorage, window.sessionStorage);
        } catch {
            return null;
        }
    });
    const [isPendingLicenseOpen, setIsPendingLicenseOpen] = useState(Boolean(pendingLicense));
    const [isRecoveringLicense, setIsRecoveringLicense] = useState(false);
    const licenseRecoveryInFlightRef = useRef(false);
    const licenseRecoveryControllerRef = useRef<AbortController | null>(null);

    const hasOpenDialog =
        isAuthModalOpen || isTrialModalOpen || isMacModalOpen || isPaymentModalOpen || isPaidLicenseModalOpen || isPendingLicenseOpen;
    useEffect(() => {
        if (!hasOpenDialog) return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const getControls = () =>
            Array.from(
                document.querySelectorAll<HTMLElement>(
                    '[role="dialog"] button:not(:disabled), [role="dialog"] a[href], [role="dialog"] input:not(:disabled)'
                )
            );
        const frame = requestAnimationFrame(() => getControls()[0]?.focus());
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsTrialModalOpen(false);
                setIsAuthModalOpen(false);
                setIsMacModalOpen(false);
                setIsPaymentModalOpen(false);
                setIsPaidLicenseModalOpen(false);
                setIsPendingLicenseOpen(false);
            }
            if (event.key !== 'Tab') return;
            const controls = getControls();
            const first = controls[0];
            const last = controls.at(-1);
            if (!first) return;
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            cancelAnimationFrame(frame);
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
            previousFocus?.focus();
        };
    }, [hasOpenDialog, isTrialModalOpen]);

    const debugLog = (...args: unknown[]) => {
        void args;
    };

    useEffect(() => {
        debugLog('App mounted', {
            href: window.location.href,
            origin: window.location.origin,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            host: window.location.host,
            hostname: window.location.hostname,
            port: window.location.port,
            isDev: import.meta.env.DEV,
            storedIntent: window.localStorage.getItem(AUTH_INTENT_STORAGE_KEY),
        });
    }, []);

    const loadRazorpayScript = () => {
        checkoutScriptLoaderRef.current ??= createCheckoutScriptLoader({
            isReady: () => Boolean(window.Razorpay),
            create: () => document.createElement('script'),
            append: script => document.body.appendChild(script as HTMLScriptElement),
        });
        return checkoutScriptLoaderRef.current();
    };

    useEffect(() => {
        const preload = () => {
            void loadRazorpayScript();
        };

        if ('requestIdleCallback' in window) {
            const idleCallbackId = (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(preload);
            return () => {
                const idleWindow = window as Window & {
                    cancelIdleCallback?: (id: number) => void;
                };
                idleWindow.cancelIdleCallback?.(idleCallbackId);
            };
        }

        const timeoutId = globalThis.setTimeout(preload, 250);
        return () => globalThis.clearTimeout(timeoutId);
    }, []);

    const downloadAfterTrialKey = () => {
        setIsTrialModalOpen(false);
        setIsKeyCopied(false);
        triggerDownload();
    };

    const handleCopyTrialKey = async () => {
        if (!trialKey) return;
        await navigator.clipboard.writeText(trialKey);
        setIsKeyCopied(true);
    };

    const triggerDownload = () => {
        debugLog('triggerDownload called', { windowsDownloadUrl });
        window.open(windowsDownloadUrl, '_blank', 'noopener,noreferrer');
    };

    const fetchPaidLicenseKey = async (plan: 'monthly' | 'yearly', signal: AbortSignal) => {
        const client = supabase;
        if (!client) throw new Error('Supabase is not configured');
        return recoverLicenseKeyAutomatically(
            plan,
            (requestedPlan, signal) =>
                client.functions.invoke('get-my-license', {
                    body: { plan: requestedPlan, paymentId: pendingPaymentReference(requestedPlan, window.localStorage, window.sessionStorage) },
                    signal,
                    timeout: LICENSE_LOOKUP_TIMEOUT_MS,
                }),
            signal
        );
    };

    const issuePaidLicenseKey = async (
        plan: 'monthly' | 'yearly',
        paymentResponse?: {
            razorpay_payment_id?: string;
            razorpay_order_id?: string;
            razorpay_subscription_id?: string;
            razorpay_signature?: string;
        }
    ) => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { data, error } = await withDeadline(signal =>
            supabase.functions.invoke('issue-paid-license', {
                signal,
                timeout: REQUEST_TIMEOUT_MS,
                body: {
                    plan,
                    paymentId: paymentResponse?.razorpay_payment_id ?? null,
                    orderId: paymentResponse?.razorpay_order_id ?? null,
                    subscriptionId: paymentResponse?.razorpay_subscription_id ?? null,
                    signature: paymentResponse?.razorpay_signature ?? null,
                },
            })
        );

        if (error || !data?.licenseKey) {
            throw new Error(error?.message ?? 'Issue paid license function failed');
        }

        return String(data.licenseKey);
    };

    const handleCopyPaidLicenseKey = async () => {
        if (!paidLicenseKey) return;
        await navigator.clipboard.writeText(paidLicenseKey);
        setIsPaidLicenseCopied(true);
    };

    // A paid customer can keep using the page while the existing issuer/webhook finishes.
    // Retry only reads the authenticated license endpoint; it never creates another payment.
    const deliverPaidLicense = async (plan: 'monthly' | 'yearly', paymentResponse?: Parameters<typeof issuePaidLicenseKey>[1]) => {
        if (licenseRecoveryInFlightRef.current) {
            setIsPendingLicenseOpen(true);
            return;
        }
        licenseRecoveryInFlightRef.current = true;
        const controller = new AbortController();
        licenseRecoveryControllerRef.current = controller;
        const pending = { plan, reference: paymentResponse?.razorpay_payment_id || pendingLicense?.reference || '' };
        setPendingLicense(pending);
        try {
            rememberPendingLicense(pending, window.localStorage, window.sessionStorage);
        } catch {
            /* Storage may be unavailable. */
        }
        setIsPendingLicenseOpen(true);
        setIsRecoveringLicense(true);
        setIsCheckoutLoading(false);
        try {
            let key: string;
            if (paymentResponse) {
                try {
                    key = await abortable(issuePaidLicenseKey(plan, paymentResponse), controller.signal);
                } catch {
                    controller.signal.throwIfAborted();
                    key = await fetchPaidLicenseKey(plan, controller.signal);
                }
            } else {
                key = await fetchPaidLicenseKey(plan, controller.signal);
            }
            controller.signal.throwIfAborted();
            setPaidLicensePlan(plan);
            setPaidLicenseKey(key);
            setIsPaidLicenseCopied(false);
            setIsPendingLicenseOpen(false);
            setIsPaidLicenseModalOpen(true);
            setPendingLicense(null);
            try {
                forgetPendingLicense(window.localStorage, window.sessionStorage);
            } catch {
                /* Keep the delivered key visible. */
            }
        } catch {
            // Keep the pending reference on navigation; mounting again resumes automatic lookup.
        } finally {
            if (licenseRecoveryControllerRef.current === controller) {
                licenseRecoveryControllerRef.current = null;
                licenseRecoveryInFlightRef.current = false;
                setIsRecoveringLicense(false);
            }
        }
    };

    useEffect(() => {
        const resumeController = new AbortController();
        if (pendingLicense) void handleRecoverLicense(pendingLicense.plan, resumeController.signal);
        return () => {
            resumeController.abort();
            licenseRecoveryControllerRef.current?.abort();
            licenseRecoveryControllerRef.current = null;
            licenseRecoveryInFlightRef.current = false;
        };
        // Resume once after a reload; the lookup continues until delivery or unmount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRecoverLicense = async (plan: 'monthly' | 'yearly', resumeSignal?: AbortSignal) => {
        setAuthError(null);
        setAuthIntent(plan === 'monthly' ? 'recover_monthly' : 'recover_yearly');
        try {
            if (!supabase) throw new Error('Key recovery is temporarily unavailable. Contact support; do not pay again.');
            const { data, error } = await withDeadline(signal => abortable(supabase.auth.getSession(), signal), REQUEST_TIMEOUT_MS, resumeSignal);
            resumeSignal?.throwIfAborted();
            if (error) throw error;
            if (!data.session) {
                setIsPendingLicenseOpen(false);
                setIsAuthModalOpen(true);
                return;
            }
            setIsAuthModalOpen(false);
            await deliverPaidLicense(plan);
        } catch {
            if (resumeSignal?.aborted) return;
            setIsPendingLicenseOpen(false);
            setAuthError('Could not restore your account. Sign in with the account you paid with; do not pay again.');
            setIsAuthModalOpen(true);
        }
    };

    const startRazorpayCheckout = async (plan: 'monthly' | 'yearly') => {
        if (pendingLicense) {
            await handleRecoverLicense(pendingLicense.plan);
            return;
        }
        if (checkoutInFlightRef.current) return;
        checkoutInFlightRef.current = true;
        setIsCheckoutLoading(true);
        try {
            await withDeadline(async signal => {
                debugLog('startRazorpayCheckout invoked', { plan, href: window.location.href });
                if (!supabase) {
                    debugLog('startRazorpayCheckout blocked: supabase not configured', { missingSupabaseEnvVars });
                    setAuthError(`Supabase is not configured. Missing: ${missingSupabaseEnvVars.join(', ')}`);
                    setIsAuthModalOpen(true);
                    return;
                }

                const { data: sessionData, error: sessionError } = await abortable(supabase.auth.getSession(), signal);
                debugLog('startRazorpayCheckout getSession result', {
                    hasSession: Boolean(sessionData.session),
                    sessionError: sessionError?.message ?? null,
                    userId: sessionData.session?.user?.id ?? null,
                    email: sessionData.session?.user?.email ?? null,
                });

                if (!sessionData.session) {
                    debugLog('startRazorpayCheckout no session, opening auth modal', { plan });
                    setAuthIntent(plan === 'monthly' ? 'upgrade_monthly' : 'upgrade_yearly');
                    setIsAuthModalOpen(true);
                    return;
                }

                const getJwtIat = (accessToken: string) => {
                    try {
                        const [, payloadBase64] = accessToken.split('.');
                        if (!payloadBase64) return null;
                        const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
                        const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
                        const decoded = JSON.parse(window.atob(padded)) as { iat?: number };
                        return typeof decoded.iat === 'number' ? decoded.iat : null;
                    } catch {
                        return null;
                    }
                };

                const waitForTokenNotInFuture = async (accessToken: string) => {
                    const iat = getJwtIat(accessToken);
                    const nowSec = Math.floor(Date.now() / 1000);
                    if (iat && iat > nowSec + 1) {
                        const waitMs = Math.max(0, (iat - nowSec + 1) * 1000);
                        debugLog('Access token iat too close/future; waiting before edge call', {
                            iat,
                            nowSec,
                            waitMs,
                        });
                        await abortable(new Promise(resolve => setTimeout(resolve, waitMs)), signal);
                    }
                };

                setIsCheckoutLoading(true);
                debugLog('Checkout loading started');

                const isScriptLoaded = await abortable(loadRazorpayScript(), signal);
                debugLog('Razorpay script load result', { isScriptLoaded, hasRazorpay: Boolean(window.Razorpay) });
                if (!isScriptLoaded || !window.Razorpay) {
                    debugLog('Checkout blocked: Razorpay script unavailable');
                    setIsCheckoutLoading(false);
                    setIsPaymentModalOpen(true);
                    return;
                }

                let activeAccessToken = sessionData.session.access_token;
                await waitForTokenNotInFuture(activeAccessToken);

                const invokeCheckout = async (accessToken: string) =>
                    await abortable(
                        supabase.functions.invoke('create-razorpay-checkout', {
                            signal,
                            timeout: REQUEST_TIMEOUT_MS,
                            body: { plan },
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                            },
                        }),
                        signal
                    );

                const invokeCheckoutViaFetch = async (accessToken: string) => {
                    if (!supabaseAnonKey) {
                        return {
                            ok: false,
                            status: null as number | null,
                            data: null as Record<string, unknown> | null,
                            body: 'Missing VITE_SUPABASE_ANON_KEY for fetch fallback.',
                        };
                    }

                    const response = await fetch(
                        billingTestUrl(
                            `${supabaseFunctionsBaseUrl}/functions/v1/create-razorpay-checkout`,
                            billingTestMode,
                            supabaseFunctionsBaseUrl
                        ),
                        {
                            method: 'POST',
                            signal,
                            headers: {
                                'Content-Type': 'application/json',
                                apikey: supabaseAnonKey,
                                Authorization: `Bearer ${accessToken}`,
                            },
                            body: JSON.stringify({ plan }),
                        }
                    );

                    const bodyText = await abortable(response.text(), signal);
                    let parsedBody: Record<string, unknown> | null = null;
                    try {
                        parsedBody = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : null;
                    } catch {
                        parsedBody = null;
                    }

                    return {
                        ok: response.ok,
                        status: response.status,
                        data: parsedBody,
                        body: bodyText,
                    };
                };

                let { data: checkoutData, error: checkoutError } = await invokeCheckout(activeAccessToken);

                const getCheckoutErrorStatus = (error: unknown) => {
                    const directStatus = (error as { status?: unknown } | null)?.status;
                    if (typeof directStatus === 'number') return directStatus;

                    const contextStatus = (error as { context?: { status?: unknown } } | null)?.context?.status;
                    if (typeof contextStatus === 'number') return contextStatus;

                    const responseStatus = (error as { response?: { status?: unknown } } | null)?.response?.status;
                    if (typeof responseStatus === 'number') return responseStatus;

                    return null;
                };

                const readCheckoutErrorContext = async (error: unknown) => {
                    try {
                        const context = (error as { context?: Response } | null)?.context;
                        if (!context) {
                            return {
                                status: null,
                                body: null,
                            };
                        }

                        const body = await abortable(context.clone().text(), signal);
                        return {
                            status: context.status,
                            body,
                        };
                    } catch {
                        return {
                            status: null,
                            body: null,
                        };
                    }
                };

                const initialCheckoutStatus = getCheckoutErrorStatus(checkoutError);
                const shouldRetryForAuth = initialCheckoutStatus === 401;

                if (shouldRetryForAuth) {
                    debugLog('create-razorpay-checkout returned 401, attempting session refresh + retry');
                    const { data: refreshedSessionData, error: refreshError } = await abortable(supabase.auth.refreshSession(), signal);
                    debugLog('refreshSession result before checkout retry', {
                        refreshError: refreshError?.message ?? null,
                        hasSession: Boolean(refreshedSessionData.session),
                    });

                    if (!refreshError && refreshedSessionData.session?.access_token) {
                        activeAccessToken = refreshedSessionData.session.access_token;
                        await waitForTokenNotInFuture(activeAccessToken);
                        ({ data: checkoutData, error: checkoutError } = await invokeCheckout(activeAccessToken));

                        const postRetryStatus = getCheckoutErrorStatus(checkoutError);
                        if ((postRetryStatus === 401 || !checkoutData) && activeAccessToken) {
                            debugLog('SDK invoke still failing after retry; trying direct fetch fallback');
                            const fallbackResult = await invokeCheckoutViaFetch(activeAccessToken);
                            debugLog('Direct fetch fallback result', {
                                ok: fallbackResult.ok,
                                status: fallbackResult.status,
                                body: fallbackResult.body,
                            });
                            debugLog(
                                'Direct fetch fallback result JSON',
                                JSON.stringify({
                                    ok: fallbackResult.ok,
                                    status: fallbackResult.status,
                                    body: fallbackResult.body,
                                })
                            );

                            if (fallbackResult.ok && fallbackResult.data) {
                                checkoutData = fallbackResult.data as typeof checkoutData;
                                checkoutError = null;
                            }
                        }
                    }
                }

                const finalCheckoutStatus = getCheckoutErrorStatus(checkoutError);

                const checkoutErrorContext = await readCheckoutErrorContext(checkoutError);

                debugLog('create-razorpay-checkout response', {
                    hasData: Boolean(checkoutData),
                    checkoutError: checkoutError?.message ?? null,
                    checkoutErrorName: (checkoutError as { name?: string } | null)?.name ?? null,
                    initialCheckoutStatus,
                    finalCheckoutStatus,
                    contextStatus: checkoutErrorContext.status,
                    contextBody: checkoutErrorContext.body,
                    mode: checkoutData?.mode ?? null,
                    hasKeyId: Boolean(checkoutData?.keyId),
                    orderId: checkoutData?.orderId ?? null,
                    subscriptionId: checkoutData?.subscriptionId ?? null,
                });
                debugLog(
                    'create-razorpay-checkout response JSON',
                    JSON.stringify({
                        hasData: Boolean(checkoutData),
                        checkoutError: checkoutError?.message ?? null,
                        checkoutErrorName: (checkoutError as { name?: string } | null)?.name ?? null,
                        initialCheckoutStatus,
                        finalCheckoutStatus,
                        contextStatus: checkoutErrorContext.status,
                        contextBody: checkoutErrorContext.body,
                        mode: checkoutData?.mode ?? null,
                        hasKeyId: Boolean(checkoutData?.keyId),
                        orderId: checkoutData?.orderId ?? null,
                        subscriptionId: checkoutData?.subscriptionId ?? null,
                    })
                );

                if (checkoutError || !checkoutData?.keyId || (billingTestMode && !checkoutMatchesEnvironment(checkoutData.keyId, true))) {
                    debugLog('Checkout blocked: function returned error or missing keyId');
                    setIsCheckoutLoading(false);
                    setIsPaymentModalOpen(true);
                    return;
                }

                const options: Record<string, unknown> = {
                    key: checkoutData.keyId,
                    name: checkoutData.name ?? 'hintio',
                    description: checkoutData.description ?? 'hintio payment',
                    prefill: checkoutData.prefill ?? {},
                    readonly: {
                        email: true,
                    },
                    notes: {
                        plan_type: plan,
                    },
                    handler: async (paymentResponse?: {
                        razorpay_payment_id?: string;
                        razorpay_order_id?: string;
                        razorpay_subscription_id?: string;
                        razorpay_signature?: string;
                    }) => {
                        await deliverPaidLicense(plan, paymentResponse);
                    },
                    modal: {
                        ondismiss: () => setIsCheckoutLoading(false),
                    },
                    theme: {
                        color: '#dcff00',
                    },
                };

                if (checkoutData.mode === 'subscription') {
                    options.subscription_id = checkoutData.subscriptionId;
                } else {
                    options.order_id = checkoutData.orderId;
                    options.amount = checkoutData.amount;
                    options.currency = checkoutData.currency;
                }

                debugLog('Opening Razorpay checkout', {
                    mode: checkoutData.mode,
                    plan,
                    orderId: checkoutData.orderId ?? null,
                    subscriptionId: checkoutData.subscriptionId ?? null,
                    amount: checkoutData.amount ?? null,
                    currency: checkoutData.currency ?? null,
                });
                signal.throwIfAborted();
                const razorpay = new window.Razorpay(options);
                razorpay.open();
                setIsCheckoutLoading(false);
                debugLog('Checkout loading ended after razorpay.open()');
            }, CHECKOUT_TIMEOUT_MS);
        } catch {
            setIsPaymentModalOpen(true);
        } finally {
            checkoutInFlightRef.current = false;
            setIsCheckoutLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        let stopWaiting: (() => void) | undefined;
        const runPostAuthAction = async () => {
            if (!supabase) return;

            const params = new URLSearchParams(window.location.search);
            const intentParam = params.get('intent');
            const legacyDownloadParam = params.get('download') === '1';
            const storedIntent = window.localStorage.getItem(AUTH_INTENT_STORAGE_KEY);
            const hasAuthCallbackMarkers = Boolean(
                params.get('code') || params.get('access_token') || params.get('refresh_token') || params.get('error')
            );

            debugLog('runPostAuthAction started', {
                href: window.location.href,
                intentParam,
                legacyDownloadParam,
                storedIntent,
                hasAuthCallbackMarkers,
            });

            const validIntents = ['download', 'upgrade_monthly', 'upgrade_yearly', 'recover_monthly', 'recover_yearly'];
            const intent =
                intentParam && validIntents.includes(intentParam)
                    ? (intentParam as AuthIntent)
                    : storedIntent && validIntents.includes(storedIntent)
                      ? (storedIntent as AuthIntent)
                      : legacyDownloadParam
                        ? 'download'
                        : null;

            debugLog('runPostAuthAction resolved intent', { intent });

            if (!intent) return;

            const clearIntentMarkers = () => {
                debugLog('Clearing intent markers from storage and URL');
                window.localStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
                params.delete('intent');
                params.delete('download');
                const nextSearch = params.toString();
                const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
                window.history.replaceState({}, '', nextUrl);
                debugLog('Intent markers cleared', { nextUrl });
            };

            const continueIntent = async (activeIntent: AuthIntent) => {
                debugLog('continueIntent entered', { activeIntent });
                clearIntentMarkers();

                if (activeIntent === 'recover_monthly' || activeIntent === 'recover_yearly') {
                    setIsAuthModalOpen(false);
                    await deliverPaidLicense(activeIntent === 'recover_yearly' ? 'yearly' : 'monthly');
                    return;
                }

                if (activeIntent === 'upgrade_monthly') {
                    debugLog('continueIntent -> upgrade_monthly');
                    await startRazorpayCheckout('monthly');
                    return;
                }

                if (activeIntent === 'upgrade_yearly') {
                    debugLog('continueIntent -> upgrade_yearly');
                    await startRazorpayCheckout('yearly');
                    return;
                }

                await claimTrialAndDownload();
            };

            const { data, error: postAuthSessionError } = await withDeadline(signal => abortable(supabase.auth.getSession(), signal));
            if (cancelled) return;
            debugLog('runPostAuthAction getSession result', {
                hasSession: Boolean(data.session),
                postAuthSessionError: postAuthSessionError?.message ?? null,
                userId: data.session?.user?.id ?? null,
                email: data.session?.user?.email ?? null,
            });

            if (data.session) {
                debugLog('Session available immediately after OAuth callback');
                await continueIntent(intent);
                return;
            }

            if (!hasAuthCallbackMarkers) {
                debugLog('No callback markers and no session; clearing stale auth intent', { intent });
                window.localStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
                return;
            }

            stopWaiting = continueAfterSignIn({
                subscribe: onSession => {
                    const { data } = supabase.auth.onAuthStateChange((event, session) => {
                        if (event === 'SIGNED_IN' && session) onSession(session);
                    });
                    return () => data.subscription.unsubscribe();
                },
                onSuccess: () => {
                    if (!cancelled)
                        void continueIntent(intent).catch(() => {
                            setAuthError('Unable to finish signing in. Please try again.');
                            setIsAuthModalOpen(true);
                        });
                },
                onTimeout: () => {
                    if (cancelled) return;
                    setAuthError('Google login did not finish. Please try signing in again.');
                    setIsAuthModalOpen(true);
                },
            });
        };

        void runPostAuthAction().catch(() => {
            if (cancelled) return;
            setAuthError('Unable to finish signing in. Please try again.');
            setIsAuthModalOpen(true);
        });
        return () => {
            cancelled = true;
            stopWaiting?.();
        };
    }, []);

    const startGoogleSignIn = async () => {
        setAuthError(null);
        debugLog('startGoogleSignIn called', {
            authIntent,
            href: window.location.href,
            origin: window.location.origin,
            pathname: window.location.pathname,
            host: window.location.host,
        });

        if (!supabase) {
            debugLog('startGoogleSignIn blocked: supabase not configured', { missingSupabaseEnvVars });
            setAuthError(`Supabase is not configured. Missing: ${missingSupabaseEnvVars.join(', ')}`);
            return;
        }

        setIsAuthModalOpen(false);
        setIsSigningIn(true);
        window.localStorage.setItem(AUTH_INTENT_STORAGE_KEY, authIntent);
        debugLog('Stored auth intent before OAuth redirect', {
            storageKey: AUTH_INTENT_STORAGE_KEY,
            authIntent,
        });

        const redirectTo = (() => {
            const redirectUrl = new URL(window.location.href);
            redirectUrl.hash = '';
            redirectUrl.search = '';
            redirectUrl.searchParams.set('intent', authIntent);
            return redirectUrl.toString();
        })();

        debugLog('Calling signInWithOAuth', { redirectTo });

        const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                skipBrowserRedirect: true,
            },
        });

        if (error) {
            debugLog('signInWithOAuth returned error', { message: error.message });
            setAuthError(error.message);
            setIsSigningIn(false);
            return;
        }

        debugLog('signInWithOAuth initiated successfully', {
            hasUrl: Boolean(oauthData?.url),
            oauthUrl: oauthData?.url ?? null,
        });

        if (!oauthData?.url) {
            setAuthError('OAuth URL was not returned by Supabase.');
            setIsSigningIn(false);
            return;
        }

        window.location.assign(oauthData.url);
    };

    const claimTrialAndDownload = async () => {
        if (!supabase) {
            setAuthError('Sign-in is not configured. Please contact support.');
            setIsAuthModalOpen(true);
            return;
        }
        try {
            const deviceId = getTrialDeviceId(window.localStorage);
            const { data, error } = await withDeadline(signal => supabase.functions.invoke('claim-trial-access', { body: { deviceId }, signal }));
            if (error || !data?.access_key) {
                let message = 'Could not retrieve your trial key. Please retry.';
                const context = (error as { context?: Response } | null)?.context;
                if (context instanceof Response) {
                    const detail = await context
                        .clone()
                        .json()
                        .catch(() => null);
                    if (typeof detail?.error === 'string') message = detail.error;
                }
                throw new Error(message);
            }
            setTrialKey(String(data.access_key));
            setIsKeyCopied(false);
            setIsAuthModalOpen(false);
            setIsTrialModalOpen(true);
        } catch (error) {
            setAuthError(error instanceof Error ? error.message : 'Could not retrieve your trial key. Please retry.');
            setIsAuthModalOpen(true);
        }
    };
    const handleDownloadClick = async () => {
        setAuthError(null);
        setAuthIntent('download');
        if (!supabase) {
            setAuthError('Sign-in is not configured. Please contact support.');
            setIsAuthModalOpen(true);
            return;
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            setAuthError('Could not check sign-in. Please retry.');
            setIsAuthModalOpen(true);
            return;
        }
        if (data.session) {
            await claimTrialAndDownload();
            return;
        }
        setIsAuthModalOpen(true);
    };

    const handleMacDownloadClick = () => {
        setIsMacModalOpen(true);
    };

    const handleUpgradeClick = async (plan: 'monthly' | 'yearly') => {
        setAuthError(null);
        debugLog('handleUpgradeClick called', { plan });
        setAuthIntent(plan === 'monthly' ? 'upgrade_monthly' : 'upgrade_yearly');
        await startRazorpayCheckout(plan);
    };

    return (
        <div className="bg-charcoal min-h-screen text-white selection:bg-mint selection:text-charcoal">
            <div inert={hasOpenDialog}>
                <MarketingSite
                    onDownload={handleDownloadClick}
                    onUpgrade={handleUpgradeClick}
                    onRecover={handleRecoverLicense}
                    onMacDownload={handleMacDownloadClick}
                    checkoutLoading={isCheckoutLoading}
                />
            </div>

            <AuthGateModal
                isOpen={isAuthModalOpen}
                intent={authIntent}
                onClose={() => setIsAuthModalOpen(false)}
                onSignIn={startGoogleSignIn}
                isSigningIn={isSigningIn}
                error={authError}
            />

            <TrialKeyModal
                isOpen={isTrialModalOpen}
                trialKey={trialKey}
                onCopy={handleCopyTrialKey}
                onDone={downloadAfterTrialKey}
                onClose={() => setIsTrialModalOpen(false)}
                isCopied={isKeyCopied}
            />

            <MacComingSoonModal isOpen={isMacModalOpen} onClose={() => setIsMacModalOpen(false)} />

            <PaymentSupportModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} />

            <PaidLicenseModal
                isOpen={isPaidLicenseModalOpen}
                plan={paidLicensePlan}
                licenseKey={paidLicenseKey}
                isCopied={isPaidLicenseCopied}
                onCopy={handleCopyPaidLicenseKey}
                onDownload={triggerDownload}
                onClose={() => setIsPaidLicenseModalOpen(false)}
            />

            <PendingLicenseModal
                isOpen={isPendingLicenseOpen}
                isRecovering={isRecoveringLicense}
                reference={pendingLicense?.reference || ''}
                onDownload={triggerDownload}
                onClose={() => setIsPendingLicenseOpen(false)}
            />
            {isCheckoutLoading && <CheckoutStatus />}
        </div>
    );
}

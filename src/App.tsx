/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { supabase, missingSupabaseEnvVars } from './lib/supabase';
import MarketingSite from './marketing/MarketingSite';
import './marketing/account-dialogs.css';

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    }
}

import { AuthGateModal, TrialKeyModal, MacComingSoonModal, PaymentSupportModal, PaidLicenseModal, CheckoutStatus } from './marketing/AccountDialogs';

export default function App() {
    const windowsDownloadUrl =
        import.meta.env.VITE_WINDOWS_DOWNLOAD_URL || 'https://github.com/Shomesh007/hintio/releases/download/v1.0.0/Hintio-1.0.1.Setup.exe';
    const defaultSupabaseUrl = 'https://vsybqtunyuanxspxhzue.supabase.co';
    const supabaseFunctionsBaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    type AuthIntent = 'download' | 'upgrade_monthly' | 'upgrade_yearly';
    const AUTH_INTENT_STORAGE_KEY = 'hintio_auth_intent';
    const postAuthRunGuardRef = useRef(false);
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

    const hasOpenDialog = isAuthModalOpen || isTrialModalOpen || isMacModalOpen || isPaymentModalOpen || isPaidLicenseModalOpen;
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
            if (event.key === 'Escape' && !isTrialModalOpen) {
                setIsAuthModalOpen(false);
                setIsMacModalOpen(false);
                setIsPaymentModalOpen(false);
                setIsPaidLicenseModalOpen(false);
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

    const loadRazorpayScript = async () => {
        debugLog('loadRazorpayScript called', { hasRazorpay: Boolean(window.Razorpay) });
        if (window.Razorpay) {
            debugLog('Razorpay already loaded');
            return true;
        }

        return await new Promise<boolean>(resolve => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => {
                debugLog('Razorpay script loaded successfully');
                resolve(true);
            };
            script.onerror = () => {
                debugLog('Razorpay script failed to load');
                resolve(false);
            };
            document.body.appendChild(script);
            debugLog('Razorpay script tag appended');
        });
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

    const fetchPaidLicenseKey = async (plan: 'monthly' | 'yearly') => {
        if (!supabase) throw new Error('Supabase is not configured');

        const fetchFromLicensesTable = async (userEmail: string) => {
            const { data, error } = await supabase
                .from('licenses')
                .select('license_key,plan,status,created_at')
                .eq('email', userEmail)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error || !data?.length) {
                return null;
            }

            const matchedPlan = data.find(row => row.plan === plan && typeof row.license_key === 'string');
            if (matchedPlan?.license_key) {
                return String(matchedPlan.license_key);
            }

            const latest = data.find(row => typeof row.license_key === 'string');
            return latest?.license_key ? String(latest.license_key) : null;
        };

        const attemptCount = 15;
        for (let attempt = 1; attempt <= attemptCount; attempt++) {
            const { data: sessionData } = await supabase.auth.getSession();
            const fallbackEmail = sessionData.session?.user?.email ?? null;
            if (fallbackEmail) {
                const fallbackKey = await fetchFromLicensesTable(fallbackEmail);
                if (fallbackKey) {
                    debugLog('fetchPaidLicenseKey succeeded via licenses table fallback', {
                        attempt,
                        attemptCount,
                        email: fallbackEmail,
                    });
                    return fallbackKey;
                }
            }

            debugLog('fetchPaidLicenseKey attempt failed', {
                attempt,
                attemptCount,
                error: 'licenses table fallback did not find key yet',
                hasLicenseKey: false,
            });

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        throw new Error('Payment was successful, but your key is still processing. Please contact support if it does not appear in 1-2 minutes.');
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

        const { data, error } = await supabase.functions.invoke('issue-paid-license', {
            body: {
                plan,
                paymentId: paymentResponse?.razorpay_payment_id ?? null,
                orderId: paymentResponse?.razorpay_order_id ?? null,
                subscriptionId: paymentResponse?.razorpay_subscription_id ?? null,
                signature: paymentResponse?.razorpay_signature ?? null,
            },
        });

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

    const startRazorpayCheckout = async (plan: 'monthly' | 'yearly') => {
        debugLog('startRazorpayCheckout invoked', { plan, href: window.location.href });
        if (!supabase) {
            debugLog('startRazorpayCheckout blocked: supabase not configured', { missingSupabaseEnvVars });
            setAuthError(`Supabase is not configured. Missing: ${missingSupabaseEnvVars.join(', ')}`);
            setIsAuthModalOpen(true);
            return;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
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
                await new Promise(resolve => setTimeout(resolve, waitMs));
            }
        };

        setIsCheckoutLoading(true);
        debugLog('Checkout loading started');

        const isScriptLoaded = await loadRazorpayScript();
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
            await supabase.functions.invoke('create-razorpay-checkout', {
                body: { plan },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

        const invokeCheckoutViaFetch = async (accessToken: string) => {
            if (!supabaseAnonKey) {
                return {
                    ok: false,
                    status: null as number | null,
                    data: null as Record<string, unknown> | null,
                    body: 'Missing VITE_SUPABASE_ANON_KEY for fetch fallback.',
                };
            }

            const response = await fetch(`${supabaseFunctionsBaseUrl}/functions/v1/create-razorpay-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: supabaseAnonKey,
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ plan }),
            });

            const bodyText = await response.text();
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

                const body = await context.clone().text();
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
        const shouldRetryForAuth =
            initialCheckoutStatus === 401 || ((checkoutError as { name?: string } | null)?.name === 'FunctionsHttpError' && !checkoutData);

        if (shouldRetryForAuth) {
            debugLog('create-razorpay-checkout returned 401, attempting session refresh + retry');
            const { data: refreshedSessionData, error: refreshError } = await supabase.auth.refreshSession();
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

        if (checkoutError || !checkoutData?.keyId) {
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
                setIsCheckoutLoading(true);
                try {
                    let licenseKey: string | null = null;

                    try {
                        licenseKey = await issuePaidLicenseKey(plan, paymentResponse);
                        debugLog('issuePaidLicenseKey succeeded', {
                            plan,
                            hasPaymentId: Boolean(paymentResponse?.razorpay_payment_id),
                            hasOrderId: Boolean(paymentResponse?.razorpay_order_id),
                            hasSubscriptionId: Boolean(paymentResponse?.razorpay_subscription_id),
                        });
                    } catch (issueError) {
                        debugLog('issuePaidLicenseKey failed, falling back to polling', {
                            message: issueError instanceof Error ? issueError.message : String(issueError),
                        });
                        licenseKey = await fetchPaidLicenseKey(plan);
                    }

                    setPaidLicensePlan(plan);
                    setPaidLicenseKey(licenseKey);
                    setIsPaidLicenseCopied(false);
                    setIsPaidLicenseModalOpen(true);
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Payment was successful, but key retrieval failed.';
                    alert(message);
                } finally {
                    setIsCheckoutLoading(false);
                }
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
        const razorpay = new window.Razorpay(options);
        razorpay.open();
        setIsCheckoutLoading(false);
        debugLog('Checkout loading ended after razorpay.open()');
    };

    useEffect(() => {
        const runPostAuthAction = async () => {
            if (postAuthRunGuardRef.current) {
                debugLog('runPostAuthAction skipped by guard (StrictMode double-invoke)');
                return;
            }
            postAuthRunGuardRef.current = true;

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

            const intent =
                intentParam === 'download' || intentParam === 'upgrade_monthly' || intentParam === 'upgrade_yearly'
                    ? (intentParam as AuthIntent)
                    : storedIntent === 'download' || storedIntent === 'upgrade_monthly' || storedIntent === 'upgrade_yearly'
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

                debugLog('continueIntent -> download flow, requesting trial key');
                const { data: keyData, error: keyError } = await supabase.rpc('claim_three_usage_trial_key');
                debugLog('claim_three_usage_trial_key response', {
                    hasKeyData: Boolean(keyData),
                    keyError: keyError?.message ?? null,
                    isNew: keyData?.is_new ?? null,
                    hasAccessKey: Boolean(keyData?.access_key),
                });

                if (keyError || !keyData?.access_key) {
                    setAuthError(keyError?.message ?? 'Could not fetch free trial key.');
                    setIsAuthModalOpen(true);
                    return;
                }

                if (keyData.is_new) {
                    setTrialKey(String(keyData.access_key));
                    setIsTrialModalOpen(true);
                } else {
                    triggerDownload();
                }
            };

            const { data, error: postAuthSessionError } = await supabase.auth.getSession();
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

            const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
                debugLog('onAuthStateChange event', {
                    event,
                    hasSession: Boolean(session),
                    userId: session?.user?.id ?? null,
                    email: session?.user?.email ?? null,
                });
                if (event === 'SIGNED_IN' && session) {
                    authListener.subscription.unsubscribe();
                    debugLog('SIGNED_IN received, continuing intent');
                    void continueIntent(intent);
                }
            });

            setTimeout(() => {
                debugLog('Auth listener timeout reached, unsubscribing');
                authListener.subscription.unsubscribe();
                setAuthError('Google login callback did not produce a session. Check device clock and Supabase redirect URL settings.');
                setIsAuthModalOpen(true);
            }, 20000);
        };

        runPostAuthAction();
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

    const handleDownloadClick = async () => {
        setAuthError(null);
        setAuthIntent('download');
        debugLog('handleDownloadClick called');

        if (!supabase) {
            debugLog('handleDownloadClick blocked: supabase not configured', { missingSupabaseEnvVars });
            setAuthError(`Supabase is not configured. Missing: ${missingSupabaseEnvVars.join(', ')}`);
            setIsAuthModalOpen(true);
            return;
        }

        const { data, error } = await supabase.auth.getSession();
        debugLog('handleDownloadClick getSession result', {
            hasSession: Boolean(data.session),
            sessionError: error?.message ?? null,
            userId: data.session?.user?.id ?? null,
        });

        if (data.session) {
            triggerDownload();
            return;
        }

        debugLog('No session, opening auth modal for download flow');
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

            {isCheckoutLoading && <CheckoutStatus />}
        </div>
    );
}

import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { billingTestMode } from './lib/supabase';

const AnalyticsDashboard = lazy(() => import('./admin/AnalyticsDashboard'));
const adminPath = /^\/admin\/analytics\/?$/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {!adminPath && billingTestMode && (
            <div
                role="status"
                style={{ background: '#dcff00', color: '#101625', padding: '10px 20px', font: '600 12px system-ui', textAlign: 'center' }}
            >
                LOCAL PAYMENT TEST MODE · No real payments · Paid keys are sandbox-only · Free trial uses the real trial service
            </div>
        )}
        {adminPath ? (
            <Suspense fallback={<p role="status">Loading analytics…</p>}>
                <AnalyticsDashboard />
            </Suspense>
        ) : <App />}
    </StrictMode>
);

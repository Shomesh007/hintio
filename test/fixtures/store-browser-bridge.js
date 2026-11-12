// Test-only bridge. No native capture, credentials, payment or outbound reports.
const state = (window.uiTestState = {
    config: { onboarded: true, cloudConsent: true },
    prefs: { selectedProfile: 'meeting', audioMode: 'none', customPrompt: 'Example context: summarize decisions and next steps.' },
    token: '',
    approved: true,
    calls: [],
    exports: [],
    capture: false,
});
const sample = {
    sessionId: '1794300000000',
    createdAt: 1794300000000,
    profile: 'meeting',
    customPrompt: 'Synthetic example session, no customer data.',
    conversationHistory: [
        {
            transcription: 'Example: how can we make the project handoff clearer?',
            ai_response: 'Example AI draft: document the owner, acceptance criteria, and next review date.',
            timestamp: 1794300000000,
        },
    ],
    screenAnalysisHistory: [],
};
const handlers = {};
window.electronAPI = {
    on: (name, fn) => {
        handlers[name] = fn;
    },
    removeListener() {},
    removeAllListeners() {},
    send: (...args) => state.calls.push(args),
    invoke: async (channel, ...args) => {
        state.calls.push([channel, ...args]);
        if (channel === 'open-file-dialog') return 'synthetic-resume.docx';
        if (channel === 'parse-document') return window.syntheticDocument;
        if (channel === 'close-session') state.capture = false;
        return { success: true };
    },
};
const updates = {
    channel: 'microsoft-store',
    currentVersion: window.syntheticAppVersion || '1.0.6',
    required: false,
    available: false,
    phase: 'managed',
};
window.hintio = {
    isMacOS: false,
    getVersion: async () => updates.currentVersion,
    refreshPreferencesCache: async () => {},
    storage: {
        getConfig: async () => ({ ...state.config }),
        updateConfig: async (k, v) => {
            state.config[k] = v;
        },
        getPreferences: async () => ({ ...state.prefs }),
        updatePreference: async (k, v) => {
            state.prefs[k] = v;
        },
        getCredentials: async () => ({ cloudToken: state.token }),
        setAccessToken: async token => {
            state.token = token;
        },
        getKeybinds: async () => null,
        setKeybinds: async () => {},
        getAllSessions: async () => [{ ...sample, messageCount: 1, screenAnalysisCount: 0 }],
        getSession: async () => sample,
        clearAll: async () => {
            state.cleared = true;
        },
        getVoiceProfile: async () => null,
    },
    theme: { getAll: () => [{ value: 'dark', name: 'Dark' }], get: () => ({ background: '#09090b' }), applyBackgrounds() {}, save: async () => {} },
    updates: {
        getState: async () => updates,
        check: async () => updates,
        openInstaller: async () => {
            state.calls.push(['store-downloads']);
            return { ...updates, notice: 'Microsoft Store opened.' };
        },
    },
    initializeGemini: async () => {
        state.calls.push(['initialize']);
        return state.approved;
    },
    getLastInitError: () => 'Synthetic invalid access token.',
    startCapture: () => {
        state.capture = true;
    },
    stopCapture: () => {
        state.capture = false;
    },
    getSessionLimitMs: () => 900000,
    clearSessionProviderSecrets: async () => {},
    saveTextFile: async (text, name) => {
        state.exports.push({ text, name });
        return { success: true };
    },
};

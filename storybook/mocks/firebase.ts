// Storybook stub: Firebase is native only. No events leave the browser.
const noop = () => undefined;
const asyncNoop = async () => undefined;
const handler: ProxyHandler<any> = { get: (_t, k) => (k === 'then' ? undefined : new Proxy(function () {}, handler)), apply: () => new Proxy(function () {}, handler) };
const stub: any = new Proxy(function () {}, handler);
export default stub;
export const getAnalytics = () => stub; export const logEvent = asyncNoop; export const setUserId = asyncNoop;
export const setUserProperties = asyncNoop; export const getApp = () => stub; export const getCrashlytics = () => stub;
export const log = noop; export const recordError = noop; export const getRemoteConfig = () => stub;
export const fetchAndActivate = async () => false; export const getValue = () => ({ asString: () => '', asBoolean: () => false, asNumber: () => 0 });
export const setDefaults = asyncNoop; export const setConfigSettings = asyncNoop; export const getAll = () => ({});
export const setCrashlyticsCollectionEnabled = asyncNoop; export const setAnalyticsCollectionEnabled = asyncNoop; export const logScreenView = asyncNoop;

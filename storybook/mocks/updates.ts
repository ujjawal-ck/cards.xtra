// Storybook stub: no OTA updates.
export const isEnabled = false; export const channel = 'storybook'; export const updateId = null;
export async function checkForUpdateAsync() { return { isAvailable: false }; }
export async function fetchUpdateAsync() { return {}; } export async function reloadAsync() {}
export function useUpdates() { return { isUpdateAvailable: false, isUpdatePending: false }; }

/**
 * Feature Flags Configuration
 * 
 * INPUT_ONLY_MODE: When enabled, the app runs in input-only mode where:
 * - No authentication required
 * - Simple UI with terminal text and Record button
 * - Phone number collection after first recording
 * - All recordings stored with phone number association
 * 
 * To re-enable the original auth flow, set this to false or remove the env var.
 */
export const INPUT_ONLY_MODE = import.meta.env.VITE_INPUT_ONLY_MODE === 'true' || true; // Default to true in this branch


# Troubleshooting: Input-Only Mode Not Showing

If you're seeing the old map interface instead of the input-only page, try these steps:

## 1. Restart the Dev Server

The dev server needs to be restarted to pick up the new files:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## 2. Hard Refresh Browser

Clear browser cache and hard refresh:
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R`

## 3. Check Browser Console

Open browser DevTools (F12) and check for errors:
- Look for any red error messages
- Check if `InputOnlyPage` component is loading
- Verify feature flag is `true`

## 4. Verify Feature Flag

Check that the feature flag is enabled:

```bash
# In the project root
cat src/config/featureFlags.ts
```

Should show: `export const INPUT_ONLY_MODE = ... || true;`

## 5. Check File Structure

Verify all new files exist:

```bash
ls -la src/pages/InputOnlyPage.tsx
ls -la src/components/PhoneModal.tsx
ls -la src/config/featureFlags.ts
ls -la src/hooks/usePhoneLead.ts
ls -la src/hooks/useRecorder.ts
```

## 6. Check Import Errors

If you see import errors in console, verify:
- All imports are using correct paths (`@/` alias)
- TypeScript compilation is successful
- No missing dependencies

## 7. Verify App.tsx

Check that `App.tsx` is using `InputOnlyRoutes`:

```bash
grep -A 5 "INPUT_ONLY_MODE" src/App.tsx
```

Should show the conditional rendering logic.

## 8. Clear Vite Cache

If still not working, clear Vite's cache:

```bash
rm -rf node_modules/.vite
npm run dev
```

## Expected Behavior

When working correctly, you should see:
1. Black background
2. Terminal-style text box at top with the Time Machine description
3. Large "Record" button in the center
4. No map, no auth prompts, no other UI elements

If you're still seeing the map, the feature flag might not be evaluating correctly or the dev server hasn't picked up changes.


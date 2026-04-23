# Offline Capability Testing Guide

## What's Been Set Up

1. **Service Worker** (`service-worker.js`): Automatically caches all app files on first load
2. **Offline Support**: Once cached, the app works completely offline
3. **Auto-Registration**: Service Worker registers automatically when you load the page

## Local Testing Steps

### Step 1: Load the App Online
1. Open browser: `http://localhost:8000`
2. Open DevTools (F12)
3. Go to **Application** tab → **Service Workers**
4. Confirm "Service Worker registered" message in console
5. Check **Application** → **Cache Storage** → `bulk-volume-calculator-v1`
6. You should see cached files: `index.html`, `script.js`, `styles.css`, etc.

### Step 2: Test Offline Mode (Simulate)
1. In DevTools, go to **Network** tab
2. Check "Offline" checkbox
3. Refresh the page (Ctrl+R)
4. **Expected Result**: App should load fully from cache
5. All functionality should work: Upload CSV, Add rows, Calculate, etc.

### Step 3: Test Cache Updates
1. Uncheck "Offline" checkbox
2. Make changes to files (they'll be re-cached on next visit)
3. Go back to Offline mode
4. Refresh - you'll see the updated version

## Browser DevTools Locations

### Chrome/Edge:
- **Network Offline**: DevTools → Network tab → Checkbox "Offline"
- **Service Workers**: DevTools → Application → Service Workers
- **Cache**: DevTools → Application → Cache Storage

### Firefox:
- **Network Offline**: DevTools → Network → Settings (gear) → Throttling
- **Service Workers**: DevTools → Storage → Service Workers

## What Gets Cached

✅ Cached (works offline):
- HTML, CSS, JavaScript files
- CSV sample data
- Charts.js library (from CDN)

## Real-World Offline Test

1. Deploy to Vercel
2. Open on mobile
3. Load the app normally (online)
4. Enable Airplane Mode
5. App continues to work with all previous calculations

## Updating the Cache

To force update the cache version:
- Edit `service-worker.js`: Change `CACHE_NAME` to `'bulk-volume-calculator-v2'`
- Old cache automatically deleted on next visit
- New files will be cached

## Network Requests (Offline)

When offline, service worker will:
- ✅ Serve cached files (fast)
- ❌ Fail gracefully on new requests (shows offline message)
- ✅ All calculations work (client-side only)

---

**Ready to Deploy?** Upload to Vercel and test with DevTools → Application → Service Workers

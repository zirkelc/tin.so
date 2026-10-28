const BEACON_URL = "https://static.cloudflareinsights.com/beacon.min.js";

/**
 * The script of Cloudflare Web Analytics for a token, or undefined without a token. The beacon uses
 * no cookies, and it sends the page address without the fragment, so the spec of a link stays on
 * the device.
 */
export function beaconScript(token: string | undefined): HTMLScriptElement | undefined {
  if (!token) return undefined;
  const script = document.createElement("script");
  script.defer = true;
  script.src = BEACON_URL;
  // Only a page load counts as a view, because the app changes the address on each edit
  script.dataset.cfBeacon = JSON.stringify({ token, spa: false });
  return script;
}

/** Loads the analytics when the build has a token */
export function startAnalytics(token: string | undefined): void {
  const script = beaconScript(token);
  if (script) document.head.append(script);
}

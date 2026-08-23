/**
 * Xhipa Referral & Affiliate Client Attribution Tracker
 * Enforces a 30-day first-touch attribution window stored client-side
 * and securely authoritatively verified on the backend.
 */

const REFERRAL_STORAGE_KEY = 'stf_affiliate_attribution';
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface StoredAttribution {
  code: string;
  timestamp: number;
}

/**
 * Parses referral parameter from URL if present and records click
 */
export async function trackReferralTouch(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref') || urlParams.get('aff');

    if (refParam) {
      const cleanCode = refParam.trim().toUpperCase();

      // Check if we already have an active attribution stored within the window (First-Touch Attribution)
      const existing = getStoredAttribution();
      if (!existing) {
        // Record new first-touch attribution
        const attribution: StoredAttribution = {
          code: cleanCode,
          timestamp: Date.now()
        };
        localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(attribution));

        // Asynchronously notify server of the click
        fetch(`/api/affiliate/track-click?ref=${encodeURIComponent(cleanCode)}&page=${encodeURIComponent(window.location.pathname)}`)
          .then(res => res.json())
          .catch(err => console.debug('Referral click tracking:', err));

        return cleanCode;
      }
      return existing.code;
    }

    const current = getStoredAttribution();
    return current ? current.code : null;
  } catch (err) {
    console.debug('Attribution tracker error:', err);
    return null;
  }
}

/**
 * Returns the currently active attributed referral code, or null if absent/expired (>30 days)
 */
export function getAttributedReferralCode(): string | null {
  const attribution = getStoredAttribution();
  return attribution ? attribution.code : null;
}

function getStoredAttribution(): StoredAttribution | null {
  if (typeof window === 'undefined') return null;

  try {
    const item = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!item) return null;

    const parsed: StoredAttribution = JSON.parse(item);
    if (!parsed || !parsed.code || !parsed.timestamp) {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }

    // Check 30-day attribution window
    if (Date.now() - parsed.timestamp > ATTRIBUTION_WINDOW_MS) {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch (e) {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    return null;
  }
}

/**
 * Clears the attribution token once account registration and permanent attribution are confirmed
 */
export function clearAttributedReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch (e) {
    // Ignore
  }
}

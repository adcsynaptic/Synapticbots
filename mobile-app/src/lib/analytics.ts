type AnalyticsEvent = {
  name: string;
  properties?: Record<string, string | number | boolean | null>;
};

/**
 * Analytics baseline for the mobile app.
 * Replace the implementation with your preferred analytics provider later.
 */
export function trackEvent(_event: AnalyticsEvent) {
  // No-op by default to avoid coupling to a specific vendor.
}


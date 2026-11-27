export const LOCATION_MODES = ["fixed", "mobile", "hybrid"] as const;
export type LocationMode = typeof LOCATION_MODES[number];

export type GeoFailure = "blocked" | "denied" | "timeout" | "inaccurate" | "unsupported" | "unavailable";
export type GeoResult = { status: "located"; latitude: number; longitude: number } | { status: GeoFailure };

/** Call from an explicit user action. The caller owns the lifetime of the coordinates. */
export async function locateOnce({ maxAccuracyMeters, timeoutMs }: { maxAccuracyMeters: number; timeoutMs: number }): Promise<GeoResult> {
  if (typeof window === "undefined" || !window.isSecureContext || !navigator.geolocation) {
    return { status: "unsupported" };
  }
  const doc = document as Document & {
    permissionsPolicy?: { allowsFeature(name: string): boolean };
    featurePolicy?: { allowsFeature(name: string): boolean };
  };
  if ((doc.permissionsPolicy ?? doc.featurePolicy)?.allowsFeature("geolocation") === false) {
    return { status: "blocked" };
  }
  return new Promise(resolve => {
    const finish = (result: GeoResult) => {
      clearTimeout(timer);
      resolve(result);
    };
    const timer = window.setTimeout(() => finish({ status: "timeout" }), timeoutMs);
    try {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        if (!Number.isFinite(coords.latitude) || Math.abs(coords.latitude) > 90 ||
            !Number.isFinite(coords.longitude) || Math.abs(coords.longitude) > 180) {
          finish({ status: "unavailable" });
        } else if (!Number.isFinite(coords.accuracy) || coords.accuracy < 0 || coords.accuracy > maxAccuracyMeters) {
          finish({ status: "inaccurate" });
        } else {
          finish({ status: "located", latitude: coords.latitude, longitude: coords.longitude });
        }
      }, ({ code }) => finish({ status: code === 1 ? "denied" : code === 3 ? "timeout" : "unavailable" }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs });
    } catch {
      finish({ status: "unavailable" });
    }
  });
}


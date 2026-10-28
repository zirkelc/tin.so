import { describe, expect, test } from "vite-plus/test";
import { beaconScript } from "../../src/analytics.ts";

describe("beaconScript", () => {
  test("should make no script without a token", () => {
    // Act
    const result = beaconScript(undefined);

    // Assert
    expect(result).toBe(undefined);
  });

  test("should make the beacon with the token and without page views per edit", () => {
    // Act
    const result = beaconScript("abc123");

    // Assert
    expect(result?.src).toBe("https://static.cloudflareinsights.com/beacon.min.js");
    expect(JSON.parse(result!.dataset.cfBeacon!)).toEqual({ token: "abc123", spa: false });
  });
});

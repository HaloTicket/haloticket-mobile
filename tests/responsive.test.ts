import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeResponsiveMetrics } from "../src/utils/responsive.ts";

describe("computeResponsiveMetrics", () => {
  it("classifies compact phones and shrinks padding, track, and scan box safely", () => {
    const m = computeResponsiveMetrics(320, 568);
    assert.equal(m.sizeClass, "compact");
    assert.equal(m.isCompact, true);
    assert.equal(m.eventColumns, 1);
    assert.equal(m.horizontalPadding, 12);
    assert.ok(m.splashTrackWidth >= 200 && m.splashTrackWidth <= 248);
    assert.ok(m.scanBoxSize >= 168 && m.scanBoxSize <= 220);
  });

  it("classifies standard phones with single column and balanced dimensions", () => {
    const m = computeResponsiveMetrics(390, 844);
    assert.equal(m.sizeClass, "regular");
    assert.equal(m.isCompact, false);
    assert.equal(m.isTablet, false);
    assert.equal(m.eventColumns, 1);
    assert.equal(m.horizontalPadding, 16);
    assert.ok(m.scanBoxSize >= 240 && m.scanBoxSize <= 280);
  });

  it("switches to 2 columns on tablet portrait and 3 columns on desktop/wide tablet", () => {
    const tablet = computeResponsiveMetrics(768, 1024);
    assert.equal(tablet.sizeClass, "tablet");
    assert.equal(tablet.isTablet, true);
    assert.equal(tablet.eventColumns, 2);

    const desktop = computeResponsiveMetrics(1280, 800);
    assert.equal(desktop.sizeClass, "desktop");
    assert.equal(desktop.isDesktop, true);
    assert.equal(desktop.isLandscape, true);
    assert.equal(desktop.eventColumns, 3);
    assert.equal(desktop.contentMaxWidth, 1040);
  });

  it("shrinks QR scan box height in phone landscape so top/bottom controls stay visible", () => {
    const landscape = computeResponsiveMetrics(844, 390);
    assert.equal(landscape.isLandscape, true);
    assert.ok(landscape.scanBoxSize <= 180);
  });
});


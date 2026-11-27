/** Phân loại kích thước màn hình theo bề rộng hiện tại của thiết bị. */
export type DeviceSizeClass = "compact" | "regular" | "tablet" | "desktop";

/** Tập thông số bố cục co giãn theo kích thước và hướng xoay của màn hình. */
export interface ResponsiveMetrics {
  width: number;
  height: number;
  isCompact: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  sizeClass: DeviceSizeClass;
  horizontalPadding: number;
  contentMaxWidth: number;
  authMaxWidth: number;
  eventColumns: number;
  splashTrackWidth: number;
  scanBoxSize: number;
}

/** Giới hạn giá trị trong đoạn [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Tính các thông số responsive từ kích thước cửa sổ:
 * - compact (< 360px): điện thoại màn nhỏ (iPhone SE 1st gen, Android nhỏ)
 * - regular (360–767px): điện thoại phổ thông (iPhone, Android)
 * - tablet (768–1023px): máy tính bảng (iPad dọc/ngang nhỏ)
 * - desktop (>= 1024px): iPad ngang lớn / trình duyệt máy tính
 */
export function computeResponsiveMetrics(width: number, height: number): ResponsiveMetrics {
  const safeWidth = Math.max(width || 390, 280);
  const safeHeight = Math.max(height || 844, 320);

  const isCompact = safeWidth < 360;
  const isTablet = safeWidth >= 768;
  const isDesktop = safeWidth >= 1024;
  const isLandscape = safeWidth > safeHeight;

  const sizeClass: DeviceSizeClass = isDesktop
    ? "desktop"
    : isTablet
      ? "tablet"
      : isCompact
        ? "compact"
        : "regular";

  const horizontalPadding = isDesktop ? 28 : isTablet ? 24 : isCompact ? 12 : 16;
  const contentMaxWidth = isDesktop ? 1040 : isTablet ? 860 : safeWidth;
  const authMaxWidth = isTablet ? 460 : 420;
  const eventColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  const splashTrackWidth = Math.round(clamp(safeWidth - 72, 200, 300));
  const scanBoxTarget = Math.min(
    safeWidth * 0.68,
    safeHeight * (isLandscape ? 0.44 : 0.34),
    280
  );
  const scanBoxSize = Math.round(clamp(scanBoxTarget, 168, 280));

  return {
    width: safeWidth,
    height: safeHeight,
    isCompact,
    isTablet,
    isDesktop,
    isLandscape,
    sizeClass,
    horizontalPadding,
    contentMaxWidth,
    authMaxWidth,
    eventColumns,
    splashTrackWidth,
    scanBoxSize,
  };
}


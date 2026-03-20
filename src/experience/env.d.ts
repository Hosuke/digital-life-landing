export {};

declare global {
  interface Window {
    DIGITAL_LIFE_CONFIG?: {
      controlPlaneBaseUrl?: string;
      manualSchedulingWechat?: string;
      manualSchedulingQq?: string;
      paidContactEmail?: string;
    };
  }
}

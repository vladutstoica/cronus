import { ActiveWindowDetails } from "./types";

export const isVeryLikelyProductive = (windowDetails: ActiveWindowDetails) => {
  let isProductiveSite = false;
  if (windowDetails.url) {
    try {
      const hostname = new URL(windowDetails.url).hostname;
      isProductiveSite = alwaysProductiveSites.some(
        (site) => hostname === site || hostname.endsWith(`.${site}`),
      );
    } catch {
      // Invalid URL, skip site matching
    }
  }
  return (
    isProductiveSite ||
    alwaysProductiveOwners.includes(windowDetails.ownerName)
  );
};

export const alwaysProductiveSites = [
  "cursor.com",
  "us-east-1.console.aws.amazon.com",
  "figma.com",
];

export const alwaysProductiveOwners = [
  "Cursor",
  "Toggl Track",
  "MongoDB Compass",
  "Postman",
  "1Password",
  "Electron",
];

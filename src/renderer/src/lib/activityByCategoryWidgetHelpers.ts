export const extractWebsiteInfo = (
  url: string,
  title: string,
): { domain: string; name: string } => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, "");

    let cleanTitle = title
      .replace(/ - Google Chrome$/i, "")
      .replace(/ - Chrome$/i, "")
      .replace(/ - Safari$/i, "")
      .replace(/ - Microsoft\ Edge$/i, "")
      .replace(/ - Firefox$/i, "")
      .replace(/^\([0-9]+\) /, "") // Remove notification counts like "(2) Gmail"
      .trim();

    if (
      !cleanTitle ||
      cleanTitle.length < 3 ||
      cleanTitle.toLowerCase() === domain.toLowerCase()
    ) {
      cleanTitle = domain; // Fallback to domain if title is not descriptive or same as domain
    }
    return { domain, name: cleanTitle };
  } catch {
    return { domain: "unknown", name: title || "Unknown Website" };
  }
};

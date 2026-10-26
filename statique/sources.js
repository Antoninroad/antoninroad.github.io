const domaines = {
  youtube: ["youtube.com", "youtu.be"], tiktok: ["tiktok.com"], instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.me"], google: ["google.com", "google.fr", "google.be", "google.ch", "google.ca", "google.de", "google.co.uk", "google.es", "google.it"],
  bing: ["bing.com"], duckduckgo: ["duckduckgo.com"], linkedin: ["linkedin.com", "lnkd.in"], x: ["x.com", "twitter.com", "t.co"],
};
const alias = { yt: "youtube", "youtu.be": "youtube", "tik-tok": "tiktok", insta: "instagram", fb: "facebook", twitter: "x", email: "newsletter" };


export function sourceEntree(adresse, referer) {
  const url = new URL(adresse);
  const marque = (url.searchParams.get("utm_source") ?? "").trim().toLowerCase();
  const source = Object.hasOwn(alias, marque) ? alias[marque] : marque;
  // Une redirection statique depuis /instagram/ est elle-même une page du site.
  // Le marqueur explicite doit donc primer, même si le Referer est devenu interne.
  if (Object.hasOwn(domaines, source) || source === "newsletter") return source;
  if (!referer) return "direct";
  try {
    const depuis = new URL(referer);
    if (!["http:", "https:"].includes(depuis.protocol)) return null;
    const nom = depuis.hostname.toLowerCase().replace(/\.$/, "");
    if (nom === url.hostname.toLowerCase().replace(/\.$/, "")) return null;
    for (const [source, liste] of Object.entries(domaines))
      if (liste.some(d => nom === d || nom.endsWith("." + d))) return source;
    return "autre";
  } catch { return null; }
}

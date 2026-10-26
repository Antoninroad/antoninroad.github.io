import { sourceEntree } from "./sources.js";

/* Mesure Bobby IA : compteurs globaux, puis cookie de navigateur sur accord explicite. */
const API = "https://hacktofluency.com/api/bobby";
const CHOIX = "bobby_choix";
const VISITEUR = "bobby_visiteur";
const DUREE = 180 * 86400;
const panneau = document.querySelector("#audience-panneau");
const preferences = document.querySelector("[data-audience-preferences]");
const erreur = document.querySelector("#audience-erreur");
const fermer = document.querySelector("[data-audience-fermer]");
const boutons = [...document.querySelectorAll("[data-audience-choix]")];

function lireCookie(nom) {
  const valeur = document.cookie.split(";").map(x => x.trim()).find(x => x.startsWith(nom + "="));
  if (!valeur) return "";
  try { return decodeURIComponent(valeur.slice(nom.length + 1)); } catch { return ""; }
}
function ecrireCookie(nom, valeur, duree = DUREE) {
  document.cookie = `${nom}=${encodeURIComponent(valeur)}; Path=/; Max-Age=${duree}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
function jetonValide(jeton) {
  return /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.\d{13}\.[A-Za-z0-9_-]{43}$/.test(jeton) && Number(jeton.split(".")[1]) > Date.now();
}

async function envoyer(action, corps) {
  const controleur = new AbortController();
  const delai = setTimeout(() => controleur.abort(), 10000);
  try {
    const response = await fetch(`${API}/${action}`, { method: "POST", credentials: "omit", mode: "cors", referrerPolicy: "no-referrer", cache: "no-store", keepalive: true,
      signal: controleur.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    if (!response.ok) throw new Error("Mesure indisponible");
    return response.status === 204 ? null : response.json();
  } finally { clearTimeout(delai); }
}

let choix = lireCookie(CHOIX);
let jeton = choix === "oui" ? lireCookie(VISITEUR) : "";
if (!["oui", "non"].includes(choix) || (choix === "oui" && !jetonValide(jeton))) {
  choix = ""; jeton = "";
}
let retraitEnAttente = "";
let enCours = false;
function montrer(visible) {
  if (!panneau) return;
  panneau.hidden = !visible;
  preferences?.setAttribute("aria-expanded", String(visible));
  if (fermer) fermer.hidden = !choix;
}
preferences?.addEventListener("click", event => {
  event.preventDefault(); montrer(panneau.hidden); if (!panneau.hidden) boutons[0]?.focus();
});
fermer?.addEventListener("click", () => { montrer(false); preferences?.focus({ preventScroll: true }); });
panneau?.addEventListener("keydown", event => { if (event.key === "Escape" && choix) montrer(false); });
for (const bouton of boutons) bouton.addEventListener("click", async () => {
  if (enCours) return;
  enCours = true; erreur.hidden = true; boutons.forEach(b => b.disabled = true);
  const demande = bouton.dataset.audienceChoix;
  try {
    if (demande === "non") {
      retraitEnAttente = jeton || retraitEnAttente;
      jeton = ""; choix = "non";
      ecrireCookie(VISITEUR, "", 0); ecrireCookie(CHOIX, "non");
      await envoyer("choix", { choix: "non", visiteur: retraitEnAttente || undefined });
      retraitEnAttente = "";
    } else {
      const retour = await envoyer("choix", { choix: "oui", visiteur: jeton || undefined });
      if (!jetonValide(retour?.visiteur)) throw new Error("Réponse invalide");
      jeton = retour.visiteur; choix = "oui";
      ecrireCookie(VISITEUR, jeton); ecrireCookie(CHOIX, "oui");
    }
    montrer(false); preferences?.focus({ preventScroll: true });
  } catch {
    erreur.textContent = demande === "non"
      ? "Le suivi est arrêté sur ce navigateur. L'effacement des anciennes présences est momentanément indisponible ; réessayez de refuser."
      : "Votre accord n'a pas pu être enregistré. Réessayez.";
    erreur.hidden = false;
    if (fermer) fermer.hidden = !choix;
  } finally { enCours = false; boutons.forEach(b => b.disabled = false); }
});
montrer(!choix || location.pathname === "/cookies/");

let pageComptee = false;
function noterPage() {
  if (pageComptee || document.visibilityState !== "visible" || document.prerendering) return;
  pageComptee = true;
  if (!/^\/(?:guides\/[a-z0-9-]{1,90}\/)?$/.test(location.pathname)) return;
  const source = sourceEntree(location.href, document.referrer);
  envoyer("visite", { chemin: location.pathname, source, visiteur: choix === "oui" ? jeton : undefined }).catch(() => {});
  // L'étiquette a été lue ; l'adresse affichée retrouve une forme propre.
  const url = new URL(location.href);
  if (url.searchParams.has("utm_source")) {
    url.searchParams.delete("utm_source"); url.searchParams.delete("utm_medium");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }
}
document.addEventListener("visibilitychange", noterPage);
document.addEventListener("prerenderingchange", noterPage);
noterPage();

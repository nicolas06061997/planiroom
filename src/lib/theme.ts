/**
 * Couleurs de l'appli, choisies sur chaque téléphone (bouton palette, comme dans Céline).
 * Toutes les teintes sont calculées à partir d'une seule couleur, puis rangées dans
 * des variables CSS (`--c-primaire`, `--c-fond`…) utilisées par tailwind.config.ts.
 */

export const PALETTE = [
  { nom: "Terracotta", hex: "#C0675A" },
  { nom: "Rose", hex: "#C85A7C" },
  { nom: "Lavande", hex: "#8466BE" },
  { nom: "Océan", hex: "#2F7BA6" },
  { nom: "Vert d'eau", hex: "#0F766E" },
  { nom: "Sauge", hex: "#5B8A5E" },
  { nom: "Ardoise", hex: "#4B5563" },
] as const;

export const THEME_DEFAUT = PALETTE[0].hex;
export const CLE_THEME = "planiroom:theme";
export const CLE_FOND = "planiroom:fond";

/**
 * Script autonome (sans dépendance) : calcule et pose les variables de couleur.
 * Il est aussi injecté tel quel dans <head> pour éviter un éclair de mauvaise couleur au démarrage.
 */
export const SCRIPT_THEME = `(function(){
function rgb(h){h=h.replace('#','');return[parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]}
function mix(a,b,t){return a.map(function(v,i){return Math.round(v+(b[i]-v)*t)})}
function css(c){return c.join(' ')}
window.__appliquerTheme=function(hex){
  if(!/^#[0-9a-fA-F]{6}$/.test(hex||''))hex='${THEME_DEFAUT}';
  var c=rgb(hex),n=[0,0,0],w=[255,255,255],f=[247,244,241],r=document.documentElement.style;
  r.setProperty('--c-primaire',css(c));
  r.setProperty('--c-fonce',css(mix(c,n,.16)));
  r.setProperty('--c-nuit',css(mix(c,n,.34)));
  r.setProperty('--c-vif',css(mix(c,w,.14)));
  r.setProperty('--c-clair',css(mix(c,w,.88)));
  r.setProperty('--c-moyen',css(mix(c,w,.74)));
  r.setProperty('--c-fond',css(mix(f,c,.05)));
  var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','rgb('+mix(f,c,.05).join(',')+')');
};
var h;try{h=localStorage.getItem('${CLE_THEME}')}catch(e){}
window.__appliquerTheme(h);
})();`;

declare global {
  interface Window {
    __appliquerTheme?: (hex: string) => void;
  }
}

export function lireTheme(): string {
  try {
    return localStorage.getItem(CLE_THEME) || THEME_DEFAUT;
  } catch {
    return THEME_DEFAUT;
  }
}

export function changerTheme(hex: string) {
  try {
    localStorage.setItem(CLE_THEME, hex);
  } catch {}
  window.__appliquerTheme?.(hex);
  window.dispatchEvent(new Event("planiroom:theme"));
}

export interface ReglageFond {
  /** Photo de fond (data URL, réduite), ou rien = fond doux par défaut. */
  photo?: string;
  /** Id de la photo dans le rangement en ligne (pour la retrouver après un téléphone vidé). */
  id?: string;
  flou: boolean;
}

export function lireFond(): ReglageFond {
  try {
    return { flou: true, ...JSON.parse(localStorage.getItem(CLE_FOND) ?? "{}") };
  } catch {
    return { flou: true };
  }
}

export function changerFond(f: ReglageFond): boolean {
  try {
    localStorage.setItem(CLE_FOND, JSON.stringify(f));
    window.dispatchEvent(new Event("planiroom:fond"));
    return true;
  } catch {
    return false; // photo trop lourde pour ce téléphone
  }
}

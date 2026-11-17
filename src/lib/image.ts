/**
 * Réduit une photo avant l'envoi : plus rapide sur un réseau mobile
 * et moins cher à lire pour l'IA, sans perdre la lisibilité du texte.
 */
export async function preparerImage(
  fichier: File,
  maxCote = 1600,
  qualite = 0.88
): Promise<{ base64: string; mediaType: "image/jpeg"; apercu: string; largeur: number; hauteur: number }> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error("Image illisible"));
      i.src = url;
    });
    const echelle = Math.min(1, maxCote / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * echelle);
    canvas.height = Math.round(img.height * echelle);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", qualite);
    return { base64: dataUrl.split(",")[1], mediaType: "image/jpeg", apercu: dataUrl, largeur: canvas.width, hauteur: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

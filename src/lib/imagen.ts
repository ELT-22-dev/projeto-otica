/**
 * Reduz a foto no próprio celular antes de enviar: fotos de câmera têm 3–8 MB,
 * e para ler uma receita bastam ~1500 px no lado maior.
 */
export async function reducirImagen(
  archivo: File,
  ladoMaximo = 1568,
  calidad = 0.85,
): Promise<{ tipo: "image/jpeg"; base64: string }> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas no disponible");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", calidad);
  return { tipo: "image/jpeg", base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

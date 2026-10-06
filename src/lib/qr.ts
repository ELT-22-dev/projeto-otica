import "server-only";
import QRCode from "qrcode";

/** Código do WhatsApp → SVG para mostrar na tela. */
export function qrSvg(codigo: string): Promise<string> {
  return QRCode.toString(codigo, { type: "svg", margin: 1, errorCorrectionLevel: "L" });
}

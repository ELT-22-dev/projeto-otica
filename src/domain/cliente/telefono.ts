import { ErrorDominio } from "../shared/errores";

/** WhatsApp em E.164 só com dígitos, sem "+": ex. 5511987654321. */
export type WhatsappE164 = string;

const DDD_BRASIL = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
  49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

const PATRON_E164 = /^[1-9]\d{9,14}$/;

function esNumeroBrasileno(digitos: string): boolean {
  // DDD + 8 dígitos (fixo) ou DDD + 9 + 8 dígitos (celular)
  if (digitos.length !== 10 && digitos.length !== 11) return false;
  if (!DDD_BRASIL.has(Number(digitos.slice(0, 2)))) return false;
  return digitos.length === 10 || digitos[2] === "9";
}

/**
 * Normaliza o que a atendente digita.
 * - Com "+" ou "00" na frente: número internacional, o código do país é mantido.
 * - Sem prefixo: número brasileiro (com ou sem 55). Peru (+51), Bolívia (+591) etc.
 *   precisam do "+", porque "51 98765-4321" também é um celular válido de Porto Alegre.
 */
export function normalizarWhatsapp(entrada: string): WhatsappE164 {
  const texto = entrada.trim();
  const internacional = texto.startsWith("+") || texto.startsWith("00");
  let digitos = texto.replace(/\D/g, "");

  if (internacional) {
    if (digitos.startsWith("00")) digitos = digitos.slice(2);
    if (digitos.startsWith("55") && !esNumeroBrasileno(digitos.slice(2))) {
      throw new ErrorDominio("telefono_invalido", entrada);
    }
    if (!PATRON_E164.test(digitos)) throw new ErrorDominio("telefono_invalido", entrada);
    return digitos;
  }

  digitos = digitos.replace(/^0+/, "");
  if (esNumeroBrasileno(digitos)) return `55${digitos}`;
  if (digitos.startsWith("55") && esNumeroBrasileno(digitos.slice(2))) return digitos;
  throw new ErrorDominio("telefono_invalido", entrada);
}

/** Formato para leitura: +55 (11) 98765-4321 ou +51 987654321. */
export function formatearWhatsapp(e164: WhatsappE164): string {
  if (e164.startsWith("55") && (e164.length === 12 || e164.length === 13)) {
    const ddd = e164.slice(2, 4);
    const resto = e164.slice(4);
    const corte = resto.length - 4;
    return `+55 (${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
  }
  return `+${e164}`;
}

/**
 * Formas do mesmo número que podem aparecer no WhatsApp. Celulares brasileiros antigos
 * continuam registrados sem o 9 (55 11 8765-4321), então o chat pode chegar com ou sem ele.
 */
export function variantesWhatsapp(e164: WhatsappE164): WhatsappE164[] {
  if (!e164.startsWith("55")) return [e164];
  const ddd = e164.slice(2, 4);
  const local = e164.slice(4);
  if (local.length === 9 && local.startsWith("9")) return [e164, `55${ddd}${local.slice(1)}`];
  if (local.length === 8 && /^[6-9]/.test(local)) return [e164, `55${ddd}9${local}`];
  return [e164];
}

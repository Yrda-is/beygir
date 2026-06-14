import { afkóðaTexta } from "./textakóðun";

export type Textasýn = Buffer;

// Sjálfgefna leiðin varðveitir upprunalegu Buffer-afkóðunina; wrapperinn gefur
// lesaranum sama API og vefsmíðin án þess að afrita bætin.
export function textasýn(bæti: Uint8Array): Textasýn {
  return Buffer.from(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

export function afkóðaTextasýn(sýn: Textasýn, hliðrun: number, lengd: number): string {
  return afkóðaTexta(sýn, hliðrun, lengd);
}

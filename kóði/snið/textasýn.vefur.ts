import { afkóðaBætatextasýn } from "./textasýn-grunnur";

export type Textasýn = Uint8Array;

export function textasýn(bæti: Uint8Array): Textasýn {
  return bæti;
}

export const afkóðaTextasýn = afkóðaBætatextasýn;

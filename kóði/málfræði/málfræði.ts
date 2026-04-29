const KOMMUSTAFKÓÐI = ",".charCodeAt(0);

/**
 * Samræmir `málfræði`-streng úr Kristínarsniði í stöðugt kommuskipt snið.
 * Fjarlægir kommur fremst og aftast og fellur saman endurteknar kommur,
 * en heldur annars röð og innihaldi þáttanna óbreyttu.
 */
export function hreinsaMálfræði(málfræði: string): string {
  let byrjun = 0;
  let endir = málfræði.length;

  while (byrjun < endir && málfræði.charCodeAt(byrjun) === KOMMUSTAFKÓÐI) {
    byrjun++;
  }
  while (endir > byrjun && málfræði.charCodeAt(endir - 1) === KOMMUSTAFKÓÐI) {
    endir--;
  }

  let þarfHreinsun = byrjun !== 0 || endir !== málfræði.length;
  for (let vísir = byrjun + 1; !þarfHreinsun && vísir < endir; vísir++) {
    if (
      málfræði.charCodeAt(vísir) === KOMMUSTAFKÓÐI &&
      málfræði.charCodeAt(vísir - 1) === KOMMUSTAFKÓÐI
    ) {
      þarfHreinsun = true;
    }
  }

  if (!þarfHreinsun) {
    return málfræði;
  }

  let niðurstaða = "";
  let síðastaVarKomma = false;
  for (let vísir = byrjun; vísir < endir; vísir++) {
    const stafur = málfræði.charAt(vísir);
    if (stafur === ",") {
      if (!síðastaVarKomma) {
        niðurstaða += stafur;
        síðastaVarKomma = true;
      }
      continue;
    }

    niðurstaða += stafur;
    síðastaVarKomma = false;
  }

  return niðurstaða;
}

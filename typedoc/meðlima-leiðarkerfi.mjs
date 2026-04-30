// @ts-check

import { RendererEvent, ReflectionKind } from "typedoc";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { deflate } from "node:zlib";

/**
 * @import {
 *   Application,
 *   ContainerReflection,
 *   DeclarationReflection,
 *   DefaultTheme,
 *   NavigationElement,
 *   ProjectReflection,
 *   Reflection,
 * } from "typedoc"
 */

const þjappaBætiÓsamstillt = promisify(deflate);
const LEIÐARHÆFAR_MEÐLIMAGERÐIR = ReflectionKind.Method | ReflectionKind.Function;
const MEÐLIMAEIGENDAGERÐIR = ReflectionKind.Class | ReflectionKind.Interface;

/** @param {Application} forrit */
export function load(forrit) {
  forrit.renderer.on(RendererEvent.BEGIN, () => {
    forrit.renderer.postRenderAsyncJobs.push(async (atburður) => {
      const þema = /** @type {DefaultTheme | undefined} */ (forrit.renderer.theme);
      const leiðarkerfi = þema?.getNavigation(atburður.project) ?? [];
      bætaMeðlimumÍLeiðarkerfi(forrit, atburður.project, leiðarkerfi);

      await writeFile(
        join(atburður.outputDirectory, "assets", "navigation.js"),
        `window.navigationData = "${await þjappaLeiðargögn(leiðarkerfi)}"`,
      );
    });
  });
}

/** @param {Application} forrit @param {ProjectReflection} verkefni @param {NavigationElement[]} leiðarkerfi */
function bætaMeðlimumÍLeiðarkerfi(forrit, verkefni, leiðarkerfi) {
  /** @type {Map<string, NavigationElement[]>} */
  const leiðaratriðiEftirSlóð = new Map();
  safnaLeiðaratriðum(leiðarkerfi, leiðaratriðiEftirSlóð);

  for (const speglun of Object.values(verkefni.reflections)) {
    if (speglun.kindOf(MEÐLIMAEIGENDAGERÐIR)) {
      bætaBörnumViðLeiðaratriði(
        leiðaratriðiEftirSlóð,
        sækjaSlóð(forrit, speglun),
        sækjaMeðlimaleiðaratriði(forrit, /** @type {ContainerReflection} */ (speglun)),
      );
    }

    const mark = speglun.kindOf(ReflectionKind.Variable)
      ? sækjaTilvísaðaTegundarspeglun(/** @type {DeclarationReflection} */ (speglun))
      : undefined;
    if (mark?.kindOf(MEÐLIMAEIGENDAGERÐIR)) {
      bætaBörnumViðLeiðaratriði(
        leiðaratriðiEftirSlóð,
        sækjaSlóð(forrit, speglun),
        sækjaMeðlimaleiðaratriði(forrit, /** @type {ContainerReflection} */ (mark)),
      );
    }
  }
}

/** @param {NavigationElement[]} leiðarkerfi @param {Map<string, NavigationElement[]>} leiðaratriðiEftirSlóð */
function safnaLeiðaratriðum(leiðarkerfi, leiðaratriðiEftirSlóð) {
  for (const atriði of leiðarkerfi) {
    if (atriði.path) {
      const atriðiMeðSömuSlóð = leiðaratriðiEftirSlóð.get(atriði.path) ?? [];
      atriðiMeðSömuSlóð.push(atriði);
      leiðaratriðiEftirSlóð.set(atriði.path, atriðiMeðSömuSlóð);
    }

    if (atriði.children) {
      safnaLeiðaratriðum(atriði.children, leiðaratriðiEftirSlóð);
    }
  }
}

/** @param {Map<string, NavigationElement[]>} leiðaratriðiEftirSlóð @param {string | undefined} slóð @param {NavigationElement[]} börn */
function bætaBörnumViðLeiðaratriði(leiðaratriðiEftirSlóð, slóð, börn) {
  if (!slóð || börn.length === 0) {
    return;
  }

  for (const atriði of leiðaratriðiEftirSlóð.get(slóð) ?? []) {
    atriði.children = sameinaLeiðarbörn(atriði.children ?? [], börn);
  }
}

/** @param {Application} forrit @param {ContainerReflection} speglun */
function sækjaMeðlimaleiðaratriði(forrit, speglun) {
  /** @type {NavigationElement[]} */
  const leiðaratriði = [];

  for (const barn of speglun.children ?? []) {
    if (!barn.kindOf(LEIÐARHÆFAR_MEÐLIMAGERÐIR) || barn.flags.isInherited) {
      continue;
    }

    const slóð = sækjaSlóð(forrit, barn);
    if (!slóð) {
      continue;
    }

    leiðaratriði.push({
      text: barn.name,
      path: slóð,
      kind: barn.kind,
    });
  }

  return leiðaratriði;
}

/** @param {DeclarationReflection} speglun */
function sækjaTilvísaðaTegundarspeglun(speglun) {
  return speglun.type?.type === "reference" ? speglun.type.reflection : undefined;
}

/** @param {NavigationElement[]} núverandi @param {NavigationElement[]} viðbót */
function sameinaLeiðarbörn(núverandi, viðbót) {
  const þekktirLyklar = new Set(núverandi.map((barn) => barn.path ?? barn.text));
  const sameinuð = [...núverandi];

  for (const barn of viðbót) {
    const lykill = barn.path ?? barn.text;
    if (!þekktirLyklar.has(lykill)) {
      þekktirLyklar.add(lykill);
      sameinuð.push(barn);
    }
  }

  return sameinuð;
}

/** @param {Application} forrit @param {Reflection} speglun */
function sækjaSlóð(forrit, speglun) {
  try {
    return forrit.renderer.router?.getFullUrl(speglun);
  } catch {
    return undefined;
  }
}

/** @param {NavigationElement[]} leiðarkerfi */
async function þjappaLeiðargögn(leiðarkerfi) {
  const þjöppuðGögn = await þjappaBætiÓsamstillt(Buffer.from(JSON.stringify(leiðarkerfi)));
  return þjöppuðGögn.toString("base64");
}

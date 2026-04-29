import { opnaKjarna, opnaKjarnaÓsamstillt } from "../../kóði/kjarni/lesari";
import { skráViðmið } from "../kjarni/skrá";

const svíta = "opinbert.kjarni";
const aðferð = "opnun";
const tafla = "opinbert.opnun";

skráViðmið({
  svíta,
  aðferð,
  tilvik: "opnun.kjarni.mmap",
  merki: ["opinbert", "opnun", "kjarni", "mmap"],
  afköst: {
    tafla,
    aðgerð: 'opnaKjarna(kjarnaslóð, { opnunaraðferð: "mmap" })',
    tilvik: "mmap, samstillt",
    niðurstaða: "opnar og lokar",
  },
  mæla: ({ kjarnaslóð }) => {
    const kjarni = opnaKjarna(kjarnaslóð, { opnunaraðferð: "mmap" });
    try {
      return kjarni.snið;
    } finally {
      kjarni.loka();
    }
  },
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "opnun.kjarni.lesa",
  merki: ["opinbert", "opnun", "kjarni", "lesa"],
  afköst: {
    tafla,
    aðgerð: 'opnaKjarnaÓsamstillt(kjarnaslóð, { opnunaraðferð: "lesa" })',
    tilvik: "lesa, ósamstillt",
    niðurstaða: "opnar og lokar",
  },
  mæla: async ({ kjarnaslóð }) => {
    const kjarni = await opnaKjarnaÓsamstillt(kjarnaslóð, { opnunaraðferð: "lesa" });
    try {
      return kjarni.snið;
    } finally {
      kjarni.loka();
    }
  },
});

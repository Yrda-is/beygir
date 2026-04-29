import { performance } from "node:perf_hooks";
import { opnaKjarna } from "../../kóði/kjarni/lesari";

const slóð = Bun.argv[2];

if (slóð === undefined || slóð === "") {
  throw new Error("Viðfang köldu opnunar verður að vera kjarnaslóð.");
}

const t0 = performance.now();
const kjarni = opnaKjarna(slóð);
kjarni.loka();
const t1 = performance.now();

process.stdout.write(String((t1 - t0) * 1000));

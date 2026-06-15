#!/usr/bin/env bun

import { smíðaSkráarsnið } from "../kóði/snið/skráarsnið/smíði";

const athuga = process.argv.includes("--athuga");
const úrelt = await smíðaSkráarsnið({ rót: process.cwd(), athuga });

if (úrelt) {
  process.exitCode = 1;
}

type Svið = readonly [string, number, number];

function staðfestaU32Svið(heiti: string, gildi: number, hámark: number): void {
  if (!Number.isInteger(gildi) || gildi < 0 || gildi > hámark) {
    throw new Error(`${heiti} verður að vera heiltala á bilinu 0..${hámark}, fékk ${gildi}.`);
  }
}

export function staðfestaSvið(svið: readonly Svið[]): void {
  for (const [heiti, gildi, hámark] of svið) {
    staðfestaU32Svið(heiti, gildi, hámark);
  }
}

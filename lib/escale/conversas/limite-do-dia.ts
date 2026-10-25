const dosCampos = (instante: number, fuso: string): number => {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instante));
  const campo = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return Date.UTC(campo("year"), campo("month") - 1, campo("day"), campo("hour"), campo("minute"), campo("second"));
};

/**
 * O instante (ISO, UTC) em que `data` (aaaa-mm-dd) começa ou termina no `fuso`. Sem isto o
 * filtro "de 24/10" lia `T00:00:00` como UTC e, em Brasília, incluía 23/10 a partir das 21h
 * (B1-11 da revisão).
 */
export function limiteDoDiaNoFuso(data: string, ponta: "inicio" | "fim", fuso: string): string {
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  const alvo = ponta === "inicio" ? Date.UTC(a, m - 1, d, 0, 0, 0, 0) : Date.UTC(a, m - 1, d, 23, 59, 59, 999);
  let t = alvo;
  // Duas passadas: o deslocamento do fuso depende do próprio instante (horário de verão).
  for (let i = 0; i < 2; i += 1) {
    const base = Math.floor(t / 1000) * 1000;
    t = alvo - (dosCampos(base, fuso) - base);
  }
  return new Date(t).toISOString();
}

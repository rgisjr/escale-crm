import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import * as icones from "@/lib/ui/icons-da-casca";

/**
 * A Clint desenha com Feather/Lucide (traço 2, grade 24). A casca usa o
 * lucide-react, reexportado por um arquivo só dela — o barril do original
 * (`lib/ui/icons.ts`, Phosphor) não é tocado.
 */
const NOMES = [
  "CalendarPlus",
  "CalendarCheck",
  "CalendarX",
  "CalendarClock",
  "ChevronDown",
  "ChevronLeft",
  "ChevronRight",
  "Search",
  "RefreshCw",
  "Download",
  "Settings",
  "HelpCircle",
  "Phone",
  "MessageCircle",
  "Mail",
  "CheckCircle2",
  "Clock",
  "MoreVertical",
  "Plus",
  "Sparkles",
  "LayoutGrid",
  "Check",
  "Minus",
  "EllipsisVertical",
] as const;

describe("ícones da casca", () => {
  it("reexporta cada ícone que o contrato nomeia", () => {
    expect(NOMES.filter((n) => !(n in icones))).toEqual([]);
  });

  it("cada ícone desenha um svg de traço 2, como os da Clint", () => {
    for (const nome of NOMES) {
      const Icone = icones[nome];
      const { container, unmount } = render(<Icone aria-hidden />);
      const svg = container.querySelector("svg");
      expect(svg, nome).not.toBeNull();
      expect(svg?.getAttribute("stroke-width"), nome).toBe("2");
      unmount();
    }
  });

  it("o barril do original continua só com Phosphor", () => {
    const fonte = readFileSync(join(__dirname, "..", "..", "lib", "ui", "icons.ts"), "utf8");
    expect(fonte).not.toContain("lucide-react");
  });
});

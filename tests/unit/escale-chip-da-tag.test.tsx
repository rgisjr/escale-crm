import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { tomDaTag } from "@/lib/escale/tags/paleta";

describe("ChipDaTag", () => {
  it("tag sem cor gravada sai no tom automático do nome", () => {
    render(<ChipDaTag tag="vip" />);
    const tom = tomDaTag(null, "vip");
    const chip = screen.getByText("vip");
    expect(chip).toHaveStyle({ backgroundColor: tom.fundo, color: tom.texto });
  });

  it("aceita className para o tamanho de cada lugar", () => {
    render(<ChipDaTag tag="vip" className="h-5 text-[11px]" />);
    expect(screen.getByText("vip").className).toContain("h-5");
  });
});

/**
 * Contrato visual del "player row".
 * Garantiza que las tarjetas de socios/jugadores compartan el mismo formato
 * que la fila de ranking. Ver docs/design-contracts/player-row.md.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const CARDS = [
  "src/components/ranking/RankingList.tsx",
  "src/components/ladder/SuggestedRivalCard.tsx",
  "src/components/partner/PartnerCard.tsx",
  "src/components/partner/InvitationItem.tsx",
  "src/components/partner/OpenChallengeCard.tsx",
];

describe("player-row visual contract", () => {
  for (const file of CARDS) {
    describe(file, () => {
      const src = read(file);

      it("usa Avatar h-9 w-9", () => {
        expect(src).toMatch(/Avatar[^>]*className="[^"]*h-9 w-9/);
      });

      it("nombre usa text-sm font-medium (sans, no font-display)", () => {
        // Debe existir al menos una línea con truncate text-sm font-medium
        expect(src).toMatch(/truncate[^"]*text-sm font-medium/);
        // No debe usar font-display para el nombre del jugador
        expect(src).not.toMatch(/font-display[^"]*text-(base|lg)[^"]*tracking-tight/);
      });

      it("línea secundaria/contadores usan text-[10px] muted", () => {
        expect(src).toMatch(/text-\[10px\][^"]*text-muted-foreground|text-muted-foreground[^"]*text-\[10px\]/);
      });
    });
  }

  describe("badges (categoría/estado/motivos)", () => {
    const partnerCards = CARDS.filter((f) => !f.endsWith("RankingList.tsx"));
    for (const file of partnerCards) {
      it(`${file} usa badges h-4 rounded-md text-[9px] font-semibold`, () => {
        const src = read(file);
        expect(src).toMatch(/h-4 rounded-md[^"]*px-1\.5[^"]*text-\[9px\][^"]*font-semibold/);
      });
    }
  });
});

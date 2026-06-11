import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BracketView } from "./BracketView";
import type { Match, Registration, Player, Court } from "@/hooks/useCategoryData";

type Bracket = "main" | "plate" | "winners" | "losers" | "grand_final";

interface BracketTabsProps {
  motor: string | null | undefined;
  matches: Match[];
  registrations: Registration[];
  players: Map<string, Player>;
  courts?: Court[];
  highlightUserId?: string;
  onMatchClick?: (m: Match) => void;
}

/**
 * Reparte los partidos por columna `bracket` y renderiza tabs distintas según
 * el motor:
 *  - consolacion       → Main | Plate
 *  - doble_eliminacion → Winners | Losers | Final
 *  - cualquier otro    → un único <BracketView /> sin tabs.
 */
export const BracketTabs = ({
  motor,
  matches,
  registrations,
  players,
  courts,
  highlightUserId,
  onMatchClick,
}: BracketTabsProps) => {
  const groups = useMemo(() => {
    const g: Record<Bracket, Match[]> = {
      main: [],
      plate: [],
      winners: [],
      losers: [],
      grand_final: [],
    };
    for (const m of matches) {
      const b = ((m as { bracket?: string | null }).bracket ?? "main") as Bracket;
      (g[b] ?? g.main).push(m);
    }
    return g;
  }, [matches]);

  const view = (subset: Match[]) => (
    <BracketView
      matches={subset}
      registrations={registrations}
      players={players}
      courts={courts}
      highlightUserId={highlightUserId}
      onMatchClick={onMatchClick}
    />
  );

  if (motor === "consolacion") {
    const hasPlate = groups.plate.length > 0;
    return (
      <Tabs defaultValue="main" className="w-full">
        <TabsList className={`grid w-full ${hasPlate ? "grid-cols-2" : "grid-cols-1"}`}>
          <TabsTrigger value="main" className="text-xs">Cuadro principal</TabsTrigger>
          {hasPlate && (
            <TabsTrigger value="plate" className="text-xs">Consolación</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="main" className="mt-3">{view(groups.main)}</TabsContent>
        {hasPlate && (
          <TabsContent value="plate" className="mt-3">{view(groups.plate)}</TabsContent>
        )}
      </Tabs>
    );
  }

  if (motor === "doble_eliminacion") {
    return (
      <Tabs defaultValue="winners" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="winners" className="text-xs">Ganadores</TabsTrigger>
          <TabsTrigger value="losers" className="text-xs">Repechaje</TabsTrigger>
          <TabsTrigger value="final" className="text-xs">Gran Final</TabsTrigger>
        </TabsList>
        <TabsContent value="winners" className="mt-3">{view(groups.winners)}</TabsContent>
        <TabsContent value="losers" className="mt-3">{view(groups.losers)}</TabsContent>
        <TabsContent value="final" className="mt-3">
          {groups.grand_final.length > 0 ? (
            <>
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Sin reset · gana el primer match
              </p>
              {view(groups.grand_final)}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Aún no se define la gran final.
            </div>
          )}
        </TabsContent>
      </Tabs>
    );
  }

  return view(matches);
};
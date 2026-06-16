import type { ReactNode } from "react";
import { Trophy } from "lucide-react";
import { ShareCardFrame, type ShareFormat } from "../ShareCardFrame";
import { Medal } from "../Medal";
import type { TournamentCobrand } from "@/hooks/useTournamentCobrand";
import type { ShareStats } from "@/hooks/useShareCardData";
import { fullName, handleFor, buildInviteLink } from "@/lib/share-card-copy";

interface Props {
  format: ShareFormat;
  cobrand: TournamentCobrand | null;
  stats: ShareStats;
  tournamentName: string;
  slug: string;
}

export function ChampionCard({ format, cobrand, stats, tournamentName, slug }: Props) {
  const name = fullName(stats.user?.first_name, stats.user?.last_name);
  const handle = handleFor(stats.user?.first_name, stats.user?.last_name);
  const inviteUrl = buildInviteLink(slug);

  return (
    <ShareCardFrame format={format} cobrand={cobrand} handle={handle} inviteUrl={inviteUrl}>
      <div className="mt-6 flex flex-1 flex-col">
        <p
          className="text-[10px] uppercase tracking-[0.32em] text-white/70"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          Campeón · {tournamentName}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <Medal place={1} size={64} />
          <h1 className="font-display text-[44px] font-semibold leading-[1.02]">
            ¡<em className="italic text-[hsl(var(--gold))]">Campeón</em>!
          </h1>
        </div>

        <p className="mt-2 font-display text-2xl">{name}</p>

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
          <Stat value={"1º"} label={`de ${stats.total_players ?? 0}`} highlight />
          <Stat value={String(stats.points ?? 0)} label="Puntos" />
          <Stat value={`${stats.wins}-${stats.losses}`} label="Win-Loss" />
          <Stat value={<Trophy className="inline h-6 w-6" />} label="Coronado" />
        </div>
      </div>
    </ShareCardFrame>
  );
}

function Stat({
  value,
  label,
  highlight,
}: {
  value: ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-display text-3xl font-semibold leading-none ${
          highlight ? "text-[hsl(var(--gold))]" : ""
        }`}
      >
        {value}
      </p>
      <p
        className="mt-1 text-[10px] uppercase tracking-[0.28em] opacity-75"
        style={{ fontFamily: "'DM Mono', monospace" }}
      >
        {label}
      </p>
    </div>
  );
}
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  tournament_id: string;
  format: "pdf" | "xlsx";
}

function setsLabel(score: any): string {
  if (!Array.isArray(score)) return "";
  return score
    .map((s: any) => {
      const tb =
        s.tb_a != null && s.tb_b != null ? `(${Math.min(s.tb_a, s.tb_b)})` : "";
      return `${s.a}-${s.b}${tb}`;
    })
    .join(" ");
}

function playerLabel(reg: any, profilesById: Map<string, any>): string {
  if (!reg) return "BYE";
  const p1 = profilesById.get(reg.player1_user_id);
  const p1Name = p1 ? `${p1.first_name} ${p1.last_name}` : "—";
  if (!reg.player2_user_id) return p1Name;
  const p2 = profilesById.get(reg.player2_user_id);
  const p2Name = p2 ? `${p2.first_name} ${p2.last_name}` : "—";
  return `${p1Name} / ${p2Name}`;
}

function roundLabel(round: number, totalRounds: number): string {
  if (round === 1) return "Final";
  if (round === 2) return "Semifinal";
  if (round === 3) return "Cuartos de final";
  if (round === 4) return "Octavos de final";
  if (round === 5) return "16avos";
  if (round === 6) return "32avos";
  return `Ronda ${totalRounds - round + 1}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.tournament_id || !["pdf", "xlsx"].includes(body.format)) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tournament + tenant
    const { data: tournament, error: tErr } = await supabase
      .from("tournaments")
      .select("*, tenants(*)")
      .eq("id", body.tournament_id)
      .maybeSingle();
    if (tErr || !tournament) {
      return new Response(JSON.stringify({ error: "Tournament not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: categories } = await supabase
      .from("tournament_categories")
      .select("*")
      .eq("tournament_id", body.tournament_id)
      .order("sort_order");

    const { data: registrations } = await supabase
      .from("tournament_registrations")
      .select("*")
      .eq("tournament_id", body.tournament_id);

    const { data: matches } = await supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", body.tournament_id)
      .order("round", { ascending: false })
      .order("bracket_position");

    const { data: courts } = await supabase
      .from("courts")
      .select("id, name")
      .eq("tenant_id", tournament.tenant_id);

    const userIds = new Set<string>();
    (registrations ?? []).forEach((r: any) => {
      userIds.add(r.player1_user_id);
      if (r.player2_user_id) userIds.add(r.player2_user_id);
    });
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, ntrp_level, club_ranking")
      .in("user_id", userIds.size ? Array.from(userIds) : ["00000000-0000-0000-0000-000000000000"]);

    const profilesById = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    const regsById = new Map((registrations ?? []).map((r: any) => [r.id, r]));
    const courtsById = new Map((courts ?? []).map((c: any) => [c.id, c.name]));

    const tenant = (tournament as any).tenants;
    const clubName = tenant?.name ?? "Club";

    if (body.format === "xlsx") {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Resumen
      const summary = [
        ["Torneo", tournament.name],
        ["Club", clubName],
        ["Estado", tournament.status],
        ["Inicio", new Date(tournament.starts_at).toLocaleDateString("es-CL")],
        ["Fin", new Date(tournament.ends_at).toLocaleDateString("es-CL")],
        ["Categorías", (categories ?? []).length],
        ["Inscritos totales", (registrations ?? []).length],
        ["Partidos totales", (matches ?? []).length],
        [
          "Partidos jugados",
          (matches ?? []).filter((m: any) => m.status === "jugado" || m.status === "walkover").length,
        ],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summary);
      wsSummary["!cols"] = [{ wch: 22 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

      // Sheet 2: Inscritos por categoría
      const regsRows: any[][] = [
        ["Categoría", "Jugador 1", "Jugador 2", "Estado", "Seed", "Inscrito el"],
      ];
      for (const cat of categories ?? []) {
        const catRegs = (registrations ?? []).filter((r: any) => r.category_id === cat.id);
        for (const r of catRegs) {
          const p1 = profilesById.get(r.player1_user_id);
          const p2 = r.player2_user_id ? profilesById.get(r.player2_user_id) : null;
          regsRows.push([
            cat.name,
            p1 ? `${p1.first_name} ${p1.last_name}` : "—",
            p2 ? `${p2.first_name} ${p2.last_name}` : "",
            r.status,
            r.seed ?? "",
            new Date(r.registered_at).toLocaleString("es-CL"),
          ]);
        }
      }
      const wsRegs = XLSX.utils.aoa_to_sheet(regsRows);
      wsRegs["!cols"] = [
        { wch: 22 },
        { wch: 28 },
        { wch: 28 },
        { wch: 16 },
        { wch: 6 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, wsRegs, "Inscritos");

      // Sheet 3: Partidos y resultados
      const matchRows: any[][] = [
        [
          "Categoría",
          "Ronda",
          "Posición",
          "Jugador A",
          "Jugador B",
          "Marcador",
          "Ganador",
          "Estado",
          "Cancha",
          "Programado",
          "Jugado",
        ],
      ];
      for (const cat of categories ?? []) {
        const catMatches = (matches ?? []).filter((m: any) => m.category_id === cat.id);
        const totalRounds = Math.max(...catMatches.map((m: any) => m.round), 1);
        for (const m of catMatches) {
          const ra = regsById.get(m.registration_a_id);
          const rb = regsById.get(m.registration_b_id);
          const winner = m.winner_registration_id ? regsById.get(m.winner_registration_id) : null;
          matchRows.push([
            cat.name,
            roundLabel(m.round, totalRounds),
            m.bracket_position,
            playerLabel(ra, profilesById),
            playerLabel(rb, profilesById),
            setsLabel(m.score),
            winner ? playerLabel(winner, profilesById) : "",
            m.status,
            m.court_id ? courtsById.get(m.court_id) ?? "" : "",
            m.scheduled_at ? new Date(m.scheduled_at).toLocaleString("es-CL") : "",
            m.played_at ? new Date(m.played_at).toLocaleString("es-CL") : "",
          ]);
        }
      }
      const wsMatches = XLSX.utils.aoa_to_sheet(matchRows);
      wsMatches["!cols"] = [
        { wch: 22 },
        { wch: 18 },
        { wch: 8 },
        { wch: 28 },
        { wch: 28 },
        { wch: 18 },
        { wch: 28 },
        { wch: 12 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, wsMatches, "Partidos");

      // Sheet 4: Ranking final por categoría
      const rankRows: any[][] = [["Categoría", "Posición", "Jugador(es)"]];
      for (const cat of categories ?? []) {
        const catMatches = (matches ?? []).filter((m: any) => m.category_id === cat.id);
        const finalMatch = catMatches.find((m: any) => m.round === 1);
        const semis = catMatches.filter((m: any) => m.round === 2);
        if (finalMatch?.winner_registration_id) {
          const champion = regsById.get(finalMatch.winner_registration_id);
          const runnerUpId =
            finalMatch.winner_registration_id === finalMatch.registration_a_id
              ? finalMatch.registration_b_id
              : finalMatch.registration_a_id;
          const runnerUp = runnerUpId ? regsById.get(runnerUpId) : null;
          rankRows.push([cat.name, "1°", playerLabel(champion, profilesById)]);
          if (runnerUp) rankRows.push([cat.name, "2°", playerLabel(runnerUp, profilesById)]);
          for (const sf of semis) {
            const loserId =
              sf.winner_registration_id === sf.registration_a_id
                ? sf.registration_b_id
                : sf.registration_a_id;
            const loser = loserId ? regsById.get(loserId) : null;
            if (loser) rankRows.push([cat.name, "3°-4°", playerLabel(loser, profilesById)]);
          }
        }
      }
      const wsRank = XLSX.utils.aoa_to_sheet(rankRows);
      wsRank["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 32 }];
      XLSX.utils.book_append_sheet(wb, wsRank, "Ranking Final");

      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
      const filename = `${tournament.slug || "torneo"}.xlsx`;
      return new Response(buffer, {
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Brand color (parse from tenant.brand_primary "16 78% 48%")
    const hslMatch = tenant?.brand_primary?.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    const brand = hslMatch
      ? hslToRgb(Number(hslMatch[1]), Number(hslMatch[2]) / 100, Number(hslMatch[3]) / 100)
      : { r: 0.78, g: 0.32, b: 0.11 };

    let page = pdfDoc.addPage([595, 842]); // A4
    let y = 800;
    const margin = 50;
    const lineH = 14;

    const drawText = (text: string, opts: { size?: number; bold?: boolean; color?: any } = {}) => {
      const size = opts.size ?? 10;
      const f = opts.bold ? fontBold : font;
      const color = opts.color ?? rgb(0.1, 0.1, 0.1);
      page.drawText(text, { x: margin, y, size, font: f, color });
      y -= size + 4;
    };

    const ensureSpace = (needed: number) => {
      if (y - needed < 60) {
        page = pdfDoc.addPage([595, 842]);
        y = 800;
      }
    };

    // Header band
    page.drawRectangle({
      x: 0,
      y: 780,
      width: 595,
      height: 62,
      color: rgb(brand.r, brand.g, brand.b),
    });
    page.drawText(clubName.toUpperCase(), {
      x: margin,
      y: 815,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(tournament.name, {
      x: margin,
      y: 795,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    y = 760;

    drawText(
      `${new Date(tournament.starts_at).toLocaleDateString("es-CL")} — ${new Date(
        tournament.ends_at,
      ).toLocaleDateString("es-CL")}`,
      { size: 10, color: rgb(0.4, 0.4, 0.4) },
    );
    y -= 8;

    for (const cat of categories ?? []) {
      ensureSpace(120);
      // Category title
      page.drawRectangle({
        x: margin - 4,
        y: y - 4,
        width: 495,
        height: 22,
        color: rgb(0.96, 0.94, 0.91),
      });
      page.drawText(cat.name, {
        x: margin,
        y: y + 4,
        size: 13,
        font: fontBold,
        color: rgb(brand.r * 0.6, brand.g * 0.6, brand.b * 0.6),
      });
      y -= 28;

      const catMatches = (matches ?? []).filter((m: any) => m.category_id === cat.id);
      const totalRounds = catMatches.length ? Math.max(...catMatches.map((m: any) => m.round)) : 1;

      // Ranking
      const finalMatch = catMatches.find((m: any) => m.round === 1);
      if (finalMatch?.winner_registration_id) {
        const champion = regsById.get(finalMatch.winner_registration_id);
        const runnerUpId =
          finalMatch.winner_registration_id === finalMatch.registration_a_id
            ? finalMatch.registration_b_id
            : finalMatch.registration_a_id;
        const runnerUp = runnerUpId ? regsById.get(runnerUpId) : null;

        drawText("Ranking final", { size: 10, bold: true });
        drawText(`  1° ${playerLabel(champion, profilesById)}`, { size: 10 });
        if (runnerUp) drawText(`  2° ${playerLabel(runnerUp, profilesById)}`, { size: 10 });
        const semis = catMatches.filter((m: any) => m.round === 2);
        for (const sf of semis) {
          const loserId =
            sf.winner_registration_id === sf.registration_a_id
              ? sf.registration_b_id
              : sf.registration_a_id;
          const loser = loserId ? regsById.get(loserId) : null;
          if (loser) drawText(`  3°-4° ${playerLabel(loser, profilesById)}`, { size: 10 });
        }
        y -= 6;
      }

      // Matches list grouped by round
      const rounds = Array.from(new Set(catMatches.map((m: any) => m.round))).sort(
        (a: any, b: any) => b - a,
      );
      for (const r of rounds) {
        ensureSpace(40);
        drawText(roundLabel(r, totalRounds), { size: 11, bold: true, color: rgb(0.2, 0.2, 0.2) });
        const roundMatches = catMatches.filter((m: any) => m.round === r);
        for (const m of roundMatches) {
          ensureSpace(lineH * 2);
          const ra = regsById.get(m.registration_a_id);
          const rb = regsById.get(m.registration_b_id);
          const score = setsLabel(m.score);
          const winnerIsA = m.winner_registration_id === m.registration_a_id;
          const winnerIsB = m.winner_registration_id === m.registration_b_id;
          const aLabel = playerLabel(ra, profilesById);
          const bLabel = playerLabel(rb, profilesById);
          page.drawText(winnerIsA ? ">" : " ", {
            x: margin,
            y,
            size: 9,
            font: fontBold,
            color: rgb(brand.r, brand.g, brand.b),
          });
          page.drawText(aLabel, {
            x: margin + 12,
            y,
            size: 9,
            font: winnerIsA ? fontBold : font,
            color: rgb(0.1, 0.1, 0.1),
          });
          if (score)
            page.drawText(score, { x: margin + 380, y, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
          y -= lineH;
          page.drawText(winnerIsB ? ">" : " ", {
            x: margin,
            y,
            size: 9,
            font: fontBold,
            color: rgb(brand.r, brand.g, brand.b),
          });
          page.drawText(bLabel, {
            x: margin + 12,
            y,
            size: 9,
            font: winnerIsB ? fontBold : font,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= lineH + 4;
        }
        y -= 6;
      }
      y -= 10;
    }

    // Footer on last page
    page.drawText(`Generado ${new Date().toLocaleString("es-CL")}`, {
      x: margin,
      y: 30,
      size: 8,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });

    const pdfBytes = await pdfDoc.save();
    const filename = `${tournament.slug || "torneo"}.pdf`;
    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("export-tournament error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: r + m, g: g + m, b: b + m };
}

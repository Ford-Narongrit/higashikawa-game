"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAdminCopy } from "@/lib/admin-lang";

type Card = { code: string; svg: string };

/** A4 sheet of QR + code cards to cut out and tape on gift boxes. ?since=ISO prints one batch, ?unused=1 all unused. */
export default function PrintBoxes() {
  const t = useAdminCopy();
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const since = params.get("since");
    const unusedOnly = params.get("unused") === "1";
    const base = process.env.NEXT_PUBLIC_SITE_URL || location.origin;

    fetch(`/api/admin/boxes${since ? `?since=${encodeURIComponent(since)}` : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(async (rows: { code: string; redeemed_at: string | null }[]) => {
        const list = rows.filter((r) => !unusedOnly || !r.redeemed_at).sort((a, b) => a.code.localeCompare(b.code));
        setCards(
          await Promise.all(
            list.map(async (r) => ({
              code: r.code,
              svg: await QRCode.toString(`${base}/box/${r.code}`, { type: "svg", margin: 0, errorCorrectionLevel: "M" }),
            })),
          ),
        );
      });
  }, []);

  if (!cards) return <p className="p-8">Loading…</p>;

  return (
    <div className="bg-white text-black">
      <style>{`
        @page { size: A4; margin: 8mm; }
        @media print { .no-print { display: none !important; } body { background: white !important; } }
      `}</style>
      <div className="no-print flex items-center gap-4 bg-zinc-900 p-4 text-white">
        <span>{t.printCount(cards.length)}</span>
        <button onClick={() => window.print()} className="rounded-lg bg-white px-4 py-2 font-bold text-black">
          🖨 {t.print}
        </button>
      </div>
      <div className="mx-auto grid w-[194mm] grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.code}
            className="flex h-[69mm] break-inside-avoid flex-col items-center justify-center gap-[2mm] border border-dashed border-zinc-400"
          >
            <p className="text-[11pt] font-bold">🎁 HIGASHIKAWA GAME</p>
            <div className="h-[40mm] w-[40mm] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: c.svg }} />
            <p className="font-mono text-[22pt] font-black tracking-[0.15em]">{c.code}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

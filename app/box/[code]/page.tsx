import { PlayerApp } from "@/components/player/PlayerApp";

/** QR on each gift box points here; the player page opens with the code pre-filled (joining first if needed). */
export default async function BoxPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = decodeURIComponent(code).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return <PlayerApp initialBoxCode={clean} />;
}

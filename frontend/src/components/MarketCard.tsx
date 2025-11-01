import Link from "next/link";
import Badge from "./ui/Badge";
import { Market } from "@/types/market";

export default function MarketCard({ m }: { m: Market }) {
  const totalTickets = m.options.reduce((a, o) => a + o.tickets, 0);
  const totalVolume = m.options.reduce((a, o) => a + o.volume, 0);

  return (
    <Link
      href={`/market/${m.id}`}
      className="block rounded-2xl border p-4 transition hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{m.title}</h3>
        <Badge>{m.status === "open" ? "Open" : "Resolved"}</Badge>
      </div>
      {m.description && (
        <p className="mb-3 line-clamp-2 text-sm text-gray-600">{m.description}</p>
      )}
      <div className="flex flex-wrap gap-4 text-sm">
        <div>Oracle: <span className="font-medium">{m.oracle}</span></div>
        <div>Prize Pool: <span className="font-medium">{m.prizePool}</span></div>
        <div>Tickets: <span className="font-medium">{totalTickets}</span></div>
        <div>Volume: <span className="font-medium">{totalVolume}</span></div>
      </div>
    </Link>
  );
}

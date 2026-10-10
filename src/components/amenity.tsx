import {
  AirVent, Armchair, Bath, Car, CookingPot, Flame, Heater, Laptop, PawPrint, Sunset, TreePalm, Trees, Tv,
  WashingMachine, Waves, Wifi, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  ac: AirVent,
  pool: Waves,
  parking: Car,
  seaView: Sunset,
  kitchen: CookingPot,
  washer: WashingMachine,
  bbq: Flame,
  garden: Trees,
  terrace: Armchair,
  tv: Tv,
  pets: PawPrint,
  heating: Heater,
  workspace: Laptop,
  beach: TreePalm,
  jacuzzi: Bath,
};

export function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Armchair;
  return <Icon className={className} strokeWidth={1.5} />;
}

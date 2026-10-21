import {
  ArrowUpDown,
  Bell,
  Car,
  Check,
  CookingPot,
  LampDesk,
  Paintbrush,
  Refrigerator,
  Shirt,
  Sun,
  Tv,
  Utensils,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "lamp-desk": LampDesk,
  shirt: Shirt,
  "washing-machine": WashingMachine,
  refrigerator: Refrigerator,
  "cooking-pot": CookingPot,
  utensils: Utensils,
  tv: Tv,
  sun: Sun,
  "arrow-up-down": ArrowUpDown,
  bell: Bell,
  car: Car,
  paintbrush: Paintbrush,
};

export const AMENITY_ICON_NAMES = Object.keys(ICONS);

export function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Check;
  return <Icon className={className} aria-hidden />;
}

import {
  Shirt,
  Leaf,
  Gem,
  Snowflake,
  Layers,
  Layers3,
  Droplets,
  Zap,
  Footprints,
  PawPrint,
  Scissors,
  Armchair,
  type LucideIcon,
} from 'lucide-react'

export const SURFACE_ICONS: Record<string, LucideIcon> = {
  Cotton: Shirt,
  Polyester: Layers,
  Acrylic: Layers3,
  Silk: Gem,
  Wool: Snowflake,
  Cashmere: Gem,
  Linen: Leaf,
  Rayon: Droplets,
  Nylon: Zap,
  Leather: Footprints,
  Denim: Scissors,
  Suede: PawPrint,
  Upholstery: Armchair,
}

export const DEFAULT_SURFACE_ICON: LucideIcon = Shirt

import { BarChart3, Handshake, Megaphone, Phone, Users, Wallet, type LucideIcon } from 'lucide-react'
import type { TileColor } from '@/ui/glass'

/** an added / recommended chart's icon tile by its dataset: leads blue, deals green, calls purple, ads orange */
export function datasetTile(dataset: string): { icon: LucideIcon; color: TileColor } {
  switch (dataset) {
    case 'leads':
      return { icon: Users, color: 'blue' }
    case 'deals':
      return { icon: Handshake, color: 'green' }
    case 'calls':
      return { icon: Phone, color: 'purple' }
    case 'ads':
    case 'campaigns':
      return { icon: Megaphone, color: 'orange' }
    case 'payments':
      return { icon: Wallet, color: 'teal' }
    default:
      return { icon: BarChart3, color: 'indigo' }
  }
}

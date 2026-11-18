import type { LazyExoticComponent, JSX } from 'react'
import type { PageId } from '@/features/projects/types'

export type PageComponents = Partial<Record<PageId, LazyExoticComponent<() => JSX.Element>>>

import { config } from '@/config'

/**
 * Standalone app (export-app): this copy is always a published dashboard's viewer page — Studio's shared code asks
 * `kioskOf()` to hide everything that is not for a viewer (Studio links, the projects trail, sign-in menus).
 * Studio's own kiosk.tsx also looks the address up and draws the login card; here src/app/boot.ts and LoginScreen do.
 */
export function kioskOf(): string | null {
  return config.project.slug
}

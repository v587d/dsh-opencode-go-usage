/**
 * Shared browser platform modules: the loader module-table entries this plugin's
 * client bundle keeps external (seeding and bundling consume one list so their
 * module identities cannot drift). Only the entries this bundle actually
 * requires are listed — anything else must inline or be reached through a
 * cordis service.
 * @module dsh-ocgo-usage/web-platform
 */

/** The module specifiers the shell shares into the frozen module table. */
export const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime',
] as const

/** One platform module specifier (a seed-table key). */
export type PlatformModule = (typeof PLATFORM_MODULES)[number]

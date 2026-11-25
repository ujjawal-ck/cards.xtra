// Only the part of Vite's client types the docs blocks use. The full `vite/client` types
// redeclare `*.svg` as a string and clash with the app's SVG-as-component typing.
interface ImportMeta {
  glob(pattern: string, options?: { eager?: boolean; query?: string; import?: string }): Record<string, unknown>;
}

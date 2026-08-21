import { defineConfig } from 'vitest/config';
import fs from 'fs';
import path from 'path';

/**
 * Der Servercode verwendet ESM-konforme Importe mit `.js`-Endung, die zur
 * Laufzeit (esbuild-Bundle) bzw. unter NodeNext auf die `.ts`-Quelldateien
 * verweisen. Vitest/Vite lösen `.js` nicht automatisch auf `.ts` auf, daher
 * bildet dieses kleine Plugin relative `*.js`-Importe auf existierende
 * `*.ts`-Dateien ab.
 */
function resolveTsFromJs() {
  return {
    name: 'resolve-ts-from-js',
    enforce: 'pre' as const,
    resolveId(source: string, importer: string | undefined) {
      if (!importer) return null;
      if (!source.startsWith('.')) return null;
      if (!source.endsWith('.js')) return null;
      const resolvedDir = path.dirname(importer);
      const candidate = path.resolve(resolvedDir, source.replace(/\.js$/, '.ts'));
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveTsFromJs()],
  test: {
    // Reine Node-Umgebung: Wir testen ausschließlich Server-/Kernlogik.
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['server/**/*.ts'],
      exclude: ['server/prismaStore.ts'],
    },
  },
});

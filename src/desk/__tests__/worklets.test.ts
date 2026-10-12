import * as timeline from '../timeline';

// drawDesk runs on the UI thread every frame. Calling a plain JS function from there crashes the app (a
// bitmap helper did, at the tally), so every function it can reach must carry the 'worklet' directive.

// No @types/node in this repo, so Node modules are typed structurally.
const fs = jest.requireActual<{ readFileSync(path: string, encoding: 'utf8'): string }>('fs');
const { cwd } = jest.requireActual<{ cwd(): string }>('process');

// Reanimated's Babel plugin (on in Jest via babel-preset-expo) compiles worklets and tags them with __workletHash.
const isWorklet = (fn: (...args: never[]) => unknown) => '__workletHash' in fn || /['"]worklet['"]/.test(fn.toString());

describe('desk worklets', () => {
  it('marks every timeline function as a worklet', () => {
    const plain = Object.entries(timeline)
      .filter(([, v]) => typeof v === 'function')
      .filter(([, fn]) => !isWorklet(fn as (...args: never[]) => unknown))
      .map(([name]) => name);
    expect(plain).toEqual([]);
  });

  it('only calls worklets from drawDesk', () => {
    const source = fs.readFileSync(`${cwd()}/src/desk/draw.ts`, 'utf8');
    const body = source.slice(source.indexOf('export function drawDesk'));
    const called = new Set([...body.matchAll(/\b([A-Za-z_]\w*)\(/g)].map((m) => m[1]));
    // Read from source: importing draw.ts would load Skia, which Jest can't.
    const declared = [...source.matchAll(/^export function (\w+)\([^)]*\)[^{]*\{\n(\s*'worklet';)?/gm)];
    const plain = declared.filter((m) => m[1] !== 'drawDesk' && called.has(m[1]) && !m[2]).map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(0);
    expect(plain).toEqual([]);
    // Imports from other modules (bitmap, tokens) may only be constants inside drawDesk.
    const imported = [...source.matchAll(/import \{([^}]*)\} from '@\/(?:render|design)\/[^']+';/g)].flatMap((m) =>
      (m[1] ?? '').split(',').map((s: string) => s.replace(/\btype\b/, '').trim()),
    );
    expect(imported.filter((name) => name && called.has(name))).toEqual([]);
  });
});

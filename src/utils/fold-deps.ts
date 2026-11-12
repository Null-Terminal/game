export async function foldDeps<T extends Record<string, Promise<object>>>(dependencies: T): Promise<Tb.IntersectionOf<Awaited<T[keyof T]>>> {
  const modules = await Promise.all(Object.values(dependencies));
  const exports: Record<string, unknown> = {};

  for (const module of modules) {
    for (const [name, value] of Object.entries(module)) {
      if (Object.hasOwn(exports, name)) {
        throw new Error(`Duplicate module export: ${name}`);
      }

      exports[name] = value;
    }
  }

  return exports as Tb.IntersectionOf<Awaited<T[keyof T]>>;
}

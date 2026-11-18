describe('configProblems', () => {
  const OLD_STAGE = process.env.EXPO_PUBLIC_STAGE;
  const OLD_DEV = (global as any).__DEV__;

  afterEach(() => {
    if (OLD_STAGE === undefined) delete process.env.EXPO_PUBLIC_STAGE;
    else process.env.EXPO_PUBLIC_STAGE = OLD_STAGE;
    (global as any).__DEV__ = OLD_DEV;
  });

  const load = (stage: string | undefined, dev: boolean) => {
    if (stage === undefined) delete process.env.EXPO_PUBLIC_STAGE;
    else process.env.EXPO_PUBLIC_STAGE = stage;
    (global as any).__DEV__ = dev;
    let problems: string[] = [];
    jest.isolateModules(() => {
      problems = require('../env').configProblems();
    });
    return problems;
  };

  it('flags an unset stage in a release build', () => {
    expect(load(undefined, false).some((p) => p.includes('EXPO_PUBLIC_STAGE is not set'))).toBe(true);
  });

  it('does not flag an unset stage in development', () => {
    expect(load(undefined, true).some((p) => p.includes('EXPO_PUBLIC_STAGE'))).toBe(false);
  });

  it('does not flag a release build that sets the stage', () => {
    expect(load('prod', false).some((p) => p.includes('EXPO_PUBLIC_STAGE'))).toBe(false);
  });
});

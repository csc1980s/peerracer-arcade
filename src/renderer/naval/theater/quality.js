/**
 * Quality tiers. `auto` picks one from a quick GPU probe; dynamic resolution
 * then trims render scale at runtime if frame time exceeds the budget.
 */
export const QUALITY = {
  low: {
    maxPixelRatio: 1, oceanSegments: 256, ssrSteps: 0, msaa: 0, reflectionScale: 0.35,
    skyCube: 128, cloudSteps: 16, skyFacesPerFrame: 1, shadowMap: 1024,
    bloom: true, dof: false, particleScale: 0.5, wakeResolution: 512, frameBudgetMs: 33,
  },
  medium: {
    maxPixelRatio: 1.25, oceanSegments: 384, ssrSteps: 16, msaa: 2, reflectionScale: 0.5,
    skyCube: 256, cloudSteps: 24, skyFacesPerFrame: 1, shadowMap: 2048,
    bloom: true, dof: true, particleScale: 0.75, wakeResolution: 1024, frameBudgetMs: 16.7,
  },
  high: {
    maxPixelRatio: 2, oceanSegments: 512, ssrSteps: 28, msaa: 4, reflectionScale: 0.5,
    skyCube: 512, cloudSteps: 32, skyFacesPerFrame: 1, shadowMap: 2048,
    bloom: true, dof: true, particleScale: 1, wakeResolution: 1024, frameBudgetMs: 16.7,
  },
};

export function detectQuality(renderer) {
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|software/i.test(name)) return 'low';
  if (/intel|mali|adreno|powervr|apple gpu/i.test(name)) return 'medium';
  return 'high';
}

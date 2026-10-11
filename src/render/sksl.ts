// SkSL ports of the WebGL shaders in the starter kit's engine/dusk-scene.js. Kept free of Skia
// imports so tests can compile them with CanvasKit.
//
// All coordinates are Skia canvas points. uDensity (device px per point) is passed where an effect
// must stay a whole number of *device* pixels to look crisp.

// Dithered dusk swirl, one color per art pixel. Drawn full-screen inside <Fill>.
// uRes = scene size in art px (135, 240); uOrigin = scene top-left in the screen's art grid;
// uUnit = points per art px; uTime = swirl phase in seconds; uDim = 0..0.35 after the sequence;
// uC0..uC4 = dusk, twilight, plum, heather, teal as 0..1 RGB.
export const SWIRL_SKSL = `
uniform float2 uRes;
uniform float2 uOrigin;
uniform float uUnit;
uniform float uTime;
uniform float uDim;
uniform float3 uC0;
uniform float3 uC1;
uniform float3 uC2;
uniform float3 uC3;
uniform float3 uC4;

// 4x4 ordered dither without arrays (SkSL limits dynamic indexing).
float bayer2(float2 a) { a = floor(a); return fract(dot(a, float2(0.5, a.y * 0.75))); }
float bayer4(float2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

half4 main(float2 xy) {
  float2 ap = floor(xy / uUnit) - uOrigin;
  ap.y = uRes.y - 1.0 - ap.y;                 // match WebGL's bottom-up rows
  float2 uv = (ap + 0.5 - uRes * 0.5) / uRes.y;
  uv.y += 0.12;
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float t = uTime;
  a += r * 3.4 - t * 0.32;
  float2 p = float2(cos(a), sin(a)) * r;
  float v = sin(p.x * 7.0 + t * 0.55) * 0.5;
  v += sin(p.y * 9.0 - t * 0.35 + sin(p.x * 3.0 + t * 0.2) * 2.0) * 0.5;
  v += sin(r * 11.0 - t * 0.7) * 0.35;
  v = v * 0.37 + 0.5;
  v = clamp(v + (bayer4(ap) - 0.5) * 0.24, 0.0, 0.999);
  float3 c = uC4;
  if (v < 0.955) { c = uC3; }
  if (v < 0.80) { c = uC2; }
  if (v < 0.56) { c = uC1; }
  if (v < 0.30) { c = uC0; }
  return half4(half3(mix(c, uC0 * 0.6, uDim)), 1.0);
}
`;

// CRT pass, applied as the layer image filter of a <Group> holding the swirl and every sprite.
// uRes = canvas size; uShake and uChroma in points; uBright = 1 except the single lights-out pulse.
export const CRT_SKSL = `
uniform shader image;
uniform float2 uRes;
uniform float2 uShake;
uniform float3 uFrame;
uniform float uCurv;
uniform float uScan;
uniform float uChroma;
uniform float uVig;
uniform float uNoise;
uniform float uBright;
uniform float uUnit;
uniform float uDensity;
uniform float uTime;

float2 barrel(float2 uv) {
  float2 c = uv * 2.0 - 1.0;
  c *= 1.0 + uCurv * dot(c, c);
  return c * 0.5 + 0.5;
}
float hash(float2 p) { return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453); }

half4 main(float2 xy) {
  float2 uv = barrel(xy / uRes) + uShake / uRes;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { return half4(half3(uFrame), 1.0); }
  float2 p = uv * uRes;
  float2 off = float2(uChroma, 0.0);
  float3 col = float3(image.eval(p + off).r, image.eval(p).g, image.eval(p - off).b);
  // Scanlines every half art pixel, never finer than 2 device px.
  float period = max(2.0 / uDensity, uUnit * 0.5);
  float scan = 0.5 - 0.5 * cos(6.2831853 * p.y / period);
  col *= 1.0 - uScan * scan;
  float2 c = (uv * 2.0 - 1.0) * float2(0.9, 0.75);
  col *= clamp(1.0 - uVig * pow(dot(c, c), 1.3), 0.0, 1.0);
  col += (hash(floor(p / max(1.0 / uDensity, uUnit * 0.5)) + fract(uTime) * 61.0) - 0.5) * uNoise;
  return half4(half3(col * uBright), 1.0);
}
`;

// Menu-preset overlay drawn over RN views: outputs premultiplied night with alpha, never samples
// content. Scanlines: 1pt dark row every 3pt. Tube: rounded inset frame (opaque night outside)
// plus an inner shadow approximating CSS `inset 0 0 blur spread`.
export const OVERLAY_SKSL = `
uniform float2 uRes;
uniform float3 uNight;
uniform float uScanAlpha;
uniform float uInset;
uniform float uRadius;
uniform float uFrame;
uniform float uShadowAlpha;
uniform float uShadowSpread;
uniform float uShadowBlur;

float sdRoundRect(float2 p, float2 halfSize, float r) {
  float2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

half4 main(float2 xy) {
  float scan = step(2.0, mod(xy.y, 3.0)) * uScanAlpha;
  float2 halfSize = (uRes - 2.0 * uInset) * 0.5;
  float inside = -sdRoundRect(xy - uRes * 0.5, halfSize, uRadius);
  float shadow = uShadowAlpha * (1.0 - smoothstep(-0.5 * uShadowBlur, 0.5 * uShadowBlur, inside - uShadowSpread));
  float frame = uFrame * (1.0 - smoothstep(-0.5, 0.5, inside));
  float a = 1.0 - (1.0 - scan) * (1.0 - shadow) * (1.0 - frame);
  return half4(half3(uNight * a), a);
}
`;

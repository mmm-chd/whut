import {
  AddEquation,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  Texture,
  Vector3,
  Vector4,
} from 'three';

export type BlendMode = 'normal' | 'additive';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * One shader draws every textured plane. It reproduces the CSS features the
 * old DOM stage relied on, so the art keeps its look:
 *  - uFit      object-fit / object-position (box uv -> image-local uv)
 *  - uCrop     a source-pixel crop (tower sheet cut-outs, sky strips)
 *  - uMask     an elliptical clip-path (the rocket window)
 *  - uFadeX/Y  mask-image edge ramps (sky edges, sky cap)
 *  - uFlip     scaleX(-1) / scaleY(-1) mirrors
 * Textures are uploaded premultiplied, so blending is (ONE, 1 - src alpha).
 */
const fragmentShader = /* glsl */ `
uniform sampler2D map;
uniform float uOpacity;
uniform vec4 uFit;
uniform vec4 uCrop;
uniform vec4 uMask;
uniform vec2 uFlip;
uniform float uFadeX;
uniform float uFadeBottom;
uniform float uBrighten;
/* Multiplied into the texture: lets one asset serve a colour ramp. */
uniform vec3 uTint;
varying vec2 vUv;

void main() {
  vec2 box = vec2(vUv.x, 1.0 - vUv.y);
  vec2 sampleBox = box;
  if (uFlip.x > 0.5) sampleBox.x = 1.0 - sampleBox.x;
  if (uFlip.y > 0.5) sampleBox.y = 1.0 - sampleBox.y;

  vec2 local = sampleBox * uFit.xy + uFit.zw;
  if (local.x < 0.0 || local.x > 1.0 || local.y < 0.0 || local.y > 1.0) discard;

  vec2 tex = uCrop.xy + local * uCrop.zw;
  vec4 color = texture2D(map, vec2(tex.x, 1.0 - tex.y));

  float alpha = uOpacity;
  if (uMask.z > 0.0) {
    vec2 d = (box - uMask.xy) / uMask.zw;
    float r = length(d);
    float edge = max(fwidth(r), 0.0001);
    alpha *= 1.0 - smoothstep(1.0 - edge, 1.0, r);
  }
  if (uFadeX > 0.0) {
    alpha *= clamp(box.x / uFadeX, 0.0, 1.0) * clamp((1.0 - box.x) / uFadeX, 0.0, 1.0);
  }
  if (uFadeBottom < 1.0) {
    alpha *= 1.0 - clamp((box.y - uFadeBottom) / (1.0 - uFadeBottom), 0.0, 1.0);
  }

  color.rgb *= uTint;
  color *= alpha;
  color.rgb += uBrighten * color.a;
  gl_FragColor = color;
}
`;

export interface SpriteUniformValues {
  fit: [number, number, number, number];
  crop: [number, number, number, number];
  /** cx, cy, rx, ry as box fractions; rx <= 0 disables the mask. */
  mask?: [number, number, number, number];
  flipX?: boolean;
  flipY?: boolean;
  fadeX?: number;
  fadeBottom?: number;
}

export function createSpriteMaterial(blend: BlendMode = 'normal'): ShaderMaterial {
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      map: { value: null as Texture | null },
      uOpacity: { value: 1 },
      uFit: { value: new Vector4(1, 1, 0, 0) },
      uCrop: { value: new Vector4(0, 0, 1, 1) },
      uMask: { value: new Vector4(0, 0, 0, 0) },
      uFlip: { value: new Vector4(0, 0, 0, 0) },
      uFadeX: { value: 0 },
      uFadeBottom: { value: 1 },
      uBrighten: { value: 0 },
      uTint: { value: new Vector3(1, 1, 1) },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: blend === 'additive' ? OneFactor : OneMinusSrcAlphaFactor,
    blendSrcAlpha: OneFactor,
    blendDstAlpha: blend === 'additive' ? OneFactor : OneMinusSrcAlphaFactor,
  });
  return material;
}

export function applySpriteUniforms(material: ShaderMaterial, values: SpriteUniformValues): void {
  const u = material.uniforms;
  (u.uFit.value as Vector4).set(...values.fit);
  (u.uCrop.value as Vector4).set(...values.crop);
  (u.uMask.value as Vector4).set(...(values.mask ?? [0, 0, 0, 0]));
  (u.uFlip.value as Vector4).set(values.flipX ? 1 : 0, values.flipY ? 1 : 0, 0, 0);
  u.uFadeX.value = values.fadeX ?? 0;
  u.uFadeBottom.value = values.fadeBottom ?? 1;
}

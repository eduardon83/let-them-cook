// materials.js — shared uniforms and shader patches for weather and wind.
// One uniform object per quantity is shared by every patched material, so the weather system
// updates a single number and the whole valley (terrain, trees, roofs) follows.
import * as THREE from 'three';

export const SHARED = {
  uTime: { value: 0 },
  uWind: { value: 1 },        // 0 calm … 2.5 gusty
  uWindDir: { value: new THREE.Vector2(0.8, 0.35) },
  uSnow: { value: 0 },        // snow cover 0..1
  uWet: { value: 0 },         // rain wetness 0..1
  uNight: { value: 0 }        // 0 day … 1 night
};

const WEATHER_VERTEX_HEAD = 'varying float vUp;\n';
const WEATHER_VERTEX_BODY = `
  {
    vec3 wN = objectNormal;
    #ifdef USE_INSTANCING
      wN = mat3(instanceMatrix) * wN;
    #endif
    vUp = normalize(mat3(modelMatrix) * wN).y;
  }
`;
const WEATHER_FRAGMENT_HEAD = 'varying float vUp;\nuniform float uSnow;\nuniform float uWet;\n';
const WEATHER_FRAGMENT_COLOR = `
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 1.0), uSnow * smoothstep(0.42, 0.82, vUp));
  diffuseColor.rgb *= 1.0 - 0.16 * uWet * (1.0 - uSnow);
`;
const WEATHER_FRAGMENT_ROUGH = `
  roughnessFactor = mix(roughnessFactor, 0.42, uWet * 0.75 * (1.0 - uSnow));
`;

const WIND_VERTEX_HEAD = 'uniform float uTime;\nuniform float uWind;\nuniform vec2 uWindDir;\nuniform float uSwayHeight;\nuniform float uSwayAmount;\n';
const WIND_VERTEX_BODY = `
  {
    vec3 anchor = vec3(0.0);
    #ifdef USE_INSTANCING
      anchor = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    #endif
    anchor = (modelMatrix * vec4(anchor, 1.0)).xyz;
    float hNorm = clamp(position.y / uSwayHeight, 0.0, 1.5);
    float bend = hNorm * hNorm;
    float phase = anchor.x * 0.21 + anchor.z * 0.17;
    float gust = sin(uTime * 1.3 + phase) * 0.6 + sin(uTime * 2.9 + phase * 1.7) * 0.3 + sin(uTime * 0.45 + phase * 0.3) * 0.5;
    float lean = (0.35 + gust) * uWind * uSwayAmount * bend;
    transformed.x += uWindDir.x * lean;
    transformed.z += uWindDir.y * lean;
    transformed.y -= abs(lean) * 0.15 * hNorm;
  }
`;

function chain(material, patch) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => { previous?.call(material, shader, renderer); patch(shader); };
  const key = material.customProgramCacheKey?.() ?? '';
  const patchKey = patch.cacheKey;
  material.customProgramCacheKey = () => key + '|' + patchKey;
  return material;
}

/** Adds snow cover on upward faces and darker, glossier surfaces in the rain. */
export function weatherize(material) {
  const patch = (shader) => {
    shader.uniforms.uSnow = SHARED.uSnow; shader.uniforms.uWet = SHARED.uWet;
    shader.vertexShader = WEATHER_VERTEX_HEAD + shader.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + WEATHER_VERTEX_BODY);
    shader.fragmentShader = WEATHER_FRAGMENT_HEAD + shader.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + WEATHER_FRAGMENT_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + WEATHER_FRAGMENT_ROUGH);
  };
  patch.cacheKey = 'weather';
  return chain(material, patch);
}

/** Bends vertices with height (trees, grass, flowers). Call before weatherize. */
export function windify(material, { swayHeight = 2.5, amount = 0.12 } = {}) {
  const swayHeightU = { value: swayHeight }, amountU = { value: amount };
  const patch = (shader) => {
    shader.uniforms.uTime = SHARED.uTime; shader.uniforms.uWind = SHARED.uWind; shader.uniforms.uWindDir = SHARED.uWindDir;
    shader.uniforms.uSwayHeight = swayHeightU; shader.uniforms.uSwayAmount = amountU;
    shader.vertexShader = WIND_VERTEX_HEAD + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND_VERTEX_BODY);
  };
  patch.cacheKey = 'wind';
  return chain(material, patch);
}

/** Night-glow material for lantern glass, windows and the trail sparkles. */
export function glowMaterial(color, strength = 1) {
  const material = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.15 * strength, roughness: 0.6 });
  material.userData.glow = strength;
  return material;
}

/**
 * Shared media / grade / graph node shapes (plain JS, no React).
 * Factories return plain objects matching the cinema ↔ workflow contract.
 */

/**
 * @typedef {'image' | 'video' | 'audio' | 'unknown'} MediaKind
 */

/**
 * @param {string} url
 * @param {MediaKind} [kind]
 * @returns {{ url: string, kind: MediaKind }}
 */
export function mediaUrl(url, kind = "unknown") {
  return { url: String(url ?? ""), kind };
}

/**
 * @param {object} [fields]
 * @returns {{
 *   id: string | null,
 *   prompt: string,
 *   camera: string | null,
 *   lens: string | null,
 *   focal: number | null,
 *   aperture: string | null,
 *   aspect_ratio: string | null,
 *   gradeId: string | null,
 *   image: { url: string, kind: MediaKind } | null,
 *   video: { url: string, kind: MediaKind } | null,
 *   audio: { url: string, kind: MediaKind } | null,
 * }}
 */
export function shot(fields = {}) {
  return {
    id: fields.id ?? null,
    prompt: fields.prompt ?? "",
    camera: fields.camera ?? null,
    lens: fields.lens ?? null,
    focal: fields.focal ?? null,
    aperture: fields.aperture ?? null,
    aspect_ratio: fields.aspect_ratio ?? null,
    gradeId: fields.gradeId ?? null,
    image: fields.image ?? null,
    video: fields.video ?? null,
    audio: fields.audio ?? null,
  };
}

/**
 * ASC CDL grade record (numbers stored; no SOP evaluation in browser).
 * @param {object} fields
 * @param {string} fields.look
 * @param {[number, number, number]} [fields.slope]
 * @param {[number, number, number]} [fields.offset]
 * @param {[number, number, number]} [fields.power]
 * @param {number} [fields.sat]
 * @returns {{ look: string, slope: [number, number, number], offset: [number, number, number], power: [number, number, number], sat: number }}
 */
export function grade(fields) {
  return {
    look: fields.look,
    slope: fields.slope ?? [1, 1, 1],
    offset: fields.offset ?? [0, 0, 0],
    power: fields.power ?? [1, 1, 1],
    sat: fields.sat ?? 1,
  };
}

/**
 * @param {object} fields
 * @param {string} fields.id
 * @param {string} fields.type
 * @param {Record<string, unknown>} [fields.params]
 * @param {unknown} [fields.output]
 * @returns {{ id: string, type: string, params: Record<string, unknown>, output: unknown }}
 */
export function node(fields) {
  return {
    id: fields.id,
    type: fields.type,
    params: fields.params ?? {},
    output: fields.output ?? null,
  };
}

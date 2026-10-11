/**
 * Resolve ?model= deep-link against studio catalog lists.
 * Exact model id wins; otherwise family id → resolveVariant default.
 */

import { getFamilies, resolveVariant } from "../modelFamilies.js";

function findById(list, id) {
  return (list || []).find((m) => m.id === id) || null;
}

function findFamilyDefault(list, familyId) {
  const families = getFamilies(list || []);
  if (!families.some((f) => f.id === familyId)) return null;
  return resolveVariant(familyId, {}, list) || null;
}

/**
 * Image Studio: t2i → i2i (id first, then family).
 * @returns {{ modelId: string, imageMode: boolean, v2vMode: boolean } | null}
 */
export function resolveImageModelQuery(query, t2iModels, i2iModels) {
  const q = typeof query === "string" ? query.trim() : "";
  if (!q) return null;

  const t2iHit = findById(t2iModels, q);
  if (t2iHit) {
    return { modelId: t2iHit.id, imageMode: false, v2vMode: false };
  }
  const i2iHit = findById(i2iModels, q);
  if (i2iHit) {
    return { modelId: i2iHit.id, imageMode: true, v2vMode: false };
  }

  const t2iFamily = findFamilyDefault(t2iModels, q);
  if (t2iFamily) {
    return { modelId: t2iFamily.id, imageMode: false, v2vMode: false };
  }
  const i2iFamily = findFamilyDefault(i2iModels, q);
  if (i2iFamily) {
    return { modelId: i2iFamily.id, imageMode: true, v2vMode: false };
  }

  return null;
}

/**
 * Video Studio: t2v → i2v → v2v (id first, then family).
 * @returns {{ modelId: string, imageMode: boolean, v2vMode: boolean } | null}
 */
export function resolveVideoModelQuery(query, t2vModels, i2vModels, v2vModels) {
  const q = typeof query === "string" ? query.trim() : "";
  if (!q) return null;

  const t2vHit = findById(t2vModels, q);
  if (t2vHit) {
    return { modelId: t2vHit.id, imageMode: false, v2vMode: false };
  }
  const i2vHit = findById(i2vModels, q);
  if (i2vHit) {
    return { modelId: i2vHit.id, imageMode: true, v2vMode: false };
  }
  const v2vHit = findById(v2vModels, q);
  if (v2vHit) {
    return { modelId: v2vHit.id, imageMode: false, v2vMode: true };
  }

  const t2vFamily = findFamilyDefault(t2vModels, q);
  if (t2vFamily) {
    return { modelId: t2vFamily.id, imageMode: false, v2vMode: false };
  }
  const i2vFamily = findFamilyDefault(i2vModels, q);
  if (i2vFamily) {
    return { modelId: i2vFamily.id, imageMode: true, v2vMode: false };
  }
  const v2vFamily = findFamilyDefault(v2vModels, q);
  if (v2vFamily) {
    return { modelId: v2vFamily.id, imageMode: false, v2vMode: true };
  }

  return null;
}

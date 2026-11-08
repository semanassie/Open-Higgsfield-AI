'use client';

import { useEffect, useRef } from 'react';

const LOADERS = {
  director: () => import('../src/components/DirectorStudio.js').then((mod) => mod.DirectorStudio()),
  vfx: () => import('../src/components/VfxStudio.js').then((mod) => mod.VfxStudio()),
  workflows: () => import('../src/components/WorkflowStudio.js').then((mod) => mod.WorkflowStudio()),
};

/**
 * Mount a vanilla DOM studio (Director, VFX) inside the Next shell.
 */
export default function VanillaStudio({ studio }) {
  const host = useRef(null);

  useEffect(() => {
    const parent = host.current;
    const load = LOADERS[studio];
    if (!parent || !load) return undefined;
    let cancelled = false;
    let node = null;
    load().then((element) => {
      if (cancelled || !element || !host.current) {
        element?.remove?.();
        return;
      }
      node = element;
      host.current.replaceChildren(element);
    }).catch((err) => {
      if (cancelled || !host.current) return;
      host.current.textContent = err?.message || String(err);
    });
    return () => {
      cancelled = true;
      node?.remove?.();
      parent.replaceChildren();
    };
  }, [studio]);

  return <div ref={host} data-vanilla-studio={studio} className="h-full w-full overflow-hidden" />;
}

"use client";

import { useState } from "react";

// Preview-only layout tool. Frames render the real routes with normal access checks.
export function ViewportCheck({ apiOrigin }: { apiOrigin: string }) {
  const [width, setWidth] = useState(390);
  const [path, setPath] = useState("/");
  return <main className="min-h-screen bg-slate-100 p-5">
    <div className="mx-auto mb-5 max-w-6xl rounded-xl bg-white p-5">
      <h1 className="text-xl font-semibold">Preview layout check</h1>
      <p className="mt-2 text-sm">Real pages in a constrained viewport. This checks responsive layout, not mobile hardware or voice support.</p>
      <p className="mt-2 break-all text-xs text-slate-600">Configured API: {apiOrigin}</p>
      <div className="mt-4 flex flex-wrap gap-4">
        <label>Viewport width<select aria-label="Viewport width" className="field mt-1" value={width} onChange={e=>setWidth(Number(e.target.value))}>
          {[320,360,390,768,1024].map(w=><option key={w} value={w}>{w}px</option>)}
        </select></label>
        <label>Page<select aria-label="Preview page" className="field mt-1" value={path} onChange={e=>setPath(e.target.value)}>
          {["/","/auth","/onboarding","/interview","/profile","/pathways","/progress","/field-worker","/review","/officer"].map(p=><option key={p} value={p}>{p}</option>)}
        </select></label>
      </div>
    </div>
    <iframe title="LEAP responsive preview" src={path} width={width} height={800} className="mx-auto block border border-slate-300 bg-white" style={{maxWidth:"100%"}} />
  </main>;
}

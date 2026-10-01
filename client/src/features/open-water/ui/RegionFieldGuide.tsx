import { getRegion, portalsFrom, type RegionId, type RegionPose } from '../data/regions';

/** A still, geometry-derived chart remains meaningful without a graphics API. */
export default function RegionFieldGuide({region:id,pose}:{region:RegionId;pose:RegionPose}) {
  const region=getRegion(id),sx=350/(region.bounds.x*2),sz=210/(region.bounds.z*2);
  const x=(v:number)=>200+v*sx,z=(v:number)=>140+v*sz;
  return <svg viewBox="0 0 400 300" role="img" aria-label={`${region.name}, illustrated field guide`}>
    <defs><pattern id="field-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#eff5df" strokeOpacity=".09" /></pattern></defs>
    <rect width="400" height="300" fill={region.palette.water}/><rect width="400" height="300" fill="url(#field-grid)"/>
    <text x="22" y="25" fill="#eff5df" fontSize="9" fontFamily="monospace" letterSpacing="2">OPEN WATER / FIELD GUIDE</text>
    {region.cave ? <>
      <rect x="20" y="38" width="360" height="214" rx="55" fill={region.palette.rock}/>
      {region.chambers.map((room,i)=><rect key={i} x={x(room.min[0])} y={z(room.min[2])} width={(room.max[0]-room.min[0])*sx} height={(room.max[2]-room.min[2])*sz} fill={region.palette.water} stroke={region.palette.accent} strokeOpacity=".3" strokeWidth="1.4"/>)}
    </> : <>
      {[1,.82,.64,.46].map((r,i)=><ellipse key={r} cx={id==='driftwall'?195+i*17:200} cy="145" rx={175*r} ry={105*r} transform={id==='driftwall'?'rotate(-17 200 140)':undefined} fill={i%2?region.palette.floor:region.palette.rock} opacity={.3+i*.09} stroke={region.palette.accent} strokeWidth=".8"/>)}
      {region.gardens.map((g,i)=><g key={i} transform={`translate(${x(g.x)} ${z(g.z)})`} fill="none" stroke={region.palette.coral[i%region.palette.coral.length]} strokeWidth="2"><path d="M0 8V-8M0 0L-6-6M0 4L7-3M-6-6V-11M7-3L11-8"/><circle r={Math.max(3,g.radius*sx*.5)} strokeWidth=".5" opacity=".5"/></g>)}
    </>}
    {portalsFrom(id).map(p=><g key={p.id} transform={`translate(${x(p.position.x)} ${z(p.position.z)})`}><circle r="6" fill={region.palette.accent}/><path d="M-2-3L2 0L-2 3" fill="none" stroke="#143b43" strokeWidth="1.5"/></g>)}
    {region.landmarks.map((l,i)=><g key={l.id} transform={`translate(${x(l.x)} ${z(l.z)})`}><circle r="9" fill="#f6f1e7"/><text textAnchor="middle" y="3" fontSize="8" fill="#143b43" fontFamily="monospace">0{i+1}</text></g>)}
    <g transform={`translate(${x(pose.x)} ${z(pose.z)}) rotate(${pose.heading*180/Math.PI})`}><circle r="12" stroke="#ffffff" strokeOpacity=".5" fill="none"/><path d="M0-7L5 6L0 3L-5 6Z" fill="#ffffff"/></g>
    <text x="22" y="277" fill="#eff5df" fontFamily="Georgia,serif" fontSize="22">{region.name}</text>
    <text x="378" y="278" textAnchor="end" fill="#eff5df" fontFamily="monospace" fontSize="9">{(-pose.y).toFixed(1)}m / STILL VIEW</text>
  </svg>;
}

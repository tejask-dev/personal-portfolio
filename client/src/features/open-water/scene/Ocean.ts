import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  Plane,
  Ray,
  Vector3,
} from "three";
import { oceanMaterial, type SeaEnvironment } from "./materials";

export function createOcean(environment: SeaEnvironment, quality: "low" | "high" = "high") {
  // Dense close to the yacht, spreading toward the horizon. One indexed mesh.
  const divisions = 160,
    positions: number[] = [],
    indices: number[] = [];
  const at = (i: number) => {
    const v = (i / divisions) * 2 - 1;
    return Math.sign(v) * (Math.abs(v) * 220 + Math.abs(v) ** 3 * 2400);
  };
  for (let x = 0; x <= divisions; x++)
    for (let z = 0; z <= divisions; z++) positions.push(at(x), 0, at(z));
  for (let x = 0; x < divisions; x++)
    for (let z = 0; z < divisions; z++) {
      const a = x * (divisions + 1) + z,
        b = a + divisions + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const highCount=indices.length;
  // Low uses every second vertex: the same extent, same surface and analytic
  // pick plane, with no additional mesh or GPU allocation during a tier change.
  for(let x=0;x<divisions;x+=2)for(let z=0;z<divisions;z+=2){
    const a=x*(divisions+1)+z,b=a+2*(divisions+1);
    indices.push(a,a+2,b,b,a+2,b+2);
  }
  const lowCount=indices.length-highCount;
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const mesh = new Mesh(geometry, oceanMaterial(environment));
  mesh.frustumCulled = false;
  mesh.name = "open-water-surface";
  mesh.renderOrder = 20;
  mesh.userData.setQuality=(next:"low"|"high")=>geometry.setDrawRange(next==="low"?highCount:0,next==="low"?lowCount:highCount);
  mesh.userData.setQuality(quality);
  // Input needs the chart coordinate on mean sea level, not an intersection
  // with every rendered wave triangle. Keep pointer picking constant-time.
  const inverse = new Matrix4();
  const ray = new Ray();
  const plane = new Plane(new Vector3(0, 1, 0), 0);
  const hit = new Vector3();
  const extent = at(divisions);
  mesh.raycast = (raycaster, intersections) => {
    inverse.copy(mesh.matrixWorld).invert();
    ray.copy(raycaster.ray).applyMatrix4(inverse);
    if (!ray.intersectPlane(plane, hit)) return;
    if (Math.abs(hit.x) > extent || Math.abs(hit.z) > extent) return;
    hit.applyMatrix4(mesh.matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(hit);
    if (distance < raycaster.near || distance > raycaster.far) return;
    intersections.push({ distance, point: hit.clone(), object: mesh });
  };
  return mesh;
}

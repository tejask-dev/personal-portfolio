import { BufferGeometry, Float32BufferAttribute, Mesh } from "three";
import { oceanMaterial, type SeaEnvironment } from "./materials";

export function createOcean(environment: SeaEnvironment) {
  // Dense close to the yacht, spreading toward the horizon. One indexed mesh.
  const divisions = 160,
    positions: number[] = [],
    indices: number[] = [];
  const at = (i: number) => {
    const v = (i / divisions) * 2 - 1;
    return Math.sign(v) * (Math.abs(v) * 80 + Math.abs(v) ** 3 * 1900);
  };
  for (let x = 0; x <= divisions; x++)
    for (let z = 0; z <= divisions; z++) positions.push(at(x), 0, at(z));
  for (let x = 0; x < divisions; x++)
    for (let z = 0; z < divisions; z++) {
      const a = x * (divisions + 1) + z,
        b = a + divisions + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const mesh = new Mesh(geometry, oceanMaterial(environment));
  mesh.frustumCulled = false;
  return mesh;
}

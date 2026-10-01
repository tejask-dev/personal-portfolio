/** Isolated real-WebGL regression. Actual regional/legacy fish, materials and
 * per-instance attributes; fixed camera, mesh geometry, transforms and lights.
 * Only uSwimClock changes between the moving samples. Pixel differences must
 * include silhouette changes, not merely translation or a moving sea shader.
 *
 * QA_ENGINES=chromium,firefox,webkit node tests/open-water-fish-shader.mjs
 * QA_OUT_DIR=/tmp/fish-shader overrides the durable report/image directory.
 * Coordinate exclusive GPU ownership before running this script. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";

const out = path.resolve(process.env.QA_OUT_DIR ?? "design/open-water-v4/implementation-qa/fish-shader");
const port = Number(process.env.QA_PORT ?? 8826);
const engines = (process.env.QA_ENGINES ?? "chromium").split(",");
const report = { measuredAt: new Date().toISOString(), method: "Isolated actual fish factories; fixed camera/model/instances/lights/sea clock; only fish shader clock advances. No animation telemetry substitutes for pixel evidence.", checks: [] };
await mkdir(out, { recursive: true });
const server = await createServer({ optimizeDeps: { noDiscovery: true, include: ["three", "three/examples/jsm/loaders/GLTFLoader.js", "three/examples/jsm/exporters/GLTFExporter.js", "three/examples/jsm/utils/BufferGeometryUtils.js"] }, server: { host: "127.0.0.1", port, strictPort: true }, mode: "test", logLevel: "error" });
await server.listen();
try {
  for (const engine of engines) {
    assert.ok(["chromium", "firefox", "webkit"].includes(engine), `Unknown browser ${engine}`);
    const browser = engine === "chromium" ? await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true })) : await ({ firefox, webkit })[engine].launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 640, height: 480 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await page.route("**/fish-shader-fixture", route => route.fulfill({ contentType: "text/html", body: '<!doctype html><html><head><link rel="icon" href="data:,"></head><body style="margin:0;background:#071d25"></body></html>' }));
      await page.goto(`http://127.0.0.1:${port}/fish-shader-fixture`);
      const checks = await page.evaluate(async () => {
        const { THREE: T } = await import("/src/features/open-water/scene/AssetExportV4.ts");
        const { createEnvironment } = await import("/src/features/open-water/scene/materials.ts");
        const { createV4Fauna } = await import("/src/features/open-water/scene/V4Fauna.ts");
        const { createWildlife } = await import("/src/features/open-water/scene/Wildlife.ts");
        const env = createEnvironment(); env.uTime.value = 0;
        const renderer = new T.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1); renderer.setSize(640, 480); renderer.setClearColor(0x071d25, 0);
        document.body.appendChild(renderer.domElement);
        const shaderErrors = [];
        renderer.debug.checkShaderErrors = true;
        renderer.debug.onShaderError = (gl, program, vertex, fragment) => shaderErrors.push({ program: gl.getProgramInfoLog(program), vertex: gl.getShaderInfoLog(vertex), fragment: gl.getShaderInfoLog(fragment) });
        const scene = new T.Scene();
        scene.add(new T.HemisphereLight(0xe4f4ff, 0x263638, 1.8));
        const sun = new T.DirectionalLight(0xffe9cc, 2.4); sun.position.set(-3, 4, 6); scene.add(sun);
        const camera = new T.OrthographicCamera(-1.6, 1.6, 1.2, -1.2, 0.01, 20);
        camera.position.set(0, 0, 4); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
        const target = new T.WebGLRenderTarget(640, 480, { format: T.RGBAFormat });
        const capture = () => {
          renderer.setRenderTarget(target); renderer.render(scene, camera);
          const pixels = new Uint8Array(640 * 480 * 4); renderer.readRenderTargetPixels(target, 0, 0, 640, 480, pixels);
          renderer.setRenderTarget(null); renderer.render(scene, camera);
          return pixels;
        };
        const difference = (a, b) => {
          let changedPixels = 0, silhouettePixels = 0, opaquePixels = 0, sum = 0;
          for (let i = 0; i < a.length; i += 4) {
            const difference = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
            if (difference > 6 || a[i + 3] !== b[i + 3]) changedPixels++;
            if ((a[i + 3] > 127) !== (b[i + 3] > 127)) silhouettePixels++;
            if (a[i + 3] > 127) opaquePixels++;
            sum += difference + Math.abs(a[i + 3] - b[i + 3]);
          }
          return { changedPixels, silhouettePixels, opaquePixels, absoluteDifference: sum };
        };
        const rows = [], captures = [], bindings = new Map();
        const state = () => ({ camera: camera.matrixWorld.elements.join(","), seaTime: env.uTime.value, lights: sun.matrixWorld.elements.join(",") });
        for (const quality of ["low", "high"]) {
          const fauna = createV4Fauna(env, quality); fauna.update("crown", 0, false);
          const wildlife = createWildlife(env, { quality });
          const fixtures = [{ name: "regional", mesh: fauna.group.children.find(o => o.isInstancedMesh), owner: fauna }];
          for (let i = 1; i <= 3; i++) fixtures.push({ name: `legacy-fallback-${i}`, mesh: wildlife.reef.getObjectByName(`Responsive-school-${i}`), owner: wildlife });
          const run = fixture => {
            const mesh = fixture.mesh, parent = mesh.parent;
            parent.remove(mesh); scene.add(mesh);
            mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); mesh.scale.setScalar(1); mesh.count = 4;
            const transform = new T.Object3D();
            for (let i = 0; i < 4; i++) {
              transform.position.set(i % 2 ? 0.72 : -0.72, i < 2 ? 0.48 : -0.48, 0);
              // Three-quarter view makes posterior flex visible without relying
              // on a normal/specular change to count as body deformation.
              transform.rotation.set(0, 1.05, 0); transform.scale.setScalar(fixture.name === "regional" ? 1.65 : 0.95); transform.updateMatrix(); mesh.setMatrixAt(i, transform.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
            // A loaded geometry can reuse the already compiled material/program.
            // Keep the actual uniform binding captured on its first compilation.
            let clock = bindings.get(mesh.material)?.clock, mediumUniform = bindings.get(mesh.material)?.mediumUniform ?? false;
            const previous = mesh.material.onBeforeCompile;
            mesh.material.onBeforeCompile = function (shader, r) { previous.call(this, shader, r); clock = shader.uniforms.uSwimClock; mediumUniform = shader.uniforms.uSeaTime === env.uTime; bindings.set(this, {clock, mediumUniform}); };
            mesh.material.needsUpdate = true;
            renderer.compile(scene, camera); capture();
            if (!clock) throw new Error(`${fixture.name}: shader clock was not installed`);
            const positions = Array.from(mesh.geometry.attributes.position.array), matrices = Array.from(mesh.instanceMatrix.array), fixtureState = state();
            const attributes = mesh.geometry.getAttribute("aSwimPhase") ?? mesh.geometry.getAttribute("aFishPhase");
            const distinctPhases = new Set(Array.from(attributes.array).slice(0, 4)).size;
            clock.value = 0; const first = capture(); const startImage = renderer.domElement.toDataURL("image/png");
            clock.value = 0.11; const second = capture(); const strokeImage = renderer.domElement.toDataURL("image/png");
            clock.value = 0.23; const third = capture(); const endImage = renderer.domElement.toDataURL("image/png");
            const held = capture();
            const programs = renderer.info.programs.map(p => ({ linked: renderer.getContext().getProgramParameter(p.program, renderer.getContext().LINK_STATUS), name: p.name }));
            const row = {
              quality, fixture: fixture.name, source: mesh.userData.source ?? "original regional geometry",
              moving: difference(first, second), laterStroke: difference(second, third), frozen: difference(third, held),
              unchanged: JSON.stringify(positions) === JSON.stringify(Array.from(mesh.geometry.attributes.position.array)) && JSON.stringify(matrices) === JSON.stringify(Array.from(mesh.instanceMatrix.array)) && JSON.stringify(fixtureState) === JSON.stringify(state()),
              distinctPhases, mediumUniform, draws: renderer.info.render.calls, triangles: renderer.info.render.triangles,
              programs, shaderErrors: [...shaderErrors],
            };
            row.ok = row.moving.silhouettePixels >= 30 && row.laterStroke.silhouettePixels >= 30 && row.frozen.absoluteDifference === 0 && row.unchanged && distinctPhases === 4 && mediumUniform && row.draws === 1 && programs.every(p => p.linked) && shaderErrors.length === 0;
            rows.push(row); captures.push({ name: `${quality}-${fixture.name}`, startImage, strokeImage, endImage });
            scene.remove(mesh); parent.add(mesh); mesh.material.onBeforeCompile = previous;
          };
          for (const fixture of fixtures) run(fixture);
          // Exercise the shipped optional school meshes through the real loader,
          // then run the same material + frozen-transform comparison again.
          await wildlife.loadCharacter();
          if (wildlife.assetState !== "ready") throw new Error(`Optional wildlife asset did not load: ${wildlife.assetError}`);
          for (let i = 1; i <= 3; i++) run({ name: `legacy-loaded-${i}`, mesh: wildlife.reef.getObjectByName(`Responsive-school-${i}`), owner: wildlife });
          fauna.dispose(); wildlife.dispose();
        }
        const gl = renderer.getContext(), debug = gl.getExtension("WEBGL_debug_renderer_info");
        const gpu = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        target.dispose(); renderer.dispose(); renderer.forceContextLoss();
        return { rows, captures, gpu, shaderErrors };
      });
      for (const capture of checks.captures) for (const [label, image] of [["start", capture.startImage], ["stroke", capture.strokeImage], ["end", capture.endImage]])
        await writeFile(path.join(out, `${engine}-${capture.name}-${label}.png`), Buffer.from(image.split(",")[1], "base64"));
      for (const row of checks.rows) {
        report.checks.push({ engine, gpu: checks.gpu, ...row });
        console.log(`${row.ok ? "PASS" : "FAIL"} ${engine}/${row.quality}/${row.fixture}: silhouette ${row.moving.silhouettePixels}/${row.laterStroke.silhouettePixels}; held ${row.frozen.absoluteDifference}`);
      }
      report.checks.push({ engine, name: "browser and shader errors", ok: errors.length === 0 && checks.shaderErrors.length === 0, errors, shaderErrors: checks.shaderErrors });
      await page.close();
    } finally { await browser.close(); }
  }
} catch (error) {
  report.checks.push({ name: "fixture execution", ok: false, error: error.stack });
} finally {
  await server.close();
  report.passed = report.checks.length > 0 && report.checks.every(check => check.ok);
  await writeFile(path.join(out, "report.json"), JSON.stringify(report, null, 2));
}
assert.equal(report.passed, true, `Shader motion regression failed; inspect ${path.join(out, "report.json")}`);

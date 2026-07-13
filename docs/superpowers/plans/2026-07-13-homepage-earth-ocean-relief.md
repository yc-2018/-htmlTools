# Homepage Earth Ocean Relief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make China slightly more visible and add a lower white-blue ocean point layer beneath slightly raised land points.

**Architecture:** Extend the existing Fibonacci sphere sampler to assign separate radii to land and ocean coordinates. Keep China and other land in the same raised layer, render ocean points at half density with deterministic per-vertex white-blue colors, and move the invisible depth sphere below both visible layers.

**Tech Stack:** Browser JavaScript, Three.js r128 `BufferGeometry` and vertex colors, Node.js `assert` tests, direct local-browser verification.

---

## File structure

- Modify `js/homepage-earth.js`: add layer radius/style configuration, radius-aware globe coordinates, ocean positions/colors, and vertex-colored point material support.
- Modify `tests/homepage-earth-background.test.js`: specify the new colors, radii, sizes, layer ordering, deterministic ocean layer, and source-level rendering structure.

No dependency, network request, build step, or additional runtime asset will be added.

### Task 1: Define the raised-land and ocean-layer contract

**Files:**
- Modify: `tests/homepage-earth-background.test.js:90-102`
- Modify: `tests/homepage-earth-background.test.js:281-290`

- [ ] **Step 1: Write the failing configuration assertions**

In `testSceneMathAndResponsiveDefaults`, replace the existing point-style assertions with:

```js
  assert.strictEqual(earth.config.landPointRadius, 1.008);
  assert.strictEqual(earth.config.oceanPointRadius, 0.995);
  assert.strictEqual(earth.config.depthSphereRadius, 0.986);
  assert.ok(earth.config.landPointRadius > earth.config.oceanPointRadius);
  assert.ok(earth.config.oceanPointRadius > earth.config.depthSphereRadius);
  assert.strictEqual(earth.config.landPointSizePx, 1.75);
  assert.strictEqual(earth.config.oceanPointSizePx, 1.05);
  assert.strictEqual(earth.config.landPointOpacity, 0.52);
  assert.strictEqual(earth.config.oceanPointOpacity, 0.22);
  assert.strictEqual(earth.config.oceanWhiteColor, 0xf4f9fb);
  assert.strictEqual(earth.config.oceanBlueColor, 0xb9dce8);
  assert.strictEqual(earth.config.chinaPointColor, 0xc06f76);
  assert.strictEqual(earth.config.chinaPointSizePx, earth.config.landPointSizePx);
  assert.strictEqual(earth.config.chinaPointOpacity, 0.68);
```

- [ ] **Step 2: Add a radius-aware coordinate test**

Add this test after the China projection tests:

```js
function testGlobeCoordinatesRespectLayerRadius() {
  const earth = require(scriptPath);
  const land = earth.getGlobeCoordinate(105, 35, earth.config.landPointRadius);
  const ocean = earth.getGlobeCoordinate(105, 35, earth.config.oceanPointRadius);
  const magnitude = (coordinate) => Math.sqrt(
    coordinate.x * coordinate.x
    + coordinate.y * coordinate.y
    + coordinate.z * coordinate.z
  );

  assert.ok(Math.abs(magnitude(land) - earth.config.landPointRadius) < 1e-12);
  assert.ok(Math.abs(magnitude(ocean) - earth.config.oceanPointRadius) < 1e-12);
  assert.ok(magnitude(land) > magnitude(ocean), 'land points should sit above ocean points');
}
```

Export and call `testGlobeCoordinatesRespectLayerRadius()`.

- [ ] **Step 3: Replace the land-only source test**

Replace `testPointCloudRendersOnlyTwoLandLayers` with:

```js
function testPointCloudRendersRaisedLandAndColoredOcean() {
  const script = readUtf8(scriptPath);

  assertIncludes(script, 'const chinaPositions = [];');
  assertIncludes(script, 'const landPositions = [];');
  assertIncludes(script, 'const oceanPositions = [];');
  assertIncludes(script, 'const oceanColors = [];');
  assertIncludes(script, 'config.landPointRadius');
  assertIncludes(script, 'config.oceanPointRadius');
  assertIncludes(script, 'config.depthSphereRadius');
  assertIncludes(script, "geometry.setAttribute('color'");
  assertIncludes(script, 'vertexColors: Boolean(colors)');
}
```

Export and call `testPointCloudRendersRaisedLandAndColoredOcean()` instead of the old land-only test.

- [ ] **Step 4: Run only the relevant tests and verify RED**

Run:

```powershell
node -e "const t=require('./tests/homepage-earth-background.test.js'); t.testSceneMathAndResponsiveDefaults(); t.testGlobeCoordinatesRespectLayerRadius(); t.testPointCloudRendersRaisedLandAndColoredOcean();"
```

Expected: FAIL because `landPointRadius` is not defined in the current implementation.

- [ ] **Step 5: Commit the failing contract**

```powershell
git add -- tests/homepage-earth-background.test.js
git commit -m "Test homepage earth ocean relief"
```

### Task 2: Implement the layered point cloud

**Files:**
- Modify: `js/homepage-earth.js:13-38`
- Modify: `js/homepage-earth.js:315-328`
- Modify: `js/homepage-earth.js:460-542`
- Modify: `js/homepage-earth.js:729-745`
- Test: `tests/homepage-earth-background.test.js`

- [ ] **Step 1: Add the exact layer configuration**

Use these point-layer entries in `config`:

```js
    landPointRadius: 1.008,
    oceanPointRadius: 0.995,
    depthSphereRadius: 0.986,
    landPointSizePx: 1.75,
    oceanPointSizePx: 1.05,
    landPointOpacity: 0.52,
    oceanPointOpacity: 0.22,
    oceanWhiteColor: 0xf4f9fb,
    oceanBlueColor: 0xb9dce8,
    chinaPointColor: 0xc06f76,
    chinaPointSizePx: 1.75,
    chinaPointOpacity: 0.68
```

Keep the existing desktop/mobile candidate counts.

- [ ] **Step 2: Make globe coordinates radius-aware**

Replace `getGlobeCoordinate` with:

```js
  function getGlobeCoordinate(longitude, latitude, radius = 1) {
    const latitudeRadians = latitude * Math.PI / 180;
    const longitudeRadians = longitude * Math.PI / 180;
    const horizontalRadius = Math.cos(latitudeRadians) * radius;

    return {
      x: -Math.cos(longitudeRadians) * horizontalRadius,
      y: Math.sin(latitudeRadians) * radius,
      z: Math.sin(longitudeRadians) * horizontalRadius
    };
  }
```

Add `getGlobeCoordinate` to the exported API so the radius test uses production math.

- [ ] **Step 3: Generate deterministic ocean colors**

Add this helper inside `initScene`, before `createPointCloud`:

```js
    function appendOceanColor(colors, index, THREE) {
      const white = new THREE.Color(config.oceanWhiteColor);
      const blue = new THREE.Color(config.oceanBlueColor);
      const blend = 0.22 + (index * 73 % 101) / 100 * 0.56;
      const color = white.lerp(blue, blend);

      colors.push(color.r, color.g, color.b);
    }
```

The modular arithmetic makes the color distribution stable across reloads.

- [ ] **Step 4: Classify candidates into three radius-separated buffers**

In `createPointCloud`, declare:

```js
      const chinaPositions = [];
      const landPositions = [];
      const oceanPositions = [];
      const oceanColors = [];
```

Replace the current coordinate classification with:

```js
        if (isChinaCoordinate(longitude, latitude)) {
          const coordinate = getGlobeCoordinate(
            longitude,
            latitude,
            config.landPointRadius
          );
          chinaPositions.push(coordinate.x, coordinate.y, coordinate.z);
        } else if (isLandCoordinate(longitude, latitude)) {
          const coordinate = getGlobeCoordinate(
            longitude,
            latitude,
            config.landPointRadius
          );
          landPositions.push(coordinate.x, coordinate.y, coordinate.z);
        } else if (index % 2 === 0) {
          const coordinate = getGlobeCoordinate(
            longitude,
            latitude,
            config.oceanPointRadius
          );
          oceanPositions.push(coordinate.x, coordinate.y, coordinate.z);
          appendOceanColor(oceanColors, index, THREE);
        }
```

Half-density ocean sampling keeps the blue-white layer visible without overwhelming land or doubling the full candidate count on screen.

- [ ] **Step 5: Move the depth sphere below the ocean layer**

Replace the hard-coded depth sphere radius with:

```js
        new THREE.SphereBufferGeometry(config.depthSphereRadius, 48, 32),
```

- [ ] **Step 6: Add optional vertex colors to `createPoints`**

Replace `createPoints` with:

```js
    function createPoints(positions, color, size, opacity, colors = null) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      if (colors) {
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      }

      return new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color,
          size,
          sizeAttenuation: true,
          vertexColors: Boolean(colors),
          transparent: true,
          opacity,
          depthWrite: false
        })
      );
    }
```

- [ ] **Step 7: Render ocean first, then land and China**

After atmosphere creation, add the visible layers in this order:

```js
      globeGroup.add(createPoints(
        oceanPositions,
        0xffffff,
        config.oceanPointSizePx,
        config.oceanPointOpacity,
        oceanColors
      ));
      globeGroup.add(createPoints(
        landPositions,
        0x747a7d,
        config.landPointSizePx,
        config.landPointOpacity
      ));
      globeGroup.add(createPoints(
        chinaPositions,
        config.chinaPointColor,
        config.chinaPointSizePx,
        config.chinaPointOpacity
      ));
```

- [ ] **Step 8: Run the focused tests until GREEN**

Run:

```powershell
node -e "const t=require('./tests/homepage-earth-background.test.js'); t.testSceneMathAndResponsiveDefaults(); t.testGlobeCoordinatesRespectLayerRadius(); t.testPointCloudRendersRaisedLandAndColoredOcean(); console.log('homepage earth ocean relief tests passed');"
```

Expected output:

```text
homepage earth ocean relief tests passed
```

- [ ] **Step 9: Commit the implementation**

```powershell
git add -- js/homepage-earth.js
git commit -m "Add ocean relief to homepage earth"
```

### Task 3: Verify visuals and regressions

**Files:**
- Verify: `index.html`
- Verify: `js/homepage-earth.js`
- Verify: `tests/homepage-earth-background.test.js`

- [ ] **Step 1: Run the focused map tests**

Run the Task 2 Step 8 command again. Expected: exit code 0.

- [ ] **Step 2: Run all repository tests and record existing failures separately**

Run:

```powershell
Get-ChildItem tests -Filter '*.test.js' | ForEach-Object { node $_.FullName }
```

Expected project baseline: the unrelated gallery thumbnail assertion and the pre-existing homepage CSS separator assertion may remain failing; no new map assertion may fail.

- [ ] **Step 3: Check source formatting and repository state**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors and no uncommitted implementation files after the planned commits.

- [ ] **Step 4: Inspect desktop rendering at 1440 × 900**

Verify that China is visibly redder than before, gray land points sit subtly above the white-blue ocean layer, Russia remains populated above China, the ocean does not obscure coastlines, and animation remains smooth.

- [ ] **Step 5: Inspect mobile rendering at 390 × 844**

Verify that the ocean layer remains restrained behind page text, the globe does not become a solid blue ball, China remains distinguishable, and there is no horizontal overflow or WebGL fallback.

- [ ] **Step 6: Tune only within the approved ranges if visual verification requires it**

If the ocean is too strong, reduce `oceanPointOpacity` from `0.22` to `0.18`. If China is still too weak, increase `chinaPointOpacity` from `0.68` to `0.72`. Update the matching test expectation, rerun the focused tests, and commit with:

```powershell
git add -- js/homepage-earth.js tests/homepage-earth-background.test.js
git commit -m "Tune homepage earth relief colors"
```

Do not change radii, point sizes, map data, satellite behavior, or page layout during visual tuning.

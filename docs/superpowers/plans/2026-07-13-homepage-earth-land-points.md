# Homepage Earth Land Points Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage globe's ellipse-based approximation with an offline, geographically recognizable land-only point cloud that colors China light red and all other land light gray.

**Architecture:** Keep the existing single-file browser module and Three.js scene. Embed simplified Natural Earth polygon rings with precomputed bounds in `js/homepage-earth.js`, use bounds plus ray casting for coordinate classification, and feed only classified land samples into two point buffers with identical density and sizing.

**Tech Stack:** Browser JavaScript, CommonJS-compatible test exports, Three.js r128, Node.js `assert` tests, Natural Earth 110m public-domain geometry.

---

## File structure

- Modify `js/homepage-earth.js`: own the embedded map geometry, land/China coordinate classification, point sampling, colors, and Three.js point buffers.
- Modify `tests/homepage-earth-background.test.js`: specify representative real-world land/ocean classifications, unified point styling, land-only rendering, and retained globe behavior.

No runtime file, package, CDN request, build step, or generated asset will be added.

### Task 1: Lock the geographic and visual requirements in failing tests

**Files:**
- Modify: `tests/homepage-earth-background.test.js:56-61`
- Modify: `tests/homepage-earth-background.test.js:151-205`

- [ ] **Step 1: Replace the old point-style expectations**

In `testSceneMathAndResponsiveDefaults`, replace the ocean and oversized-China assertions with:

```js
  assert.strictEqual(earth.config.desktopPointCount, 24000);
  assert.strictEqual(earth.config.mobilePointCount, 14000);
  assert.strictEqual(earth.config.landPointSizePx, 1.6);
  assert.strictEqual(earth.config.chinaPointColor, 0xc98f93);
  assert.strictEqual(earth.config.chinaPointSizePx, earth.config.landPointSizePx);
  assert.strictEqual(earth.config.chinaPointOpacity, 0.56);
  assert.strictEqual('oceanPointSizePx' in earth.config, false);
```

- [ ] **Step 2: Replace the approximate-continent test with representative real geography**

Replace `testLandMaskSeparatesContinentsFromOpenOcean` with:

```js
function testLandMaskMatchesRepresentativeWorldCoordinates() {
  const earth = require(scriptPath);

  const landCoordinates = [
    [-100, 45, 'North America'],
    [-60, -15, 'South America'],
    [20, 5, 'Africa'],
    [37.6, 55.8, 'western Russia'],
    [90, 60, 'Siberia'],
    [78.9, 22.5, 'India'],
    [106.8, -6.2, 'Indonesia'],
    [135, -25, 'Australia'],
    [0, -80, 'Antarctica']
  ];
  const oceanCoordinates = [
    [-145, 0, 'Pacific Ocean'],
    [-30, -35, 'South Atlantic'],
    [80, -45, 'Indian Ocean'],
    [0, 0, 'Gulf of Guinea']
  ];

  landCoordinates.forEach(([longitude, latitude, label]) => {
    assert.strictEqual(
      earth.isLandCoordinate(longitude, latitude),
      true,
      `${label} should contain land points`
    );
  });
  oceanCoordinates.forEach(([longitude, latitude, label]) => {
    assert.strictEqual(
      earth.isLandCoordinate(longitude, latitude),
      false,
      `${label} should contain no points`
    );
  });
}
```

Update `run()` to call `testLandMaskMatchesRepresentativeWorldCoordinates()`.

- [ ] **Step 3: Tighten China classification tests**

Keep the existing Beijing, Chengdu, Xinjiang, Taiwan, Hainan, Japan, India, and Mongolia assertions. Add these assertions to verify northern China and neighboring Russia are not left empty or miscolored:

```js
  assert.strictEqual(earth.isChinaCoordinate(126.6, 45.8), true, 'Harbin should be highlighted');
  assert.strictEqual(earth.isLandCoordinate(126.6, 45.8), true, 'Harbin should also be land');
  assert.strictEqual(earth.isLandCoordinate(106, 47.8), true, 'Mongolia should remain visible land');
  assert.strictEqual(earth.isLandCoordinate(90, 60), true, 'Russia above China should remain visible land');
```

Remove the `getChinaIslandHighlightCoordinates()` assertions because island visibility will come from real polygon data and the denser uniform sampler.

- [ ] **Step 4: Add a land-only rendering source check**

Add this test before the lifecycle test:

```js
function testPointCloudRendersOnlyTwoLandLayers() {
  const script = readUtf8(scriptPath);

  assert.ok(!script.includes('oceanPositions'), 'ocean points should not be generated');
  assert.ok(!script.includes('oceanPointSizePx'), 'ocean point styling should be removed');
  assert.ok(!script.includes('index % 3'), 'ocean downsampling should be removed');
  assertIncludes(script, 'const chinaPositions = [];');
  assertIncludes(script, 'const landPositions = [];');
}
```

Call `testPointCloudRendersOnlyTwoLandLayers()` from `run()`.

- [ ] **Step 5: Run the focused test and confirm the new contract fails**

Run:

```powershell
node tests/homepage-earth-background.test.js
```

Expected: FAIL on `desktopPointCount`, because the implementation still uses 6600 candidates and ellipse-based land regions.

- [ ] **Step 6: Commit the failing test contract**

```powershell
git add -- tests/homepage-earth-background.test.js
git commit -m "Test real homepage earth land mask"
```

### Task 2: Replace ellipse regions with bounded Natural Earth polygons

**Files:**
- Modify: `js/homepage-earth.js:47-90`
- Modify: `js/homepage-earth.js:155-217`
- Modify: `js/homepage-earth.js:733-750`
- Test: `tests/homepage-earth-background.test.js`

- [ ] **Step 1: Add the simplified Natural Earth constants**

Download the fixed Natural Earth v5.1.2 public-domain sources from these exact URLs:

```text
https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_land.geojson
https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson
```

Use `ne_110m_land` for `worldLandRegions`. From `ne_110m_admin_0_countries`, use the features whose `ADMIN` values are `China` and `Taiwan` for `chinaLandRegions`, so mainland China, Hainan, and Taiwan share the red point layer. Convert every Polygon and MultiPolygon member as follows:

1. Round longitude and latitude to one decimal place.
2. Drop a coordinate only when it becomes identical to the preceding rounded coordinate.
3. Preserve the closing coordinate; append the first coordinate when rounding removed closure.
4. Compute bounds from the outer ring.
5. Encode each polygon as `[minLongitude, minLatitude, maxLongitude, maxLatitude, outerRing, ...holeRings]`.
6. Serialize both region arrays as compact JavaScript literals and insert them immediately below `orbitBands` using `apply_patch`.

Precede the arrays with this source note:

```js
  // Natural Earth 1:110m v5.1.2, public domain. Coordinates rounded to 0.1 degree.
  // Regions contain bounds followed by an outer ring and any interior hole rings.
```

Freeze the two top-level arrays with `Object.freeze`. Their coordinate entries remain private constants and are never mutated. Delete `landRegions`, `chinaMainlandPolygons`, `chinaIslandRegions`, and `chinaIslandHighlightCoordinates` after the complete serialized geometry is present.

- [ ] **Step 2: Replace ellipse helpers with polygon-region helpers**

Keep `isInsidePolygon`, then add the bounded-region helpers and replace `isLandCoordinate` / `isChinaCoordinate` with:

```js
  function isInsideRegion(longitude, latitude, region) {
    if (
      longitude < region[0]
      || latitude < region[1]
      || longitude > region[2]
      || latitude > region[3]
    ) {
      return false;
    }

    if (!isInsidePolygon(longitude, latitude, region[4])) {
      return false;
    }

    return !region.slice(5).some((hole) => (
      isInsidePolygon(longitude, latitude, hole)
    ));
  }

  function isInsideRegions(longitude, latitude, regions) {
    return regions.some((region) => isInsideRegion(longitude, latitude, region));
  }

  function isLandCoordinate(longitude, latitude) {
    return isInsideRegions(longitude, latitude, worldLandRegions);
  }

  function isChinaCoordinate(longitude, latitude) {
    return isInsideRegions(longitude, latitude, chinaLandRegions);
  }
```

Delete `longitudeDistance`, `isInsideLandRegion`, and `isInsideIslandRegion`.

- [ ] **Step 3: Remove the obsolete island-highlight API**

Delete `getChinaIslandHighlightCoordinates` and remove it from the exported API. Keep `isLandCoordinate` and `isChinaCoordinate` exported so Node tests can verify the embedded geometry directly.

- [ ] **Step 4: Run the focused test**

Run:

```powershell
node tests/homepage-earth-background.test.js
```

Expected: the representative geography and China classification assertions PASS; the test still FAILS on the new point counts or remaining ocean buffer until Task 3.

- [ ] **Step 5: Commit the real map mask**

```powershell
git add -- js/homepage-earth.js tests/homepage-earth-background.test.js
git commit -m "Use real land polygons for homepage earth"
```

### Task 3: Render dense land-only points with restrained China color

**Files:**
- Modify: `js/homepage-earth.js:13-38`
- Modify: `js/homepage-earth.js:384-475`
- Test: `tests/homepage-earth-background.test.js`

- [ ] **Step 1: Update the point configuration**

Replace the point-count and point-style entries in `config` with:

```js
    desktopPointCount: 24000,
    mobilePointCount: 14000,
    pointerEase: 0.035,
    landPointSizePx: 1.6,
    landPointOpacity: 0.48,
    orbitBandCount: 4,
    trailLength: 12,
    trailAngleStep: 0.035,
    trailPointSizePx: 2.1,
    chinaPointColor: 0xc98f93,
    chinaPointSizePx: 1.6,
    chinaPointOpacity: 0.56
```

This removes `oceanPointSizePx`; China and other land use equal dot size and sampling density.

- [ ] **Step 2: Remove the ocean buffer and classify only land candidates**

In `createPointCloud`, keep only `chinaPositions` and `landPositions`, then use:

```js
        const globeCoordinate = getGlobeCoordinate(longitude, latitude);

        if (isChinaCoordinate(longitude, latitude)) {
          chinaPositions.push(
            globeCoordinate.x,
            globeCoordinate.y,
            globeCoordinate.z
          );
        } else if (isLandCoordinate(longitude, latitude)) {
          landPositions.push(
            globeCoordinate.x,
            globeCoordinate.y,
            globeCoordinate.z
          );
        }
```

Delete the `target` variable, `oceanPositions`, the `index % 3` branch, and `appendIslandHighlightPoints`.

- [ ] **Step 3: Build exactly two map point layers**

Keep the depth sphere and atmosphere. Replace the map point additions with:

```js
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

Keep the existing `YXZ` order and China-facing rotations; they already project longitude 105°, latitude 35° to the screen center, while the corrected mask supplies Russia above and Southeast Asia below.

- [ ] **Step 4: Run the focused test until green**

Run:

```powershell
node tests/homepage-earth-background.test.js
```

Expected output:

```text
homepage earth background tests passed
```

- [ ] **Step 5: Commit the land-only renderer**

```powershell
git add -- js/homepage-earth.js tests/homepage-earth-background.test.js
git commit -m "Render homepage earth with land-only points"
```

### Task 4: Verify regressions, performance, and responsive visuals

**Files:**
- Verify: `index.html`
- Verify: `css/homepage-earth.css`
- Verify: `js/homepage-earth.js`
- Verify: `tests/homepage-earth-background.test.js`

- [ ] **Step 1: Run every repository test**

Run:

```powershell
Get-ChildItem tests -Filter '*.test.js' | ForEach-Object { node $_.FullName }
```

Expected: every file exits with code 0, including `homepage earth background tests passed`.

- [ ] **Step 2: Check formatting and unintended changes**

Run:

```powershell
git diff --check
git status --short
```

Expected: `git diff --check` produces no output; status contains only the intended earth script/test changes if they have not yet been committed.

- [ ] **Step 3: Serve and inspect the desktop viewport**

Run a local static server from the repository root, open `index.html` in current Chrome or Edge at approximately 1440 × 900, and verify:

- China appears near the globe center in light red.
- Russia has continuous gray land points above China.
- Mongolia, India, Southeast Asia, Japan, and Australia occupy recognizable relative positions.
- Ocean areas between landmasses contain no map points.
- Antarctica follows a coastline instead of forming a solid latitude band.
- Satellite, trail, rotation, pointer, and intro animations remain active.

- [ ] **Step 4: Inspect the mobile viewport**

At approximately 390 × 844, verify that the globe remains responsive, the land outline remains recognizable, China remains visible without an oversized red blob, and page scrolling/links remain usable.

- [ ] **Step 5: Record performance evidence**

In the desktop browser, reload once and confirm that map construction completes without a visible long-task stall and animation remains smooth. If construction exceeds one second on the current machine, reduce only `desktopPointCount` to 20000 and `mobilePointCount` to 12000, update their test expectations, and rerun Tasks 3 Step 4 and 4 Step 1.

- [ ] **Step 6: Final verification commit if visual tuning changed values**

If Step 5 required count tuning:

```powershell
git add -- js/homepage-earth.js tests/homepage-earth-background.test.js
git commit -m "Tune homepage earth point density"
```

If no tuning was needed, do not create an empty commit.

# Homepage Earth Orbital Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 14 spherical satellite dots with recognizable body-and-two-panel models and add one larger truss-style space station on a slower high orbit.

**Architecture:** Keep orbital math and trails separate from visuals. Add a deterministic space-station spec, export small Three.js model factories for ordinary satellites and the station, and orient each model along its local orbital tangent during the existing update loop.

**Tech Stack:** Browser JavaScript, Three.js r128 primitive geometries, CommonJS-compatible Node.js `assert` tests, local-browser visual verification.

---

## File structure

- Modify `js/homepage-earth.js`: add station configuration/specification, orbital heading math, model factories, model lifecycle, and model updates.
- Modify `tests/homepage-earth-background.test.js`: test the station spec, model composition, double-sided solar panels, tangent heading, and source integration.

The unrelated modified file `实况图片换封面/styles.css` must remain untouched and unstaged.

### Task 1: Define orbital specifications and tangent heading

**Files:**
- Modify: `tests/homepage-earth-background.test.js:135-176`
- Modify: `js/homepage-earth.js:13-52`
- Modify: `js/homepage-earth.js:348-395`

- [ ] **Step 1: Write the failing station-spec test**

Add:

```js
function testSpaceStationUsesAHighSlowOrbit() {
  const earth = require(scriptPath);
  const satellites = earth.createSatelliteSpecs();
  const station = earth.createSpaceStationSpec();

  assert.strictEqual(satellites.length, 14);
  assert.ok(satellites.every((spec) => spec.kind === 'satellite'));
  assert.strictEqual(station.kind, 'spaceStation');
  assert.strictEqual(station.bandIndex, 4);
  assert.ok(station.orbitRadius > Math.max(...satellites.map((spec) => spec.orbitRadius)));
  assert.ok(station.speed < Math.min(...satellites.map((spec) => spec.speed)));
  assert.ok(station.size > Math.max(...satellites.map((spec) => spec.size)));
  assert.deepStrictEqual(station, earth.createSpaceStationSpec());
}
```

- [ ] **Step 2: Write the failing tangent-heading test**

Add:

```js
function testOrbitalHeadingFollowsTheTravelTangent() {
  const earth = require(scriptPath);
  const spec = earth.createSatelliteSpecs()[0];
  const elapsedSeconds = 7;
  const position = earth.getSatellitePosition(spec, elapsedSeconds);
  const nextPosition = earth.getSatellitePosition(spec, elapsedSeconds, 0.0001);
  const heading = earth.getOrbitalHeading(spec, elapsedSeconds);
  const forward = { x: Math.sin(heading), z: Math.cos(heading) };
  const travel = {
    x: nextPosition.x - position.x,
    z: nextPosition.z - position.z
  };

  assert.ok(forward.x * travel.x + forward.z * travel.z > 0);
}
```

Export and call both tests.

- [ ] **Step 3: Run the focused tests and verify RED**

```powershell
node -e "const t=require('./tests/homepage-earth-background.test.js'); t.testSpaceStationUsesAHighSlowOrbit(); t.testOrbitalHeadingFollowsTheTravelTangent();"
```

Expected: FAIL because `createSpaceStationSpec` is not exported or defined.

- [ ] **Step 4: Commit the failing specification tests**

```powershell
git add -- tests/homepage-earth-background.test.js
git commit -m "Test homepage earth orbital models"
```

- [ ] **Step 5: Add exact space-station configuration**

Add to `config`:

```js
    spaceStationOrbitRadius: 1.32,
    spaceStationSpeed: 0.08,
    spaceStationSize: 0.022,
```

- [ ] **Step 6: Mark ordinary specs and create the station spec**

Add `kind: 'satellite'` to each object produced by `createSatelliteSpecs`, then add:

```js
  function createSpaceStationSpec() {
    return {
      kind: 'spaceStation',
      bandIndex: config.orbitBandCount,
      orbitRadius: config.spaceStationOrbitRadius,
      speed: config.spaceStationSpeed,
      inclination: 0.68,
      ascendingNode: 0.74,
      phase: 1.25,
      size: config.spaceStationSize,
      opacity: 0.82,
      direction: 1
    };
  }
```

- [ ] **Step 7: Extract shared angle math and add heading**

Use:

```js
  function getOrbitalAngle(spec, elapsedSeconds, angleOffset = 0) {
    return spec.phase
      + elapsedSeconds * spec.speed * spec.direction
      + angleOffset;
  }

  function getSatellitePosition(spec, elapsedSeconds, angleOffset = 0) {
    const angle = getOrbitalAngle(spec, elapsedSeconds, angleOffset);
    const orbitRadius = spec.orbitRadius * 2;

    return {
      x: Math.cos(angle) * orbitRadius,
      y: 0,
      z: Math.sin(angle) * orbitRadius
    };
  }

  function getOrbitalHeading(spec, elapsedSeconds) {
    return -getOrbitalAngle(spec, elapsedSeconds);
  }
```

Export `createSpaceStationSpec` and `getOrbitalHeading`.

- [ ] **Step 8: Run the focused tests until GREEN**

Run the Step 3 command. Expected: exit code 0.

- [ ] **Step 9: Commit orbital specifications**

```powershell
git add -- js/homepage-earth.js
git commit -m "Add homepage earth space station orbit"
```

### Task 2: Build ordinary satellite and space-station models

**Files:**
- Modify: `tests/homepage-earth-background.test.js`
- Modify: `js/homepage-earth.js:395-418`

- [ ] **Step 1: Write failing model-composition tests**

Add:

```js
function testOrbitalModelsUseSelectedShapes() {
  const earth = require(scriptPath);
  const THREE = require(threePath);
  const satellite = earth.createSatelliteModel(THREE);
  const station = earth.createSpaceStationModel(THREE);
  const namedChildren = (group, name) => group.children.filter((child) => child.name === name);

  assert.strictEqual(satellite.name, 'satellite-model');
  assert.strictEqual(namedChildren(satellite, 'satellite-body').length, 1);
  assert.strictEqual(namedChildren(satellite, 'solar-panel').length, 2);
  namedChildren(satellite, 'solar-panel').forEach((panel) => {
    assert.strictEqual(panel.material.side, THREE.DoubleSide);
  });

  assert.strictEqual(station.name, 'space-station-model');
  assert.strictEqual(namedChildren(station, 'station-truss').length, 1);
  assert.ok(namedChildren(station, 'station-module').length >= 3);
  assert.strictEqual(namedChildren(station, 'solar-panel').length, 4);
  namedChildren(station, 'solar-panel').forEach((panel) => {
    assert.strictEqual(panel.material.side, THREE.DoubleSide);
  });
}
```

Export and call the test.

- [ ] **Step 2: Run the model test and verify RED**

```powershell
node -e "const t=require('./tests/homepage-earth-background.test.js'); t.testOrbitalModelsUseSelectedShapes();"
```

Expected: FAIL because `createSatelliteModel` is not defined.

- [ ] **Step 3: Add a small named-mesh helper**

Add before `autoInit`:

```js
  function createNamedMesh(THREE, name, geometry, material, position) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(position.x, position.y, position.z);
    return mesh;
  }
```

- [ ] **Step 4: Implement the selected A ordinary satellite**

Add:

```js
  function createSatelliteModel(THREE) {
    const model = new THREE.Group();
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x737c80 });
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: 0x6fa7bd,
      side: THREE.DoubleSide
    });

    model.name = 'satellite-model';
    model.add(createNamedMesh(
      THREE,
      'satellite-body',
      new THREE.BoxBufferGeometry(1.45, 1, 1),
      bodyMaterial,
      { x: 0, y: 0, z: 0 }
    ));
    model.add(createNamedMesh(
      THREE,
      'solar-panel',
      new THREE.BoxBufferGeometry(2.1, 0.12, 0.86),
      panelMaterial,
      { x: -1.9, y: 0, z: 0 }
    ));
    model.add(createNamedMesh(
      THREE,
      'solar-panel',
      new THREE.BoxBufferGeometry(2.1, 0.12, 0.86),
      panelMaterial,
      { x: 1.9, y: 0, z: 0 }
    ));

    return model;
  }
```

- [ ] **Step 5: Implement the selected A truss station**

Add:

```js
  function createSpaceStationModel(THREE) {
    const model = new THREE.Group();
    const trussMaterial = new THREE.MeshBasicMaterial({ color: 0x7d878c });
    const moduleMaterial = new THREE.MeshBasicMaterial({ color: 0xc4cbce });
    const centerMaterial = new THREE.MeshBasicMaterial({ color: 0x687277 });
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: 0x6fa7bd,
      side: THREE.DoubleSide
    });
    const truss = createNamedMesh(
      THREE,
      'station-truss',
      new THREE.BoxBufferGeometry(6.4, 0.18, 0.18),
      trussMaterial,
      { x: 0, y: 0, z: 0 }
    );

    model.name = 'space-station-model';
    model.add(truss);
    [-1.2, 0, 1.2].forEach((x, index) => {
      const module = createNamedMesh(
        THREE,
        'station-module',
        new THREE.CylinderBufferGeometry(0.52, 0.52, 1.35, 8),
        index === 1 ? centerMaterial : moduleMaterial,
        { x, y: 0, z: 0 }
      );
      module.rotation.z = Math.PI / 2;
      model.add(module);
    });
    [
      { x: -4, y: 0.85, z: 0 },
      { x: -4, y: -0.85, z: 0 },
      { x: 4, y: 0.85, z: 0 },
      { x: 4, y: -0.85, z: 0 }
    ].forEach((position) => {
      model.add(createNamedMesh(
        THREE,
        'solar-panel',
        new THREE.BoxBufferGeometry(2.4, 0.1, 1.05),
        panelMaterial,
        position
      ));
    });

    return model;
  }
```

- [ ] **Step 6: Export the two factories and run GREEN**

Export `createSatelliteModel` and `createSpaceStationModel`, then run the Step 2 command. Expected: exit code 0.

- [ ] **Step 7: Commit model factories**

```powershell
git add -- js/homepage-earth.js tests/homepage-earth-background.test.js
git commit -m "Build homepage earth orbital models"
```

### Task 3: Integrate models into animation and resource cleanup

**Files:**
- Modify: `tests/homepage-earth-background.test.js`
- Modify: `js/homepage-earth.js:440-688`

- [ ] **Step 1: Add a failing source-integration test**

Add:

```js
function testSceneBuildsAndOrientsOrbitalModels() {
  const script = readUtf8(scriptPath);

  assertIncludes(script, '...createSatelliteSpecs(),');
  assertIncludes(script, 'createSpaceStationSpec()');
  assertIncludes(script, "spec.kind === 'spaceStation'");
  assertIncludes(script, 'createSpaceStationModel(THREE)');
  assertIncludes(script, 'createSatelliteModel(THREE)');
  assertIncludes(script, 'orbital.rotation.y = getOrbitalHeading(spec, elapsedSeconds);');
  assert.ok(!script.includes('new THREE.SphereBufferGeometry(1, 8, 6)'));
}
```

Export and call the test.

- [ ] **Step 2: Run the integration test and verify RED**

```powershell
node -e "const t=require('./tests/homepage-earth-background.test.js'); t.testSceneBuildsAndOrientsOrbitalModels();"
```

Expected: FAIL because the scene still builds `satelliteGeometry` spheres.

- [ ] **Step 3: Remove the shared sphere resource exception**

Delete `satelliteGeometry`. In `clearGroup`, change the geometry condition to:

```js
          if (object.geometry) {
            object.geometry.dispose();
          }
```

- [ ] **Step 4: Build 14 satellites plus one station**

In `buildSatellites`, create specs with:

```js
      const orbitalSpecs = [
        ...createSatelliteSpecs(),
        createSpaceStationSpec()
      ];
```

For each spec, choose the model with:

```js
        const orbital = spec.kind === 'spaceStation'
          ? createSpaceStationModel(THREE)
          : createSatelliteModel(THREE);
```

Remove the old sphere material/mesh. Add the trail and `orbital` to the orbit plane, and store `{ orbitPlane, orbital, trail, spec }`. Set `orbital.scale.setScalar(spec.size)` once while building.

- [ ] **Step 5: Update position and tangent orientation each frame**

Change the update loop to:

```js
      satellites.forEach(({ orbital, trail, spec }) => {
        const position = getSatellitePosition(spec, elapsedSeconds);
        const trailPositions = createTrailPositions(spec, elapsedSeconds);
        const trailAttribute = trail.geometry.getAttribute('position');

        orbital.position.set(position.x, position.y, position.z);
        orbital.rotation.y = getOrbitalHeading(spec, elapsedSeconds);
        trailAttribute.array.set(trailPositions);
        trailAttribute.needsUpdate = true;
      });
```

- [ ] **Step 6: Run all focused orbital tests until GREEN**

```powershell
node -e "const t=require('./tests/homepage-earth-background.test.js'); t.testSatelliteSpecsStayWithinPlannedRanges(); t.testSpaceStationUsesAHighSlowOrbit(); t.testOrbitalHeadingFollowsTheTravelTangent(); t.testOrbitalModelsUseSelectedShapes(); t.testSceneBuildsAndOrientsOrbitalModels(); console.log('homepage earth orbital model tests passed');"
```

Expected output:

```text
homepage earth orbital model tests passed
```

- [ ] **Step 7: Commit scene integration**

```powershell
git add -- js/homepage-earth.js tests/homepage-earth-background.test.js
git commit -m "Animate homepage earth orbital models"
```

### Task 4: Verify visuals and regressions

**Files:**
- Verify: `index.html`
- Verify: `js/homepage-earth.js`
- Verify: `tests/homepage-earth-background.test.js`

- [ ] **Step 1: Open the homepage at 652 × 641**

Verify that ordinary satellites visibly read as one body plus two wings, the station reads as a larger truss with four panels, and both remain recognizable while crossing the front and side of the globe.

- [ ] **Step 2: Verify motion**

Confirm that models follow their orbit tangents, the station moves more slowly on the outer orbit, and all existing trails continue updating without jumps.

- [ ] **Step 3: Verify desktop and mobile layouts**

At desktop and mobile widths, confirm the station does not dominate the page, animations remain smooth, and there is no WebGL fallback, horizontal overflow, console warning, or console error.

- [ ] **Step 4: Run automated verification**

Run the focused orbital command again. Run all repository test files and record the two known unrelated baseline failures separately. Run `git diff --check`, confirm only the pre-existing `实况图片换封面/styles.css` remains modified, and ensure it was not staged or committed.

# Homepage Earth Color Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the globe fully rotating while making China visibly red at the limb and making the white-blue ocean layer clearly visible on the light homepage background.

**Architecture:** Retain the existing land/ocean radii and map geometry. Increase China point saturation, opacity, and size; increase ocean saturation and opacity; and assign every non-land candidate to the ocean layer instead of dropping half of them.

**Tech Stack:** Browser JavaScript, Three.js r128 point materials and vertex colors, Node.js `assert` tests, in-browser responsive visual verification.

---

## File structure

- Modify `js/homepage-earth.js`: tune point-layer configuration and switch ocean classification to full density.
- Modify `tests/homepage-earth-background.test.js`: lock the stronger colors, relative China size, and removal of ocean downsampling.

### Task 1: Write the high-contrast failing contract

**Files:**
- Modify: `tests/homepage-earth-background.test.js:101-111`
- Modify: `tests/homepage-earth-background.test.js:306-318`

- [ ] **Step 1: Update exact visual configuration assertions**

Replace the ocean and China style expectations with:

```js
  assert.strictEqual(earth.config.oceanPointSizePx, 1.05);
  assert.strictEqual(earth.config.oceanPointOpacity, 0.4);
  assert.strictEqual(earth.config.oceanWhiteColor, 0xd8f2ff);
  assert.strictEqual(earth.config.oceanBlueColor, 0x69b9d8);
  assert.strictEqual(earth.config.chinaPointColor, 0xd94f5c);
  assert.strictEqual(earth.config.chinaPointSizePx, 2.1);
  assert.ok(earth.config.chinaPointSizePx > earth.config.landPointSizePx);
  assert.strictEqual(earth.config.chinaPointOpacity, 0.9);
```

- [ ] **Step 2: Require full-density ocean generation**

Add these assertions to `testPointCloudRendersRaisedLandAndColoredOcean`:

```js
  assert.ok(!script.includes('index % 2'), 'ocean points should use every non-land candidate');
  assert.ok(
    /}\s*else\s*{\s*const coordinate = getGlobeCoordinate\(/s.test(script),
    'every remaining coordinate should enter the ocean layer'
  );
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
node -e "const t=require('./tests/homepage-earth-background.test.js'); t.testSceneMathAndResponsiveDefaults(); t.testPointCloudRendersRaisedLandAndColoredOcean();"
```

Expected: FAIL because `oceanPointOpacity` remains `0.22`.

- [ ] **Step 4: Commit the failing tests**

```powershell
git add -- tests/homepage-earth-background.test.js
git commit -m "Test stronger homepage earth colors"
```

### Task 2: Increase visible contrast without changing rotation

**Files:**
- Modify: `js/homepage-earth.js:33-44`
- Modify: `js/homepage-earth.js:497-519`
- Test: `tests/homepage-earth-background.test.js`

- [ ] **Step 1: Apply the approved color and size values**

Update only these configuration entries:

```js
    oceanPointOpacity: 0.4,
    oceanWhiteColor: 0xd8f2ff,
    oceanBlueColor: 0x69b9d8,
    chinaPointColor: 0xd94f5c,
    chinaPointSizePx: 2.1,
    chinaPointOpacity: 0.9
```

Keep `rotationSpeed`, radii, ordinary land styling, satellites, and page CSS unchanged.

- [ ] **Step 2: Generate an ocean point for every non-land candidate**

Replace:

```js
        } else if (index % 2 === 0) {
```

with:

```js
        } else {
```

Keep the deterministic `appendOceanColor(oceanColors, index)` call unchanged.

- [ ] **Step 3: Run the focused tests until GREEN**

Run:

```powershell
node -e "const t=require('./tests/homepage-earth-background.test.js'); t.testSceneMathAndResponsiveDefaults(); t.testPointCloudRendersRaisedLandAndColoredOcean(); console.log('homepage earth contrast tests passed');"
```

Expected output:

```text
homepage earth contrast tests passed
```

- [ ] **Step 4: Commit the implementation**

```powershell
git add -- js/homepage-earth.js
git commit -m "Increase homepage earth color contrast"
```

### Task 3: Verify the reported visual issue

**Files:**
- Verify: `index.html`
- Verify: `js/homepage-earth.js`

- [ ] **Step 1: Open the homepage at approximately 652 × 641**

Wait until China rotates toward the right-hand limb, matching the supplied screenshot. Verify that the red remains clearly visible instead of collapsing into a pale stripe.

- [ ] **Step 2: Verify the ocean on the real light background**

Confirm that white-blue ocean points are visible across open ocean areas, remain below the gray land layer, and do not turn the globe into a solid blue disk.

- [ ] **Step 3: Verify desktop and mobile safety signals**

At desktop and mobile widths, confirm no WebGL fallback, no horizontal overflow, no console warning/error, and smooth continued rotation.

- [ ] **Step 4: Run final automated checks**

Run the focused tests again, then run all repository test files and record the two known unrelated baseline failures separately. Run `git diff --check` and confirm `git status --short` is clean.

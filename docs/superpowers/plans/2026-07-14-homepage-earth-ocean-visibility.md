# Homepage Earth Ocean Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing full-density ocean point layer visibly white-blue on the homepage's light background without changing map geometry, rotation, or land styling.

**Architecture:** Keep the current ocean buffer and vertex-color interpolation. Change only the ocean point size, opacity, and gradient endpoints, then verify at the user's 652 × 641 browser viewport after the globe has rotated.

**Tech Stack:** Browser JavaScript, Three.js r128 point materials, Node.js `assert` tests, in-app browser visual verification.

---

### Task 1: Lock and implement the visible ocean styling

**Files:**
- Modify: `tests/homepage-earth-background.test.js:101-106`
- Modify: `js/homepage-earth.js:33-37`

- [ ] **Step 1: Write the failing expectations**

Use these exact assertions in `testSceneMathAndResponsiveDefaults`:

```js
  assert.strictEqual(earth.config.oceanPointSizePx, 1.4);
  assert.strictEqual(earth.config.oceanPointOpacity, 0.5);
  assert.strictEqual(earth.config.oceanWhiteColor, 0xcceeff);
  assert.strictEqual(earth.config.oceanBlueColor, 0x4fa6c8);
```

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
node -e "const t=require('./tests/homepage-earth-background.test.js'); t.testSceneMathAndResponsiveDefaults();"
```

Expected: FAIL because `oceanPointSizePx` is still `1.05`.

- [ ] **Step 3: Commit the failing test**

```powershell
git add -- tests/homepage-earth-background.test.js
git commit -m "Test visible homepage earth ocean"
```

- [ ] **Step 4: Apply the minimal configuration change**

Set:

```js
    oceanPointSizePx: 1.4,
    oceanPointOpacity: 0.5,
    oceanWhiteColor: 0xcceeff,
    oceanBlueColor: 0x4fa6c8,
```

Do not modify radii, point counts, interpolation math, land/China styles, rotation, satellites, or CSS.

- [ ] **Step 5: Run the focused tests until GREEN**

```powershell
node -e "const t=require('./tests/homepage-earth-background.test.js'); t.testSceneMathAndResponsiveDefaults(); t.testPointCloudRendersRaisedLandAndColoredOcean(); console.log('homepage earth ocean visibility tests passed');"
```

Expected output:

```text
homepage earth ocean visibility tests passed
```

- [ ] **Step 6: Commit the implementation**

```powershell
git add -- js/homepage-earth.js
git commit -m "Improve homepage earth ocean visibility"
```

### Task 2: Verify the reported viewport

**Files:**
- Verify: `index.html`
- Verify: `js/homepage-earth.js`

- [ ] **Step 1: Reload the existing local page at 652 × 641**

Wait approximately 12 seconds so China reaches a similar right-side position to the supplied screenshot.

- [ ] **Step 2: Inspect the visible result**

Confirm that China remains clearly red, ocean points show an unmistakable white-blue field between continents, gray land remains more prominent than ocean, and the globe does not become a solid blue disk.

- [ ] **Step 3: Check browser safety signals**

Confirm there is no WebGL fallback, horizontal overflow, console warning, or console error.

- [ ] **Step 4: Run final verification**

Rerun the focused tests, record existing unrelated full-suite failures separately, run `git diff --check`, and confirm `git status --short` is clean.

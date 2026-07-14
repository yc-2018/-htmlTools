# Salary Gap Clear and Reset Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add compact same-row clear and reset buttons that preserve the current lock/URL on clear and restore the product defaults plus URL on reset.

**Architecture:** Add both buttons to the existing salary title bar without creating another action row. Extend the injectable DOM controller with two event handlers that reuse `defaults`, `expenseState`, `renderLockState()`, and `renderAndSync()`. Keep calculation and URL modules unchanged.

**Tech Stack:** Semantic HTML5 buttons, native responsive CSS, vanilla JavaScript, Node `assert`, existing fake-DOM tests, Chrome/Edge browser verification.

---

## File map

- Modify `工资不止差一半计算器/app.js`: register button elements and implement clear/reset behavior.
- Modify `工资不止差一半计算器/index.html`: add the same-row title action group and responsive button styles.
- Modify `tests/salary-gap-calculator.test.js`: add controller interaction and static markup/style coverage.
- Verify `工资不止差一半计算器/calculator.js`: no change expected.

### Task 1: Controller clear and reset behavior

**Files:**
- Modify: `tests/salary-gap-calculator.test.js`
- Modify: `工资不止差一半计算器/app.js`

- [ ] **Step 1: Add button elements to the fake DOM and write the failing interaction test**

Add `clearButton` and `resetButton` to the `ids` array in `makeDocument()`:

```js
    'expenseLock',
    'clearButton',
    'resetButton',
    'lockText',
```

Add and call this test:

```js
function testClearAndResetButtons() {
  const doc = makeDocument();
  const navigation = makeNavigation(
    'https://example.test/tool?salaryA=7000&salaryB=13000&expenseA=2000&expenseB=3000&locked=0&campaign=demo#result'
  );

  app.initialize(doc, calculator, navigation);
  assert.strictEqual(navigation.replaceCalls.length, 1);
  assert.strictEqual(doc.elements.expenseLock.attributes['aria-pressed'], 'false');

  doc.elements.clearButton.dispatch('click');
  assert.strictEqual(doc.elements.salaryA.value, '');
  assert.strictEqual(doc.elements.salaryB.value, '');
  assert.strictEqual(doc.elements.expenseA.value, '');
  assert.strictEqual(doc.elements.expenseB.value, '');
  assert.strictEqual(doc.elements.expenseLock.attributes['aria-pressed'], 'false');
  assert.strictEqual(doc.elements.monthA.textContent, '—');
  assert.strictEqual(doc.elements.salaryLine.textContent, '请输入有效的非负金额');
  assert.strictEqual(navigation.replaceCalls.length, 1);

  doc.elements.resetButton.dispatch('click');
  assert.strictEqual(doc.elements.salaryA.value, '5000');
  assert.strictEqual(doc.elements.salaryB.value, '10000');
  assert.strictEqual(doc.elements.expenseA.value, '4000');
  assert.strictEqual(doc.elements.expenseB.value, '4000');
  assert.strictEqual(doc.elements.expenseLock.attributes['aria-pressed'], 'true');
  assert.strictEqual(doc.elements.monthA.textContent, '1,000');
  assert.strictEqual(doc.elements.monthB.textContent, '6,000');
  assert.strictEqual(doc.elements.ratioEmphasis.textContent, '6 倍');
  assert.strictEqual(navigation.replaceCalls.length, 2);
  assert.strictEqual(navigation.pushCalls.length, 0);

  const resetUrl = new URL(navigation.location.href);
  assert.strictEqual(resetUrl.searchParams.get('salaryA'), '5000');
  assert.strictEqual(resetUrl.searchParams.get('salaryB'), '10000');
  assert.strictEqual(resetUrl.searchParams.get('expenseA'), '4000');
  assert.strictEqual(resetUrl.searchParams.get('expenseB'), '4000');
  assert.strictEqual(resetUrl.searchParams.get('locked'), '1');
  assert.strictEqual(resetUrl.searchParams.get('campaign'), 'demo');
  assert.strictEqual(resetUrl.hash, '#result');
}
```

- [ ] **Step 2: Run and verify the missing-element failure**

Run: `node tests/salary-gap-calculator.test.js`

Expected: FAIL with `TypeError` when dispatching `clearButton`, because the controller does not yet resolve or bind the new buttons.

- [ ] **Step 3: Resolve the buttons and implement clear/reset handlers**

After the existing required-element check in `initialize()`, resolve the two action buttons separately so this intermediate controller commit remains compatible with the not-yet-updated HTML:

```js
elements.clearButton = doc.getElementById('clearButton');
elements.resetButton = doc.getElementById('resetButton');
```

Add these handlers inside `initialize()` after `renderAndSync()` is defined:

```js
function clearAllInputs() {
  elements.salaryA.value = '';
  elements.salaryB.value = '';
  expenseState.set('a', '');
  expenseState.set('b', '');
  renderLockState(expenseState.get());
  renderAndSync();
}

function resetAllInputs() {
  elements.salaryA.value = defaults.salaryA;
  elements.salaryB.value = defaults.salaryB;

  if (!expenseState.get().locked) {
    expenseState.toggle();
  }
  expenseState.set('a', defaults.expenseA);
  renderLockState(expenseState.get());
  renderAndSync();
}
```

Bind them only when present; Task 2 makes both elements part of the final page contract:

```js
if (elements.clearButton) {
  elements.clearButton.addEventListener('click', clearAllInputs);
}
if (elements.resetButton) {
  elements.resetButton.addEventListener('click', resetAllInputs);
}
```

Because clearing creates an invalid scenario, the existing `syncUrl()` guard leaves the previous valid URL untouched. Resetting produces a valid scenario and therefore writes the default URL through `replaceState`.

- [ ] **Step 4: Run tests and syntax checks**

```powershell
node tests/salary-gap-calculator.test.js
node --check '工资不止差一半计算器/app.js'
```

Expected: both commands exit `0`.

- [ ] **Step 5: Commit controller behavior**

```powershell
git add -- 'tests/salary-gap-calculator.test.js' '工资不止差一半计算器/app.js'
git commit -m 'Add salary calculator clear reset behavior'
```

### Task 2: Same-row responsive button layout

**Files:**
- Modify: `tests/salary-gap-calculator.test.js`
- Modify: `工资不止差一半计算器/index.html`

- [ ] **Step 1: Add a failing static page contract**

Extend `requiredParts` in `testPageContractAndHomepageEntry()` with:

```js
    'class="salary-title-row"',
    'class="title-actions" role="group" aria-label="输入操作"',
    'id="clearButton" type="button"',
    'id="resetButton" type="button"',
    '.salary-title-row {',
    '.utility-button {',
    'min-height: 40px',
```

Add a focused source assertion that mobile CSS never stacks the title action row:

```js
  assert.ok(
    /@media \(max-width: 640px\)[\s\S]*\.salary-title-row\s*\{[^}]*flex-wrap:\s*nowrap;/s.test(html),
    'mobile salary title and actions should remain on one row'
  );
```

- [ ] **Step 2: Run and verify the page-contract failure**

Run: `node tests/salary-gap-calculator.test.js`

Expected: FAIL with `page should include class="salary-title-row"`.

- [ ] **Step 3: Add semantic button markup**

Replace the salary heading content with:

```html
<div class="section-heading salary-section-heading">
  <div class="salary-title-row">
    <h2 id="salaryHeading">每月工资</h2>
    <div class="title-actions" role="group" aria-label="输入操作">
      <button class="utility-button utility-button-clear" id="clearButton" type="button">清空</button>
      <button class="utility-button utility-button-reset" id="resetButton" type="button">重置</button>
    </div>
  </div>
  <p class="section-note">甲乙工资各自独立</p>
</div>
```

- [ ] **Step 4: Add desktop and mobile styles**

Add the base styles near `.section-heading`:

```css
.salary-title-row {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
  min-width: 0;
}

.title-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 7px;
}

.utility-button {
  min-height: 40px;
  padding: 6px 14px;
  border: 1px solid #cdbdab;
  border-radius: 10px;
  color: var(--ink);
  background: var(--surface);
  font-size: 0.84rem;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}

.utility-button:hover {
  transform: translateY(-1px);
  border-color: var(--accent);
}

.utility-button:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
}

.utility-button-reset {
  color: #fff;
  border-color: var(--conclusion);
  background: var(--conclusion);
}
```

Inside `@media (max-width: 640px)`, add:

```css
.salary-section-heading {
  gap: 7px;
}

.salary-title-row {
  width: 100%;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 7px;
}

.title-actions {
  gap: 5px;
}

.utility-button {
  min-height: 40px;
  padding-inline: 10px;
  border-radius: 9px;
  font-size: 0.8rem;
}
```

This preserves one row for the title and buttons while the existing mobile `.section-heading` rule places only the explanatory note below it.

- [ ] **Step 5: Run the calculator test**

Run: `node tests/salary-gap-calculator.test.js`

Expected: PASS.

- [ ] **Step 6: Commit page layout**

```powershell
git add -- 'tests/salary-gap-calculator.test.js' '工资不止差一半计算器/index.html'
git commit -m 'Add clear reset button layout'
```

### Task 3: Browser verification and final gate

**Files:**
- Verify: `工资不止差一半计算器/index.html`
- Verify: `工资不止差一半计算器/app.js`
- Verify: `工资不止差一半计算器/calculator.js`
- Modify only after adding a failing regression assertion for any discovered defect.

- [ ] **Step 1: Start the local static server**

```powershell
& 'C:\Users\cgl\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 8765 --bind 127.0.0.1
```

- [ ] **Step 2: Verify desktop placement and behavior**

Open a custom unlocked share URL and verify:

- “每月工资 / 清空 / 重置” share the same visual row.
- Clicking clear empties all four inputs, keeps the lock open, displays `—`, and leaves the URL unchanged.
- Clicking reset restores `5000 / 10000 / 4000 / 4000`, locks expenses, restores `6 倍`, and updates the URL while preserving unknown parameters and hash.
- Both buttons are reachable by keyboard and show a focus ring.
- Console error/warning count is zero.

- [ ] **Step 3: Verify phone and narrow viewports**

At `390×844` and `320px` width, verify:

- The title and both buttons remain on one row.
- The explanatory note may occupy the next line.
- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
- Both button heights are at least `40px`, text is not clipped, and controls do not overlap.

- [ ] **Step 4: Add a failing regression test before any browser fix**

For any browser-discovered defect, first add the smallest failing assertion to `tests/salary-gap-calculator.test.js`, run it to observe the expected failure, implement the minimum fix, then rerun to green.

- [ ] **Step 5: Run the final verification suite**

```powershell
node tests/salary-gap-calculator.test.js
node tests/live-photo-cover-tool.test.js
node tests/self-contained-codemirror.test.js
node tests/simulated-windows-update.test.js
node tests/yaml-properties-converter.test.js
node --check '工资不止差一半计算器/app.js'
git diff --check
git -c core.quotepath=false status --short
```

Expected: all listed tests and syntax checks pass, no calculator changes remain unstaged, and no new console errors appear. The two previously approved unrelated baseline failures remain outside this command list.

- [ ] **Step 6: Commit only a browser-proven fix if needed**

If Step 4 changed files, stage only the regression test and affected calculator files, then commit:

```powershell
git commit -m 'Fix salary calculator button responsiveness'
```

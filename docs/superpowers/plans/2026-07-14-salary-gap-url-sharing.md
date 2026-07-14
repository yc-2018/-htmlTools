# Salary Gap URL Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore calculator inputs from readable URL parameters and keep every valid state shareable through `history.replaceState` without creating per-keystroke history entries.

**Architecture:** Extend the existing expense-link model to accept an initial lock state. Add pure URL parsing/building helpers to `app.js`, then inject a small `{ location, history }` environment into the DOM controller so URL behavior is testable without a browser. Keep markup and visuals unchanged.

**Tech Stack:** Vanilla JavaScript, browser `URL`/`URLSearchParams`/History APIs, Node `assert`, existing fake-DOM tests, Chrome/Edge browser verification.

---

## File map

- Modify `工资不止差一半计算器/calculator.js`: accept and normalize an initial expense-lock state.
- Modify `工资不止差一半计算器/app.js`: parse parameters, construct share URLs, restore state, and call `replaceState` after valid changes.
- Modify `tests/salary-gap-calculator.test.js`: add pure URL and controller integration coverage.
- Verify `工资不止差一半计算器/index.html`: no markup change expected.

### Task 1: Initial expense lock state

**Files:**
- Modify: `tests/salary-gap-calculator.test.js`
- Modify: `工资不止差一半计算器/calculator.js`

- [ ] **Step 1: Add a failing lock-initialization test**

Extend `testExpenseLinkState()` with explicit locked and unlocked initialization:

```js
  const unlocked = calculator.createExpenseLinkState('4200', '2600', false);
  assert.deepStrictEqual(unlocked.get(), {
    locked: false,
    a: '4200',
    b: '2600'
  });

  const locked = calculator.createExpenseLinkState('4200', '2600', true);
  assert.deepStrictEqual(locked.get(), {
    locked: true,
    a: '4200',
    b: '4200'
  });
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node tests/salary-gap-calculator.test.js`

Expected: FAIL because the current constructor always initializes `locked: true` and does not preserve different unlocked expenses.

- [ ] **Step 3: Implement the initial lock argument**

Change the function signature and initialization in `calculator.js`:

```js
function createExpenseLinkState(initialA, initialB, initialLocked = true) {
  let a = String(initialA);
  let b = String(initialB);
  let locked = Boolean(initialLocked);

  if (locked) {
    b = a;
  }
```

Keep existing `set()`, `toggle()`, and `get()` behavior unchanged.

- [ ] **Step 4: Run the calculator test**

Run: `node tests/salary-gap-calculator.test.js`

Expected: PASS with `salary gap calculator tests passed`.

- [ ] **Step 5: Commit the lock-state extension**

```powershell
git add -- 'tests/salary-gap-calculator.test.js' '工资不止差一半计算器/calculator.js'
git commit -m 'Support initial expense lock state'
```

### Task 2: Pure URL state helpers

**Files:**
- Modify: `tests/salary-gap-calculator.test.js`
- Modify: `工资不止差一半计算器/app.js`

- [ ] **Step 1: Add failing URL parser and builder tests**

Require `app.js` once near the existing calculator require, remove the local require inside `testLiveControllerAndExpenseLock()`, and add:

```js
const app = require(appPath);

function testUrlStateParsingAndBuilding() {
  const defaults = {
    salaryA: '5000',
    salaryB: '10000',
    expenseA: '4000',
    expenseB: '4000',
    locked: true
  };

  assert.deepStrictEqual(
    app.parseUrlState(
      'https://example.test/tool?salaryA=6200.5&salaryB=13000&expenseA=3000&expenseB=2800&locked=0',
      defaults,
      calculator
    ),
    {
      salaryA: '6200.5',
      salaryB: '13000',
      expenseA: '3000',
      expenseB: '2800',
      locked: false
    }
  );

  assert.deepStrictEqual(
    app.parseUrlState(
      'https://example.test/tool?salaryA=bad&salaryB=12000&expenseA=1.234&locked=other',
      defaults,
      calculator
    ),
    {
      salaryA: '5000',
      salaryB: '12000',
      expenseA: '4000',
      expenseB: '4000',
      locked: true
    }
  );

  const shareUrl = new URL(app.buildShareUrl(
    'https://example.test/tool?campaign=demo#result',
    {
      salaryA: '6200.5',
      salaryB: '13000',
      expenseA: '3000',
      expenseB: '2800',
      locked: false
    }
  ));
  assert.strictEqual(shareUrl.searchParams.get('salaryA'), '6200.5');
  assert.strictEqual(shareUrl.searchParams.get('salaryB'), '13000');
  assert.strictEqual(shareUrl.searchParams.get('expenseA'), '3000');
  assert.strictEqual(shareUrl.searchParams.get('expenseB'), '2800');
  assert.strictEqual(shareUrl.searchParams.get('locked'), '0');
  assert.strictEqual(shareUrl.searchParams.get('campaign'), 'demo');
  assert.strictEqual(shareUrl.hash, '#result');
}
```

Call `testUrlStateParsingAndBuilding()` from `run()` before the controller test.

- [ ] **Step 2: Run and verify the missing-helper failure**

Run: `node tests/salary-gap-calculator.test.js`

Expected: FAIL with `TypeError: app.parseUrlState is not a function`.

- [ ] **Step 3: Implement and export the pure URL helpers**

Add these functions inside the `app.js` factory:

```js
const urlMoneyKeys = ['salaryA', 'salaryB', 'expenseA', 'expenseB'];

function parseUrlState(urlLike, defaults, calculator) {
  const url = new URL(urlLike, 'http://localhost/');
  const state = { ...defaults };

  urlMoneyKeys.forEach((key) => {
    const rawValue = url.searchParams.get(key);
    if (rawValue !== null && calculator.parseMoney(rawValue) !== null) {
      state[key] = rawValue;
    }
  });

  const lockedValue = url.searchParams.get('locked');
  if (lockedValue === '0' || lockedValue === '1') {
    state.locked = lockedValue === '1';
  }
  return state;
}

function buildShareUrl(urlLike, state) {
  const url = new URL(urlLike, 'http://localhost/');
  urlMoneyKeys.forEach((key) => {
    url.searchParams.set(key, state[key]);
  });
  url.searchParams.set('locked', state.locked ? '1' : '0');
  return url.href;
}
```

Export `parseUrlState` and `buildShareUrl` alongside `initialize`.

- [ ] **Step 4: Run all calculator tests**

Run: `node tests/salary-gap-calculator.test.js`

Expected: PASS with preservation of unknown parameters and hash.

- [ ] **Step 5: Commit the URL helpers**

```powershell
git add -- 'tests/salary-gap-calculator.test.js' '工资不止差一半计算器/app.js'
git commit -m 'Add salary calculator URL state helpers'
```

### Task 3: Controller restoration and replaceState synchronization

**Files:**
- Modify: `tests/salary-gap-calculator.test.js`
- Modify: `工资不止差一半计算器/app.js`

- [ ] **Step 1: Extend the fake environment and write a failing integration test**

Add `getAttribute()` to `makeElement()` and a controlled navigation helper:

```js
    getAttribute(name) {
      return this.attributes[name] || null;
    },
```

```js
function makeNavigation(href) {
  const location = { href };
  const replaceCalls = [];
  const pushCalls = [];
  return {
    location,
    history: {
      replaceState(state, title, nextUrl) {
        replaceCalls.push(nextUrl);
        location.href = nextUrl;
      },
      pushState(state, title, nextUrl) {
        pushCalls.push(nextUrl);
      }
    },
    replaceCalls,
    pushCalls
  };
}
```

Add and call this test:

```js
function testControllerRestoresAndSynchronizesUrlState() {
  const doc = makeDocument();
  const navigation = makeNavigation(
    'https://example.test/tool?salaryA=6000&salaryB=12000&expenseA=2500&expenseB=1800&locked=0&campaign=demo#result'
  );

  app.initialize(doc, calculator, navigation);
  assert.strictEqual(doc.elements.salaryA.value, '6000');
  assert.strictEqual(doc.elements.salaryB.value, '12000');
  assert.strictEqual(doc.elements.expenseA.value, '2500');
  assert.strictEqual(doc.elements.expenseB.value, '1800');
  assert.strictEqual(doc.elements.expenseLock.attributes['aria-pressed'], 'false');
  assert.strictEqual(navigation.replaceCalls.length, 1);
  assert.strictEqual(navigation.pushCalls.length, 0);

  doc.elements.salaryA.value = '7000';
  doc.elements.salaryA.dispatch('input');
  assert.strictEqual(
    new URL(navigation.location.href).searchParams.get('salaryA'),
    '7000'
  );
  assert.strictEqual(navigation.replaceCalls.length, 2);

  doc.elements.salaryA.value = '';
  doc.elements.salaryA.dispatch('input');
  assert.strictEqual(navigation.replaceCalls.length, 2);

  doc.elements.salaryA.value = '7200';
  doc.elements.salaryA.dispatch('input');
  assert.strictEqual(navigation.replaceCalls.length, 3);

  doc.elements.expenseLock.dispatch('click');
  const lockedUrl = new URL(navigation.location.href);
  assert.strictEqual(doc.elements.expenseB.value, '2500');
  assert.strictEqual(lockedUrl.searchParams.get('expenseB'), '2500');
  assert.strictEqual(lockedUrl.searchParams.get('locked'), '1');
  assert.strictEqual(lockedUrl.searchParams.get('campaign'), 'demo');
  assert.strictEqual(lockedUrl.hash, '#result');
  assert.strictEqual(navigation.pushCalls.length, 0);

  const lockedDoc = makeDocument();
  const lockedNavigation = makeNavigation(
    'https://example.test/tool?expenseA=3200&expenseB=900&locked=1'
  );
  app.initialize(lockedDoc, calculator, lockedNavigation);
  assert.strictEqual(lockedDoc.elements.expenseA.value, '3200');
  assert.strictEqual(lockedDoc.elements.expenseB.value, '3200');
  assert.strictEqual(
    lockedDoc.elements.expenseLock.attributes['aria-pressed'],
    'true'
  );
}
```

- [ ] **Step 2: Run and verify URL restoration fails**

Run: `node tests/salary-gap-calculator.test.js`

Expected: FAIL because `initialize()` still ignores its navigation argument and leaves HTML defaults unchanged.

- [ ] **Step 3: Inject navigation and synchronize valid state**

Update the browser auto-start call:

```js
api.initialize(root.document, root.SalaryGapCalculator, {
  location: root.location,
  history: root.history
});
```

Update `initialize(doc, calculator, navigation = {})` to:

1. Read current HTML defaults.
2. If `navigation.location.href` exists, call `parseUrlState()` and assign salaries before creating expense state.
3. Create `expenseState` with the parsed `locked` value and render the normalized expenses.
4. Make `render()` return its scenario result.
5. Add `syncUrl(result)` which returns without writing when the scenario is invalid or `history.replaceState` is unavailable.
6. Build the URL from the four current input strings plus `expenseState.get().locked`, then call `history.replaceState(null, '', nextUrl)`.
7. Replace direct salary `render` listeners with `renderAndSync`, call the same function after expense events and lock toggles, and call it once after initialization.

Use this exact write guard:

```js
function syncUrl(result) {
  if (
    !result.valid
    || !navigation.location
    || !navigation.location.href
    || !navigation.history
    || typeof navigation.history.replaceState !== 'function'
  ) {
    return;
  }

  const lockState = expenseState.get();
  const nextUrl = buildShareUrl(navigation.location.href, {
    salaryA: elements.salaryA.value,
    salaryB: elements.salaryB.value,
    expenseA: elements.expenseA.value,
    expenseB: elements.expenseB.value,
    locked: lockState.locked
  });
  navigation.history.replaceState(null, '', nextUrl);
}
```

Do not call `pushState` anywhere.

- [ ] **Step 4: Run calculator tests and syntax checks**

```powershell
node tests/salary-gap-calculator.test.js
node --check '工资不止差一半计算器/calculator.js'
node --check '工资不止差一半计算器/app.js'
```

Expected: all commands exit `0`.

- [ ] **Step 5: Commit controller URL synchronization**

```powershell
git add -- 'tests/salary-gap-calculator.test.js' '工资不止差一半计算器/app.js'
git commit -m 'Synchronize salary calculator state with URL'
```

### Task 4: Browser sharing verification and final gate

**Files:**
- Verify: `工资不止差一半计算器/index.html`
- Verify: `工资不止差一半计算器/app.js`
- Verify: `工资不止差一半计算器/calculator.js`
- Modify only after adding a failing regression assertion for any discovered defect.

- [ ] **Step 1: Start the local static server**

```powershell
& 'C:\Users\cgl\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 8765 --bind 127.0.0.1
```

- [ ] **Step 2: Open a parameterized URL and verify restoration**

Open:

```text
http://127.0.0.1:8765/工资不止差一半计算器/?salaryA=7000&salaryB=14000&expenseA=3000&expenseB=5000&locked=0&campaign=demo#result
```

Verify inputs restore to `7000 / 14000 / 3000 / 5000`, the lock is open, results are `4000 / 9000` per month, `campaign=demo` and `#result` remain, and console error/warning count is zero.

- [ ] **Step 3: Verify live replaceState behavior**

- Record `history.length` and the current URL.
- Change `salaryA` to `8000`; verify only `salaryA=8000` changes and `history.length` stays constant.
- Clear `salaryA`; verify the UI becomes invalid while the URL remains at `salaryA=8000`.
- Enter `8200`; verify the URL resumes at `salaryA=8200`.
- Lock expenses; verify both expenses become `3000`, `expenseB=3000`, and `locked=1`.
- Copy the normalized URL into a second tab and verify it restores the same values, lock state, and results.

- [ ] **Step 4: Add a failing regression test before any browser fix**

For a browser-discovered defect, first add the smallest failing assertion to `tests/salary-gap-calculator.test.js`, run it to observe the expected failure, implement the minimum fix, then rerun to green.

- [ ] **Step 5: Run the final verification suite**

```powershell
node tests/salary-gap-calculator.test.js
node tests/live-photo-cover-tool.test.js
node tests/self-contained-codemirror.test.js
node tests/simulated-windows-update.test.js
node tests/yaml-properties-converter.test.js
git diff --check
git -c core.quotepath=false status --short
```

Expected: all listed tests pass, no calculator changes remain unstaged, and no new console errors appear. The two previously approved unrelated baseline failures remain outside this command list.

- [ ] **Step 6: Commit only a browser-proven fix if needed**

If Step 4 changed files, stage only its regression test and affected calculator file, then commit:

```powershell
git commit -m 'Fix salary calculator URL sharing behavior'
```

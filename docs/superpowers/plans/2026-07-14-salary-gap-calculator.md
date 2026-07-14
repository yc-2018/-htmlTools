# Salary Gap Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive native HTML calculator that compares gross salary multiples with disposable-income multiples and supports a lockable pair of monthly-expense inputs.

**Architecture:** Keep arithmetic, comparison wording, formatting, and expense-link state in a browser/CommonJS-compatible `calculator.js` module. Keep DOM wiring in a small `app.js` module that accepts `document` and the calculation core, allowing interaction tests with a lightweight fake document. Put semantic markup and responsive CSS in a standalone `index.html`, then add one homepage link.

**Tech Stack:** HTML5, native CSS, vanilla JavaScript, CommonJS-compatible modules, Node `assert`, repository-style direct Node tests, Chrome/Edge browser verification.

---

## File map

- Create `工资不止差一半计算器/calculator.js`: pure validation, calculations, ratios, conclusion text, currency formatting, and lock-state model.
- Create `工资不止差一半计算器/app.js`: DOM lookup, event binding, lock-state rendering, and live result rendering.
- Create `工资不止差一半计算器/index.html`: semantic calculator markup, inline SVG lock icons, and all responsive styles.
- Create `tests/salary-gap-calculator.test.js`: unit, interaction, and static page-contract tests.
- Modify `index.html`: add a single “工资不止差一半计算器” link under “生活与计算”.

### Task 1: Calculation and validation core

**Files:**
- Create: `tests/salary-gap-calculator.test.js`
- Create: `工资不止差一半计算器/calculator.js`

- [ ] **Step 1: Write the failing core test**

Create `tests/salary-gap-calculator.test.js` with repository-style direct assertions. The initial file must check existence before requiring the not-yet-created module so the failure is an intentional assertion rather than an unrelated stack trace:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const toolRoot = path.join(repoRoot, '工资不止差一半计算器');
const corePath = path.join(toolRoot, 'calculator.js');

assert.ok(fs.existsSync(corePath), 'calculator.js should exist');
const calculator = require(corePath);

function testDefaultScenario() {
  const result = calculator.calculateScenario({
    salaryA: '5000',
    salaryB: '10000',
    expenseA: '4000',
    expenseB: '4000'
  });

  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(result.people.a, {
    name: '甲', salary: 5000, expense: 4000,
    month: 1000, year: 12000, decade: 120000
  });
  assert.deepStrictEqual(result.people.b, {
    name: '乙', salary: 10000, expense: 4000,
    month: 6000, year: 72000, decade: 720000
  });
}

function testMoneyValidation() {
  assert.strictEqual(calculator.parseMoney('0'), 0);
  assert.strictEqual(calculator.parseMoney('12.34'), 12.34);
  ['', '-1', '12.345', 'abc', 'Infinity'].forEach((value) => {
    assert.strictEqual(calculator.parseMoney(value), null);
  });

  const result = calculator.calculateScenario({
    salaryA: '', salaryB: '10000', expenseA: '4000', expenseB: '4000'
  });
  assert.deepStrictEqual(result, { valid: false, error: '请输入有效的非负金额' });

  const decimalResult = calculator.calculateScenario({
    salaryA: '5000.50', salaryB: '10000', expenseA: '4000.25', expenseB: '4000'
  });
  assert.strictEqual(decimalResult.people.a.month, 1000.25);
  assert.strictEqual(decimalResult.people.a.year, 12003);
  assert.strictEqual(decimalResult.people.a.decade, 120030);
}

function run() {
  testDefaultScenario();
  testMoneyValidation();
  console.log('salary gap calculator tests passed');
}

if (require.main === module) {
  run();
}
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `node tests/salary-gap-calculator.test.js`

Expected: FAIL with `AssertionError: calculator.js should exist`.

- [ ] **Step 3: Implement the minimal calculation core**

Create `工资不止差一半计算器/calculator.js` as a UMD-style module so the same functions work through `require()` and `window.SalaryGapCalculator`:

```js
(function initCalculator(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SalaryGapCalculator = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createCalculator() {
  function parseMoney(rawValue) {
    const text = String(rawValue).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
      return null;
    }
    const value = Number(text);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function calculatePerson(name, salary, expense) {
    const month = salary - expense;
    return {
      name,
      salary,
      expense,
      month,
      year: month * 12,
      decade: month * 120
    };
  }

  function calculateScenario(raw) {
    const values = {
      salaryA: parseMoney(raw.salaryA),
      salaryB: parseMoney(raw.salaryB),
      expenseA: parseMoney(raw.expenseA),
      expenseB: parseMoney(raw.expenseB)
    };
    if (Object.values(values).some((value) => value === null)) {
      return { valid: false, error: '请输入有效的非负金额' };
    }
    return {
      valid: true,
      people: {
        a: calculatePerson('甲', values.salaryA, values.expenseA),
        b: calculatePerson('乙', values.salaryB, values.expenseB)
      }
    };
  }

  return { parseMoney, calculateScenario };
}));
```

- [ ] **Step 4: Run the core test and verify it passes**

Run: `node tests/salary-gap-calculator.test.js`

Expected: PASS with `salary gap calculator tests passed`.

- [ ] **Step 5: Commit the calculation core**

Run:

```powershell
git add -- 'tests/salary-gap-calculator.test.js' '工资不止差一半计算器/calculator.js'
git commit -m 'Add salary gap calculation core'
```

Expected: one commit containing only the two listed files; `js/homepage-earth.js` remains unstaged.

### Task 2: Ratios, conclusion wording, formatting, and link state

**Files:**
- Modify: `tests/salary-gap-calculator.test.js`
- Modify: `工资不止差一半计算器/calculator.js`

- [ ] **Step 1: Add failing tests for comparison branches and the expense lock**

Add these tests before `run()`, then call them from `run()`:

```js
function testDefaultComparisonAndFormatting() {
  const result = calculator.calculateScenario({
    salaryA: '5000', salaryB: '10000', expenseA: '4000', expenseB: '4000'
  });
  const conclusion = calculator.buildConclusion(result);

  assert.strictEqual(result.salaryComparison.ratio, 2);
  assert.strictEqual(result.remainingComparison.ratio, 6);
  assert.deepStrictEqual(conclusion, {
    kind: 'ratio',
    salaryLine: '你以为乙的工资是甲的 2 倍？',
    factPrefix: '可事实却是',
    emphasis: '6 倍',
    factSuffix: ''
  });
  assert.strictEqual(calculator.formatMoney(123456.5), '123,456.5');
  assert.strictEqual(calculator.formatRatio(2.50), '2');
}

function testComparisonEdgeCases() {
  const equalSalary = calculator.calculateScenario({
    salaryA: '5000', salaryB: '5000', expenseA: '3000', expenseB: '4000'
  });
  assert.strictEqual(
    calculator.buildConclusion(equalSalary).salaryLine,
    '两人的工资相同'
  );

  const zeroSalary = calculator.calculateScenario({
    salaryA: '0', salaryB: '5000', expenseA: '0', expenseB: '1000'
  });
  assert.strictEqual(
    calculator.buildConclusion(zeroSalary).salaryLine,
    '乙的工资更高，但工资倍数无法计算'
  );

  const equalRemaining = calculator.calculateScenario({
    salaryA: '5000', salaryB: '6000', expenseA: '1000', expenseB: '2000'
  });
  assert.strictEqual(
    calculator.buildConclusion(equalRemaining).factPrefix,
    '两人的可支配金额相同'
  );

  const reversed = calculator.calculateScenario({
    salaryA: '5000', salaryB: '10000', expenseA: '0', expenseB: '9000'
  });
  assert.deepStrictEqual(calculator.buildConclusion(reversed), {
    kind: 'ratio',
    salaryLine: '你以为乙的工资是甲的 2 倍？',
    factPrefix: '可扣除花销后，甲反而是乙的',
    emphasis: '5 倍',
    factSuffix: ''
  });

  const insolvent = calculator.calculateScenario({
    salaryA: '4000', salaryB: '10000', expenseA: '4000', expenseB: '4000'
  });
  assert.strictEqual(calculator.buildConclusion(insolvent).kind, 'insolvent');
  assert.strictEqual(
    calculator.buildConclusion(insolvent).factPrefix,
    '甲已入不敷出，无法用倍数衡量'
  );
}

function testExpenseLinkState() {
  const state = calculator.createExpenseLinkState('4000', '4000');
  state.set('b', '4500');
  assert.deepStrictEqual(state.get(), { locked: true, a: '4500', b: '4500' });
  state.toggle();
  state.set('b', '3000');
  assert.deepStrictEqual(state.get(), { locked: false, a: '4500', b: '3000' });
  state.toggle();
  assert.deepStrictEqual(state.get(), { locked: true, a: '4500', b: '4500' });
}
```

- [ ] **Step 2: Run and verify the new tests fail for missing APIs**

Run: `node tests/salary-gap-calculator.test.js`

Expected: FAIL because `calculator.buildConclusion` is not defined.

- [ ] **Step 3: Implement comparison helpers and lock-state behavior**

Add `compareValues`, `formatMoney`, `formatRatio`, `buildConclusion`, and `createExpenseLinkState` inside the factory. Update `calculateScenario()` to attach `salaryComparison` and `remainingComparison`, and export all public helpers.

The comparison helper must return `{ status: 'equal' }`, `{ status: 'unavailable' }`, or `{ status: 'ratio', higher, lower, ratio }`. `buildConclusion()` must produce exactly the objects asserted above, plus `{ kind: 'invalid', salaryLine: '请输入有效的非负金额', factPrefix: '', emphasis: '', factSuffix: '' }` for invalid scenarios. When the lower salary is zero, use `${higher.name}的工资更高，但工资倍数无法计算`. When both positive remainders are equal, return a fact prefix of `两人的可支配金额相同` and no emphasis. When either remainder is non-positive, include the affected person name or `两人` in the insolvency message.

Implement the lock state with string values so temporarily invalid or empty input is mirrored exactly while locked:

```js
function createExpenseLinkState(initialA, initialB) {
  let a = String(initialA);
  let b = String(initialB);
  let locked = true;
  return {
    get() {
      return { locked, a, b };
    },
    set(side, value) {
      const next = String(value);
      if (side === 'a') a = next;
      if (side === 'b') b = next;
      if (locked) {
        a = next;
        b = next;
      }
      return this.get();
    },
    toggle() {
      locked = !locked;
      if (locked) b = a;
      return this.get();
    }
  };
}
```

- [ ] **Step 4: Run all salary calculator tests**

Run: `node tests/salary-gap-calculator.test.js`

Expected: PASS with no warnings, `NaN`, or `Infinity` output.

- [ ] **Step 5: Commit comparison and lock behavior**

Run:

```powershell
git add -- 'tests/salary-gap-calculator.test.js' '工资不止差一半计算器/calculator.js'
git commit -m 'Add salary comparison and expense linking'
```

### Task 3: Testable live DOM controller

**Files:**
- Modify: `tests/salary-gap-calculator.test.js`
- Create: `工资不止差一半计算器/app.js`

- [ ] **Step 1: Write a failing controller interaction test**

Add `appPath`, a fake element/document helper, and this test. Each fake element stores listeners by event name and exposes `dispatch(type)` so the real controller callbacks execute:

```js
const appPath = path.join(toolRoot, 'app.js');

function makeElement(value = '') {
  const listeners = {};
  return {
    value,
    textContent: '',
    hidden: false,
    attributes: {},
    classList: { toggle() {} },
    addEventListener(type, listener) { listeners[type] = listener; },
    setAttribute(name, nextValue) { this.attributes[name] = String(nextValue); },
    dispatch(type) { listeners[type]({ target: this }); }
  };
}

function makeDocument() {
  const values = {
    salaryA: '5000', salaryB: '10000', expenseA: '4000', expenseB: '4000'
  };
  const ids = [
    'salaryA', 'salaryB', 'expenseA', 'expenseB', 'expenseLock', 'lockText',
    'monthA', 'monthB', 'yearA', 'yearB', 'decadeA', 'decadeB',
    'statusA', 'statusB', 'salaryLine', 'factPrefix', 'ratioEmphasis', 'factSuffix'
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, makeElement(values[id] || '')]));
  return {
    elements,
    getElementById(id) { return elements[id]; }
  };
}

function testLiveControllerAndExpenseLock() {
  assert.ok(fs.existsSync(appPath), 'app.js should exist');
  const app = require(appPath);
  const doc = makeDocument();
  app.initialize(doc, calculator);

  assert.strictEqual(doc.elements.monthA.textContent, '1,000');
  assert.strictEqual(doc.elements.monthB.textContent, '6,000');
  assert.strictEqual(doc.elements.ratioEmphasis.textContent, '6 倍');
  assert.strictEqual(doc.elements.expenseLock.attributes['aria-pressed'], 'true');

  doc.elements.expenseB.value = '4500';
  doc.elements.expenseB.dispatch('input');
  assert.strictEqual(doc.elements.expenseA.value, '4500');

  doc.elements.expenseLock.dispatch('click');
  doc.elements.expenseB.value = '3000';
  doc.elements.expenseB.dispatch('input');
  assert.strictEqual(doc.elements.expenseA.value, '4500');

  doc.elements.expenseLock.dispatch('click');
  assert.strictEqual(doc.elements.expenseB.value, '4500');
  assert.strictEqual(doc.elements.expenseLock.attributes['aria-pressed'], 'true');
}
```

- [ ] **Step 2: Run and verify the controller test fails**

Run: `node tests/salary-gap-calculator.test.js`

Expected: FAIL with `AssertionError: app.js should exist`.

- [ ] **Step 3: Implement `app.js`**

Use the same UMD export pattern and expose one `initialize(doc, calculator)` function. The function must:

1. Resolve every ID listed in `makeDocument()` exactly once.
2. Create expense state from the two expense inputs.
3. Bind `input` listeners to both salaries and expenses.
4. Bind a `click` listener to `expenseLock`.
5. Mirror expense strings through `createExpenseLinkState`, updating both input values after each expense event and after relocking.
6. Set `aria-pressed`, `aria-label`, `lockText`, and a `data-locked` attribute on every lock transition.
7. Render `—` and the validation message for invalid input.
8. Render all six formatted amounts, insolvency status labels, and the four conclusion fields for valid input.
9. Auto-initialize on `DOMContentLoaded` in browsers, while exporting without touching `document` in Node.

Use this exact render mapping:

```js
const periodFields = [
  ['month', elements.monthA, elements.monthB],
  ['year', elements.yearA, elements.yearB],
  ['decade', elements.decadeA, elements.decadeB]
];

periodFields.forEach(([period, fieldA, fieldB]) => {
  fieldA.textContent = calculator.formatMoney(result.people.a[period]);
  fieldB.textContent = calculator.formatMoney(result.people.b[period]);
});
elements.statusA.textContent = result.people.a.month <= 0 ? '已入不敷出' : '';
elements.statusB.textContent = result.people.b.month <= 0 ? '已入不敷出' : '';
```

- [ ] **Step 4: Run the controller and core tests**

Run: `node tests/salary-gap-calculator.test.js`

Expected: PASS with `salary gap calculator tests passed`.

- [ ] **Step 5: Commit the DOM controller**

Run:

```powershell
git add -- 'tests/salary-gap-calculator.test.js' '工资不止差一半计算器/app.js'
git commit -m 'Add live salary calculator interactions'
```

### Task 4: Responsive page and homepage entry

**Files:**
- Modify: `tests/salary-gap-calculator.test.js`
- Create: `工资不止差一半计算器/index.html`
- Modify: `index.html:66-74`

- [ ] **Step 1: Write the failing page-contract test**

Add these paths and assertions, and call the test from `run()`:

```js
const pagePath = path.join(toolRoot, 'index.html');
const homepagePath = path.join(repoRoot, 'index.html');

function testPageContractAndHomepageEntry() {
  assert.ok(fs.existsSync(pagePath), 'calculator page should exist');
  const html = fs.readFileSync(pagePath, 'utf8');
  const homepage = fs.readFileSync(homepagePath, 'utf8');

  [
    'id="salaryA"', 'id="salaryB"', 'id="expenseA"', 'id="expenseB"',
    'id="expenseLock"', 'aria-pressed="true"', 'id="monthA"', 'id="monthB"',
    'id="yearA"', 'id="yearB"', 'id="decadeA"', 'id="decadeB"',
    'id="salaryLine"', 'id="ratioEmphasis"', '@media (max-width: 640px)',
    'prefers-reduced-motion', './calculator.js', './app.js'
  ].forEach((part) => assert.ok(html.includes(part), `page should include ${part}`));

  assert.ok(!/https?:\/\//.test(html), 'calculator must not load remote dependencies');
  assert.ok(
    homepage.includes('/工资不止差一半计算器/index.html'),
    'homepage should link to the calculator'
  );
}
```

- [ ] **Step 2: Run and verify the page-contract failure**

Run: `node tests/salary-gap-calculator.test.js`

Expected: FAIL with `AssertionError: calculator page should exist`.

- [ ] **Step 3: Create the semantic responsive page**

Create `工资不止差一半计算器/index.html` with:

- `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
- A warm neutral body background and a centered `.calculator-shell` capped near `880px`.
- A title and the approved explanatory paragraph.
- Two `.pair-grid` salary fields with labels and `inputmode="decimal"`, `min="0"`, and `step="0.01"`.
- An expense `.linked-grid` whose middle column contains the button and inline locked/unlocked SVG shapes; the button starts with `aria-pressed="true"`.
- A semantic result table or grid containing the six required result IDs and visible `statusA/statusB` labels.
- A dark conclusion card containing `salaryLine`, `factPrefix`, `ratioEmphasis`, and `factSuffix`; place `aria-live="polite"` on the conclusion card only.
- Local scripts at the end of `<body>` in this order: `calculator.js`, then `app.js`.

The responsive rules must use these concrete layout contracts:

```css
.pair-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}
.linked-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 56px minmax(0, 1fr);
  gap: 10px;
  align-items: end;
}
.lock-button {
  min-width: 48px;
  min-height: 48px;
}
@media (max-width: 640px) {
  body { padding: 12px; }
  .calculator-shell { border-radius: 20px; }
  .pair-grid { gap: 8px; }
  .linked-grid { grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1fr); gap: 6px; }
  .field-input { min-height: 48px; padding-inline: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

Use visible `甲`/`乙` labels and CSS classes, not color alone, to preserve identity. Ensure all grid children have `min-width: 0`, inputs use `width: 100%`, and the result layout does not overflow at `320px`.

- [ ] **Step 4: Add the homepage link**

Under the existing `<h3>生活与计算</h3>` ordered list in root `index.html`, insert exactly:

```html
  <li><a href="/工资不止差一半计算器/index.html">工资不止差一半计算器</a>(AI写)</li>
```

Do not modify the homepage earth script or unrelated navigation entries.

- [ ] **Step 5: Run page and homepage tests**

Run:

```powershell
node tests/salary-gap-calculator.test.js
node tests/homepage-earth-background.test.js
```

Expected: both commands exit `0`; salary test prints `salary gap calculator tests passed`.

- [ ] **Step 6: Commit the page and navigation entry**

Run:

```powershell
git add -- '工资不止差一半计算器/index.html' 'tests/salary-gap-calculator.test.js' 'index.html'
git commit -m 'Add responsive salary gap calculator page'
```

Expected: the unrelated `js/homepage-earth.js` working-tree modification remains unstaged.

### Task 5: Browser verification and final quality gate

**Files:**
- Verify: `工资不止差一半计算器/index.html`
- Verify: `工资不止差一半计算器/app.js`
- Verify: `工资不止差一半计算器/calculator.js`
- Modify only if a failing regression test proves a defect.

- [ ] **Step 1: Start a local static server**

Run from the repository root using the bundled Python runtime:

```powershell
& 'C:\Users\cgl\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 8765 --bind 127.0.0.1
```

Expected: the server exposes `http://127.0.0.1:8765/工资不止差一半计算器/`.

- [ ] **Step 2: Verify the desktop viewport**

At approximately `1280×800`, verify:

- Default outputs are `1,000 / 6,000`, `12,000 / 72,000`, and `120,000 / 720,000`.
- The conclusion shows `你以为乙的工资是甲的 2 倍？` and emphasizes `6 倍`.
- Editing either locked expense mirrors the other input.
- Unlocking permits different values; relocking copies the value from 甲 to 乙.
- Blank, negative, and more-than-two-decimal inputs show `—` plus inline validation.
- A zero or negative monthly remainder displays the real amount, the visible `已入不敷出` status, and no misleading ratio.
- Keyboard focus is visible on all four inputs and the lock button.
- Console error/warning count is zero.

- [ ] **Step 3: Verify the mobile viewport**

At `390×844` and a narrow `320px` width, verify:

- No horizontal scrollbar (`document.documentElement.scrollWidth <= window.innerWidth`).
- Salary and expense inputs remain associated with 甲/乙.
- Input and lock-button hit areas are at least about `44px` high.
- Result values and the emphasized ratio neither clip nor overlap.

- [ ] **Step 4: Add a regression test before any browser-discovered fix**

If browser verification finds a defect, first add the smallest failing assertion to `tests/salary-gap-calculator.test.js`, run it to observe the failure, implement the minimum fix, and rerun it to green. Do not change code for a discovered defect without this red-green cycle.

- [ ] **Step 5: Run the fresh final verification suite**

Run:

```powershell
node tests/salary-gap-calculator.test.js
node tests/homepage-earth-background.test.js
git diff --check
git status --short
```

Expected: tests pass, `git diff --check` emits nothing, calculator files are clean, and only the pre-existing `js/homepage-earth.js` modification remains if the user has not committed it separately.

- [ ] **Step 6: Commit any verified browser-fix changes**

Only if Step 4 produced changes, stage the exact regression test and calculator files and commit with:

```powershell
git commit -m 'Fix salary calculator responsive behavior'
```

Do not include `js/homepage-earth.js`.

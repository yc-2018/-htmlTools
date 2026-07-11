# Self-Contained CodeMirror Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the shared root CodeMirror dependency, restore the old text-diff tool unchanged, give YAML its own compatible editor files, and upgrade only the Java formatter to CodeMirror 5.65.20.

**Architecture:** Each tool owns every runtime asset it references. The old Mergely 3.3.7 tool keeps CodeMirror 3.1, YAML receives a private copy of that compatible core, and the Java formatter receives a private CodeMirror 5.65.20 distribution with the clike Java mode.

**Tech Stack:** Static HTML, browser JavaScript, CodeMirror 3.1 and 5.65.20, Node.js `assert` tests

---

### Task 1: Define and implement self-contained dependency boundaries

**Files:**
- Rename: `tests/shared-codemirror.test.js` to `tests/self-contained-codemirror.test.js`
- Move: `lib/codemirror/codemirror.js` to `文本差异对比/lib/codemirror.js`
- Move: `lib/codemirror/codemirror.min.js` to `文本差异对比/lib/codemirror.min.js`
- Move: `lib/codemirror/codemirror.css` to `文本差异对比/lib/codemirror.css`
- Create: `yaml-properties-converter/vendor/codemirror/codemirror.js`
- Create: `yaml-properties-converter/vendor/codemirror/codemirror.css`
- Modify: `文本差异对比/index.html`
- Modify: `yaml-properties-converter/index.html`
- Modify: `tests/yaml-properties-converter.test.js`

- [ ] **Step 1: Replace shared-resource assertions with failing self-contained assertions**

Rename the test file and replace its shared-directory tests with assertions equivalent to:

```js
const diffCodeMirrorDir = path.join(repoRoot, '文本差异对比', 'lib');
const yamlCodeMirrorDir = path.join(repoRoot, 'yaml-properties-converter', 'vendor', 'codemirror');

function testLegacyConsumersOwnTheirCodeMirrorFiles() {
  ['codemirror.js', 'codemirror.min.js', 'codemirror.css'].forEach((fileName) => {
    assert.ok(fs.existsSync(path.join(diffCodeMirrorDir, fileName)));
  });
  ['codemirror.js', 'codemirror.css'].forEach((fileName) => {
    assert.ok(fs.existsSync(path.join(yamlCodeMirrorDir, fileName)));
  });
  assert.ok(!fs.existsSync(path.join(repoRoot, 'lib', 'codemirror')));
}

function testLegacyConsumersUseOnlyLocalPaths() {
  const diffHtml = read('文本差异对比/index.html');
  const yamlHtml = read('yaml-properties-converter/index.html');

  assert.ok(diffHtml.includes('./lib/codemirror.js'));
  assert.ok(diffHtml.includes('./lib/codemirror.css'));
  assert.ok(yamlHtml.includes('./vendor/codemirror/codemirror.js'));
  assert.ok(yamlHtml.includes('./vendor/codemirror/codemirror.css'));
  assert.ok(!diffHtml.includes('../lib/codemirror'));
  assert.ok(!yamlHtml.includes('../lib/codemirror'));
}
```

- [ ] **Step 2: Run the renamed test and verify RED**

Run: `node tests/self-contained-codemirror.test.js`

Expected: FAIL because the old text-diff and YAML local CodeMirror files do not exist.

- [ ] **Step 3: Restore the old text-diff files without changing their contents**

Use `git mv` to return the three CodeMirror 3.1 core files from `lib/codemirror/` to `文本差异对比/lib/`. Update the page to:

```html
<script type="text/javascript" src="./lib/codemirror.js"></script>
<link type="text/css" rel="stylesheet" href="./lib/codemirror.css"/>
```

Do not modify Mergely, jQuery, `searchcursor.js`, or `文本差异对比(新)`.

- [ ] **Step 4: Give YAML a private compatible copy**

Copy the restored CodeMirror 3.1 `codemirror.js` and `codemirror.css` into `yaml-properties-converter/vendor/codemirror/`. Update YAML HTML to:

```html
<link rel="stylesheet" href="./vendor/codemirror/codemirror.css">
<script src="./vendor/codemirror/codemirror.js"></script>
```

Change the matching path assertions in `tests/yaml-properties-converter.test.js`.

- [ ] **Step 5: Verify the legacy-consumer migration**

Run:

```powershell
node tests/yaml-properties-converter.test.js
```

Expected: the YAML test passes. Running `node tests/self-contained-codemirror.test.js` now advances past the legacy-consumer checks and fails at the missing Java-local CodeMirror 5 files, which is the RED state for Task 2.

### Task 2: Upgrade the Java formatter to private CodeMirror 5.65.20

**Files:**
- Create: `java一行的多行注释一行化/vendor/codemirror/lib/codemirror.js`
- Create: `java一行的多行注释一行化/vendor/codemirror/lib/codemirror.css`
- Create: `java一行的多行注释一行化/vendor/codemirror/mode/clike/clike.js`
- Modify: `java一行的多行注释一行化/index.html`
- Modify: `tests/self-contained-codemirror.test.js`
- Delete: `lib/codemirror/mode/clike.js`

- [ ] **Step 1: Add failing CodeMirror 5 assertions**

Assert the three Java-local files exist, the core source contains `version = "5.65.20"`, the mode contains `text/x-java`, and the Java HTML contains:

```html
<link rel="stylesheet" href="./vendor/codemirror/lib/codemirror.css">
<script src="./vendor/codemirror/lib/codemirror.js"></script>
<script src="./vendor/codemirror/mode/clike/clike.js"></script>
```

Also assert the HTML has no `../lib/codemirror` reference and still configures `mode: 'text/x-java'` twice.

- [ ] **Step 2: Run the test and verify RED**

Run: `node tests/self-contained-codemirror.test.js`

Expected: FAIL because `java一行的多行注释一行化/vendor/codemirror/lib/codemirror.js` does not exist.

- [ ] **Step 3: Vendor the official 5.65.20 files**

Download these exact upstream files into the Java tool:

```text
https://cdn.jsdelivr.net/npm/codemirror@5.65.20/lib/codemirror.js
https://cdn.jsdelivr.net/npm/codemirror@5.65.20/lib/codemirror.css
https://cdn.jsdelivr.net/npm/codemirror@5.65.20/mode/clike/clike.js
```

Keep their upstream license headers and do not load them from the network at runtime.

- [ ] **Step 4: Switch the Java page to local CodeMirror 5 paths**

Use the three HTML tags from Step 1. Preserve the two `text/x-java` mode options and all existing editor behavior and CSS.

- [ ] **Step 5: Remove the now-empty shared root directory**

Delete the old root `lib/codemirror/mode/clike.js` after all consumers use local paths. Remove empty `lib/codemirror/` and `lib/` directories if no other files remain.

- [ ] **Step 6: Run focused and full tests**

Run:

```powershell
node tests/self-contained-codemirror.test.js
Get-ChildItem tests -Filter '*.test.js' | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

Expected: all tests pass with exit code 0.

- [ ] **Step 7: Verify all three tools in a browser**

Serve the repository only on `127.0.0.1`, then verify:

- Text diff initializes two CodeMirror editors using `文本差异对比/lib/`.
- YAML initializes two CodeMirror editors using `yaml-properties-converter/vendor/` and still converts both directions.
- Java initializes two CodeMirror 5.65.20 editors using only its `vendor/`, produces `cm-keyword`, `cm-string`, and `cm-comment` tokens, and retains formatting, copy, clear, checkbox, desktop, and mobile behavior.

- [ ] **Step 8: Commit the implementation**

```powershell
git add -- '文本差异对比' 'yaml-properties-converter' 'java一行的多行注释一行化' tests lib
git commit -m "Make CodeMirror dependencies self-contained"
```

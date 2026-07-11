# Shared CodeMirror Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the repository's CodeMirror core files into a shared root-level library and upgrade the Java comment formatter's input and output fields to CodeMirror without losing existing behavior.

**Architecture:** Keep CodeMirror as a local browser dependency under `lib/codemirror/`, while Mergely, jQuery, and the Mergely search addon remain private to the text-diff tool. Keep the Java formatter self-contained in its HTML file and route all editor reads, writes, changes, focus, and copy behavior through two CodeMirror instances.

**Tech Stack:** Static HTML, CSS, browser JavaScript, CodeMirror 5, Node.js `assert`-based structural tests

---

### Task 1: Promote CodeMirror core files to a shared library

**Files:**
- Create: `tests/shared-codemirror.test.js`
- Move: `文本差异对比/lib/codemirror.js` to `lib/codemirror/codemirror.js`
- Move: `文本差异对比/lib/codemirror.min.js` to `lib/codemirror/codemirror.min.js`
- Move: `文本差异对比/lib/codemirror.css` to `lib/codemirror/codemirror.css`
- Modify: `文本差异对比/index.html`
- Modify: `yaml-properties-converter/index.html`
- Modify: `tests/yaml-properties-converter.test.js`

- [ ] **Step 1: Write the failing shared-resource test**

Create `tests/shared-codemirror.test.js` with Node assertions that:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sharedDir = path.join(repoRoot, 'lib', 'codemirror');
const diffLibDir = path.join(repoRoot, '文本差异对比', 'lib');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function testCodeMirrorCoreIsShared() {
  ['codemirror.js', 'codemirror.min.js', 'codemirror.css'].forEach((fileName) => {
    assert.ok(fs.existsSync(path.join(sharedDir, fileName)), `${fileName} should be shared`);
    assert.ok(!fs.existsSync(path.join(diffLibDir, fileName)), `${fileName} should not remain private`);
  });
  ['jquery.min.js', 'mergely.js', 'mergely.min.js', 'mergely.css', 'searchcursor.js'].forEach((fileName) => {
    assert.ok(fs.existsSync(path.join(diffLibDir, fileName)), `${fileName} should remain with Mergely`);
  });
}

function testConsumersUseSharedCodeMirror() {
  const diffHtml = read('文本差异对比/index.html');
  const yamlHtml = read('yaml-properties-converter/index.html');

  assert.ok(diffHtml.includes('../lib/codemirror/codemirror.css'));
  assert.ok(diffHtml.includes('../lib/codemirror/codemirror.js'));
  assert.ok(yamlHtml.includes('../lib/codemirror/codemirror.css'));
  assert.ok(yamlHtml.includes('../lib/codemirror/codemirror.js'));
  assert.ok(!diffHtml.includes('./lib/codemirror'));
  assert.ok(!yamlHtml.includes('../文本差异对比/lib/codemirror'));
}

testCodeMirrorCoreIsShared();
testConsumersUseSharedCodeMirror();
console.log('shared CodeMirror tests passed');
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `node tests/shared-codemirror.test.js`

Expected: FAIL because `lib/codemirror/codemirror.js` does not exist yet.

- [ ] **Step 3: Move the three CodeMirror core assets**

Create `lib/codemirror/`, then use `git mv` for the three CodeMirror files. Do not move `searchcursor.js`, jQuery, or Mergely assets.

- [ ] **Step 4: Update both existing consumers**

In `文本差异对比/index.html`, replace the CodeMirror paths with:

```html
<script type="text/javascript" src="../lib/codemirror/codemirror.js"></script>
<link type="text/css" rel="stylesheet" href="../lib/codemirror/codemirror.css"/>
```

In `yaml-properties-converter/index.html`, use:

```html
<link rel="stylesheet" href="../lib/codemirror/codemirror.css">
<script src="../lib/codemirror/codemirror.js"></script>
```

Update the two old path expectations in `tests/yaml-properties-converter.test.js` to the same shared paths.

- [ ] **Step 5: Run the resource and existing converter tests**

Run:

```powershell
node tests/shared-codemirror.test.js
node tests/yaml-properties-converter.test.js
```

Expected: both commands print their passing messages and exit with code 0.

- [ ] **Step 6: Commit the shared-library migration**

```powershell
git add -- lib/codemirror '文本差异对比/index.html' 'yaml-properties-converter/index.html' tests
git commit -m "Share CodeMirror across HTML tools"
```

### Task 2: Upgrade the Java comment formatter to CodeMirror

**Files:**
- Modify: `tests/shared-codemirror.test.js`
- Modify: `java一行的多行注释一行化/index.html`

- [ ] **Step 1: Add failing Java editor integration assertions**

Extend `tests/shared-codemirror.test.js` with a test that reads the Java tool HTML and asserts:

```js
function testJavaFormatterUsesCodeMirror() {
  const javaHtml = read('java一行的多行注释一行化/index.html');

  assert.ok(javaHtml.includes('../lib/codemirror/codemirror.css'));
  assert.ok(javaHtml.includes('../lib/codemirror/codemirror.js'));
  assert.ok(javaHtml.includes('const inputEditor = CodeMirror.fromTextArea(input'));
  assert.ok(javaHtml.includes('const outputEditor = CodeMirror.fromTextArea(output'));
  assert.ok(javaHtml.includes('readOnly: true'));
  assert.ok(javaHtml.includes("inputEditor.on('change', processInput)"));
  assert.ok(javaHtml.includes('inputEditor.getValue()'));
  assert.ok(javaHtml.includes('outputEditor.setValue('));
  assert.ok(javaHtml.includes('navigator.clipboard.writeText(outputEditor.getValue())'));
  assert.ok(javaHtml.includes('@media (max-width: 768px)'));
}
```

Call the new test before the passing log message.

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `node tests/shared-codemirror.test.js`

Expected: FAIL because the Java tool does not yet reference CodeMirror.

- [ ] **Step 3: Load and style CodeMirror in the Java tool**

Add the shared stylesheet in `<head>` and the shared script before the inline application script. Replace textarea-specific visual sizing rules with `.CodeMirror` rules that preserve the current 400px desktop and 300px mobile heights, rounded borders, monospace text, and focus treatment. Keep the existing `.editor-container` responsive layout.

- [ ] **Step 4: Initialize the input and output editors**

Immediately after resolving the textarea elements, create:

```js
const inputEditor = CodeMirror.fromTextArea(input, {
  lineNumbers: true,
  lineWrapping: true
});
const outputEditor = CodeMirror.fromTextArea(output, {
  lineNumbers: true,
  lineWrapping: true,
  readOnly: true
});
```

- [ ] **Step 5: Route existing behavior through the editor APIs**

Use `inputEditor.getValue()` and `outputEditor.getValue()` for character counts and formatting input. Use `outputEditor.setValue(result)` for output, `inputEditor.setValue('')` and `outputEditor.setValue('')` for clearing, and `inputEditor.focus()` after clearing. Register `inputEditor.on('change', processInput)` instead of the textarea `input` event. Load the example with `inputEditor.setValue(example)`.

For copying, call:

```js
const outputText = outputEditor.getValue();
if (navigator.clipboard && navigator.clipboard.writeText) {
  navigator.clipboard.writeText(outputText);
} else {
  output.value = outputText;
  output.select();
  document.execCommand('copy');
}
```

Keep the current two-second button feedback.

- [ ] **Step 6: Run focused tests**

Run: `node tests/shared-codemirror.test.js`

Expected: `shared CodeMirror tests passed` with exit code 0.

- [ ] **Step 7: Run all repository Node tests**

Run:

```powershell
Get-ChildItem tests -Filter '*.test.js' | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

Expected: every test prints its passing message and the command exits with code 0.

- [ ] **Step 8: Manually verify in Chrome or Edge**

Open `java一行的多行注释一行化/index.html` directly and verify example conversion, live editing, the empty-line checkbox, format, clear, copy, input focus, desktop layout, and a viewport narrower than 768px. Open the text-diff and YAML converter pages and verify both editors still render from local shared assets.

- [ ] **Step 9: Commit the Java editor integration**

```powershell
git add -- 'java一行的多行注释一行化/index.html' tests/shared-codemirror.test.js
git commit -m "Use CodeMirror in Java comment formatter"
```

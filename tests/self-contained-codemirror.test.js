const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const diffLibDir = path.join(repoRoot, '文本差异对比', 'lib');
const yamlCodeMirrorDir = path.join(repoRoot, 'yaml-properties-converter', 'vendor', 'codemirror');
const javaCodeMirrorDir = path.join(repoRoot, 'java一行的多行注释一行化', 'vendor', 'codemirror');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function testLegacyConsumersOwnTheirCodeMirrorFiles() {
  ['codemirror.js', 'codemirror.min.js', 'codemirror.css'].forEach((fileName) => {
    assert.ok(fs.existsSync(path.join(diffLibDir, fileName)), `${fileName} should remain with text diff`);
  });

  ['codemirror.js', 'codemirror.css'].forEach((fileName) => {
    assert.ok(fs.existsSync(path.join(yamlCodeMirrorDir, fileName)), `${fileName} should remain with YAML`);
  });

  ['jquery.min.js', 'mergely.js', 'mergely.min.js', 'mergely.css', 'searchcursor.js'].forEach((fileName) => {
    assert.ok(fs.existsSync(path.join(diffLibDir, fileName)), `${fileName} should remain with Mergely`);
  });

  assert.ok(!fs.existsSync(path.join(repoRoot, 'lib', 'codemirror')), 'Root CodeMirror directory should not exist');
}

function testLegacyConsumersUseOnlyLocalPaths() {
  const diffHtml = read('文本差异对比/index.html');
  const yamlHtml = read('yaml-properties-converter/index.html');

  assert.ok(diffHtml.includes('./lib/codemirror.css'));
  assert.ok(diffHtml.includes('./lib/codemirror.js'));
  assert.ok(yamlHtml.includes('./vendor/codemirror/codemirror.css'));
  assert.ok(yamlHtml.includes('./vendor/codemirror/codemirror.js'));
  assert.ok(!diffHtml.includes('../lib/codemirror'));
  assert.ok(!yamlHtml.includes('../lib/codemirror'));
}

function testJavaFormatterUsesCodeMirror() {
  const javaHtml = read('java一行的多行注释一行化/index.html');

  assert.ok(javaHtml.includes('./vendor/codemirror/lib/codemirror.css'));
  assert.ok(javaHtml.includes('./vendor/codemirror/lib/codemirror.js'));
  assert.ok(javaHtml.includes('./vendor/codemirror/mode/clike/clike.js'));
  assert.ok(!javaHtml.includes('../lib/codemirror'));
  assert.ok(javaHtml.includes('const inputEditor = CodeMirror.fromTextArea(input'));
  assert.ok(javaHtml.includes('const outputEditor = CodeMirror.fromTextArea(output'));
  assert.strictEqual(
    (javaHtml.match(/mode: 'text\/x-java'/g) || []).length,
    2,
    'Both Java editors should enable Java syntax highlighting'
  );
  assert.ok(javaHtml.includes('readOnly: true'));
  assert.ok(javaHtml.includes("inputEditor.on('change', processInput)"));
  assert.ok(javaHtml.includes('inputEditor.getValue()'));
  assert.ok(javaHtml.includes('outputEditor.setValue('));
  assert.ok(javaHtml.includes('navigator.clipboard.writeText(outputEditor.getValue())'));
  assert.ok(javaHtml.includes('@media (max-width: 768px)'));
}

function testJavaOwnsCodeMirrorFive() {
  const javaCorePath = path.join(javaCodeMirrorDir, 'lib', 'codemirror.js');
  const javaCssPath = path.join(javaCodeMirrorDir, 'lib', 'codemirror.css');
  const javaModePath = path.join(javaCodeMirrorDir, 'mode', 'clike', 'clike.js');

  assert.ok(fs.existsSync(javaCorePath), 'The Java-local CodeMirror core should exist');
  assert.ok(fs.existsSync(javaCssPath), 'The Java-local CodeMirror stylesheet should exist');
  assert.ok(fs.existsSync(javaModePath), 'The Java-local CodeMirror Java mode should exist');
  assert.ok(fs.readFileSync(javaCorePath, 'utf8').includes('version = "5.65.20"'));
  const javaMode = fs.readFileSync(javaModePath, 'utf8');
  assert.ok(javaMode.includes('text/x-java'));
}

function testJavaFormatterInlineScriptParses() {
  const javaHtml = read('java一行的多行注释一行化/index.html');
  const inlineScripts = Array.from(
    javaHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
    (match) => match[1]
  );

  assert.ok(inlineScripts.length > 0, 'Java formatter should contain an inline application script');
  inlineScripts.forEach((source) => new Function(source));
}

testJavaOwnsCodeMirrorFive();
testJavaFormatterUsesCodeMirror();
testJavaFormatterInlineScriptParses();
testLegacyConsumersOwnTheirCodeMirrorFiles();
testLegacyConsumersUseOnlyLocalPaths();
console.log('self-contained CodeMirror tests passed');

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
  assert.ok(!diffHtml.includes('./lib/codemirror.js'));
  assert.ok(!diffHtml.includes('./lib/codemirror.css'));
  assert.ok(!yamlHtml.includes('../文本差异对比/lib/codemirror.js'));
  assert.ok(!yamlHtml.includes('../文本差异对比/lib/codemirror.css'));
}

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

function testJavaFormatterInlineScriptParses() {
  const javaHtml = read('java一行的多行注释一行化/index.html');
  const inlineScripts = Array.from(
    javaHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
    (match) => match[1]
  );

  assert.ok(inlineScripts.length > 0, 'Java formatter should contain an inline application script');
  inlineScripts.forEach((source) => new Function(source));
}

testCodeMirrorCoreIsShared();
testConsumersUseSharedCodeMirror();
testJavaFormatterUsesCodeMirror();
testJavaFormatterInlineScriptParses();
console.log('shared CodeMirror tests passed');

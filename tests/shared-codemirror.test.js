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

testCodeMirrorCoreIsShared();
testConsumersUseSharedCodeMirror();
console.log('shared CodeMirror tests passed');

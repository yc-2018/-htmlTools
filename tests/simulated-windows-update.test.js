const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const toolPath = path.join(repoRoot, '图一乐', '模拟电脑更新', 'index.html');
const homePath = path.join(repoRoot, 'index.html');

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assertIncludes(content, expectedPart) {
  assert.ok(
    content.includes(expectedPart),
    `Expected content to include "${expectedPart}"`
  );
}

function testToolPageExistsWithUpdateCopy() {
  assert.ok(fs.existsSync(toolPath), '模拟电脑更新页面应存在');

  const html = readUtf8(toolPath);
  assertIncludes(html, '<meta charset="UTF-8">');
  assertIncludes(html, '正在进行更新');
  assertIncludes(html, '已完成。请保持电脑处于打开状态。');
  assertIncludes(html, '你的电脑可能会重启几次。');
  assertIncludes(html, '正在重启');
}

function testToolSupportsFastModeAndLoopingProgress() {
  const html = readUtf8(toolPath);
  assertIncludes(html, "searchParams.get('fast') === '1'");
  assertIncludes(html, 'const isFastMode');
  assertIncludes(html, 'setTimeout(scheduleNextTick');
  assertIncludes(html, 'startRestartPhase');
}

function testHomePageLinksToTool() {
  const html = readUtf8(homePath);
  assertIncludes(html, '/图一乐/模拟电脑更新/index.html');
  assertIncludes(html, '模拟电脑更新');
}

function run() {
  testToolPageExistsWithUpdateCopy();
  testToolSupportsFastModeAndLoopingProgress();
  testHomePageLinksToTool();
  console.log('simulated-windows-update tests passed');
}

run();

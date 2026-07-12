const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const toolRoot = path.join(repoRoot, '图一乐', 'AI二维码观赏');
const htmlPath = path.join(toolRoot, 'index.html');
const helperPath = path.join(toolRoot, 'image-url.js');

function testResponsiveThumbnailSizing() {
  assert.ok(fs.existsSync(helperPath), 'image URL helper should exist');
  const urls = require(helperPath);

  assert.strictEqual(urls.calculateThumbnailSize(280, 1), 300);
  assert.strictEqual(urls.calculateThumbnailSize(280, 2), 600);
  assert.strictEqual(urls.calculateThumbnailSize(600, 2), 900);
  assert.strictEqual(urls.calculateThumbnailSize(2000, 3), 900);
  assert.strictEqual(urls.calculateThumbnailSize(1, 1), 50);
}

function testJdUrlConversion() {
  const urls = require(helperPath);
  const original = 'https://img11.360buyimg.com/cxxjwimg/jfs/t1/demo/image.png';
  const thumbnail = 'https://img11.360buyimg.com/jdcms/s600x600_jfs/t1/demo/image.png';

  assert.strictEqual(urls.toThumbnailUrl(original, 600), thumbnail);
  assert.strictEqual(urls.toFullImageUrl(thumbnail), original);
  assert.strictEqual(urls.toThumbnailUrl('https://example.com/image.png', 600), 'https://example.com/image.png');
}

function testGalleryUsesThumbnailsUntilViewing() {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('<script src="./image-url.js"></script>'));
  assert.ok(html.includes('updateThumbnailSources'));
  assert.ok(html.includes('toThumbnailUrl'));
  assert.ok(html.includes('loadCurrentFullImage'));
  assert.ok(html.includes('toFullImageUrl'));
  assert.ok(!/imageItem\.innerHTML\s*=\s*`<img src="\$\{src\}"/.test(html));
}

function run() {
  testResponsiveThumbnailSizing();
  testJdUrlConversion();
  testGalleryUsesThumbnailsUntilViewing();
  console.log('AI QR gallery tests passed');
}

run();

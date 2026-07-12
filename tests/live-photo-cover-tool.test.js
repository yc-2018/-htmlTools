const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const toolRoot = path.join(repoRoot, '实况图片换封面');
const htmlPath = path.join(toolRoot, 'index.html');
const cssPath = path.join(toolRoot, 'styles.css');
const appPath = path.join(toolRoot, 'app.js');

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assertIncludes(content, expected) {
  assert.ok(content.includes(expected), `Expected content to include "${expected}"`);
}

function makeJpeg(width, height, metadataSegments = []) {
  const sof = Uint8Array.from([
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00
  ]);
  const scan = Uint8Array.from([
    0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02,
    0x00, 0x03, 0x00, 0x00, 0xff, 0xd9
  ]);
  const length = 2 + metadataSegments.reduce((sum, item) => sum + item.length, 0)
    + sof.length + scan.length;
  const bytes = new Uint8Array(length);
  let offset = 0;
  bytes.set([0xff, 0xd8], offset);
  offset += 2;
  metadataSegments.forEach((segment) => {
    bytes.set(segment, offset);
    offset += segment.length;
  });
  bytes.set(sof, offset);
  offset += sof.length;
  bytes.set(scan, offset);
  return bytes;
}

function makeMp4() {
  return Uint8Array.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00,
    0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x32
  ]);
}

function testPageStructureAndTerminology() {
  assert.ok(fs.existsSync(cssPath), 'responsive stylesheet should exist');
  assert.ok(fs.existsSync(appPath), 'tool application module should exist');
  const html = readUtf8(htmlPath);

  assertIncludes(html, '<link rel="stylesheet" href="./styles.css">');
  assertIncludes(html, '<script src="./app.js"></script>');
  assert.ok(!html.includes('<header class="site-header">'), 'the redundant top introduction block should be removed');
  assert.ok(!html.includes('查看源码'), 'the page should not show a source-code link');
  assert.ok(!html.includes('LOCAL MOTION PHOTO TOOL'), 'the page should start with the actual tool content');
  assertIncludes(html, '所有图片和视频都只在当前浏览器本地处理');
  assertIncludes(html, 'id="replaceTab"');
  assertIncludes(html, 'id="replacePanel"');
  assertIncludes(html, 'id="createPanel"');
  assertIncludes(html, 'aria-selected="true"');
  assertIncludes(html, '<video id="videoPreview"');
  assertIncludes(html, 'class="media-stage" role="button" tabindex="0"');
  assert.ok(!html.includes('<button class="media-stage"'), 'media previews must not nest video controls inside a button');
  assertIncludes(html, 'id="keepMetadataInput"');
  assertIncludes(html, 'id="matchVideoRatioInput"');
  assertIncludes(html, 'id="cropDialog"');
  assertIncludes(html, 'id="videoWarningDialog"');
  assertIncludes(html, 'id="keepLongVideoButton"');
  assertIncludes(html, '>确定<');
  assertIncludes(html, 'id="clearLongVideoButton"');
  assertIncludes(html, '>清空<');
  assertIncludes(html, 'id="reselectLongVideoButton"');
  assertIncludes(html, '>重选<');
  assert.ok(!html.includes('影像'), 'web copy should consistently use 视频');
}

function testResponsiveStylesCoverDesktopAndMobile() {
  const css = readUtf8(cssPath);

  assertIncludes(css, 'grid-template-columns: minmax(0, 1fr) 320px');
  assertIncludes(css, '.media-pair');
  assertIncludes(css, '@media (max-width: 900px)');
  assertIncludes(css, '@media (max-width: 640px)');
  assertIncludes(css, '.video-warning-actions');
  assertIncludes(css, '.crop-stage');
}

function testCoreSizingAndVideoRules() {
  const app = require(appPath);

  assert.strictEqual(app.constants.DEFAULT_JPG_QUALITY, 0.95);
  assert.strictEqual(app.constants.VIDEO_WARNING_SECONDS, 30);
  assert.strictEqual(app.constants.MAX_COVER_LONG_SIDE, 4096);
  assert.strictEqual(app.constants.MAX_COVER_PIXELS, 16000000);
  assert.strictEqual(app.shouldWarnLongVideo(30), false);
  assert.strictEqual(app.shouldWarnLongVideo(30.01), true);
  assert.deepStrictEqual(app.getSafeCoverSize({ width: 8000, height: 4000 }), {
    width: 4096,
    height: 2048
  });
  assert.deepStrictEqual(
    app.getCoverSizeByVideoRatio(
      { width: 4000, height: 3000 },
      { width: 1920, height: 1080 }
    ),
    { width: 4000, height: 2250 }
  );
  assert.strictEqual(app.formatVideoRatioText({ width: 1920, height: 1080 }), '1920×1080 · 16:9');
}

function testMotionPhotoRoundTrip() {
  const app = require(appPath);
  const cover = makeJpeg(1200, 900);
  const video = makeMp4();
  const output = app.composeMotionPhoto(cover, video, 123456);
  const info = app.parseMotionInfo(output);

  assert.strictEqual(info.videoLength, video.length);
  assert.strictEqual(info.videoStart, output.length - video.length);
  assert.strictEqual(info.presentationUs, 123456);
  assert.deepStrictEqual(info.size, { width: 1200, height: 900 });
  assert.deepStrictEqual(Array.from(output.slice(info.videoStart)), Array.from(video));
}

function testMetadataPreservation() {
  const app = require(appPath);
  const exifPayload = new TextEncoder().encode('Exif\u0000\u0000camera-data');
  const xmpPayload = new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\u0000old-xmp');
  const exif = app.jpegSegment(0xe1, exifPayload);
  const xmp = app.jpegSegment(0xe1, xmpPayload);
  const source = makeJpeg(640, 480, [exif, xmp]);

  const withoutXmp = app.extractJpegMetadataSegments(source, false);
  const withXmp = app.extractJpegMetadataSegments(source, true);
  assert.strictEqual(withoutXmp.length, 1);
  assert.strictEqual(withXmp.length, 2);
  assert.strictEqual(app.hasJpegXmpSegment(withXmp), true);
}

function run() {
  testPageStructureAndTerminology();
  testResponsiveStylesCoverDesktopAndMobile();
  testCoreSizingAndVideoRules();
  testMotionPhotoRoundTrip();
  testMetadataPreservation();
  console.log('live photo cover tool tests passed');
}

run();

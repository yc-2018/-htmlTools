const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const homepagePath = path.join(repoRoot, 'index.html');
const stylesheetPath = path.join(repoRoot, 'css', 'homepage-earth.css');
const scriptPath = path.join(repoRoot, 'js', 'homepage-earth.js');
const threePath = path.join(repoRoot, 'js', 'vendor', 'three-r128.min.js');

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assertIncludes(content, expectedPart) {
  assert.ok(
    content.includes(expectedPart),
    `Expected content to include "${expectedPart}"`
  );
}

function testHomepageLoadsLocalEarthBackground() {
  const html = readUtf8(homepagePath);

  assertIncludes(html, '<link rel="stylesheet" href="./css/homepage-earth.css">');
  assertIncludes(html, '<canvas id="homepage-earth-background" aria-hidden="true"></canvas>');
  assertIncludes(html, '<script src="./js/vendor/three-r128.min.js"></script>');
  assertIncludes(html, '<script src="./js/homepage-earth.js"></script>');

  const threeIndex = html.indexOf('./js/vendor/three-r128.min.js');
  const earthIndex = html.indexOf('./js/homepage-earth.js');
  assert.ok(threeIndex < earthIndex, 'Three.js must load before the homepage scene');

  const scriptSources = Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g), (match) => match[1]);
  assert.ok(
    scriptSources.every((source) => !/^https?:\/\//.test(source)),
    'Homepage runtime scripts must not use a CDN'
  );

  assertIncludes(html, '/2fa/index.html');
  assertIncludes(html, '/yaml-properties-converter/index.html');
  assertIncludes(html, '/图一乐/模拟电脑更新/index.html');
}

function testBackgroundAssetsExistAndStayBehindContent() {
  assert.ok(fs.existsSync(stylesheetPath), 'homepage earth stylesheet should exist');
  assert.ok(fs.existsSync(scriptPath), 'homepage earth scene script should exist');
  assert.ok(fs.existsSync(threePath), 'local Three.js dependency should exist');

  const css = readUtf8(stylesheetPath);
  const threeSource = readUtf8(threePath);
  const three = require(threePath);

  assertIncludes(css, '#homepage-earth-background');
  assertIncludes(css, 'position: fixed');
  assertIncludes(css, 'pointer-events: none');
  assertIncludes(css, 'z-index: -1');
  assertIncludes(css, 'linear-gradient');
  assertIncludes(css, 'a::before');
  assertIncludes(css, 'a::after');
  assertIncludes(css, 'a:hover::before');
  assertIncludes(css, 'a:focus-visible::before');
  assertIncludes(css, 'left: calc(100% - 5px)');
  assert.ok(
    /a:hover\s*\{[^}]*text-decoration:\s*none;/s.test(css),
    'native link underline should disappear while the custom hover line is visible'
  );
  assert.strictEqual(three.REVISION, '128');
  assert.ok(/MIT License|The MIT License/.test(threeSource), 'vendored Three.js should retain its license');
}

function testSceneMathAndResponsiveDefaults() {
  const earth = require(scriptPath);

  assert.strictEqual(earth.config.finalDiameterVmin, 55);
  assert.strictEqual(earth.config.initialDiameterVmin, 140);
  assert.strictEqual(earth.config.introDurationMs, 3000);
  assert.strictEqual(earth.config.rotationSpeed, 0.06);
  assert.strictEqual(earth.config.maxPointerRatio, 0.1);
  assert.strictEqual(earth.config.maxDpr, 1.5);
  assert.strictEqual(earth.config.landPointSizePx, 1.6);
  assert.strictEqual(earth.config.oceanPointSizePx, 1.05);
  assert.strictEqual(earth.config.orbitBandCount, 4);
  assert.strictEqual(earth.config.trailLength, 12);

  assert.strictEqual(earth.easeOutCubic(0), 0);
  assert.strictEqual(earth.easeOutCubic(0.5), 0.875);
  assert.strictEqual(earth.easeOutCubic(1), 1);

  assert.deepStrictEqual(earth.getDeviceSettings(1280), {
    satelliteCount: 14,
    pointerParallax: true
  });
  assert.deepStrictEqual(earth.getDeviceSettings(480), {
    satelliteCount: 14,
    pointerParallax: false
  });

  assert.deepStrictEqual(earth.getSceneMetrics(1920, 1080), {
    finalDiameter: 594,
    initialDiameter: 1512,
    maxPointerX: 192,
    maxPointerY: 108
  });
}

function testSatelliteSpecsStayWithinPlannedRanges() {
  const earth = require(scriptPath);
  const satellites = earth.createSatelliteSpecs();

  assert.strictEqual(satellites.length, 14);
  assert.deepStrictEqual(
    satellites.reduce((counts, satellite) => {
      counts[satellite.bandIndex] += 1;
      return counts;
    }, [0, 0, 0, 0]),
    [4, 4, 3, 3]
  );
  assert.deepStrictEqual(satellites, earth.createSatelliteSpecs(), 'orbits should be deterministic');
  satellites.forEach((satellite) => {
    assert.ok(satellite.orbitRadius >= 0.72 && satellite.orbitRadius <= 1.2);
    assert.ok(satellite.speed >= 0.12 && satellite.speed <= 0.22);
    assert.ok(satellite.inclination >= -Math.PI / 2 && satellite.inclination <= Math.PI / 2);
    assert.ok(satellite.phase >= 0 && satellite.phase <= Math.PI * 2);
  });
}

function testSatelliteTrailsFollowTheOrbit() {
  const earth = require(scriptPath);
  const satellite = earth.createSatelliteSpecs()[0];
  const trail = earth.createTrailPositions(satellite, 10);
  const currentPosition = earth.getSatellitePosition(satellite, 10);

  assert.strictEqual(trail.length, earth.config.trailLength * 3);
  assert.notDeepStrictEqual(
    trail.slice(0, 3),
    [currentPosition.x, currentPosition.y, currentPosition.z],
    'the first trail point should sit behind the satellite'
  );
  assert.ok(
    new Set(Array.from({ length: earth.config.trailLength }, (_, index) => (
      trail.slice(index * 3, index * 3 + 3).join(',')
    ))).size > 8,
    'trail points should form a visible curved path instead of one stacked dot'
  );
}

function testIntroScaleAndPointerTargetsAreBounded() {
  const earth = require(scriptPath);
  const metrics = earth.getSceneMetrics(1920, 1080);

  assert.strictEqual(typeof earth.getIntroDiameter, 'function');
  assert.strictEqual(typeof earth.getPointerTarget, 'function');
  assert.strictEqual(earth.getIntroDiameter(metrics, 0, false), 1512);
  assert.strictEqual(earth.getIntroDiameter(metrics, 1500, false), 708.75);
  assert.strictEqual(earth.getIntroDiameter(metrics, 3000, false), 594);
  assert.strictEqual(
    earth.getIntroDiameter(metrics, 1500, true),
    708.75,
    'system motion preference must not disable the requested intro animation'
  );

  assert.deepStrictEqual(
    earth.getPointerTarget(1920, 1080, 1920, 1080, metrics, true, false),
    { x: 192, y: -108 }
  );
  assert.deepStrictEqual(
    earth.getPointerTarget(960, 540, 1920, 1080, metrics, true, false),
    { x: 0, y: 0 }
  );
  assert.deepStrictEqual(
    earth.getPointerTarget(1920, 1080, 1920, 1080, metrics, false, false),
    { x: 0, y: 0 }
  );
  assert.deepStrictEqual(
    earth.getPointerTarget(1920, 1080, 1920, 1080, metrics, true, true),
    { x: 192, y: -108 },
    'system motion preference must not disable the requested pointer parallax'
  );
}

function testLandMaskSeparatesContinentsFromOpenOcean() {
  const earth = require(scriptPath);

  assert.strictEqual(earth.isLandCoordinate(-100, 45), true, 'North America should be land');
  assert.strictEqual(earth.isLandCoordinate(-60, -15), true, 'South America should be land');
  assert.strictEqual(earth.isLandCoordinate(20, 5), true, 'Africa should be land');
  assert.strictEqual(earth.isLandCoordinate(90, 40), true, 'Asia should be land');
  assert.strictEqual(earth.isLandCoordinate(135, -25), true, 'Australia should be land');
  assert.strictEqual(earth.isLandCoordinate(-145, 0), false, 'Pacific Ocean should stay sparse');
  assert.strictEqual(earth.isLandCoordinate(-30, -35), false, 'South Atlantic should stay sparse');
}

function testLifecycleAndAccessibilityHooksExist() {
  const script = readUtf8(scriptPath);

  assert.ok(
    !script.includes("matchMedia('(prefers-reduced-motion: reduce)')"),
    'the required homepage animation must not be forced into a static state'
  );
  assertIncludes(script, "document.addEventListener('visibilitychange'");
  assertIncludes(script, "window.addEventListener('pointermove'");
  assertIncludes(script, "window.addEventListener('resize'");
  assertIncludes(script, "canvas.addEventListener('webglcontextlost'");
  assertIncludes(script, 'requestAnimationFrame');
}

function run() {
  testHomepageLoadsLocalEarthBackground();
  testBackgroundAssetsExistAndStayBehindContent();
  testSceneMathAndResponsiveDefaults();
  testSatelliteSpecsStayWithinPlannedRanges();
  testSatelliteTrailsFollowTheOrbit();
  testIntroScaleAndPointerTargetsAreBounded();
  testLandMaskSeparatesContinentsFromOpenOcean();
  testLifecycleAndAccessibilityHooksExist();
  console.log('homepage earth background tests passed');
}

run();

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
    /hr\s*\{[^}]*border-top:\s*1px solid #c7cbcd;/s.test(css),
    'homepage separators should use a soft gray single-pixel line'
  );
  assert.ok(
    /a\s*\{[^}]*text-decoration:\s*none;/s.test(css),
    'native link underline should stay hidden in every link state'
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
  assert.ok(
    Math.abs(earth.config.chinaFacingRotationY + Math.PI / 12) < 1e-12,
    'China should be centered toward the camera'
  );
  assert.ok(
    Math.abs(earth.config.chinaFacingRotationX - 35 * Math.PI / 180) < 1e-12,
    'central China should be vertically centered'
  );
  assert.strictEqual(earth.config.chinaFacingRotationZ, 0);
  assert.strictEqual(earth.config.maxPointerRatio, 0.1);
  assert.strictEqual(earth.config.maxDpr, 1.5);
  assert.strictEqual(earth.config.desktopPointCount, 24000);
  assert.strictEqual(earth.config.mobilePointCount, 14000);
  assert.strictEqual(earth.config.landPointRadius, 1.008);
  assert.strictEqual(earth.config.oceanPointRadius, 0.995);
  assert.strictEqual(earth.config.depthSphereRadius, 0.986);
  assert.ok(earth.config.landPointRadius > earth.config.oceanPointRadius);
  assert.ok(earth.config.oceanPointRadius > earth.config.depthSphereRadius);
  assert.strictEqual(earth.config.landPointSizePx, 1.75);
  assert.strictEqual(earth.config.oceanPointSizePx, 1.4);
  assert.strictEqual(earth.config.landPointOpacity, 0.52);
  assert.strictEqual(earth.config.oceanPointOpacity, 0.5);
  assert.strictEqual(earth.config.oceanWhiteColor, 0xcceeff);
  assert.strictEqual(earth.config.oceanBlueColor, 0x4fa6c8);
  assert.strictEqual(earth.config.orbitBandCount, 4);
  assert.strictEqual(earth.config.trailLength, 12);
  assert.strictEqual(earth.config.chinaPointColor, 0xd94f5c);
  assert.strictEqual(earth.config.chinaPointSizePx, 2.1);
  assert.ok(earth.config.chinaPointSizePx > earth.config.landPointSizePx);
  assert.strictEqual(earth.config.chinaPointOpacity, 0.9);

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

function testSpaceStationUsesAHighSlowOrbit() {
  const earth = require(scriptPath);
  const satellites = earth.createSatelliteSpecs();
  const station = earth.createSpaceStationSpec();

  assert.strictEqual(satellites.length, 14);
  assert.ok(satellites.every((spec) => spec.kind === 'satellite'));
  assert.strictEqual(station.kind, 'spaceStation');
  assert.strictEqual(station.bandIndex, 4);
  assert.ok(station.orbitRadius > Math.max(...satellites.map((spec) => spec.orbitRadius)));
  assert.ok(station.speed < Math.min(...satellites.map((spec) => spec.speed)));
  assert.ok(station.size > Math.max(...satellites.map((spec) => spec.size)));
  assert.deepStrictEqual(station, earth.createSpaceStationSpec());
}

function testOrbitalHeadingFollowsTheTravelTangent() {
  const earth = require(scriptPath);
  const spec = earth.createSatelliteSpecs()[0];
  const elapsedSeconds = 7;
  const position = earth.getSatellitePosition(spec, elapsedSeconds);
  const nextPosition = earth.getSatellitePosition(spec, elapsedSeconds, 0.0001);
  const heading = earth.getOrbitalHeading(spec, elapsedSeconds);
  const forward = { x: Math.sin(heading), z: Math.cos(heading) };
  const travel = {
    x: nextPosition.x - position.x,
    z: nextPosition.z - position.z
  };

  assert.ok(forward.x * travel.x + forward.z * travel.z > 0);
}

function testOrbitalModelsUseSelectedShapes() {
  const earth = require(scriptPath);
  const THREE = require(threePath);
  const satellite = earth.createSatelliteModel(THREE);
  const station = earth.createSpaceStationModel(THREE);
  const namedChildren = (group, name) => group.children.filter((child) => child.name === name);

  assert.strictEqual(satellite.name, 'satellite-model');
  assert.strictEqual(namedChildren(satellite, 'satellite-body').length, 1);
  assert.strictEqual(namedChildren(satellite, 'solar-panel').length, 2);
  namedChildren(satellite, 'solar-panel').forEach((panel) => {
    assert.strictEqual(panel.material.side, THREE.DoubleSide);
    assert.ok(panel.geometry.parameters.height > panel.geometry.parameters.depth);
  });

  assert.strictEqual(station.name, 'space-station-model');
  assert.strictEqual(namedChildren(station, 'station-truss').length, 1);
  assert.ok(namedChildren(station, 'station-module').length >= 3);
  assert.strictEqual(namedChildren(station, 'solar-panel').length, 4);
  namedChildren(station, 'solar-panel').forEach((panel) => {
    assert.strictEqual(panel.material.side, THREE.DoubleSide);
    assert.ok(panel.geometry.parameters.height > panel.geometry.parameters.depth);
  });
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

function testLandMaskMatchesRepresentativeWorldCoordinates() {
  const earth = require(scriptPath);

  const landCoordinates = [
    [-100, 45, 'North America'],
    [-60, -15, 'South America'],
    [20, 5, 'Africa'],
    [37.6, 55.8, 'western Russia'],
    [90, 60, 'Siberia'],
    [78.9, 22.5, 'India'],
    [106.8, -6.2, 'Indonesia'],
    [135, -25, 'Australia'],
    [0, -80, 'Antarctica']
  ];
  const oceanCoordinates = [
    [-145, 0, 'Pacific Ocean'],
    [-30, -35, 'South Atlantic'],
    [80, -45, 'Indian Ocean'],
    [0, 0, 'Gulf of Guinea']
  ];

  landCoordinates.forEach(([longitude, latitude, label]) => {
    assert.strictEqual(
      earth.isLandCoordinate(longitude, latitude),
      true,
      `${label} should contain land points`
    );
  });
  oceanCoordinates.forEach(([longitude, latitude, label]) => {
    assert.strictEqual(
      earth.isLandCoordinate(longitude, latitude),
      false,
      `${label} should contain no points`
    );
  });
}

function testChinaMaskIncludesMainlandTaiwanAndHainan() {
  const earth = require(scriptPath);

  assert.strictEqual(earth.isChinaCoordinate(116.4, 39.9), true, 'Beijing should be highlighted');
  assert.strictEqual(earth.isChinaCoordinate(104.1, 30.7), true, 'Chengdu should be highlighted');
  assert.strictEqual(earth.isChinaCoordinate(87.6, 43.8), true, 'Xinjiang should be highlighted');
  assert.strictEqual(earth.isChinaCoordinate(121, 23.7), true, 'Taiwan should be highlighted');
  assert.strictEqual(earth.isChinaCoordinate(110, 19.3), true, 'Hainan should be highlighted');
  assert.strictEqual(earth.isChinaCoordinate(126.6, 45.8), true, 'Harbin should be highlighted');
  assert.strictEqual(earth.isLandCoordinate(126.6, 45.8), true, 'Harbin should also be land');
  assert.strictEqual(earth.isChinaCoordinate(139.7, 35.7), false, 'Japan should remain gray');
  assert.strictEqual(earth.isChinaCoordinate(78.9, 22.5), false, 'India should remain gray');
  assert.strictEqual(earth.isChinaCoordinate(106, 47.8), false, 'Mongolia should remain gray');
  assert.strictEqual(earth.isLandCoordinate(106, 47.8), true, 'Mongolia should remain visible land');
  assert.strictEqual(earth.isLandCoordinate(90, 60), true, 'Russia above China should remain visible land');
}

function testChinaFacingProjectionKeepsWestOnLeftAndEastOnRight() {
  const earth = require(scriptPath);

  assert.strictEqual(typeof earth.getFacingScreenX, 'function');
  const xinjiangX = earth.getFacingScreenX(87.6, 43.8);
  const beijingX = earth.getFacingScreenX(116.4, 39.9);
  const taiwanX = earth.getFacingScreenX(121, 23.7);

  assert.ok(xinjiangX < beijingX, 'Xinjiang should appear left of Beijing');
  assert.ok(taiwanX > beijingX, 'Taiwan should appear right of Beijing');
  assert.ok(Math.abs(earth.getFacingScreenX(105, 35)) < 1e-12, 'central China should face the camera');
}

function testChinaFacingProjectionCentersTheMainlandVertically() {
  const earth = require(scriptPath);

  assert.strictEqual(typeof earth.getFacingScreenPosition, 'function');
  const center = earth.getFacingScreenPosition(105, 35);
  const beijing = earth.getFacingScreenPosition(116.4, 39.9);
  const hainan = earth.getFacingScreenPosition(110, 19.3);

  assert.ok(Math.abs(center.x) < 1e-12);
  assert.ok(Math.abs(center.y) < 1e-12);
  assert.ok(beijing.y > center.y, 'Beijing should remain north of the center');
  assert.ok(hainan.y < center.y, 'Hainan should remain south of the center');
}

function testGlobeCoordinatesRespectLayerRadius() {
  const earth = require(scriptPath);
  const land = earth.getGlobeCoordinate(105, 35, earth.config.landPointRadius);
  const ocean = earth.getGlobeCoordinate(105, 35, earth.config.oceanPointRadius);
  const magnitude = (coordinate) => Math.sqrt(
    coordinate.x * coordinate.x
    + coordinate.y * coordinate.y
    + coordinate.z * coordinate.z
  );

  assert.ok(Math.abs(magnitude(land) - earth.config.landPointRadius) < 1e-12);
  assert.ok(Math.abs(magnitude(ocean) - earth.config.oceanPointRadius) < 1e-12);
  assert.ok(magnitude(land) > magnitude(ocean), 'land points should sit above ocean points');
}

function testPointCloudRendersRaisedLandAndColoredOcean() {
  const script = readUtf8(scriptPath);

  assertIncludes(script, 'const chinaPositions = [];');
  assertIncludes(script, 'const landPositions = [];');
  assertIncludes(script, 'const oceanPositions = [];');
  assertIncludes(script, 'const oceanColors = [];');
  assertIncludes(script, 'config.landPointRadius');
  assertIncludes(script, 'config.oceanPointRadius');
  assertIncludes(script, 'config.depthSphereRadius');
  assertIncludes(script, "geometry.setAttribute('color'");
  assertIncludes(script, 'vertexColors: Boolean(colors)');
  assert.ok(!script.includes('index % 2'), 'ocean points should use every non-land candidate');
  assert.ok(
    /}\s*else\s*{\s*const coordinate = getGlobeCoordinate\(/s.test(script),
    'every remaining coordinate should enter the ocean layer'
  );
}

function testSceneBuildsAndOrientsOrbitalModels() {
  const script = readUtf8(scriptPath);

  assertIncludes(script, '...createSatelliteSpecs(),');
  assertIncludes(script, 'createSpaceStationSpec()');
  assertIncludes(script, "spec.kind === 'spaceStation'");
  assertIncludes(script, 'createSpaceStationModel(THREE)');
  assertIncludes(script, 'createSatelliteModel(THREE)');
  assertIncludes(script, 'orbital.rotation.y = getOrbitalHeading(spec, elapsedSeconds);');
  assert.ok(!script.includes('new THREE.SphereBufferGeometry(1, 8, 6)'));
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
  assertIncludes(script, 'globeGroup.rotation.y = config.chinaFacingRotationY;');
  assertIncludes(script, 'requestAnimationFrame');
}

function run() {
  testHomepageLoadsLocalEarthBackground();
  testBackgroundAssetsExistAndStayBehindContent();
  testSceneMathAndResponsiveDefaults();
  testSatelliteSpecsStayWithinPlannedRanges();
  testSatelliteTrailsFollowTheOrbit();
  testSpaceStationUsesAHighSlowOrbit();
  testOrbitalHeadingFollowsTheTravelTangent();
  testOrbitalModelsUseSelectedShapes();
  testIntroScaleAndPointerTargetsAreBounded();
  testLandMaskMatchesRepresentativeWorldCoordinates();
  testChinaMaskIncludesMainlandTaiwanAndHainan();
  testChinaFacingProjectionKeepsWestOnLeftAndEastOnRight();
  testChinaFacingProjectionCentersTheMainlandVertically();
  testGlobeCoordinatesRespectLayerRadius();
  testPointCloudRendersRaisedLandAndColoredOcean();
  testSceneBuildsAndOrientsOrbitalModels();
  testLifecycleAndAccessibilityHooksExist();
  console.log('homepage earth background tests passed');
}

module.exports = {
  testSceneMathAndResponsiveDefaults,
  testSatelliteSpecsStayWithinPlannedRanges,
  testSpaceStationUsesAHighSlowOrbit,
  testOrbitalHeadingFollowsTheTravelTangent,
  testOrbitalModelsUseSelectedShapes,
  testLandMaskMatchesRepresentativeWorldCoordinates,
  testChinaMaskIncludesMainlandTaiwanAndHainan,
  testGlobeCoordinatesRespectLayerRadius,
  testPointCloudRendersRaisedLandAndColoredOcean,
  testSceneBuildsAndOrientsOrbitalModels
};

if (require.main === module) {
  run();
}

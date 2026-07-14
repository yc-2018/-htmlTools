const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(repoRoot, 'js', 'homepage-earth.js');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');
const earth = require(path.join(repoRoot, 'js', 'homepage-earth.js'));
const THREE = require(path.join(repoRoot, 'js', 'vendor', 'three-r128.min.js'));

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-12, message);
}

function createShaderStub() {
  return {
    uniforms: {},
    vertexShader: 'void main() {\n#include <begin_vertex>\n}',
    fragmentShader: 'void main() {\n#include <color_fragment>\n}'
  };
}

function testSunlightConfigurationMatchesApprovedDesign() {
  assert.deepStrictEqual(earth.config.sunlightDirection, {
    x: 0.55,
    y: 0.65,
    z: 1
  });
  assert.strictEqual(earth.config.sunlightNightBrightness, 0.76);
  assert.strictEqual(earth.config.sunlightDayBrightness, 1.1);
  assert.strictEqual(earth.config.sunlightTwilightStart, -0.25);
  assert.strictEqual(earth.config.sunlightTwilightEnd, 0.35);
}

function testSunlightBrightnessStaysWithinApprovedBounds() {
  assert.strictEqual(earth.getSunlightBrightness(-1), 0.76);
  assert.strictEqual(earth.getSunlightBrightness(-0.25), 0.76);
  assertClose(
    earth.getSunlightBrightness(0.05),
    0.93,
    'the midpoint of the twilight band should use the midpoint brightness'
  );
  assert.strictEqual(earth.getSunlightBrightness(0.35), 1.1);
  assert.strictEqual(earth.getSunlightBrightness(1), 1.1);
}

function testEarthPointMaterialInjectsWorldSpaceSunlight() {
  const material = earth.createEarthPointMaterial(THREE, {
    color: 0x747a7d,
    size: 1.75,
    opacity: 0.52,
    vertexColors: false
  });
  const shader = createShaderStub();

  material.onBeforeCompile(shader);

  assert.ok(material instanceof THREE.PointsMaterial);
  assert.strictEqual(material.name, 'earth-point-sunlight');
  assert.strictEqual(material.size, 1.75);
  assert.strictEqual(material.opacity, 0.52);
  assert.strictEqual(material.transparent, true);
  assert.strictEqual(material.depthWrite, false);
  assert.strictEqual(material.vertexColors, false);
  assertClose(shader.uniforms.uSunDirection.value.length(), 1, 'sun direction should be normalized');
  assert.ok(shader.uniforms.uSunDirection.value.x > 0, 'sun should come from screen right');
  assert.ok(shader.uniforms.uSunDirection.value.y > 0, 'sun should come from screen top');
  assert.ok(shader.uniforms.uSunDirection.value.z > 0, 'sun should point toward the viewer');
  assert.strictEqual(shader.uniforms.uNightBrightness.value, 0.76);
  assert.strictEqual(shader.uniforms.uDayBrightness.value, 1.1);
  assert.ok(shader.vertexShader.includes('mat3(modelMatrix) * normalize(position)'));
  assert.ok(shader.vertexShader.includes('smoothstep(uTwilightStart, uTwilightEnd, sunlightDot)'));
  assert.ok(shader.fragmentShader.includes('diffuseColor.rgb *= vSunlightBrightness;'));
}

function testOnlyEarthPointCloudUsesSunlightMaterial() {
  const createPointsBlock = scriptSource.match(
    /function createPoints\([\s\S]+?(?=\n    function clearGroup)/
  )[0];
  const moonBlock = scriptSource.match(
    /function createMoonModel\([\s\S]+?(?=\n  function createMoonOrbitPoints)/
  )[0];

  assert.ok(createPointsBlock.includes('createEarthPointMaterial(THREE, {'));
  assert.ok(!createPointsBlock.includes('new THREE.PointsMaterial'));
  assert.ok(createPointsBlock.includes('vertexColors: Boolean(colors)'));
  assert.ok(moonBlock.includes('new THREE.PointsMaterial'));
}

function run() {
  testSunlightConfigurationMatchesApprovedDesign();
  testSunlightBrightnessStaysWithinApprovedBounds();
  testEarthPointMaterialInjectsWorldSpaceSunlight();
  testOnlyEarthPointCloudUsesSunlightMaterial();
  console.log('homepage earth sunlight unit tests passed');
}

if (require.main === module) {
  run();
}

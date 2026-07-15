const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const homepagePath = path.join(repoRoot, 'index.html');
const stylesheetPath = path.join(repoRoot, 'css', 'homepage-earth.css');
const scriptPath = path.join(repoRoot, 'js', 'homepage-earth.js');
const homepageSource = fs.readFileSync(homepagePath, 'utf8');
const stylesheetSource = fs.readFileSync(stylesheetPath, 'utf8');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');
const earth = require(path.join(repoRoot, 'js', 'homepage-earth.js'));
const THREE = require(path.join(repoRoot, 'js', 'vendor', 'three-r128.min.js'));

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-12, message);
}

function getVisibleDiscCoverage(direction, resolution = 120) {
  const directionLength = Math.hypot(direction.x, direction.y, direction.z);
  const normalizedDirection = {
    x: direction.x / directionLength,
    y: direction.y / directionLength,
    z: direction.z / directionLength
  };
  const counts = { night: 0, twilight: 0, day: 0, total: 0 };

  for (let yIndex = -resolution; yIndex <= resolution; yIndex += 1) {
    const y = yIndex / resolution;

    for (let xIndex = -resolution; xIndex <= resolution; xIndex += 1) {
      const x = xIndex / resolution;

      if (x * x + y * y > 1) {
        continue;
      }

      const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
      const lightDot = x * normalizedDirection.x
        + y * normalizedDirection.y
        + z * normalizedDirection.z;

      if (lightDot <= earth.config.sunlightTwilightStart) {
        counts.night += 1;
      } else if (lightDot >= earth.config.sunlightTwilightEnd) {
        counts.day += 1;
      } else {
        counts.twilight += 1;
      }
      counts.total += 1;
    }
  }

  return {
    night: counts.night / counts.total,
    twilight: counts.twilight / counts.total,
    day: counts.day / counts.total,
    normalizedZ: normalizedDirection.z
  };
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
    x: 0.8,
    y: 0.35,
    z: 0.25
  });
  assert.strictEqual(earth.config.sunlightNightBrightness, 0.76);
  assert.strictEqual(earth.config.sunlightDayBrightness, 1.1);
  assert.strictEqual(earth.config.sunlightTwilightStart, -0.25);
  assert.strictEqual(earth.config.sunlightTwilightEnd, 0.35);
}

function testSunlightDirectionKeepsDayAndNightVisible() {
  const coverage = getVisibleDiscCoverage(earth.config.sunlightDirection);

  assert.ok(
    coverage.normalizedZ < earth.config.sunlightTwilightEnd,
    'sun direction should not place the center of the visible disc in full daylight'
  );
  assert.ok(coverage.night >= 0.2, 'at least 20% of the visible disc should be fully dark');
  assert.ok(coverage.day >= 0.35, 'at least 35% of the visible disc should remain fully lit');
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

function testSunlightToggleDefaultsOnAndDescribesBothStates() {
  const buttonMatch = homepageSource.match(
    /<button[^>]+id="homepage-earth-sunlight-toggle"[\s\S]+?<\/button>/
  );

  assert.ok(buttonMatch, 'homepage should include the sunlight toggle button');
  const buttonMarkup = buttonMatch[0];
  const enabled = earth.getSunlightTogglePresentation(true);
  const disabled = earth.getSunlightTogglePresentation(false);

  assert.ok(buttonMarkup.includes('type="button"'));
  assert.ok(buttonMarkup.includes('aria-pressed="true"'));
  assert.ok(buttonMarkup.includes('aria-label="关闭地球阳光"'));
  assert.ok(buttonMarkup.includes('hidden'));
  assert.ok(buttonMarkup.includes('☀ 阳光：开'));
  assert.deepStrictEqual(enabled, {
    pressed: 'true',
    label: '☀ 阳光：开',
    ariaLabel: '关闭地球阳光'
  });
  assert.deepStrictEqual(disabled, {
    pressed: 'false',
    label: '☀ 阳光：关',
    ariaLabel: '开启地球阳光'
  });
}

function testSunlightToggleStaysFixedAndSameSizeOnMobile() {
  assert.ok(
    /\.homepage-earth-sunlight-toggle\s*\{[^}]*position:\s*fixed;[^}]*top:\s*12px;[^}]*right:\s*12px;/s
      .test(stylesheetSource)
  );
  assert.ok(
    !/@media[^\{]*\([^\)]*max-width[\s\S]*homepage-earth-sunlight-toggle/.test(stylesheetSource),
    'mobile styles must not shrink the sunlight toggle'
  );
}

function testEarthPointMaterialInjectsWorldSpaceSunlight() {
  const sunlightEnabledUniform = { value: 1 };
  const material = earth.createEarthPointMaterial(THREE, {
    color: 0x747a7d,
    size: 1.75,
    opacity: 0.52,
    vertexColors: false,
    sunlightEnabledUniform
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
  assert.strictEqual(shader.uniforms.uSunlightEnabled, sunlightEnabledUniform);
  assert.ok(shader.vertexShader.includes('mat3(modelMatrix) * normalize(position)'));
  assert.ok(shader.vertexShader.includes('smoothstep(uTwilightStart, uTwilightEnd, sunlightDot)'));
  assert.ok(shader.fragmentShader.includes(
    'diffuseColor.rgb *= mix(1.0, vSunlightBrightness, uSunlightEnabled);'
  ));
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
  testSunlightDirectionKeepsDayAndNightVisible();
  testSunlightBrightnessStaysWithinApprovedBounds();
  testSunlightToggleDefaultsOnAndDescribesBothStates();
  testSunlightToggleStaysFixedAndSameSizeOnMobile();
  testEarthPointMaterialInjectsWorldSpaceSunlight();
  testOnlyEarthPointCloudUsesSunlightMaterial();
  console.log('homepage earth sunlight unit tests passed');
}

if (require.main === module) {
  run();
}

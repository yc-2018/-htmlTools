# 首页地球阳光明暗 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为首页点云地球增加固定在画面右上方的柔和阳光，使地球自转时地表自然经过亮面与暗面。

**Architecture:** 保留 Three.js `PointsMaterial` 的点尺寸、透明混合和输出编码，通过 `onBeforeCompile` 给地球点云的顶点与片元着色器注入世界空间光照。光照参数集中在现有 `config`，并提供纯 JavaScript 的亮度参考函数用于边界测试；月球、卫星、轨道和大气层继续使用现有材质。

**Tech Stack:** 原生 JavaScript、Three.js r128、Node.js `assert`、浏览器 WebGL

---

## 文件结构

- Modify: `js/homepage-earth.js` — 定义阳光配置、亮度参考函数、地球点云光照材质，并接入现有点云构建流程。
- Create: `tests/homepage-earth-lighting.test.js` — 独立验证亮度边界、着色器注入、点云接入范围和非目标回归。
- Reference: `docs/superpowers/specs/2026-07-15-homepage-earth-sunlight-design.md` — 已批准的视觉强度、作用范围和验收标准。

现有已暂存的测试删除属于用户改动。每次提交都必须使用 `git commit --only <本任务文件>`，不得提交、恢复或取消暂存这些删除项。

### Task 1: 定义可测试的阳光配置与 GPU 材质

**Files:**
- Modify: `js/homepage-earth.js:12-41`
- Modify: `js/homepage-earth.js:436-446`
- Modify: `js/homepage-earth.js:1125-1149`
- Create: `tests/homepage-earth-lighting.test.js`

- [ ] **Step 1: 写出配置、亮度边界和材质注入的失败测试**

创建 `tests/homepage-earth-lighting.test.js`：

```js
const assert = require('assert');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
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

function run() {
  testSunlightConfigurationMatchesApprovedDesign();
  testSunlightBrightnessStaysWithinApprovedBounds();
  testEarthPointMaterialInjectsWorldSpaceSunlight();
  console.log('homepage earth sunlight unit tests passed');
}

if (require.main === module) {
  run();
}
```

- [ ] **Step 2: 运行测试并确认因功能尚不存在而失败**

Run: `node tests/homepage-earth-lighting.test.js`

Expected: FAIL，首个错误指出 `earth.config.sunlightDirection` 不存在；不得因语法错误或 Three.js 加载失败而失败。

- [ ] **Step 3: 增加阳光配置、亮度参考函数和材质工厂**

在 `config` 的地球点云配置附近加入：

```js
sunlightDirection: Object.freeze({ x: 0.55, y: 0.65, z: 1 }),
sunlightNightBrightness: 0.76,
sunlightDayBrightness: 1.1,
sunlightTwilightStart: -0.25,
sunlightTwilightEnd: 0.35,
```

在 `getMoonPosition()` 后加入：

```js
function getSunlightBrightness(lightDot) {
  const twilightProgress = Math.max(0, Math.min(
    1,
    (lightDot - config.sunlightTwilightStart)
      / (config.sunlightTwilightEnd - config.sunlightTwilightStart)
  ));
  const smoothedProgress = twilightProgress
    * twilightProgress
    * (3 - 2 * twilightProgress);

  return config.sunlightNightBrightness
    + (config.sunlightDayBrightness - config.sunlightNightBrightness)
      * smoothedProgress;
}

function createEarthPointMaterial(THREE, options) {
  const material = new THREE.PointsMaterial({
    color: options.color,
    size: options.size,
    sizeAttenuation: true,
    vertexColors: options.vertexColors,
    transparent: true,
    opacity: options.opacity,
    depthWrite: false
  });
  const sunDirection = new THREE.Vector3(
    config.sunlightDirection.x,
    config.sunlightDirection.y,
    config.sunlightDirection.z
  ).normalize();

  material.name = 'earth-point-sunlight';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDirection = { value: sunDirection };
    shader.uniforms.uNightBrightness = { value: config.sunlightNightBrightness };
    shader.uniforms.uDayBrightness = { value: config.sunlightDayBrightness };
    shader.uniforms.uTwilightStart = { value: config.sunlightTwilightStart };
    shader.uniforms.uTwilightEnd = { value: config.sunlightTwilightEnd };
    shader.vertexShader = `
uniform vec3 uSunDirection;
uniform float uNightBrightness;
uniform float uDayBrightness;
uniform float uTwilightStart;
uniform float uTwilightEnd;
varying float vSunlightBrightness;
${shader.vertexShader}
`.replace('#include <begin_vertex>', `
#include <begin_vertex>
vec3 worldSurfaceDirection = normalize(mat3(modelMatrix) * normalize(position));
float sunlightDot = dot(worldSurfaceDirection, uSunDirection);
float sunlightMix = smoothstep(uTwilightStart, uTwilightEnd, sunlightDot);
vSunlightBrightness = mix(uNightBrightness, uDayBrightness, sunlightMix);
`);
    shader.fragmentShader = `
varying float vSunlightBrightness;
${shader.fragmentShader}
`.replace('#include <color_fragment>', `
#include <color_fragment>
diffuseColor.rgb *= vSunlightBrightness;
`);
  };
  material.customProgramCacheKey = () => 'homepage-earth-sunlight-v1';

  return material;
}
```

在模块导出对象中加入：

```js
getSunlightBrightness,
createEarthPointMaterial,
```

- [ ] **Step 4: 运行聚焦测试并确认通过**

Run: `node tests/homepage-earth-lighting.test.js`

Expected: PASS，输出 `homepage earth sunlight unit tests passed`。

- [ ] **Step 5: 只提交 Task 1 文件**

Run:

```bash
git add -- tests/homepage-earth-lighting.test.js
git commit --only js/homepage-earth.js tests/homepage-earth-lighting.test.js -m "Add homepage earth sunlight material"
```

Expected: 提交只包含 `js/homepage-earth.js` 与 `tests/homepage-earth-lighting.test.js`；原有测试删除仍保持已暂存且不进入提交。

### Task 2: 将光照材质接入地球三层点云

**Files:**
- Modify: `tests/homepage-earth-lighting.test.js`
- Modify: `js/homepage-earth.js:833-853`

- [ ] **Step 1: 写出点云接入范围的失败测试**

在测试文件顶部加入 `fs` 和源码读取：

```js
const fs = require('fs');

const scriptPath = path.join(repoRoot, 'js', 'homepage-earth.js');
const scriptSource = fs.readFileSync(scriptPath, 'utf8');
```

加入测试：

```js
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
```

在 `run()` 中调用：

```js
testOnlyEarthPointCloudUsesSunlightMaterial();
```

- [ ] **Step 2: 运行测试并确认地球点云尚未接入而失败**

Run: `node tests/homepage-earth-lighting.test.js`

Expected: FAIL at `createPointsBlock.includes('createEarthPointMaterial(THREE, {')`，前三个 Task 1 测试仍通过。

- [ ] **Step 3: 用光照材质替换 `createPoints()` 中的普通点材质**

将 `createPoints()` 的返回值改为：

```js
return new THREE.Points(
  geometry,
  createEarthPointMaterial(THREE, {
    color,
    size,
    opacity,
    vertexColors: Boolean(colors)
  })
);
```

不要修改月球、月球轨道、卫星尾迹或大气层材质。

- [ ] **Step 4: 运行测试并确认通过**

Run: `node tests/homepage-earth-lighting.test.js`

Expected: PASS，输出 `homepage earth sunlight unit tests passed`。

- [ ] **Step 5: 只提交 Task 2 文件**

Run:

```bash
git commit --only js/homepage-earth.js tests/homepage-earth-lighting.test.js -m "Apply sunlight to homepage earth points"
```

Expected: 提交只包含两个本功能文件；原有测试删除仍保持已暂存且不进入提交。

### Task 3: 回归检查与浏览器验收

**Files:**
- Verify: `js/homepage-earth.js`
- Verify: `tests/homepage-earth-lighting.test.js`
- Verify: `index.html`

- [ ] **Step 1: 运行语法和聚焦自动化测试**

Run:

```bash
node --check js/homepage-earth.js
node tests/homepage-earth-lighting.test.js
```

Expected: 语法检查退出码为 `0`；测试输出 `homepage earth sunlight unit tests passed`。

- [ ] **Step 2: 检查补丁格式和提交边界**

Run:

```bash
git diff --check HEAD~2..HEAD
git show --stat --oneline HEAD~1..HEAD
git status --short
```

Expected: `git diff --check` 无输出；最近两个功能提交只涉及 `js/homepage-earth.js` 与 `tests/homepage-earth-lighting.test.js`；用户原有测试删除仍为已暂存状态，`.superpowers/` 仍未跟踪。

- [ ] **Step 3: 启动本地静态服务器**

Run: `py -m http.server 4173`

Expected: 输出 `Serving HTTP on ... port 4173`。服务器必须在验证结束后停止。

- [ ] **Step 4: 在 Chrome 或 Edge 验证桌面与移动端**

打开 `http://localhost:4173/index.html`，分别以桌面宽度和约 `390 × 844` 的移动端视口检查：

- 初始地球右上侧略亮、左下侧略暗，中国红色仍清楚。
- 等待地球旋转后，明暗方向固定在画面中，地表点会穿过柔和晨昏线。
- 暗面仍能辨认海洋、普通陆地和中国点。
- 月球、卫星、空间站、轨道、大气层、首页文字和鼠标视差保持原有观感。
- 控制台没有 JavaScript、WebGL 或着色器警告，桌面与移动端动画都流畅。

- [ ] **Step 5: 停止静态服务器并确认工作区状态**

停止 `py -m http.server 4173`，然后运行：

```bash
git status --short
```

Expected: 本功能文件干净；仅保留用户原有已暂存测试删除和 Visual Companion 生成的未跟踪 `.superpowers/` 目录。

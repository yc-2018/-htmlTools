# 首页地球阳光方向修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 调整固定太阳的方向，让点云地球保留轻微光照的同时呈现一眼可辨的左暗右亮。

**Architecture:** 保留现有 `PointsMaterial.onBeforeCompile` 光照、亮度范围和晨昏线，只修改 `config.sunlightDirection`。测试通过均匀采样正面可见圆盘，直接约束完整暗面和亮面的最低占比，避免太阳再次过度朝向镜头。

**Tech Stack:** 原生 JavaScript、Three.js r128、Node.js `assert`、Edge WebGL

---

## 文件结构

- Modify: `tests/homepage-earth-lighting.test.js` — 更新太阳方向契约，并增加可见圆盘明暗覆盖率回归测试。
- Modify: `js/homepage-earth.js` — 只替换 `config.sunlightDirection` 的三个分量。
- Reference: `docs/superpowers/specs/2026-07-15-homepage-earth-sunlight-direction-correction-design.md` — 已批准的根因、参数和验收范围。

### Task 1: 用可见球面覆盖率测试驱动太阳方向修正

**Files:**
- Modify: `tests/homepage-earth-lighting.test.js:11-33`
- Modify: `tests/homepage-earth-lighting.test.js:90-96`
- Modify: `js/homepage-earth.js:38`

- [ ] **Step 1: 写出新方向和可见明暗覆盖率的失败测试**

在 `assertClose()` 后加入：

```js
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
```

把配置期望改为：

```js
assert.deepStrictEqual(earth.config.sunlightDirection, {
  x: 0.8,
  y: 0.35,
  z: 0.25
});
```

加入覆盖率测试：

```js
function testSunlightDirectionKeepsDayAndNightVisible() {
  const coverage = getVisibleDiscCoverage(earth.config.sunlightDirection);

  assert.ok(
    coverage.normalizedZ < earth.config.sunlightTwilightEnd,
    'sun direction should not place the center of the visible disc in full daylight'
  );
  assert.ok(coverage.night >= 0.2, 'at least 20% of the visible disc should be fully dark');
  assert.ok(coverage.day >= 0.35, 'at least 35% of the visible disc should remain fully lit');
}
```

在 `run()` 中紧跟配置测试调用：

```js
testSunlightDirectionKeepsDayAndNightVisible();
```

- [ ] **Step 2: 运行测试并确认旧方向无法满足新契约**

Run: `node tests/homepage-earth-lighting.test.js`

Expected: FAIL，配置差异显示实际值仍为 `{ x: 0.55, y: 0.65, z: 1 }`；失败原因必须是旧太阳方向，而不是语法或依赖错误。

- [ ] **Step 3: 只修改太阳方向配置**

将 `js/homepage-earth.js` 中的方向改为：

```js
sunlightDirection: Object.freeze({ x: 0.8, y: 0.35, z: 0.25 }),
```

不得修改 `sunlightNightBrightness`、`sunlightDayBrightness`、晨昏线、着色器或材质参数。

- [ ] **Step 4: 运行聚焦测试并确认通过**

Run: `node tests/homepage-earth-lighting.test.js`

Expected: PASS，输出 `homepage earth sunlight unit tests passed`。

- [ ] **Step 5: 运行语法和补丁范围检查**

Run:

```bash
node --check js/homepage-earth.js
git diff --check
git diff --name-only
```

Expected: 语法检查退出码为 `0`，`git diff --check` 无输出，改动文件只有 `js/homepage-earth.js` 与 `tests/homepage-earth-lighting.test.js`。

- [ ] **Step 6: 提交参数修正**

Run:

```bash
git add -- js/homepage-earth.js tests/homepage-earth-lighting.test.js
git commit -m "Fix homepage earth sunlight direction"
```

Expected: 一个提交只包含两个目标文件。

### Task 2: 浏览器复验与最终检查

**Files:**
- Verify: `index.html`
- Verify: `js/homepage-earth.js`
- Verify: `tests/homepage-earth-lighting.test.js`

- [ ] **Step 1: 启动本地静态服务器**

Run: `py -m http.server 4173 --bind 127.0.0.1`

Expected: 输出 `Serving HTTP on 127.0.0.1 port 4173`。

- [ ] **Step 2: 生成并检查桌面、移动端 Edge WebGL 截图**

在 PowerShell 中运行：

```powershell
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$output = Join-Path $env:TEMP 'codex-homepage-earth-direction-fix'
New-Item -ItemType Directory -Force -Path $output | Out-Null

$desktopArgs = @(
  '--headless=new',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--use-angle=swiftshader',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1440,900',
  '--virtual-time-budget=5000',
  "--user-data-dir=$output\desktop-profile",
  "--screenshot=$output\desktop.png",
  'http://127.0.0.1:4173/index.html'
)
$mobileArgs = @(
  '--headless=new',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--use-angle=swiftshader',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=390,844',
  '--virtual-time-budget=5000',
  "--user-data-dir=$output\mobile-profile",
  "--screenshot=$output\mobile.png",
  'http://127.0.0.1:4173/index.html'
)

& $edge @desktopArgs
& $edge @mobileArgs
```

确认 `$output\desktop.png` 与 `$output\mobile.png` 存在，再用图像查看工具检查。验收要求：

- 地球左侧较暗、右侧较亮，第一眼即可辨认。
- 明暗仍然轻微，暗面海洋、陆地和中国红色点保持清楚。
- 页面布局、月球、卫星、轨道和大气层没有非预期变化。
- Edge 退出码为 `0`，页面和着色器成功渲染。

- [ ] **Step 3: 停止服务器并运行最终验证**

停止静态服务器，然后运行：

```bash
node --check js/homepage-earth.js
node tests/homepage-earth-lighting.test.js
git diff --check HEAD^..HEAD
git status --short
```

Expected: 语法和测试退出码为 `0`，测试输出 `homepage earth sunlight unit tests passed`，补丁检查无输出，工作区干净。

(function createHomepageEarthModule(factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }

  api.autoInit();
})(function buildHomepageEarthApi() {
  'use strict';

  const config = Object.freeze({
    finalDiameterVmin: 55,
    initialDiameterVmin: 140,
    introDurationMs: 3000,
    rotationSpeed: 0.06,
    chinaFacingRotationX: 35 * Math.PI / 180,
    chinaFacingRotationY: -Math.PI / 12,
    chinaFacingRotationZ: 0,
    maxPointerRatio: 0.1,
    maxDpr: 1.5,
    mobileBreakpoint: 768,
    desktopSatelliteCount: 14,
    mobileSatelliteCount: 14,
    desktopPointCount: 6600,
    mobilePointCount: 4200,
    pointerEase: 0.035,
    landPointSizePx: 1.6,
    oceanPointSizePx: 1.05,
    orbitBandCount: 4,
    trailLength: 12,
    trailAngleStep: 0.035,
    trailPointSizePx: 2.1,
    chinaPointColor: 0x9b7376,
    chinaPointSizePx: 2.4,
    chinaPointOpacity: 0.82
  });

  const orbitBands = Object.freeze([
    { count: 4, orbitRadius: 0.72, speed: 0.22, inclination: -1.05, ascendingNode: 0.18, direction: 1 },
    { count: 4, orbitRadius: 0.86, speed: 0.18, inclination: -0.38, ascendingNode: 1.12, direction: -1 },
    { count: 3, orbitRadius: 1.01, speed: 0.15, inclination: 0.46, ascendingNode: 2.08, direction: 1 },
    { count: 3, orbitRadius: 1.16, speed: 0.12, inclination: 1.08, ascendingNode: 2.82, direction: -1 }
  ]);

  const landRegions = Object.freeze([
    { longitude: -105, latitude: 47, longitudeRadius: 34, latitudeRadius: 24, rotation: -0.2 },
    { longitude: -93, latitude: 22, longitudeRadius: 18, latitudeRadius: 17, rotation: 0.35 },
    { longitude: -61, latitude: -17, longitudeRadius: 19, latitudeRadius: 35, rotation: -0.2 },
    { longitude: -42, latitude: 72, longitudeRadius: 13, latitudeRadius: 10, rotation: 0.1 },
    { longitude: 12, latitude: 51, longitudeRadius: 21, latitudeRadius: 12, rotation: -0.15 },
    { longitude: 19, latitude: 7, longitudeRadius: 25, latitudeRadius: 35, rotation: 0.08 },
    { longitude: 61, latitude: 49, longitudeRadius: 43, latitudeRadius: 19, rotation: 0.04 },
    { longitude: 105, latitude: 34, longitudeRadius: 39, latitudeRadius: 24, rotation: -0.14 },
    { longitude: 136, latitude: -25, longitudeRadius: 22, latitudeRadius: 14, rotation: 0.08 },
    { longitude: 48, latitude: -20, longitudeRadius: 7, latitudeRadius: 13, rotation: -0.2 }
  ]);

  const chinaMainlandPolygons = Object.freeze([
    Object.freeze([
      [73.5, 39.5], [78, 35], [79, 31], [86, 27], [96, 28], [99, 24],
      [108, 20], [113, 22], [119, 25], [122, 30], [120, 36], [117, 41],
      [111, 42], [105, 42], [100, 45], [96, 43], [92, 45], [87, 49],
      [81, 47], [77, 42]
    ]),
    Object.freeze([
      [116, 40], [121, 39], [125, 42], [131, 43], [135, 48], [132, 53],
      [125, 53], [119, 48]
    ])
  ]);

  const chinaIslandRegions = Object.freeze([
    { longitude: 121, latitude: 23.7, longitudeRadius: 1.35, latitudeRadius: 2.55 },
    { longitude: 110, latitude: 19.25, longitudeRadius: 1.75, latitudeRadius: 1.35 }
  ]);

  const chinaIslandHighlightCoordinates = Object.freeze([
    Object.freeze([120.5, 22.2]),
    Object.freeze([120.7, 22.8]),
    Object.freeze([120.9, 23.5]),
    Object.freeze([121.1, 24.2]),
    Object.freeze([121.3, 24.9]),
    Object.freeze([121.2, 25.2]),
    Object.freeze([109.2, 18.6]),
    Object.freeze([109.8, 19]),
    Object.freeze([110.4, 19.4]),
    Object.freeze([110.8, 19.8]),
    Object.freeze([111.1, 20])
  ]);

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function easeOutCubic(progress) {
    const normalized = clamp(progress, 0, 1);
    return 1 - Math.pow(1 - normalized, 3);
  }

  function getDeviceSettings(viewportWidth) {
    const isMobile = viewportWidth < config.mobileBreakpoint;

    return {
      satelliteCount: isMobile
        ? config.mobileSatelliteCount
        : config.desktopSatelliteCount,
      pointerParallax: !isMobile
    };
  }

  function getSceneMetrics(viewportWidth, viewportHeight) {
    const shortEdge = Math.min(viewportWidth, viewportHeight);

    return {
      finalDiameter: shortEdge * config.finalDiameterVmin / 100,
      initialDiameter: shortEdge * config.initialDiameterVmin / 100,
      maxPointerX: viewportWidth * config.maxPointerRatio,
      maxPointerY: viewportHeight * config.maxPointerRatio
    };
  }

  function getIntroDiameter(sceneMetrics, elapsedMs) {
    const progress = elapsedMs / config.introDurationMs;
    const easedProgress = easeOutCubic(progress);

    return sceneMetrics.initialDiameter
      + (sceneMetrics.finalDiameter - sceneMetrics.initialDiameter) * easedProgress;
  }

  function getPointerTarget(
    clientX,
    clientY,
    viewportWidth,
    viewportHeight,
    sceneMetrics,
    pointerParallax
  ) {
    if (!pointerParallax) {
      return { x: 0, y: 0 };
    }

    const normalizedX = clientX / viewportWidth * 2 - 1;
    const normalizedY = clientY / viewportHeight * 2 - 1;

    const targetX = clamp(normalizedX, -1, 1) * sceneMetrics.maxPointerX;
    const targetY = clamp(-normalizedY, -1, 1) * sceneMetrics.maxPointerY;

    return {
      x: targetX === 0 ? 0 : targetX,
      y: targetY === 0 ? 0 : targetY
    };
  }

  function longitudeDistance(first, second) {
    const rawDistance = Math.abs(first - second) % 360;
    return rawDistance > 180 ? 360 - rawDistance : rawDistance;
  }

  function isInsideLandRegion(longitude, latitude, region) {
    const rawLongitude = longitudeDistance(longitude, region.longitude);
    const longitudeDirection = longitude >= region.longitude ? 1 : -1;
    const x = rawLongitude * longitudeDirection;
    const y = latitude - region.latitude;
    const cosine = Math.cos(region.rotation);
    const sine = Math.sin(region.rotation);
    const rotatedX = x * cosine - y * sine;
    const rotatedY = x * sine + y * cosine;
    const normalizedX = rotatedX / region.longitudeRadius;
    const normalizedY = rotatedY / region.latitudeRadius;

    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }

  function isLandCoordinate(longitude, latitude) {
    if (latitude < -60) {
      return true;
    }

    return landRegions.some((region) => isInsideLandRegion(longitude, latitude, region));
  }

  function isInsidePolygon(longitude, latitude, polygon) {
    let inside = false;

    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      const currentPoint = polygon[current];
      const previousPoint = polygon[previous];
      const crossesLatitude = currentPoint[1] > latitude !== previousPoint[1] > latitude;
      const intersectionLongitude = (previousPoint[0] - currentPoint[0])
        * (latitude - currentPoint[1])
        / (previousPoint[1] - currentPoint[1])
        + currentPoint[0];

      if (crossesLatitude && longitude < intersectionLongitude) {
        inside = !inside;
      }
    }

    return inside;
  }

  function isInsideIslandRegion(longitude, latitude, region) {
    const normalizedLongitude = (longitude - region.longitude) / region.longitudeRadius;
    const normalizedLatitude = (latitude - region.latitude) / region.latitudeRadius;

    return normalizedLongitude * normalizedLongitude
      + normalizedLatitude * normalizedLatitude <= 1;
  }

  function isChinaCoordinate(longitude, latitude) {
    return chinaMainlandPolygons.some((polygon) => (
      isInsidePolygon(longitude, latitude, polygon)
    )) || chinaIslandRegions.some((region) => (
      isInsideIslandRegion(longitude, latitude, region)
    ));
  }

  function getGlobeCoordinate(longitude, latitude) {
    const latitudeRadians = latitude * Math.PI / 180;
    const longitudeRadians = longitude * Math.PI / 180;
    const horizontalRadius = Math.cos(latitudeRadians);

    return {
      x: -Math.cos(longitudeRadians) * horizontalRadius,
      y: Math.sin(latitudeRadians),
      z: Math.sin(longitudeRadians) * horizontalRadius
    };
  }

  function getFacingScreenPosition(longitude, latitude) {
    const coordinate = getGlobeCoordinate(longitude, latitude);
    const cosineY = Math.cos(config.chinaFacingRotationY);
    const sineY = Math.sin(config.chinaFacingRotationY);
    const afterY = {
      x: cosineY * coordinate.x + sineY * coordinate.z,
      y: coordinate.y,
      z: -sineY * coordinate.x + cosineY * coordinate.z
    };
    const cosineX = Math.cos(config.chinaFacingRotationX);
    const sineX = Math.sin(config.chinaFacingRotationX);
    const afterX = {
      x: afterY.x,
      y: cosineX * afterY.y - sineX * afterY.z,
      z: sineX * afterY.y + cosineX * afterY.z
    };
    const cosineZ = Math.cos(config.chinaFacingRotationZ);
    const sineZ = Math.sin(config.chinaFacingRotationZ);

    return {
      x: cosineZ * afterX.x - sineZ * afterX.y,
      y: sineZ * afterX.x + cosineZ * afterX.y,
      z: afterX.z
    };
  }

  function getFacingScreenX(longitude, latitude) {
    return getFacingScreenPosition(longitude, latitude).x;
  }

  function getChinaIslandHighlightCoordinates() {
    return chinaIslandHighlightCoordinates.map((coordinate) => coordinate.slice());
  }

  function createSatelliteSpecs() {
    const satellites = [];

    orbitBands.forEach((band, bandIndex) => {
      for (let index = 0; index < band.count; index += 1) {
        satellites.push({
          bandIndex,
          orbitRadius: band.orbitRadius,
          speed: band.speed,
          inclination: band.inclination,
          ascendingNode: band.ascendingNode,
          phase: (index / band.count * Math.PI * 2 + bandIndex * 0.31) % (Math.PI * 2),
          size: 0.014 + (index + bandIndex) % 3 * 0.0025,
          opacity: 0.54 + (index + bandIndex) % 3 * 0.08,
          direction: band.direction
        });
      }
    });

    return satellites;
  }

  function getSatellitePosition(spec, elapsedSeconds, angleOffset = 0) {
    const angle = spec.phase
      + elapsedSeconds * spec.speed * spec.direction
      + angleOffset;
    const orbitRadius = spec.orbitRadius * 2;

    return {
      x: Math.cos(angle) * orbitRadius,
      y: 0,
      z: Math.sin(angle) * orbitRadius
    };
  }

  function createTrailPositions(spec, elapsedSeconds) {
    const positions = [];

    for (let index = 1; index <= config.trailLength; index += 1) {
      const position = getSatellitePosition(
        spec,
        elapsedSeconds,
        -spec.direction * config.trailAngleStep * index
      );
      positions.push(position.x, position.y, position.z);
    }

    return positions;
  }

  function autoInit() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const start = () => {
      try {
        initScene(window, document, window.THREE);
      } catch (error) {
        document.documentElement.classList.add('earth-background-fallback');
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }

  function initScene(window, document, THREE) {
    const canvas = document.getElementById('homepage-earth-background');

    if (!canvas || !THREE || !window.WebGLRenderingContext) {
      document.documentElement.classList.add('earth-background-fallback');
      return null;
    }

    let renderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power'
      });
    } catch (error) {
      document.documentElement.classList.add('earth-background-fallback');
      return null;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);
    const sceneGroup = new THREE.Group();
    const globeGroup = new THREE.Group();
    const satellitesGroup = new THREE.Group();
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const clock = new THREE.Clock();
    const satelliteGeometry = new THREE.SphereBufferGeometry(1, 8, 6);
    const satellites = [];
    let viewportWidth = 1;
    let viewportHeight = 1;
    let sceneMetrics = getSceneMetrics(viewportWidth, viewportHeight);
    let deviceSettings = getDeviceSettings(viewportWidth);
    let currentDeviceMode = '';
    let animationFrame = 0;
    let introStartTime = 0;
    let elapsedSeconds = 0;
    let pageVisible = !document.hidden;
    let contextAvailable = true;

    renderer.setClearColor(0xffffff, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    scene.add(sceneGroup);
    sceneGroup.add(globeGroup);
    sceneGroup.add(satellitesGroup);
    camera.position.z = 1000;

    function createPointCloud() {
      const pointCount = viewportWidth < config.mobileBreakpoint
        ? config.mobilePointCount
        : config.desktopPointCount;
      const chinaPositions = [];
      const landPositions = [];
      const oceanPositions = [];
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));

      for (let index = 0; index < pointCount; index += 1) {
        const y = 1 - index / (pointCount - 1) * 2;
        const horizontalRadius = Math.sqrt(Math.max(0, 1 - y * y));
        const angle = goldenAngle * index;
        const x = Math.cos(angle) * horizontalRadius;
        const z = Math.sin(angle) * horizontalRadius;
        const longitude = Math.atan2(z, x) * 180 / Math.PI;
        const latitude = Math.asin(y) * 180 / Math.PI;
        let target = oceanPositions;

        if (isChinaCoordinate(longitude, latitude)) {
          target = chinaPositions;
        } else if (isLandCoordinate(longitude, latitude)) {
          target = landPositions;
        }

        if (target === oceanPositions && index % 3 !== 0) {
          continue;
        }

        const globeCoordinate = getGlobeCoordinate(longitude, latitude);
        target.push(globeCoordinate.x, globeCoordinate.y, globeCoordinate.z);
      }

      appendIslandHighlightPoints(chinaPositions);

      const depthMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        colorWrite: false,
        depthWrite: true
      });
      const depthSphere = new THREE.Mesh(
        new THREE.SphereBufferGeometry(0.992, 48, 32),
        depthMaterial
      );
      const atmosphere = new THREE.Mesh(
        new THREE.SphereBufferGeometry(1.05, 48, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.13,
          side: THREE.BackSide,
          depthWrite: false
        })
      );

      depthSphere.renderOrder = -2;
      globeGroup.add(depthSphere);
      globeGroup.add(atmosphere);
      globeGroup.add(createPoints(
        landPositions,
        0x747a7d,
        config.landPointSizePx,
        0.46
      ));
      globeGroup.add(createPoints(
        oceanPositions,
        0xaeb3b5,
        config.oceanPointSizePx,
        0.24
      ));
      globeGroup.add(createPoints(
        chinaPositions,
        config.chinaPointColor,
        config.chinaPointSizePx,
        config.chinaPointOpacity
      ));
      globeGroup.rotation.order = 'YXZ';
      globeGroup.rotation.x = config.chinaFacingRotationX;
      globeGroup.rotation.y = config.chinaFacingRotationY;
      globeGroup.rotation.z = config.chinaFacingRotationZ;
    }

    function appendIslandHighlightPoints(positions) {
      getChinaIslandHighlightCoordinates().forEach(([longitude, latitude]) => {
        const globeCoordinate = getGlobeCoordinate(longitude, latitude);
        positions.push(
          globeCoordinate.x,
          globeCoordinate.y,
          globeCoordinate.z
        );
      });
    }

    function createPoints(positions, color, size, opacity) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      return new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color,
          size,
          sizeAttenuation: true,
          transparent: true,
          opacity,
          depthWrite: false
        })
      );
    }

    function clearGroup(group) {
      while (group.children.length) {
        const child = group.children.pop();
        child.traverse((object) => {
          if (object.material) {
            object.material.dispose();
          }
          if (object.geometry && object.geometry !== satelliteGeometry) {
            object.geometry.dispose();
          }
        });
      }
    }

    function createTrailColors() {
      const colors = [];
      const startColor = new THREE.Color(0x858b8e);
      const endColor = new THREE.Color(0xe5e7e8);

      for (let index = 0; index < config.trailLength; index += 1) {
        const progress = index / Math.max(1, config.trailLength - 1);
        const color = startColor.clone().lerp(endColor, progress);
        colors.push(color.r, color.g, color.b);
      }

      return colors;
    }

    function buildSatellites() {
      clearGroup(satellitesGroup);
      satellites.length = 0;

      createSatelliteSpecs().forEach((spec) => {
        const orbitPlane = new THREE.Group();
        const material = new THREE.MeshBasicMaterial({
          color: 0x6f7578,
          transparent: true,
          opacity: spec.opacity,
          depthWrite: true
        });
        const satellite = new THREE.Mesh(satelliteGeometry, material);
        const trailGeometry = new THREE.BufferGeometry();
        trailGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(createTrailPositions(spec, 0), 3)
        );
        trailGeometry.setAttribute(
          'color',
          new THREE.Float32BufferAttribute(createTrailColors(), 3)
        );
        const trail = new THREE.Points(
          trailGeometry,
          new THREE.PointsMaterial({
            size: config.trailPointSizePx,
            sizeAttenuation: false,
            vertexColors: true,
            transparent: true,
            opacity: 0.72,
            depthWrite: false
          })
        );

        orbitPlane.rotation.x = spec.inclination;
        orbitPlane.rotation.z = spec.ascendingNode;
        orbitPlane.add(trail);
        orbitPlane.add(satellite);
        satellitesGroup.add(orbitPlane);
        satellites.push({ orbitPlane, satellite, trail, spec });
      });
    }

    function rebuildResponsiveObjects() {
      const nextMode = viewportWidth < config.mobileBreakpoint ? 'mobile' : 'desktop';

      if (nextMode === currentDeviceMode) {
        return;
      }

      currentDeviceMode = nextMode;
      deviceSettings = getDeviceSettings(viewportWidth);
      clearGroup(globeGroup);
      createPointCloud();
      buildSatellites();
    }

    function updateSatellites() {
      satellites.forEach(({ satellite, trail, spec }) => {
        const position = getSatellitePosition(spec, elapsedSeconds);
        const trailPositions = createTrailPositions(spec, elapsedSeconds);
        const trailAttribute = trail.geometry.getAttribute('position');

        satellite.position.set(position.x, position.y, position.z);
        satellite.scale.setScalar(spec.size);
        trailAttribute.array.set(trailPositions);
        trailAttribute.needsUpdate = true;
      });
    }

    function updateScale(timestamp) {
      if (!introStartTime) {
        introStartTime = timestamp;
      }

      const diameter = getIntroDiameter(
        sceneMetrics,
        timestamp - introStartTime
      );
      sceneGroup.scale.setScalar(diameter / 2);
    }

    function updatePointer() {
      pointer.x += (pointer.targetX - pointer.x) * config.pointerEase;
      pointer.y += (pointer.targetY - pointer.y) * config.pointerEase;
      sceneGroup.position.x = pointer.x;
      sceneGroup.position.y = pointer.y;
    }

    function render(timestamp = window.performance.now()) {
      const delta = Math.min(clock.getDelta(), 0.05);

      elapsedSeconds += delta;
      globeGroup.rotation.y += config.rotationSpeed * delta;
      updatePointer();

      updateScale(timestamp);
      updateSatellites();
      renderer.render(scene, camera);
    }

    function animate(timestamp) {
      animationFrame = 0;

      if (!pageVisible || !contextAvailable) {
        render(timestamp);
        return;
      }

      render(timestamp);
      animationFrame = window.requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (animationFrame || !pageVisible || !contextAvailable) {
        return;
      }

      clock.start();

      animationFrame = window.requestAnimationFrame(animate);
    }

    function stopAnimation() {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      clock.stop();
    }

    function resize() {
      viewportWidth = Math.max(1, window.innerWidth);
      viewportHeight = Math.max(1, window.innerHeight);
      sceneMetrics = getSceneMetrics(viewportWidth, viewportHeight);
      camera.left = -viewportWidth / 2;
      camera.right = viewportWidth / 2;
      camera.top = viewportHeight / 2;
      camera.bottom = -viewportHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.maxDpr));
      renderer.setSize(viewportWidth, viewportHeight, false);
      rebuildResponsiveObjects();

      if (!introStartTime) {
        sceneGroup.scale.setScalar(sceneMetrics.finalDiameter / 2);
      }

      render();
    }

    function handlePointerMove(event) {
      const target = getPointerTarget(
        event.clientX,
        event.clientY,
        viewportWidth,
        viewportHeight,
        sceneMetrics,
        deviceSettings.pointerParallax
      );
      pointer.targetX = target.x;
      pointer.targetY = target.y;
    }

    function resetPointer() {
      pointer.targetX = 0;
      pointer.targetY = 0;
    }

    function handleVisibilityChange() {
      pageVisible = !document.hidden;

      if (pageVisible) {
        startAnimation();
      } else {
        stopAnimation();
      }
    }

    function handleContextLost(event) {
      event.preventDefault();
      contextAvailable = false;
      stopAnimation();
      document.documentElement.classList.add('earth-background-fallback');
    }

    function handleContextRestored() {
      contextAvailable = true;
      document.documentElement.classList.remove('earth-background-fallback');
      resize();
      startAnimation();
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', resetPointer);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    resize();
    introStartTime = 0;
    startAnimation();

    return {
      render,
      resize,
      stop: stopAnimation
    };
  }

  return Object.freeze({
    config,
    easeOutCubic,
    getDeviceSettings,
    getSceneMetrics,
    getIntroDiameter,
    getPointerTarget,
    createSatelliteSpecs,
    getSatellitePosition,
    createTrailPositions,
    isLandCoordinate,
    isChinaCoordinate,
    getChinaIslandHighlightCoordinates,
    getFacingScreenX,
    getFacingScreenPosition,
    initScene,
    autoInit
  });
});

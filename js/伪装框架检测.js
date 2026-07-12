/**
 * 伪装 React DevTools / Vue DevTools 检测的脚本
 * 不引入任何真实框架，仅设置这些扩展依赖的全局标记来"骗过"检测。
 * 用法：在 <head> 里尽早引入（越早越好，最好在其他脚本之前）。
 */

/* ---------- 伪装 React（production build） ---------- */
(function () {
  var hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook) return; // 没装 React DevTools 扩展，跳过

  var rendererId = hook.inject({
    findFiberByHostInstance: function () { return null; },
    bundleType: 0, // 0 = production（改成 1 会显示红色的"开发版"警告图标）
    version: '18.3.0',
    rendererPackageName: 'fake-react-dom'
  });

  var fakeRoot = { current: { tag: 3, child: null } };
  if (typeof hook.onCommitFiberRoot === 'function') {
    hook.onCommitFiberRoot(rendererId, fakeRoot, undefined, false);
  }
})();

/* ---------- 伪装 Vue3 + Nuxt ---------- */
(function () {
  // 仅这一行就足以触发 "Vue.js is detected on this page"
  window.__VUE__ = true;

  // 仅这一行就足以触发提示文案里的 "Nuxt.js"
  window.__NUXT__ = {
    config: {},
    data: {},
    state: {},
    _payloadReducers: {}
  };

  // 可选：进一步向旧版协议的 hook 上报一次 app:init
  // （新版 Vue/Nuxt DevTools 不校验这个，加不加效果一样）
  var hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
  if (hook && typeof hook.emit === 'function') {
    var fakeApp = {
      version: '3.4.21',
      _instance: { type: {}, subTree: {} },
      _container: document.body,
      config: { globalProperties: {} }
    };
    hook.emit('app:init', fakeApp, fakeApp.version, {
      Fragment: Symbol('Fragment'),
      Text: Symbol('Text'),
      Comment: Symbol('Comment'),
      Static: Symbol('Static')
    });
  }
})();

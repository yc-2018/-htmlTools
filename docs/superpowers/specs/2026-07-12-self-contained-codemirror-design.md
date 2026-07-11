# CodeMirror 依赖自包含与 Java 工具升级设计

## 目标

恢复仓库中“每个 HTML 工具可独立复制并直接打开”的约束，移除工具对仓库根目录共享 CodeMirror 的依赖。同时，仅为新加入的 `java一行的多行注释一行化` 升级编辑器版本；旧文本差异工具不做技术栈升级。

## 版本与目录边界

### 文本差异对比

`文本差异对比` 继续使用 Mergely 3.3.7 和与其兼容的 CodeMirror 3.1。以下核心文件恢复到 `文本差异对比/lib/`：

- `codemirror.js`
- `codemirror.min.js`
- `codemirror.css`

页面恢复使用 `./lib/` 相对路径。Mergely、jQuery 和 `searchcursor.js` 不升级、不迁移，也不改变现有行为。

`文本差异对比(新)` 已经自包含 Mergely 5.0，本次不修改。

### YAML 与 Properties 转换工具

`yaml-properties-converter` 继续使用当前兼容的 CodeMirror 3.1，但在自己的 `vendor/codemirror/` 中保存：

- `codemirror.js`
- `codemirror.css`

页面仅引用本工具目录下的资源，不再引用根目录或其他工具目录。

### Java 注释一行化工具

`java一行的多行注释一行化` 使用 CodeMirror 5.65.20，这是经典 CodeMirror 可直接通过本地 `<script>` 和 `<link>` 使用的最终稳定版本。资源保存在：

- `vendor/codemirror/lib/codemirror.js`
- `vendor/codemirror/lib/codemirror.css`
- `vendor/codemirror/mode/clike/clike.js`

页面按“核心 CSS、核心 JavaScript、clike mode、应用脚本”的顺序加载，并让输入、输出编辑器继续使用 `text/x-java` mode。格式化、实时转换、字符计数、复制、清空、空行选项、桌面与移动端布局保持不变。

不采用 CodeMirror 6，因为它需要模块化依赖和打包流程，不符合本仓库直接打开 HTML 文件运行的约束。

## 共享目录清理

完成迁移后删除仓库根目录 `lib/codemirror/`。三个消费者的 HTML 中不得出现 `../lib/codemirror/` 或指向其他工具目录的 CodeMirror 路径。

## 资源来源与许可

CodeMirror 5.65.20 的核心与 clike mode 从 CodeMirror 官方发布包获取并本地保存。保留上游文件中的许可声明，不依赖 CDN 运行页面。

## 测试与验收

自动化检查覆盖：

- 根目录共享 CodeMirror 不再存在。
- 旧文本差异工具的 CodeMirror 3.1 文件与本地引用恢复，Mergely 版本和文件保持不变。
- YAML 工具仅引用自身 `vendor/codemirror/`。
- Java 工具仅引用自身 CodeMirror 5.65.20 文件，并加载 `clike` Java mode。
- 所有 HTML 中不再存在跨工具 CodeMirror 引用。
- Java 工具的内联脚本仍可解析，原有行为相关结构断言继续通过。

浏览器验收覆盖：

- 三个工具均能从各自目录的本地资源初始化编辑器。
- 旧文本差异工具继续显示双栏差异编辑器。
- YAML 工具继续显示双栏编辑器并正常转换。
- Java 工具显示 Java 关键字、字符串与注释高亮，实时格式化、复制、清空和空行选项正常。
- Java 工具在移动端宽度下保持上下布局且无横向溢出。

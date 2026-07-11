# 共享 CodeMirror 与 Java 注释工具编辑器升级设计

## 目标

将当前位于 `文本差异对比/lib/` 中的 CodeMirror 核心资源提升为仓库级共享依赖，并让 `java一行的多行注释一行化` 使用共享 CodeMirror 作为输入、输出编辑器。

## 范围

迁移以下 CodeMirror 核心文件到 `lib/codemirror/`：

- `codemirror.js`
- `codemirror.min.js`
- `codemirror.css`

以下资源继续保留在 `文本差异对比/lib/`：

- `jquery.min.js`
- `mergely.js`
- `mergely.min.js`
- `mergely.css`
- `searchcursor.js`

`searchcursor.js` 是 Mergely 搜索能力所依赖的 CodeMirror 扩展，不作为本次共享编辑器核心资源迁移。

## 消费方与资源路径

- `文本差异对比/index.html` 从 `../lib/codemirror/` 加载 CodeMirror，继续从自身 `./lib/` 加载 jQuery 和 Mergely。
- `yaml-properties-converter/index.html` 改为从 `../lib/codemirror/` 加载 CodeMirror。
- `java一行的多行注释一行化/index.html` 从 `../lib/codemirror/` 加载 CodeMirror。

所有页面仍可通过直接打开对应 HTML 文件运行，不引入构建步骤或网络依赖。

## Java 注释工具交互设计

输入框和输出框都通过 `CodeMirror.fromTextArea` 创建编辑器：

- 输入编辑器可编辑，显示行号并自动换行。
- 输出编辑器只读，显示行号并自动换行。
- 两个编辑器保持与现有文本框接近的高度，桌面端左右排列，窄屏下上下排列。
- 格式化、实时转换、字符计数、清空、复制、示例内容和“不保留空换行”功能保持不变。
- 业务逻辑通过编辑器的 `getValue()`、`setValue()` 和 `change` 事件读写内容，不再依赖隐藏 textarea 的实时值。
- 清空后聚焦输入编辑器；复制操作读取输出编辑器内容，并优先使用 Clipboard API，在不可用时保留兼容回退。

## 错误与兼容处理

CodeMirror 是随仓库提供的本地资源，正常情况下应在初始化脚本执行前加载。页面不新增服务端或异步资源错误状态。原始 textarea 保留在 DOM 中，确保页面结构和无障碍标签仍然存在。

## 测试与验收

自动化检查覆盖：

- 三个消费者均引用新的共享 CodeMirror 路径。
- 原 CodeMirror 核心文件不再残留于 `文本差异对比/lib/`。
- Java 工具创建一个可编辑输入实例和一个只读输出实例。
- Java 工具通过 CodeMirror API 完成格式化、计数、清空和复制的数据流。

手动在当前 Chrome 或 Edge 中验证：

- 示例代码加载后自动生成正确输出。
- 编辑输入、切换空行选项、点击格式化、清空和复制均正常。
- 桌面宽度下编辑器左右排列，移动端宽度下上下排列且无横向溢出。

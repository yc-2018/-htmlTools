const assert = require('assert');
const fs = require('fs');
const path = require('path');

const converter = require('../yaml-properties-converter/app.js');

function assertIncludes(message, expectedPart) {
  assert.ok(
    message.includes(expectedPart),
    `Expected "${message}" to include "${expectedPart}"`
  );
}

function testPropertiesToYaml() {
  const input = [
    '# Spring Boot example',
    'server.port=8080',
    'spring.application.name=yaml-properties-demo',
    'spring.datasource.url=jdbc:mysql://localhost:3306/demo',
    'spring.datasource.username=root',
    'feature-flags[0].name=login',
    'feature-flags[0].enabled=true',
    'feature-flags[1].name=checkout',
    'feature-flags[1].enabled=false',
    'message=Hello\\nWorld',
    'unicode=\\u4F60\\u597D'
  ].join('\n');

  const data = converter.parseProperties(input);
  const yaml = converter.stringifyYaml(data);

  assertIncludes(yaml, 'server:');
  assertIncludes(yaml, '  port: 8080');
  assertIncludes(yaml, 'application:');
  assertIncludes(yaml, 'feature-flags:');
  assertIncludes(yaml, '  - name: login');
  assertIncludes(yaml, '    enabled: true');
  assertIncludes(yaml, "message: 'Hello\\nWorld'");
  assertIncludes(yaml, 'unicode: 你好');
}

function testYamlToProperties() {
  const input = [
    'server:',
    '  port: 8080',
    'spring:',
    '  application:',
    '    name: yaml-properties-demo',
    'features:',
    '  - name: login',
    '    enabled: true',
    '  - name: checkout',
    '    enabled: false',
    'empty-value: null'
  ].join('\n');

  const data = converter.parseYaml(input);
  const properties = converter.stringifyProperties(data);

  assertIncludes(properties, 'server.port=8080');
  assertIncludes(properties, 'spring.application.name=yaml-properties-demo');
  assertIncludes(properties, 'features[0].name=login');
  assertIncludes(properties, 'features[0].enabled=true');
  assertIncludes(properties, 'features[1].name=checkout');
  assertIncludes(properties, 'empty-value=');
}

function testPropertiesConflictsHaveHelpfulErrors() {
  assert.throws(
    () => converter.parseProperties('a=1\na.b=2'),
    /路径冲突/
  );

  assert.throws(
    () => converter.parseProperties('list[0]=first\nlist.name=bad'),
    /类型冲突/
  );
}

function testYamlUnsupportedSyntaxHasHelpfulErrors() {
  assert.throws(
    () => converter.parseYaml('---\nserver:\n  port: 8080'),
    /多文档/
  );

  assert.throws(
    () => converter.parseYaml('server: &defaults\n  port: 8080'),
    /锚点/
  );

  assert.throws(
    () => converter.parseYaml('server: { port: 8080 }'),
    /行内对象/
  );
}

function testYamlIndentAndTypeConflicts() {
  assert.throws(
    () => converter.parseYaml('server: 8080\nserver:\n  port: 9090'),
    /路径冲突/
  );
}

function testYamlAllowsConsistentNonTwoSpaceIndentation() {
  const input = [
    'spring:',
    '  datasource:',
    '    dynamic:',
    '      datasource:',
    '        master:',
    '         url: jdbc:oracle:thin:@//192.168.111.86:1521/sjtstms',
    '         username: iwms',
    '        cswms:',
    '          username: WMS_USER_DEV'
  ].join('\n');

  const properties = converter.stringifyProperties(converter.parseYaml(input));

  assertIncludes(
    properties,
    'spring.datasource.dynamic.datasource.master.url=jdbc:oracle:thin:@//192.168.111.86:1521/sjtstms'
  );
  assertIncludes(properties, 'spring.datasource.dynamic.datasource.master.username=iwms');
  assertIncludes(properties, 'spring.datasource.dynamic.datasource.cswms.username=WMS_USER_DEV');
}

function testYamlAllowsSpringPlaceholdersWithBraces() {
  const input = [
    'eureka:',
    '  instance:',
    '    instance-id: ${spring.application.name}:${server.port}',
    '    hostname: localhost'
  ].join('\n');

  const properties = converter.stringifyProperties(converter.parseYaml(input));

  assertIncludes(
    properties,
    'eureka.instance.instance-id=${spring.application.name}:${server.port}'
  );
  assertIncludes(properties, 'eureka.instance.hostname=localhost');
}

function testPropertiesToYamlKeepsSpringPlaceholderUnquoted() {
  const yaml = converter.stringifyYaml(converter.parseProperties('server.port=${SERVER_PORT:8022}'));

  assertIncludes(yaml, 'server:');
  assertIncludes(yaml, '  port: ${SERVER_PORT:8022}');
  assert.ok(!yaml.includes("'${SERVER_PORT:8022}'"), 'Spring placeholder should not be single quoted');
}

function testPropertiesToYamlKeepsJdbcUrlUnquoted() {
  const yaml = converter.convertPropertiesToYaml(
    'qq.url=jdbc:oracle:thin:@//172.29.30.101/ITMS'
  );

  assertIncludes(yaml, '  url: jdbc:oracle:thin:@//172.29.30.101/ITMS');
  assert.ok(!yaml.includes("'jdbc:oracle:thin:@//172.29.30.101/ITMS'"), 'JDBC URL should not be single quoted');
}

function testCommentsArePreservedWhenConvertingBothDirections() {
  const yaml = converter.convertPropertiesToYaml([
    '# server config',
    '! local override',
    'server.port=8022'
  ].join('\n'));
  const properties = converter.convertYamlToProperties([
    '# redis config',
    'spring:',
    '  redis:',
    '    host: 127.0.0.1 # local redis'
  ].join('\n'));

  assertIncludes(yaml, '# server config');
  assertIncludes(yaml, '# local override');
  assertIncludes(yaml, 'server:');
  assertIncludes(properties, '# redis config');
  assertIncludes(properties, '# local redis');
  assertIncludes(properties, 'spring.redis.host=127.0.0.1');
}

function testYamlInlineCommentsStayWithConvertedProperties() {
  const properties = converter.convertYamlToProperties([
    '# file comment',
    'spring:',
    '  datasource:',
    '    # password comment',
    '    password: secret # 222',
    'feature-flags:',
    '  - name: login',
    '    enabled: true',
    '  # checkout comment',
    '  - name: checkout',
    '    enabled: false #1111'
  ].join('\n'));
  const lines = properties.split('\n');
  const passwordIndex = lines.indexOf('spring.datasource.password=secret');
  const checkoutIndex = lines.indexOf('feature-flags[1].name=checkout');
  const enabledIndex = lines.indexOf('feature-flags[1].enabled=false');

  assert.strictEqual(lines[0], '# file comment');
  assert.strictEqual(lines[passwordIndex - 2], '# password comment');
  assert.strictEqual(lines[passwordIndex - 1], '# 222');
  assert.strictEqual(lines[checkoutIndex - 1], '# checkout comment');
  assert.strictEqual(lines[enabledIndex - 1], '# 1111');
  assert.ok(
    lines.indexOf('# 1111') > lines.indexOf('feature-flags[1].name=checkout'),
    'array item inline comment should stay near its property instead of moving to the top'
  );
}

function testYamlCommentedOutPropertiesStayNearSameNamedKeys() {
  const properties = converter.convertYamlToProperties([
    'spring:',
    '  datasource:',
    '    dynamic:',
    '      datasource:',
    '        master:',
    '          #',
    '          # url: jdbc:oracle:thin:@172.29.30.101:1521/ITMS',
    '          # username: iwms',
    '          # password: iwmsSj09',
    '          url: jdbc:oracle:thin:@//192.168.111.86:1521/sjtstms',
    '          username: iwms',
    '          password: iwms',
    '          driver-class-name: oracle.jdbc.OracleDriver # 3.2.0开始支持SPI可省略此配置'
  ].join('\n'));
  const lines = properties.split('\n');
  const urlIndex = lines.indexOf('spring.datasource.dynamic.datasource.master.url=jdbc:oracle:thin:@//192.168.111.86:1521/sjtstms');
  const usernameIndex = lines.indexOf('spring.datasource.dynamic.datasource.master.username=iwms');
  const passwordIndex = lines.indexOf('spring.datasource.dynamic.datasource.master.password=iwms');
  const driverIndex = lines.indexOf('spring.datasource.dynamic.datasource.master.driver-class-name=oracle.jdbc.OracleDriver');

  assert.ok(urlIndex > 0, 'master.url should be converted');
  assert.ok(usernameIndex > urlIndex, 'master.username should be converted after url');
  assert.ok(passwordIndex > usernameIndex, 'master.password should be converted after username');
  assert.strictEqual(lines[urlIndex - 2], '#');
  assert.strictEqual(lines[urlIndex - 1], '# url: jdbc:oracle:thin:@172.29.30.101:1521/ITMS');
  assert.strictEqual(lines[usernameIndex - 1], '# username: iwms');
  assert.strictEqual(lines[passwordIndex - 1], '# password: iwmsSj09');
  assert.strictEqual(lines[driverIndex - 1], '# 3.2.0开始支持SPI可省略此配置');
}

function testYamlSectionCommentsStayBeforeFirstNestedProperty() {
  const properties = converter.convertYamlToProperties([
    'spring:',
    '  redis:',
    '    host: 127.0.0.1',
    '#==========================================================',
    '#  minio 对象存储 配置',
    '#==========================================================',
    'minio:',
    '  endpoint: http://127.0.0.1:9000',
    '  bucketName: itms'
  ].join('\n'));
  const lines = properties.split('\n');
  const minioIndex = lines.indexOf('minio.endpoint=http://127.0.0.1:9000');

  assert.strictEqual(lines[0], 'spring.redis.host=127.0.0.1');
  assert.strictEqual(lines[minioIndex - 3], '# ==========================================================');
  assert.strictEqual(lines[minioIndex - 2], '# minio 对象存储 配置');
  assert.strictEqual(lines[minioIndex - 1], '# ==========================================================');
}

function testYamlUnmatchedAndTrailingCommentsDoNotMoveToTopOrDisappear() {
  const properties = converter.convertYamlToProperties([
    'wx:',
    '  miniapp:',
    '    msgDataFormat: JSON',
    '    #   token: 6666 #微信小程序消息服务器配置的token',
    '    #   aesKey: 666 #微信小程序消息服务器配置的EncodingAESKey',
    '#==========================================================',
    '#  钉钉H5 配置',
    '#==========================================================',
    'ding:',
    '  appKey: demo',
    '',
    '##==================================',
    '## mybatis-plus',
    '##=================================',
    '#mybatis-plus:',
    '#  configuration:',
    ''
  ].join('\n'));
  const lines = properties.split('\n');
  const wxIndex = lines.indexOf('wx.miniapp.msgDataFormat=JSON');
  const dingIndex = lines.indexOf('ding.appKey=demo');

  assert.strictEqual(lines[0], 'wx.miniapp.msgDataFormat=JSON');
  assert.ok(dingIndex > wxIndex, 'ding.appKey should stay after wx.miniapp');
  assert.strictEqual(lines[dingIndex - 5], '# token: 6666 #微信小程序消息服务器配置的token');
  assert.strictEqual(lines[dingIndex - 4], '# aesKey: 666 #微信小程序消息服务器配置的EncodingAESKey');
  assert.strictEqual(lines[dingIndex - 3], '# ==========================================================');
  assert.strictEqual(lines[dingIndex - 2], '# 钉钉H5 配置');
  assert.strictEqual(lines[dingIndex - 1], '# ==========================================================');
  assert.strictEqual(lines[lines.length - 5], '# #==================================');
  assert.strictEqual(lines[lines.length - 4], '# # mybatis-plus');
  assert.strictEqual(lines[lines.length - 3], '# #=================================');
  assert.strictEqual(lines[lines.length - 2], '# mybatis-plus:');
  assert.strictEqual(lines[lines.length - 1], '# configuration:');
}

function testPropertiesCommentsStayNearConvertedYamlKeys() {
  const yaml = converter.convertPropertiesToYaml([
    'server.port=${SERVER_PORT:8022}',
    '#==========================================================',
    '#  datasource config',
    '#==========================================================',
    '#ITMS',
    'spring.datasource.dynamic.datasource.master.driver-class-name=oracle.jdbc.OracleDriver',
    'spring.datasource.dynamic.datasource.master.url=jdbc:oracle:thin:@//127.0.0.1/ITMS',
    '#鹊桥',
    'spring.datasource.dynamic.datasource.qq.driver-class-name=oracle.jdbc.OracleDriver',
    'spring.datasource.dynamic.datasource.qq.url=jdbc:oracle:thin:@//127.0.0.2/ITMS',
    '#==========================================================',
    '#  tms url',
    '#==========================================================',
    'tms-url=http://127.0.0.1:8081'
  ].join('\n'));
  const lines = yaml.split('\n');
  const masterIndex = lines.indexOf('        master:');
  const qqIndex = lines.indexOf('        qq:');
  const tmsIndex = lines.indexOf('tms-url: http://127.0.0.1:8081');

  assert.strictEqual(lines[0], 'server:');
  assert.strictEqual(lines[masterIndex - 4], '        # ==========================================================');
  assert.strictEqual(lines[masterIndex - 3], '        # datasource config');
  assert.strictEqual(lines[masterIndex - 2], '        # ==========================================================');
  assert.strictEqual(lines[masterIndex - 1], '        # ITMS');
  assert.strictEqual(lines[qqIndex - 1], '        # 鹊桥');
  assert.strictEqual(lines[tmsIndex - 3], '# ==========================================================');
  assert.strictEqual(lines[tmsIndex - 2], '# tms url');
  assert.strictEqual(lines[tmsIndex - 1], '# ==========================================================');
}

function testSyntaxHighlightingEscapesAndMarksTokens() {
  const propertiesHtml = converter.highlightProperties([
    '# comment',
    'server.port=8080',
    'danger=<script>'
  ].join('\n'));
  const yamlHtml = converter.highlightYaml([
    'server:',
    '  port: 8080',
    '  enabled: true',
    "  name: 'demo < app'",
    '  - item'
  ].join('\n'));

  assertIncludes(propertiesHtml, 'class="syntax-comment"');
  assertIncludes(propertiesHtml, 'class="syntax-key"');
  assertIncludes(propertiesHtml, 'class="syntax-separator"');
  assertIncludes(propertiesHtml, 'class="syntax-number"');
  assertIncludes(propertiesHtml, '&lt;script&gt;');
  assertIncludes(yamlHtml, 'class="syntax-key"');
  assertIncludes(yamlHtml, 'class="syntax-number"');
  assertIncludes(yamlHtml, 'class="syntax-boolean"');
  assertIncludes(yamlHtml, 'class="syntax-string"');
  assertIncludes(yamlHtml, 'class="syntax-list-marker"');
  assertIncludes(yamlHtml, '&lt; app');
}

function testLineNumbersMatchEditorLines() {
  assert.strictEqual(converter.buildLineNumbers('').trim(), '1');
  assert.strictEqual(converter.buildLineNumbers('a=1\nb=2').trim(), '1\n2');
  assert.strictEqual(converter.buildLineNumbers('a=1\n').trim(), '1\n2');
}

function testHtmlStructureAndHomepageLink() {
  const toolHtml = fs.readFileSync(
    path.join(__dirname, '..', 'yaml-properties-converter', 'index.html'),
    'utf8'
  );
  const toolCss = fs.readFileSync(
    path.join(__dirname, '..', 'yaml-properties-converter', 'styles.css'),
    'utf8'
  );
  const appJs = fs.readFileSync(
    path.join(__dirname, '..', 'yaml-properties-converter', 'app.js'),
    'utf8'
  );
  const homepage = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assertIncludes(toolHtml, '<link rel="stylesheet" href="../文本差异对比/lib/codemirror.css">');
  assertIncludes(toolHtml, '<link rel="stylesheet" href="./styles.css">');
  assertIncludes(toolHtml, '<script src="../文本差异对比/lib/codemirror.js"></script>');
  assertIncludes(toolHtml, '<script src="./app.js"></script>');
  assertIncludes(toolHtml, 'id="propertiesInput"');
  assertIncludes(toolHtml, 'id="yamlInput"');
  assert.ok(
    /<textarea[^>]*id="propertiesInput"[^>]*wrap="off"/.test(toolHtml),
    'Properties textarea should disable soft wrapping'
  );
  assert.ok(
    /<textarea[^>]*id="yamlInput"[^>]*wrap="off"/.test(toolHtml),
    'YAML textarea should disable soft wrapping'
  );
  assertIncludes(toolHtml, 'id="propertiesStatus"');
  assertIncludes(toolHtml, 'id="yamlStatus"');
  assertIncludes(toolHtml, 'id="exampleBtn"');
  assertIncludes(toolHtml, 'id="clearBtn"');
  assertIncludes(toolHtml, 'id="copyPropertiesBtn"');
  assertIncludes(toolHtml, 'id="copyYamlBtn"');
  assertIncludes(toolCss, '.CodeMirror');
  assertIncludes(toolCss, '.cm-property');
  assertIncludes(toolCss, '.syntax-key');
  assertIncludes(toolCss, '.syntax-string');
  assertIncludes(toolCss, '@media (max-width: 900px)');
  assert.ok(!toolCss.includes('white-space: pre-wrap'), 'Editors should not soft-wrap long lines');
  assert.ok(!toolCss.includes('overflow-wrap: break-word'), 'Editors should use horizontal scroll for long lines');
  assertIncludes(appJs, 'CodeMirror.fromTextArea');
  assertIncludes(appJs, 'lineNumbers: true');
  assertIncludes(appJs, 'lineWrapping: false');
  assertIncludes(homepage, '/yaml-properties-converter/index.html');
}

function run() {
  testPropertiesToYaml();
  testYamlToProperties();
  testPropertiesConflictsHaveHelpfulErrors();
  testYamlUnsupportedSyntaxHasHelpfulErrors();
  testYamlIndentAndTypeConflicts();
  testYamlAllowsConsistentNonTwoSpaceIndentation();
  testYamlAllowsSpringPlaceholdersWithBraces();
  testPropertiesToYamlKeepsSpringPlaceholderUnquoted();
  testPropertiesToYamlKeepsJdbcUrlUnquoted();
  testCommentsArePreservedWhenConvertingBothDirections();
  testYamlInlineCommentsStayWithConvertedProperties();
  testYamlCommentedOutPropertiesStayNearSameNamedKeys();
  testYamlSectionCommentsStayBeforeFirstNestedProperty();
  testYamlUnmatchedAndTrailingCommentsDoNotMoveToTopOrDisappear();
  testPropertiesCommentsStayNearConvertedYamlKeys();
  testSyntaxHighlightingEscapesAndMarksTokens();
  testLineNumbersMatchEditorLines();
  testHtmlStructureAndHomepageLink();
  console.log('yaml-properties-converter tests passed');
}

run();

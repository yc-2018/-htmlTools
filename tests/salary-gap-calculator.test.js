const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const toolRoot = path.join(repoRoot, '工资不止差一半计算器');
const corePath = path.join(toolRoot, 'calculator.js');
const appPath = path.join(toolRoot, 'app.js');

assert.ok(fs.existsSync(corePath), 'calculator.js should exist');
const calculator = require(corePath);

function testDefaultScenario() {
  const result = calculator.calculateScenario({
    salaryA: '5000',
    salaryB: '10000',
    expenseA: '4000',
    expenseB: '4000'
  });

  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(result.people.a, {
    name: '甲',
    salary: 5000,
    expense: 4000,
    month: 1000,
    year: 12000,
    decade: 120000
  });
  assert.deepStrictEqual(result.people.b, {
    name: '乙',
    salary: 10000,
    expense: 4000,
    month: 6000,
    year: 72000,
    decade: 720000
  });
}

function testMoneyValidation() {
  assert.strictEqual(calculator.parseMoney('0'), 0);
  assert.strictEqual(calculator.parseMoney('12.34'), 12.34);
  ['', '-1', '12.345', 'abc', 'Infinity'].forEach((value) => {
    assert.strictEqual(calculator.parseMoney(value), null);
  });

  const result = calculator.calculateScenario({
    salaryA: '',
    salaryB: '10000',
    expenseA: '4000',
    expenseB: '4000'
  });
  assert.deepStrictEqual(result, {
    valid: false,
    error: '请输入有效的非负金额'
  });

  const decimalResult = calculator.calculateScenario({
    salaryA: '5000.50',
    salaryB: '10000',
    expenseA: '4000.25',
    expenseB: '4000'
  });
  assert.strictEqual(decimalResult.people.a.month, 1000.25);
  assert.strictEqual(decimalResult.people.a.year, 12003);
  assert.strictEqual(decimalResult.people.a.decade, 120030);
}

function testDefaultComparisonAndFormatting() {
  const result = calculator.calculateScenario({
    salaryA: '5000',
    salaryB: '10000',
    expenseA: '4000',
    expenseB: '4000'
  });
  const conclusion = calculator.buildConclusion(result);

  assert.strictEqual(result.salaryComparison.ratio, 2);
  assert.strictEqual(result.remainingComparison.ratio, 6);
  assert.deepStrictEqual(conclusion, {
    kind: 'ratio',
    salaryLine: '你以为乙的工资是甲的 2 倍？',
    factPrefix: '可事实却是',
    emphasis: '6 倍',
    factSuffix: ''
  });
  assert.strictEqual(calculator.formatMoney(123456.5), '123,456.5');
  assert.strictEqual(calculator.formatRatio(2.5), '2.5');
  assert.strictEqual(calculator.formatRatio(2.0), '2');
}

function testComparisonEdgeCases() {
  const equalSalary = calculator.calculateScenario({
    salaryA: '5000',
    salaryB: '5000',
    expenseA: '3000',
    expenseB: '4000'
  });
  assert.strictEqual(
    calculator.buildConclusion(equalSalary).salaryLine,
    '两人的工资相同'
  );

  const zeroSalary = calculator.calculateScenario({
    salaryA: '0',
    salaryB: '5000',
    expenseA: '0',
    expenseB: '1000'
  });
  assert.strictEqual(
    calculator.buildConclusion(zeroSalary).salaryLine,
    '乙的工资更高，但工资倍数无法计算'
  );

  const equalRemaining = calculator.calculateScenario({
    salaryA: '5000',
    salaryB: '6000',
    expenseA: '1000',
    expenseB: '2000'
  });
  assert.strictEqual(
    calculator.buildConclusion(equalRemaining).factPrefix,
    '两人的可支配金额相同'
  );

  const reversed = calculator.calculateScenario({
    salaryA: '5000',
    salaryB: '10000',
    expenseA: '0',
    expenseB: '9000'
  });
  assert.deepStrictEqual(calculator.buildConclusion(reversed), {
    kind: 'ratio',
    salaryLine: '你以为乙的工资是甲的 2 倍？',
    factPrefix: '可扣除花销后，甲反而是乙的',
    emphasis: '5 倍',
    factSuffix: ''
  });

  const insolvent = calculator.calculateScenario({
    salaryA: '4000',
    salaryB: '10000',
    expenseA: '4000',
    expenseB: '4000'
  });
  assert.strictEqual(calculator.buildConclusion(insolvent).kind, 'insolvent');
  assert.strictEqual(
    calculator.buildConclusion(insolvent).factPrefix,
    '甲已入不敷出，无法用倍数衡量'
  );

  const invalid = calculator.buildConclusion({
    valid: false,
    error: '请输入有效的非负金额'
  });
  assert.deepStrictEqual(invalid, {
    kind: 'invalid',
    salaryLine: '请输入有效的非负金额',
    factPrefix: '',
    emphasis: '',
    factSuffix: ''
  });
}

function testExpenseLinkState() {
  const state = calculator.createExpenseLinkState('4000', '4000');
  state.set('b', '4500');
  assert.deepStrictEqual(state.get(), {
    locked: true,
    a: '4500',
    b: '4500'
  });

  state.toggle();
  state.set('b', '3000');
  assert.deepStrictEqual(state.get(), {
    locked: false,
    a: '4500',
    b: '3000'
  });

  state.toggle();
  assert.deepStrictEqual(state.get(), {
    locked: true,
    a: '4500',
    b: '4500'
  });
}

function makeElement(value = '') {
  const listeners = {};

  return {
    value,
    textContent: '',
    hidden: false,
    attributes: {},
    classList: {
      toggle() {}
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    setAttribute(name, nextValue) {
      this.attributes[name] = String(nextValue);
    },
    dispatch(type) {
      listeners[type]({ target: this });
    }
  };
}

function makeDocument() {
  const values = {
    salaryA: '5000',
    salaryB: '10000',
    expenseA: '4000',
    expenseB: '4000'
  };
  const ids = [
    'salaryA',
    'salaryB',
    'expenseA',
    'expenseB',
    'expenseLock',
    'lockText',
    'monthA',
    'monthB',
    'yearA',
    'yearB',
    'decadeA',
    'decadeB',
    'statusA',
    'statusB',
    'salaryLine',
    'factPrefix',
    'ratioEmphasis',
    'factSuffix'
  ];
  const elements = Object.fromEntries(
    ids.map((id) => [id, makeElement(values[id] || '')])
  );

  return {
    elements,
    getElementById(id) {
      return elements[id];
    }
  };
}

function testLiveControllerAndExpenseLock() {
  assert.ok(fs.existsSync(appPath), 'app.js should exist');
  const app = require(appPath);
  const doc = makeDocument();

  app.initialize(doc, calculator);

  assert.strictEqual(doc.elements.monthA.textContent, '1,000');
  assert.strictEqual(doc.elements.monthB.textContent, '6,000');
  assert.strictEqual(doc.elements.ratioEmphasis.textContent, '6 倍');
  assert.strictEqual(
    doc.elements.expenseLock.attributes['aria-pressed'],
    'true'
  );
  assert.strictEqual(doc.elements.lockText.textContent, '已同步');

  doc.elements.expenseB.value = '4500';
  doc.elements.expenseB.dispatch('input');
  assert.strictEqual(doc.elements.expenseA.value, '4500');

  doc.elements.expenseLock.dispatch('click');
  assert.strictEqual(
    doc.elements.expenseLock.attributes['aria-pressed'],
    'false'
  );
  assert.strictEqual(doc.elements.lockText.textContent, '已解锁');

  doc.elements.expenseB.value = '3000';
  doc.elements.expenseB.dispatch('input');
  assert.strictEqual(doc.elements.expenseA.value, '4500');

  doc.elements.expenseLock.dispatch('click');
  assert.strictEqual(doc.elements.expenseB.value, '4500');
  assert.strictEqual(
    doc.elements.expenseLock.attributes['aria-pressed'],
    'true'
  );

  doc.elements.salaryA.value = '';
  doc.elements.salaryA.dispatch('input');
  assert.strictEqual(doc.elements.monthA.textContent, '—');
  assert.strictEqual(
    doc.elements.salaryLine.textContent,
    '请输入有效的非负金额'
  );
  assert.strictEqual(doc.elements.ratioEmphasis.textContent, '');

  doc.elements.salaryA.value = '4000';
  doc.elements.salaryA.dispatch('input');
  assert.strictEqual(doc.elements.monthA.textContent, '-500');
  assert.strictEqual(doc.elements.statusA.textContent, '已入不敷出');
}

function run() {
  testDefaultScenario();
  testMoneyValidation();
  testDefaultComparisonAndFormatting();
  testComparisonEdgeCases();
  testExpenseLinkState();
  testLiveControllerAndExpenseLock();
  console.log('salary gap calculator tests passed');
}

if (require.main === module) {
  run();
}

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const toolRoot = path.join(repoRoot, '工资不止差一半计算器');
const corePath = path.join(toolRoot, 'calculator.js');

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

function run() {
  testDefaultScenario();
  testMoneyValidation();
  console.log('salary gap calculator tests passed');
}

if (require.main === module) {
  run();
}

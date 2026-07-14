(function initCalculator(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SalaryGapCalculator = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createCalculator() {
  function parseMoney(rawValue) {
    const text = String(rawValue).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
      return null;
    }

    const value = Number(text);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function calculatePerson(name, salary, expense) {
    const month = salary - expense;

    return {
      name,
      salary,
      expense,
      month,
      year: month * 12,
      decade: month * 120
    };
  }

  function calculateScenario(rawValues) {
    const values = {
      salaryA: parseMoney(rawValues.salaryA),
      salaryB: parseMoney(rawValues.salaryB),
      expenseA: parseMoney(rawValues.expenseA),
      expenseB: parseMoney(rawValues.expenseB)
    };

    if (Object.values(values).some((value) => value === null)) {
      return {
        valid: false,
        error: '请输入有效的非负金额'
      };
    }

    return {
      valid: true,
      people: {
        a: calculatePerson('甲', values.salaryA, values.expenseA),
        b: calculatePerson('乙', values.salaryB, values.expenseB)
      }
    };
  }

  return {
    parseMoney,
    calculateScenario
  };
}));

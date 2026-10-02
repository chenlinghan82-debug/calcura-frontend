import { explainExpression, CalculationError } from '../api/_parser.js'

const valid = [
  ['12 + 8', 20],
  ['1 + 2 * 3', 7],
  ['(1 + 2) * 3', 9],
  ['10 / 2 + 7', 12],
  ['8 - 3 * 2', 2],
  ['-5 + 8', 3],
  ['3 * -2', -6],
  ['0.1 + 0.2', 0.3],
  ['--5', 5],
  ['2^3', 8],
  ['2^3^2', 512],
  ['-2^2', -4],
  ['50%', 0.5],
  ['200*10%', 20],
  ['5!', 120],
  ['sqrt(16)', 4],
  ['abs(-3.5)', 3.5],
  ['sin(30)', 0.5],
  ['cos(60)', 0.5],
  ['tan(45)', 1],
  ['ln(1)', 0],
  ['log(100)', 2],
  ['log(1000)', 3],
  ['pi', 3.141592653589793],
  ['(2+3)*4', 20],
]
const invalid = ['', '1 / 0', '1 +', '(1 + 2', '1 + 2)', '2..3', '2 ** 3', '2 + abc', 'sqrt(-1)', '1.5!', '2^10000', 'ln(0)', 'log(-2)', 'tan(90)', "__import__('os').system('whoami')"]

let failed = 0
for (const [expression, expected] of valid) {
  try {
    const got = explainExpression(expression)
    const delta = Math.abs(got.result - expected)
    if (delta > 1e-9) {
      failed += 1
      console.log('MISMATCH', expression, got.result, expected, JSON.stringify(got.steps))
    }
  } catch (error) {
    failed += 1
    console.log('THREW', expression, error.message)
  }
}
for (const expression of invalid) {
  try {
    const got = explainExpression(expression)
    failed += 1
    console.log('SHOULD FAIL', expression, JSON.stringify(got))
  } catch (error) {
    if (!(error instanceof CalculationError)) {
      failed += 1
      console.log('WRONG ERROR', expression, String(error))
    }
  }
}
const steps = explainExpression('(2+3)*4')
if (!steps.steps.includes('2 + 3 = 5') || !steps.steps.includes('5 * 4 = 20')) {
  failed += 1
  console.log('STEPS', JSON.stringify(steps.steps))
}
const ans = explainExpression('Ans*3', 4)
if (ans.result !== 12) {
  failed += 1
  console.log('ANS', JSON.stringify(ans))
}
console.log(failed === 0 ? 'PARSER_OK' : 'PARSER_FAIL ' + failed)

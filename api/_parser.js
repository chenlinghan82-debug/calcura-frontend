import Decimal from 'decimal.js'

Decimal.set({ precision: 28 })

export class CalculationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CalculationError'
  }
}

const CONSTANTS = {
  pi: new Decimal('3.141592653589793238462643383'),
  e: new Decimal('2.718281828459045235360287471'),
}
const FUNCTIONS = new Set(['sqrt', 'abs', 'sin', 'cos', 'tan', 'ln', 'log'])

class Token {
  constructor(kind, value) {
    this.kind = kind
    this.value = value
  }
}

class Lexer {
  constructor(expression) {
    this.expression = expression
    this.index = 0
  }

  tokenize() {
    const tokens = []
    while (this.index < this.expression.length) {
      const char = this.expression[this.index]
      if (char.trim() === '') {
        this.index += 1
        continue
      }
      if (isDigit(char) || char === '.') {
        tokens.push(this.readNumber())
        continue
      }
      if (isNameStart(char)) {
        tokens.push(this.readName())
        continue
      }
      if ('+-*/^'.includes(char)) {
        tokens.push(new Token('OP', char))
        this.index += 1
        continue
      }
      if (char === '(') {
        tokens.push(new Token('LPAREN', char))
        this.index += 1
        continue
      }
      if (char === ')') {
        tokens.push(new Token('RPAREN', char))
        this.index += 1
        continue
      }
      if (char === '%') {
        tokens.push(new Token('PERCENT', char))
        this.index += 1
        continue
      }
      if (char === '!') {
        tokens.push(new Token('FACTORIAL', char))
        this.index += 1
        continue
      }
      throw new CalculationError('Unsupported character: ' + char)
    }
    if (tokens.length === 0) throw new CalculationError('Expression cannot be empty')
    return tokens
  }

  readNumber() {
    const start = this.index
    let dotCount = 0
    let digitCount = 0
    while (this.index < this.expression.length) {
      const char = this.expression[this.index]
      if (char === '.') {
        dotCount += 1
        if (dotCount > 1) throw new CalculationError('Invalid decimal number')
        this.index += 1
        continue
      }
      if (!isDigit(char)) break
      digitCount += 1
      this.index += 1
    }
    const value = this.expression.slice(start, this.index)
    if (digitCount === 0) throw new CalculationError('A decimal point must be followed by digits')
    try {
      new Decimal(value)
    } catch {
      throw new CalculationError('Invalid decimal number')
    }
    return new Token('NUMBER', value)
  }

  readName() {
    const start = this.index
    while (this.index < this.expression.length && isNamePart(this.expression[this.index])) this.index += 1
    return new Token('IDENT', this.expression.slice(start, this.index).toLowerCase())
  }
}

function isDigit(char) {
  return char >= '0' && char <= '9'
}

function isNameStart(char) {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_'
}

function isNamePart(char) {
  return isNameStart(char) || isDigit(char)
}

export function formatDecimal(value) {
  if (!value.isFinite()) throw new CalculationError('Result is not finite')
  let text = value.toFixed(48)
  if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '')
  if (text === '' || text === '-0') return '0'
  return text
}

function python12g(numeric) {
  if (Object.is(numeric, -0) || numeric === 0) return '0'
  const negative = numeric < 0
  const text = Math.abs(numeric).toPrecision(12)
  const trimmed = text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  return (negative ? '-' : '') + trimmed
}

class Parser {
  constructor(tokens, ans) {
    this.tokens = tokens
    this.position = 0
    this.ans = ans
    this.steps = []
  }

  parse() {
    const result = this.expression()
    if (this.position !== this.tokens.length) {
      throw new CalculationError('Unexpected token: ' + this.tokens[this.position].value)
    }
    return result
  }

  expression() {
    let result = this.term()
    while (this.matchOperator('+', '-')) {
      const operator = this.previous().value
      const left = result
      const right = this.term()
      result = operator === '+' ? left.plus(right) : left.minus(right)
      this.steps.push(formatDecimal(left) + ' ' + operator + ' ' + formatDecimal(right) + ' = ' + formatDecimal(result))
    }
    return result
  }

  term() {
    let result = this.unary()
    while (this.matchOperator('*', '/')) {
      const operator = this.previous().value
      const left = result
      const right = this.unary()
      if (operator === '*') result = left.times(right)
      else {
        if (right.isZero()) throw new CalculationError('Division by zero is not allowed')
        result = left.div(right)
      }
      this.steps.push(formatDecimal(left) + ' ' + operator + ' ' + formatDecimal(right) + ' = ' + formatDecimal(result))
    }
    return result
  }

  unary() {
    if (this.matchOperator('+', '-')) {
      const operator = this.previous().value
      const value = this.unary()
      return operator === '+' ? value : value.neg()
    }
    return this.power()
  }

  power() {
    const result = this.postfix()
    if (this.matchOperator('^')) {
      const exponent = this.unary()
      const powered = this.applyPower(result, exponent)
      this.steps.push(formatDecimal(result) + ' ^ ' + formatDecimal(exponent) + ' = ' + formatDecimal(powered))
      return powered
    }
    return result
  }

  postfix() {
    let value = this.primary()
    for (;;) {
      if (this.match('FACTORIAL')) {
        const factorialValue = this.factorial(value)
        this.steps.push(formatDecimal(value) + '! = ' + formatDecimal(factorialValue))
        value = factorialValue
        continue
      }
      if (this.match('PERCENT')) {
        const percentValue = value.div(100)
        this.steps.push(formatDecimal(value) + '% = ' + formatDecimal(percentValue))
        value = percentValue
        continue
      }
      return value
    }
  }

  primary() {
    if (this.match('NUMBER')) return new Decimal(this.previous().value)
    if (this.match('IDENT')) return this.identifier(this.previous().value)
    if (this.match('LPAREN')) {
      const value = this.expression()
      if (!this.match('RPAREN')) throw new CalculationError('Missing closing parenthesis')
      return value
    }
    if (this.match('RPAREN')) throw new CalculationError('Unexpected closing parenthesis')
    throw new CalculationError('Expected a number or opening parenthesis')
  }

  identifier(name) {
    if (name === 'ans') {
      if (this.check('LPAREN')) throw new CalculationError('Ans is a value, not a function')
      if (this.ans == null) throw new CalculationError('Ans is not available yet. Complete a calculation first')
      return this.ans
    }
    if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) {
      if (this.check('LPAREN')) throw new CalculationError(name + ' is a constant, not a function')
      return CONSTANTS[name]
    }
    if (FUNCTIONS.has(name)) {
      if (!this.match('LPAREN')) throw new CalculationError("Expected '(' after " + name)
      const argument = this.expression()
      if (!this.match('RPAREN')) throw new CalculationError('Missing closing parenthesis')
      const result = this.callFunction(name, argument)
      this.steps.push(name + '(' + formatDecimal(argument) + ') = ' + formatDecimal(result))
      return result
    }
    throw new CalculationError('Unknown name: ' + name)
  }

  callFunction(name, argument) {
    if (name === 'sqrt') {
      if (argument.isNegative()) throw new CalculationError('Square root of a negative number is not allowed')
      return argument.sqrt()
    }
    if (name === 'abs') return argument.abs()
    return roundedDecimal(scientificValue(name, argument))
  }

  factorial(value) {
    if (!value.isInteger() || value.isNegative() || value.gt(170)) {
      throw new CalculationError('Factorial is only defined for integers from 0 to 170')
    }
    let result = new Decimal(1)
    const limit = value.toNumber()
    for (let number = 2; number <= limit; number += 1) result = result.times(number)
    return result
  }

  applyPower(base, exponent) {
    if (exponent.abs().gt(1000)) throw new CalculationError('Exponent is too large')
    let result
    try {
      result = base.pow(exponent)
    } catch {
      try {
        const numeric = Number(base.toString()) ** Number(exponent.toString())
        if (!Number.isFinite(numeric)) throw new CalculationError('Power result is not finite')
        result = new Decimal(String(numeric))
      } catch (inner) {
        if (inner instanceof CalculationError) throw inner
        throw new CalculationError('Power result is not a real number')
      }
    }
    if (!result.isFinite()) throw new CalculationError('Power result is not finite')
    return result
  }

  match(kind) {
    if (this.position < this.tokens.length && this.tokens[this.position].kind === kind) {
      this.position += 1
      return true
    }
    return false
  }

  check(kind) {
    return this.position < this.tokens.length && this.tokens[this.position].kind === kind
  }

  matchOperator() {
    if (this.position >= this.tokens.length) return false
    const token = this.tokens[this.position]
    for (let index = 0; index < arguments.length; index += 1) {
      if (token.kind === 'OP' && token.value === arguments[index]) {
        this.position += 1
        return true
      }
    }
    return false
  }

  previous() {
    return this.tokens[this.position - 1]
  }
}

function scientificValue(name, argument) {
  const number = Number(argument.toString())
  if (name === 'sin') return Math.sin((number * Math.PI) / 180)
  if (name === 'cos') return Math.cos((number * Math.PI) / 180)
  if (name === 'tan') {
    const cosine = Math.cos((number * Math.PI) / 180)
    if (Math.abs(cosine) < 1e-12) throw new CalculationError('Tangent is undefined for this angle')
    return Math.tan((number * Math.PI) / 180)
  }
  if (name === 'ln') {
    if (!(number > 0)) throw new CalculationError('Natural logarithm is only defined for positive numbers')
    return Math.log(number)
  }
  if (name === 'log') {
    if (!(number > 0)) throw new CalculationError('Logarithm is only defined for positive numbers')
    return Math.log10(number)
  }
  throw new CalculationError('Unknown function: ' + name)
}

function roundedDecimal(numeric) {
  if (!Number.isFinite(numeric)) throw new CalculationError('Result is not finite')
  if (Math.abs(numeric) < 1e-12) return new Decimal(0)
  try {
    return new Decimal(python12g(numeric))
  } catch {
    throw new CalculationError('Result is not finite')
  }
}

export function needsAns(expression) {
  try {
    return new Lexer(String(expression)).tokenize().some((token) => token.kind === 'IDENT' && token.value === 'ans')
  } catch {
    return false
  }
}

export function explainExpression(expression, ans = null) {
  if (String(expression).length > 200) throw new CalculationError('Expression is too long')
  const ansValue = ans == null ? null : new Decimal(String(ans))
  const parser = new Parser(new Lexer(String(expression).trim()).tokenize(), ansValue)
  const result = parser.parse()
  if (!result.isFinite()) throw new CalculationError('Result is not finite')
  const numericResult = Number(result.toString())
  if (!Number.isFinite(numericResult)) throw new CalculationError('Result is not finite')
  return { result: numericResult === 0 ? 0 : numericResult, steps: parser.steps }
}

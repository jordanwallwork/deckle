declare module 'formula-evaluator' {
  export interface Token {
    type: string;
    value: string;
    start: number;
    end: number;
  }

  export default class FormulaEvaluator {
    TOKEN_TYPES: Readonly<{
      NUMBER: 'number';
      STRING: 'string';
      IDENTIFIER: 'identifier';
      OPERATOR: 'operator';
      DELIMITER: 'delimiter';
      WHITESPACE: 'whitespace';
    }>;
    constructor(globalContext?: Record<string, unknown>);
    tokenize(str: string): Token[];
    evaluate(formula: string, localContext?: Record<string, unknown>): unknown;
    registerFunction(
      name: string,
      fn: (...args: unknown[]) => unknown,
      description?: string
    ): this;
    listFunctions(): string[];
    describeFunctions(): { name: string; description: string }[];
    getDependencies(formula: string): string[];
  }
}

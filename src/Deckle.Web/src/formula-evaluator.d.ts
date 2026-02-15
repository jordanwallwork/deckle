declare module 'formula-evaluator' {
  export default class FormulaEvaluator {
    constructor(globalContext?: Record<string, unknown>);
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

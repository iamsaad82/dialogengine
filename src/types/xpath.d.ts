declare module 'xpath' {
  export function select(
    expression: string,
    node: Node,
    resolver?: XPathNSResolver | null
  ): Node[];
  
  export function select1(
    expression: string,
    node: Node,
    resolver?: XPathNSResolver | null
  ): Node | null;
  
  export function evaluate(
    expression: string,
    contextNode: Node,
    resolver?: XPathNSResolver | null,
    type?: number,
    result?: XPathResult | null
  ): XPathResult;
} 
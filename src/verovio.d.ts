declare module 'verovio/wasm' {
  export default function createVerovioModule(): Promise<any>;
}

declare module 'verovio/esm' {
  export class VerovioToolkit {
    constructor(module: any);
    setOptions(options: Record<string, any>): void;
    loadData(data: string): boolean;
    renderToSVG(page?: number): string;
    getElementAttr(id: string): Record<string, any> | null;
    getPageCount(): number;
  }
}

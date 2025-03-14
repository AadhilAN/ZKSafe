declare module 'secrets.js' {
    export function split(secret: string, numShares: number, threshold: number): string[];
    export function combine(shares: string[]): string;
  }
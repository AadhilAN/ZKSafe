declare module 'shamirs-secret-sharing' {
    export function split(secret: Buffer, options: { shares: number, threshold: number }): Uint8Array[];
    export function combine(shares: Uint8Array[]): Buffer;
  }
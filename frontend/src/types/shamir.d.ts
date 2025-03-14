declare module 'shamir' {
    function split(secret: Buffer, shares: number, threshold: number): Buffer[];
    function combine(shares: Buffer[]): Buffer;
    export { split, combine };
  }
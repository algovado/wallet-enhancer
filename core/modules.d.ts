declare module "uint8-to-base64" {
  export function encode(uint8: Uint8Array): string;
  export function decode(base64: string): Uint8Array;
}

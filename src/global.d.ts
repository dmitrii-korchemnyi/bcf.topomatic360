declare module "jszip" {
  const JSZip: any;
  export default JSZip;
}

declare module "xmlbuilder2" {
  export function create(...args: any[]): any;
  export function convert(...args: any[]): any;
}

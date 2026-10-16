// Direkter Import der Bibliothek ohne den Debug-Block in pdf-parse/index.js,
// der unter ESM (tsx/vitest) eine nicht vorhandene Testdatei liest.
declare module 'pdf-parse/lib/pdf-parse.js' {
  import pdfParse from 'pdf-parse';
  export default pdfParse;
}

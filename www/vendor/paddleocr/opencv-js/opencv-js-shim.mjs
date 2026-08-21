// opencv.js (build Emscripten/UMD) resolve seu wrapper via `this` de topo do
// arquivo — só funciona como script clássico (this === window), não como ES
// module (this === undefined ali, lançaria erro). Por isso é carregado via
// <script src> clássico antes deste shim (ver carregarBibliotecasPaddleOCR).
export default window.cv;

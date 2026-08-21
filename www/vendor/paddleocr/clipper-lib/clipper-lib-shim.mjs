// clipper-lib é publicado como script UMD clássico (window.ClipperLib), não
// como ES module — precisa ser carregado via <script src> clássico antes
// deste shim rodar (ver carregarBibliotecasPaddleOCR). Isso só re-exporta o
// global como export default, que é o que paddleocr-js espera ao importar.
export default window.ClipperLib;

/*
 * Fotos enviadas pelo navegador (global `Fotos`): reduz o tamanho antes de usar ou salvar.
 *   await Fotos.comprimir(file, { lado: 1600, qualidade: 0.82 }) → { src: dataURL JPEG, proporcao: largura/altura }
 */
(function () {
  'use strict';
  const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

  async function abrir(file) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* tenta pelo <img> */ }
    }
    return new Promise((ok, falha) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('Não consegui abrir essa imagem. Tente uma foto JPG ou PNG.')); };
      img.src = url;
    });
  }

  async function comprimir(file, opcoes) {
    const o = Object.assign({ lado: 1600, qualidade: 0.82 }, opcoes || {});
    if (!file || (file.type && !TIPOS.includes(file.type))) throw new Error('Envie uma foto (JPG, PNG ou WEBP).');
    if (file.size > 25 * 1024 * 1024) throw new Error('Foto muito grande (máximo 25 MB).');
    const img = await abrir(file);
    const w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight;
    if (!w0 || !h0) throw new Error('Não consegui ler essa imagem.');
    const esc = Math.min(1, o.lado / Math.max(w0, h0));
    const w = Math.round(w0 * esc), h = Math.round(h0 * esc);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    if (img.close) img.close();
    return { src: c.toDataURL('image/jpeg', o.qualidade), proporcao: Math.round(w / h * 1000) / 1000 };
  }

  window.Fotos = { comprimir, tamanhoKB: (src) => Math.round(String(src || '').length * 0.75 / 1024) };
})();

(() => {
  const workerUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  async function showPdfPreview(file) {
    const container = document.querySelector("#pdfPreview");
    const message = document.querySelector("#importMessage");
    const pre = document.querySelector("#importPreview");
    if (!container || !message || !pre) return;

    container.hidden = false;
    container.innerHTML = "<p>Preparando vista previa del PDF…</p>";
    pre.hidden = true;

    try {
      const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.15 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;

      const text = await page.getTextContent();
      const excerpt = text.items.map(item => item.str).filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 700);
      container.innerHTML = "";
      container.append(canvas);
      const note = document.createElement("p");
      note.innerHTML = `<strong>${file.name}</strong> · ${pdf.numPages} página(s). El PDF se muestra como referencia; para importar horarios automáticamente, carga el Excel o CSV correspondiente.`;
      container.append(note);
      if (excerpt) {
        const snippet = document.createElement("details");
        snippet.innerHTML = `<summary>Texto detectado en la primera página</summary><p>${excerpt}</p>`;
        container.append(snippet);
      }
      message.className = "message ok";
      message.textContent = "Vista previa de PDF lista. No se modificó ningún turno.";
    } catch (error) {
      container.innerHTML = "";
      message.className = "message error";
      message.textContent = `No se pudo renderizar el PDF: ${error.message || "archivo no compatible"}.`;
    }
  }

  document.addEventListener("click", event => {
    const trigger = event.target.closest("#importSchedule");
    const file = document.querySelector("#scheduleFile")?.files?.[0];
    if (!trigger || !file || !file.name.toLowerCase().endsWith(".pdf")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showPdfPreview(file);
  }, true);
})();

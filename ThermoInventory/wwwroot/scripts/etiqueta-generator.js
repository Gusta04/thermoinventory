const { jsPDF } = window.jspdf;

/**
 * @param {string} op - O número da Ordem de Produção.
 * @param {number} qtd - A quantidade de etiquetas a serem geradas.
 * @param {string} prod - O código do produto.
 */

function gerarEtiquetasEmLotePDF(op, qtd, prod) {
    
    try {
        const quantidade = parseInt(qtd, 10);
        if (isNaN(quantidade) || quantidade <= 0) {
            alert("A quantidade deve ser um número maior que zero.");
            return;
        }

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [100, 50]
        });

        const canvas = document.getElementById('barcode-canvas');
        const padding = Math.max(2, String(quantidade).length);
        const prodFormatadoParaCodigo = prod.replaceAll('.', '-');

        for (let i = 1; i <= quantidade; i++) {

            if (i > 1) {
                doc.addPage([100, 50], 'landscape');
            }

            const numeroSequencial = String(i).padStart(padding, '0');
            const codigoCompleto = `${op}${numeroSequencial}${prodFormatadoParaCodigo}`;

            const qrContainer = document.getElementById('qrcode-container');
            qrContainer.innerHTML = '';

            new QRCode(qrContainer, {
                text: codigoCompleto,
                width: 256, // Tamanho em pixels da imagem gerada
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H // Alta correção de erro
            });

            const qrCanvas = qrContainer.querySelector('canvas');
            const qrImage = qrCanvas.toDataURL('image/png');

            const tamanhoQrCode = 30;
            const margemX = (100 - tamanhoQrCode) / 2;
            const margemY = 10;
            doc.addImage(qrImage, 'PNG', margemX, margemY, tamanhoQrCode, tamanhoQrCode);

            doc.setFontSize(14);
            doc.text(codigoCompleto, 50, 45, { align: 'center' });
        }

        doc.save(`etiquetas-OP-${op}-${prod}.pdf`);

    } catch (error) {
        console.error("Erro ao gerar as etiquetas em lote:", error);
        alert("Ocorreu um erro ao gerar o PDF. Verifique os dados inseridos.");
    }
}

export { gerarEtiquetasEmLotePDF };
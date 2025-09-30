const { jsPDF } = window.jspdf;

/**
 * @param descricao
 * @param codigo
 */

function gerarEtiquetaManualPDF(descricao, codigo) {
    try {
        const descUpper = descricao.toUpperCase();
        const codUpper = codigo.toUpperCase();

        const codFormatado = codUpper.replaceAll('.', '-');
        
        const LARGURA_ETIQUETA_MM = 100;
        const ALTURA_ETIQUETA_MM = 50;
        
        const TAMANHO_QRCODE_MM = 28;
        const MARGEM_ESQUERDA_QRCODE_MM = 5;
        const TAMANHO_FONTE_TEXTO = 24;
        const MARGEM_ENTRE_ELEMENTOS_MM = 5;

        const qrCodeText = `MANUAL-${descUpper}-${codFormatado}`;

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [100, 50]
        });

        const qrContainer = document.getElementById('qrcode-container');
        qrContainer.innerHTML = '';

        new QRCode(qrContainer, {
            text: qrCodeText,
            width: 256,
            height: 256,
            correctLevel: QRCode.CorrectLevel.H
        });

        const qrCanvas = qrContainer.querySelector('canvas');
        const qrImage = qrCanvas.toDataURL('image/png');

        const tamanhoQrCode = 40;
        const margemXQr = 5;
        const margemYQr = (50 - tamanhoQrCode) / 2;
        doc.addImage(qrImage, 'PNG', margemXQr, margemYQr, tamanhoQrCode, tamanhoQrCode);

        const margemXTexto = margemXQr + tamanhoQrCode + 5;
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");

        const texto = `${codUpper} - ${descUpper}`;
        doc.text(texto, margemXTexto, 25, {
            align: 'left',
            baseline: 'middle',
            maxWidth: 100 - margemXTexto - 5
        });

        doc.save(`etiqueta-manual-${codUpper}.pdf`);

    } catch (error) {
        console.error("Erro ao gerar a etiqueta manual:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
    }
}

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
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
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

function gerarEtiquetaEnderecoPDF(endereco){
    try {
        const enderecoUpper = endereco.toUpperCase();
        const qrCodeText = `END-${enderecoUpper}`;

        const LARGURA_ETIQUETA_MM = 100;
        const ALTURA_ETIQUETA_MM = 100;

        const TAMANHO_QRCODE_MM = 30;
        const TAMANHO_FONTE_PRINCIPAL = 80;
        const TAMANHO_FONTE_SECUNDARIA = 36;
        
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [LARGURA_ETIQUETA_MM, ALTURA_ETIQUETA_MM],
        });

        const qrContainer = document.getElementById('qrcode-container');
        
        qrContainer.innerHTML = '';
        
        new QRCode(qrContainer, { 
            text: qrCodeText, 
            width: 256, 
            height: 256, 
            correctLevel: QRCode.CorrectLevel.H 
        });
        
        const qrCanvas = qrContainer.querySelector('canvas');
        
        const qrImage = qrCanvas.toDataURL('image/png');

        doc.setFont("helvetica", "bold");
        
        const centroHorizontal = LARGURA_ETIQUETA_MM / 2;
        
        if (enderecoUpper.includes('-')){
            const partes = enderecoUpper.split('-');
            
            doc.setFontSize(TAMANHO_FONTE_PRINCIPAL);
            
            doc.text(
                partes[0], 
                centroHorizontal, 
                25, 
                {align: 'center'
            });

            doc.text(
                partes[1],
                centroHorizontal,
                50,
                {align: 'center'}
            );
        } else {
            doc.setFontSize(TAMANHO_FONTE_SECUNDARIA);
            
            doc.text(
                enderecoUpper, 
                centroHorizontal, 
                25,
                {
                    align: 'center',
                    baseline: 'middle'
                }
            );
        }
        
        const margemXQr = (LARGURA_ETIQUETA_MM - TAMANHO_QRCODE_MM) / 2;
        const margemYQr = 60;
        
        doc.addImage(
            qrImage,
            'PNG',
            margemXQr,
            margemYQr,
            TAMANHO_QRCODE_MM,
            TAMANHO_QRCODE_MM
        );
        
        doc.save(`etiqueta-endereco-${enderecoUpper}.pdf`)
        
    } catch (error) {
        console.error("Erro ao gerar a etiqueta de endereço:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
    }
}

export { gerarEtiquetaManualPDF, gerarEtiquetasEmLotePDF, gerarEtiquetaEnderecoPDF };
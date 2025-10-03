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
        const ALTURA_ETIQUETA_MM = 30;

        const ALTURA_UTIL_MM = 28;
        const MARGEM_SUPERIOR_MM = (ALTURA_ETIQUETA_MM - ALTURA_UTIL_MM) / 2;

        const TAMANHO_QRCODE_MM = ALTURA_UTIL_MM - 5;
        const MARGEM_ESQUERDA_QRCODE_MM = 2;
        const TAMANHO_FONTE_TEXTO = 16;
        const MARGEM_ENTRE_ELEMENTOS_MM = 3;

        const qrCodeText = `MANUAL-${descUpper}-${codFormatado}`;

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [LARGURA_ETIQUETA_MM, ALTURA_ETIQUETA_MM]
        });

        const qrContainer = document.getElementById('qrcode-container');
        qrContainer.innerHTML = '';

        new QRCode(qrContainer, {
            text: qrCodeText,
            width: 256,
            height: 256,
            correctLevel: QRCode.CorrectLevel.H
        });

        const caixaTextoX = MARGEM_ESQUERDA_QRCODE_MM + TAMANHO_QRCODE_MM + MARGEM_ENTRE_ELEMENTOS_MM;
        const caixaTextoY = MARGEM_SUPERIOR_MM;
        const caixaTextoLargura = LARGURA_ETIQUETA_MM - caixaTextoX - MARGEM_ESQUERDA_QRCODE_MM;
        const caixaTextoAltura = ALTURA_UTIL_MM;

        const qrCanvas = qrContainer.querySelector('canvas');
        const qrImage = qrCanvas.toDataURL('image/png');

        const margemYQr = MARGEM_SUPERIOR_MM + ((ALTURA_UTIL_MM - TAMANHO_QRCODE_MM) / 2);
        doc.addImage(qrImage, 'PNG', MARGEM_ESQUERDA_QRCODE_MM, margemYQr, TAMANHO_QRCODE_MM, TAMANHO_QRCODE_MM);

        const margemXTexto = MARGEM_ESQUERDA_QRCODE_MM + TAMANHO_QRCODE_MM + MARGEM_ENTRE_ELEMENTOS_MM;
        const larguraMaximaTexto = LARGURA_ETIQUETA_MM - margemXTexto - MARGEM_ESQUERDA_QRCODE_MM;
        
        doc.setFontSize(TAMANHO_FONTE_TEXTO);
        doc.setFont("helvetica", "bold");

        const texto = `${codUpper} - ${descUpper}`;

        const linhasDoTexto = doc.splitTextToSize(texto, caixaTextoLargura);
        const alturaDoTexto = doc.getTextDimensions(linhasDoTexto).h;
        const posicaoYInicial = caixaTextoY + (caixaTextoAltura / 2) - (alturaDoTexto / 2);
        
        doc.text(texto, (caixaTextoX + (caixaTextoLargura / 2)), posicaoYInicial, {
            align: 'center',
            baseline: 'top',
            maxWidth: larguraMaximaTexto
        });
        
        //doc.setLineDash([2.5])
        //doc.line(0, MARGEM_SUPERIOR_MM, LARGURA_ETIQUETA_MM, MARGEM_SUPERIOR_MM);
        //doc.line(0, (MARGEM_SUPERIOR_MM + ALTURA_UTIL_MM), LARGURA_ETIQUETA_MM, (MARGEM_SUPERIOR_MM + ALTURA_UTIL_MM));
        
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

/**
 * @param {number} notaFiscal
 * @param {number} total
 * @param {number} porCaixa
 * @param {string} descricao
 * @param {string} codigo
 */
function gerarEtiquetasLotePDF(notaFiscal, total, porCaixa, descricao, codigo)
{
    try 
    {
        const notaFiscalNum = parseInt(notaFiscal);
        const totalNum = parseInt(total, 10);
        const porCaixaNum = parseInt(porCaixa, 10);
        
        if (isNaN(totalNum) || isNaN(porCaixaNum) || totalNum <= 0 || porCaixaNum <= 0) 
        {
            alert("As quantidades devem ser números maiores que zero.");
            return;
        }
        
        if (totalNum % porCaixaNum !== 0) 
        {
            alert("A 'Quantidade Total' deve ser perfeitamente divisível pela 'Quantidade por embalagem'.");
            return;
        }

        const LARGURA_ETIQUETA_MM = 100;
        const ALTURA_ETIQUETA_MM = 50;
        
        const numEtiquetas = totalNum / porCaixaNum;
        const descUpper = descricao.toUpperCase();
        const codUpper = codigo.toUpperCase();
        const codFormatado = codUpper.replaceAll('.', '-');

        const caixaTextoX = 5;
        const caixaTextoY = 1;
        const caixaTextoLargura = LARGURA_ETIQUETA_MM - (caixaTextoX * 2);
        const caixaTextoAltura = 10;

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [100, 50]
        });

        const qrContainer = document.getElementById('qrcode-container');
        
        for (let i = 1; i <= numEtiquetas; i++) 
        {
            if (i > 1) 
            {
                doc.addPage([LARGURA_ETIQUETA_MM, ALTURA_ETIQUETA_MM], 'landscape');
            }

            const qrCodeText = `LOTE-${notaFiscalNum}-${i}-${porCaixaNum}-${codFormatado}::${descUpper}`;

            qrContainer.innerHTML = '';
            new QRCode(qrContainer, { 
                text: qrCodeText, 
                width: 256, 
                height: 256, 
                correctLevel: QRCode.CorrectLevel.H 
            });
            
            const qrCanvas = qrContainer.querySelector('canvas');
            const qrImage = qrCanvas.toDataURL('image/png');

            const texto = `${codUpper} - ${descUpper}`;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            
            const linhasDoTexto = doc.splitTextToSize(texto, caixaTextoLargura);
            const alturaDoTexto = doc.getTextDimensions(linhasDoTexto).h;
            const posicaoYInicial = caixaTextoY + (caixaTextoAltura / 2) - (alturaDoTexto / 2);
            
            doc.text(texto, (caixaTextoX + (caixaTextoLargura / 2)), posicaoYInicial, {
                align: 'center',
                baseline: 'top'
            });

            const tamanhoQrCode = 28;
            doc.addImage(qrImage, 'PNG', (LARGURA_ETIQUETA_MM - tamanhoQrCode) / 2, 10, tamanhoQrCode, tamanhoQrCode);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            
            doc.text(`CAIXA ${i} DE ${numEtiquetas}`, 5, 45);
            
            doc.text(`CONTÉM: ${porCaixaNum} UNID.`, LARGURA_ETIQUETA_MM - 5, 45, { 
                align: 'right' 
            });

            doc.setFontSize(10);
            
            let date = new Date().toLocaleDateString('pt-br');
            let hours = new Date().toLocaleTimeString('pt-br');
            
            doc.text(`${date} - ${hours}`,
                LARGURA_ETIQUETA_MM / 2, 49, {align: 'center'});
        }

        doc.save(`etiquetas-lote-${codUpper}.pdf`);
    }
    catch(error) 
    {
        console.error("Erro ao gerar as etiquetas de lote:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
    }
}

export { gerarEtiquetaManualPDF, gerarEtiquetasEmLotePDF, gerarEtiquetaEnderecoPDF, gerarEtiquetasLotePDF };
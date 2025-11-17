// Estado da aplicação
const contagemInventario = new Map();
const codigosBipados = new Set();
const codigosPorEndereco = new Map();
const TAMANHO_CODIGO_PRODUTO = 8;
let isScanningPaused = false;
const SCAN_COOLDOWN_MS = 2000;
let modoAtual = null;

const ITENS_ATE_REVALIDACAO = 7;
let inventarioBloqueado;
let enderecoAtual = null;
let scansDesdeEndereco = 0;

let modoRecontagem = false;
let aguardandoEnderecoParaRecontar = false;

// Elementos da UI
let selecaoModoEl = document.getElementById('selecao-modo');
let modoLeitorUsbEl = document.getElementById('modo-leitor-usb');
let modoCameraEl = document.getElementById('modo-camera');
let areaResultadosEl = document.getElementById('area-resultados');
let controlesInventarioEl = document.getElementById('controles-inventario');
let modalOverlayEl = document.getElementById('modal-manual-overlay');
let modalProductInfoEl = document.getElementById('modal-product-info');
let modalQuantityInputEl = document.getElementById('modal-quantity-input');

let leitorInput = document.getElementById('leitorInput');
let statusDiv = document.getElementById('status');
let tabelaInventarioBody = document.querySelector("#tabelaInventario tbody");
let html5QrCode = null;
let dadosModalAtual = null;

let textoAlternarModo = document.getElementById('texto-alternar-modo');
let audioCtx;

//region **** Funções Relacionadas a leitura ****
function iniciarModoLeitor() {
    localStorage.setItem('ultimoModo', 'leitor');
    modoAtual = 'leitor';

    selecaoModoEl.classList.add('hidden');
    modoCameraEl.classList.add('hidden');
    modoLeitorUsbEl.classList.remove('hidden');
    areaResultadosEl.classList.remove('hidden');
    controlesInventarioEl.classList.remove('hidden');
    textoAlternarModo.textContent = "Trocar para Câmera"
    leitorInput.focus();

    leitorInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            processarCodigo(leitorInput.value.trim());
            leitorInput.value = '';
        }
    });
}

async function iniciarModoCamera() {
    localStorage.setItem('ultimoModo', 'camera');
    modoAtual = 'camera';

    selecaoModoEl.classList.add('hidden');
    modoLeitorUsbEl.classList.add('hidden');
    modoCameraEl.classList.remove('hidden');
    areaResultadosEl.classList.remove('hidden');
    controlesInventarioEl.classList.remove('hidden');
    textoAlternarModo.textContent = "Trocar para Leitor.";

    html5QrCode = new Html5Qrcode("camera-reader");

    try{
        const cameras = await Html5Qrcode.getCameras();
        const cameraPrincipal = cameras.find(cam => cam.label === 'camera 0, facing back');

        const cameraId = cameraPrincipal ? cameraPrincipal.id : { facingMode: "environment" };

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            videoContraints:
                {
                    width: {ideal: 1920},
                    height: {ideal: 1080},
                    focusMode: "continuous"
                }
        }

        await html5QrCode.start(cameraId, config, onScanSuccess)
            .catch(err => {
                console.error("Erro ao iniciar a câmera", err);
                mostrarStatus("Não foi possível iniciar a câmera. Verifique as permissões.", "erro");
            });

    } catch(error) {
        console.error("Erro: ", error);
    }
}

async function pararCamera() {
    if (html5QrCode && html5QrCode.isScanning) {
        try {
            await html5QrCode.stop();
            console.log("Scanner da câmera parado.");

        } catch (err) {
            console.error("Falha ao parar a câmera", err);
        }
    }
}

async function alternarModoDeLeitura() {
    if (modoAtual === 'leitor')
    {
        await iniciarModoCamera();
    }
    else if (modoAtual === 'camera')
    {
        await pararCamera();
        iniciarModoLeitor();
    }
    else if (modoAtual === 'pausado')
    {
        await iniciarModoCamera();
    }
}

function mostrarVisaoResumo(){
    modoAtual = 'pausado';

    selecaoModoEl.classList.add('hidden');
    modoCameraEl.classList.add('hidden');
    modoLeitorUsbEl.classList.add('hidden');

    areaResultadosEl.classList.remove('hidden');
    controlesInventarioEl.classList.remove('hidden');

    textoAlternarModo.textContent = "Continuar Contagem";
}
//endregion **** Funções Relacionadas a leitura ****

//region **** Sons ****
function tocarBeep() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.type = 'sine';

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

function tocarBuzzerErro() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
    oscillator.type = 'square';

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
}

/**
 * @param {string} texto
 */
function falarTexto(texto)
{
    if ('speechSynthesis' in window)
    {
        const utterance = new SpeechSynthesisUtterance(texto);

        utterance.lang = 'pt-BR';
        utterance.rate = 1.1;

        window.speechSynthesis.speak(utterance);
    }
    else
    {
        console.warn("API de Síntese de Voz não suportada neste navegador.");
        tocarBuzzerErro();
    }
}
//endregion **** Sons ****


//region **** Recontagem de Endereço ********
function iniciarRecontagem() {
    
    if (contagemInventario.size === 0) {
        alert("Não há dados de inventário para recontar. Realize uma contagem primeiro");
        return;
    }
    
    modoRecontagem = true;
    aguardandoEnderecoParaRecontar = true;
    
    const mensagem = "MODO RECONTAGEM ATIVADO: Escaneie o endereço que deseja recontar."
    mostrarStatus(mensagem, "info");
    falarTexto(mensagem);
    
    const btnRecontar = document.getElementById("btn-recontar-endereco");
    const btnCancelar = document.getElementById("btn-cancelar-recontagem");
    
    if (btnRecontar) {
        btnRecontar.style.backgroundColor = "#f39c12";
        btnRecontar.textContent = "⏳ Aguardando Endereço...";
        btnRecontar.style.pointerEvents = "none";
    }

    if (btnCancelar) {
        btnCancelar.classList.remove('hidden');
    }
}

/**
 * @param {string} endereco
 */
function limparDadosDoEndereco (endereco) {
    if (!contagemInventario.has(endereco)) {
        mostrarStatus(`ERRO: O endereço "${endereco}" não foi encontrado no inventario atual.`, "erro");
        tocarBuzzerErro();
        cancelarRecontagem();
        return;
    }
    
    if (codigosPorEndereco.has(endereco)) {
        const codigosDoEndereco = codigosPorEndereco.get(endereco);
        codigosDoEndereco.forEach((codigo) => {
            codigosBipados.delete(codigo);
        });
        
        codigosPorEndereco.delete(endereco);
        console.log(`${codigosDoEndereco.size} código(s) removido(s) do endereço "${endereco}".`);
        
    }
    
    const itensRemovidos = contagemInventario.get(endereco);
    contagemInventario.delete(endereco);
    
    const quantidadeItensRemovidos = itensRemovidos.size;
    
    console.log(`Endereço "${endereco}" limpo. ${quantidadeItensRemovidos} item(ns) removido(s).`);
    
    enderecoAtual = endereco;
    scansDesdeEndereco = 0;
    inventarioBloqueado = false;
    
    contagemInventario.set(endereco, new Map());
    codigosPorEndereco.set(endereco, new Set());
    
    atualizarTabela();
    salvarInventario();
    
    const mensagem = `Endereço "${endereco}" limpo! Você pode recontar os itens agora.`;
    mostrarStatus(mensagem, "Sucesso");
    tocarBeep();
    falarTexto(mensagem);
    
    cancelarRecontagem();
}

function cancelarRecontagem() {
    modoRecontagem = false;
    aguardandoEnderecoParaRecontar = false;
    
    const btnRecontar = document.getElementById("btn-recontar-endereco");
    const btnCancelar = document.getElementById('btn-cancelar-recontagem');
    
    if (btnRecontar) {
        btnRecontar.style.backgroundColor = "";
        btnRecontar.textContent = "🔄 Recontar Endereço";
        btnRecontar.style.pointerEvents = "";
    }

    if (btnCancelar) {
        btnCancelar.classList.add('hidden');
    }
}
//endregion **** Recontagem de Endereço ********


//region **** Salvar e excluir inventário ****
function salvarInventario() {
    const dadosParaSalvar = {
        bipados: Array.from(codigosBipados)
    };

    const inventarioSerializavel = {};

    for (const [endereco, inventarioDoEndereco] of contagemInventario.entries()) {
        inventarioSerializavel[endereco] = Array.from(inventarioDoEndereco.entries());
    }

    dadosParaSalvar.inventario = inventarioSerializavel;

    localStorage.setItem('inventarioSalvo', JSON.stringify(dadosParaSalvar));
    console.log("Inventário salvo no cache.");
}

function carregarInventarioSalvo() {
    const dadosSalvos = localStorage.getItem('inventarioSalvo');

    if (dadosSalvos)
    {
        console.log("Inventário encontrado no cache. Carregando...");
        const dadosParseados = JSON.parse(dadosSalvos);

        contagemInventario.clear();
        codigosBipados.clear();
        codigosPorEndereco.clear();

        if (dadosParseados.inventario)
        {
            for (const endereco in dadosParseados.inventario)
            {
                const itensDoEnderecoArray = dadosParseados.inventario[endereco];
                const mapaDoEndereco = new Map(itensDoEnderecoArray);
                contagemInventario.set(endereco, mapaDoEndereco);
            }
        }

        if (dadosParseados.bipados)
        {
            const bipadosRecuperados = new Set(dadosParseados.bipados);
            bipadosRecuperados.forEach(codigo => codigosBipados.add(codigo));
        }

        if (dadosParseados.codigosPorEndereco)
        {
            for (const endereco in dadosParseados.codigosPorEndereco)
            {
                const codigosArray = dadosParseados.codigosPorEndereco[endereco];
                const codigosSet = new Set(codigosArray);
                codigosPorEndereco.set(endereco, codigosSet);
            }
        }

        if (contagemInventario.size > 0)
        {
            atualizarTabela();
            areaResultadosEl.classList.remove('hidden');
            selecaoModoEl.classList.add('hidden');

            const ultimoModo = localStorage.getItem('ultimoModo');

            if (ultimoModo === 'camera') iniciarModoCamera()
            else if (ultimoModo === 'leitor') iniciarModoLeitor();
            else if (ultimoModo === 'pausado') mostrarVisaoResumo();
            else iniciarModoLeitor();
        }
    }
}

function limparInventario() {

    const confirmacao = confirm("Você tem certeza que deseja encerrar e limpar toda a contagem atual? Esta ação não pode ser desfeita.");

    if (confirmacao) {
        gerarRelatorioPDF().then(() => {
            pararCamera().then(() => {
                localStorage.removeItem('inventarioSalvo');
                localStorage.removeItem('ultimoModo');
                console.log("Cache do inventário limpo pelo usuário.");
                location.reload();
            });
        });
    }
}
//endregion **** Salvar e excluir inventário ****

//region **** Funções auxiliares ****
function parseCodigoComplexoERP(codigoCompletoERP){
    try {
        const produto = codigoCompletoERP.slice(-8);

        const meio = codigoCompletoERP.substring(27, codigoCompletoERP.length - 8);

        const partesDoMeio = meio.split('-');

        let descricaoFinal;

        if (codigoCompletoERP.startsWith('COMINFAD')){

            if (partesDoMeio.length >= 3){
                const infoAdicional = partesDoMeio[partesDoMeio.length - 1];

                const descricaoPrincipal =  partesDoMeio.slice(1, -1).join('-');
                descricaoFinal = `${descricaoPrincipal} - ${infoAdicional}`;

            }else {
                descricaoFinal = partesDoMeio.slice(1).join('-') || "Descrição Inválida";
            }
        } else {
            if (partesDoMeio.length >= 2){
                descricaoFinal = partesDoMeio.slice(1).join('-');

            }else {
                descricaoFinal = "Descrição Inválida";
            }
        }

        return {produto, descricao: descricaoFinal};
    } catch(error){
        console.error("Erro ao fazer a separação do código", error);
        return null;
    }
}

function processarCodigo(codigo) {
    if (!codigo) return;
    
    if (aguardandoEnderecoParaRecontar) {
        if(codigo.startsWith('END-')){
            const endereco = codigo.substring(4);
            limparDadosDoEndereco(endereco);
            return;
        }
        else {
            mostrarStatus("ERRO: Esperando um código de ENDEREÇO. Escaneie uma etiqueta de endereço.", "erro");
            tocarBuzzerErro();
            return;
        }
    }

    if (inventarioBloqueado)
    {
        if (codigo.startsWith('END-'))
        {
            definirEndereco(codigo);
            scansDesdeEndereco = 0;

        }
        else
        {
            mostrarStatus(`SISTEMA BLOQUEADO! Re-escaneie o endereço 
                ${enderecoAtual} para continuar.`, 'erro');
            tocarBuzzerErro();
        }
        return;
    }

    if (codigo.startsWith('END-')){
        definirEndereco(codigo);
    }
    else if (codigo.startsWith('MANUAL-'))
    {
        if (!enderecoAtual)
        {
            mostrarStatus("ERRO: Por favor, leia primeiro a etiqueta de um endereço.", 'erro');
            tocarBuzzerErro();
            return;
        }

        try {
            const dadosBrutos = codigo.substring(7);
            const partes = dadosBrutos.split('-');

            const produto = partes.slice(1).join('-').replaceAll('-', '.');
            const descricao = partes[0];

            abrirModalManual({ produto, descricao }, codigo);

        } catch (error) {
            mostrarStatus(`ERRO: Formato de código MANUAL inválido.`, 'erro');
            tocarBuzzerErro();
        }
    }
    else {

        if (!enderecoAtual) {
            mostrarStatus("ERRO: Por favor, leia primeiro a etiqueta de um endereço.", 'erro');
            tocarBuzzerErro();
            return;
        }

        if (codigosBipados.has(codigo)) {
            mostrarStatus(`ERRO: A etiqueta ${codigo} já foi bipada!`, 'erro');
            tocarBuzzerErro();
            return;
        }

        let dadosDoCodigo;
        let quantidadeASomar = 1;

        if (codigo.startsWith('LOTE-')) {
            try {
                const partesPrincipais = codigo.split('::');
                const descricao = partesPrincipais[1] || "(Descrição não informada)";

                const partesDoCodigo = partesPrincipais[0].split('-');

                quantidadeASomar = parseInt(partesDoCodigo[3], 10);

                const produto = partesDoCodigo.slice(4).join('-').replace('-', '.');

                dadosDoCodigo = {produto, descricao};

            } catch (error) {
                mostrarStatus(`Erro: Formato de código de LOTE inválido`, 'erro');
                tocarBuzzerErro();
                return;
            }
        }
        else if (codigo.startsWith('COMINFAD') || codigo.startsWith('SEMINFAD'))
        {
            dadosDoCodigo = parseCodigoComplexoERP(codigo);
            dadosDoCodigo.produto = dadosDoCodigo.produto.replaceAll('-', '.');

        }
        else
        {
            const codigoProdutoBruto = extrairCodigoProduto(codigo);

            dadosDoCodigo = codigoProdutoBruto ? {
                produto: codigoProdutoBruto.replaceAll('-', '.'),
                descricao: "(Descrição não informada)"
            } : null;
        }

        if (!dadosDoCodigo) {
            mostrarStatus(`ERRO: Código de produto inválido: '${codigo}'.`, 'erro');
            tocarBuzzerErro();
            return;
        }

        codigosBipados.add(codigo);

        if (!codigosPorEndereco.has(enderecoAtual)) {
            codigosPorEndereco.set(enderecoAtual, new Set());
        }
        codigosPorEndereco.get(enderecoAtual).add(codigo);

        const inventarioDoEndereco = contagemInventario.get(enderecoAtual);

        const chaveComposta = `${dadosDoCodigo.produto}::${dadosDoCodigo.descricao}`;

        const contagemAtual = inventarioDoEndereco.get(chaveComposta) || {
            quantidade: 0,
            produto: dadosDoCodigo.produto,
            descricao: dadosDoCodigo.descricao
        };

        contagemAtual.quantidade += quantidadeASomar;

        inventarioDoEndereco.set(chaveComposta, contagemAtual);

        atualizarTabela();
        mostrarStatus(`SUCESSO: ${quantidadeASomar}x ${dadosDoCodigo.produto} adicionado.`, 'sucesso');
        tocarBeep();
        salvarInventario();

        scansDesdeEndereco++;

        if
        (scansDesdeEndereco >= ITENS_ATE_REVALIDACAO) {
            inventarioBloqueado = true;

            const mensagemDeAlerta = `Atenção: ${ITENS_ATE_REVALIDACAO} itens lidos. 
            Por favor, confirme o endereço para continuar.`;

            mostrarStatus(mensagemDeAlerta, 'info');

            falarTexto(mensagemDeAlerta);
        }
    }
}

function onScanSuccess(decodedText, _decodedResult) {
    if (isScanningPaused) {
        return;
    }

    isScanningPaused = true;

    processarCodigo(decodedText);

    setTimeout(() => {
        isScanningPaused = false;
        mostrarStatus("Aguardando próximo item...", "info");
    }, SCAN_COOLDOWN_MS);
}

/**
 * @param {string} codigoEndereco
 */
function definirEndereco(codigoEndereco) {
    const novoEndereco = codigoEndereco.substring(4);

    if (enderecoAtual !== novoEndereco) {
        scansDesdeEndereco = 0;
    }

    enderecoAtual = novoEndereco;
    inventarioBloqueado = false;

    if (!contagemInventario.has(enderecoAtual)){
        contagemInventario.set(enderecoAtual, new Map());
    }

    if (!codigosPorEndereco.has(enderecoAtual)){
        codigosPorEndereco.set(enderecoAtual, new Set());
    }

    mostrarStatus(`Contagem iniciada no endereço: ${enderecoAtual}. Pode ler os produtos.`, 'info');

    tocarBeep();
}

function extrairCodigoProduto(codigoCompleto) {
    if (codigoCompleto.length < TAMANHO_CODIGO_PRODUTO) return null;
    return codigoCompleto.slice(-TAMANHO_CODIGO_PRODUTO);
}

function atualizarTabela() {
    tabelaInventarioBody.innerHTML = '';

    if (contagemInventario.size === 0) return;

    for (const [endereco, inventarioDoEndereco] of contagemInventario.entries()) {
        const itensDoEndereco = Array.from(inventarioDoEndereco.values());
        const totalItensNoEndereco = itensDoEndereco.length;

        itensDoEndereco.forEach((item, index) => {
            const tr = document.createElement('tr');
            let tdEndereco = '';

            if (index === 0){
                tdEndereco = `<td rowspan="${totalItensNoEndereco}">${endereco}</td>`;
            }

            tr.innerHTML =`
                ${tdEndereco}
                <td>${item.produto}</td>
                <td>${item.quantidade}</td>
            `;
            tabelaInventarioBody.appendChild(tr);
        })
    }
}

function mostrarStatus(mensagem, tipo) {
    statusDiv.textContent = mensagem;
    statusDiv.className = `status status-${tipo}`;
}

/**
 * @param {object} dadosDoCodigo
 * @param {string} codigoOriginal
 */

function abrirModalManual (dadosDoCodigo, codigoOriginal)
{
    dadosModalAtual = {...dadosDoCodigo, codigoOriginal};

    modalProductInfoEl.textContent = `${dadosDoCodigo.produto} - ${dadosDoCodigo.descricao}`;

    modalQuantityInputEl.value = '';
    modalOverlayEl.classList.remove('hidden');
    modalQuantityInputEl.focus();
}

function fecharModalManual()
{
    modalOverlayEl.classList.add('hidden');
    dadosModalAtual = null;

    if (modoAtual === 'leitor') leitorInput.focus();
}
//endregion **** Funções auxiliares ****

async function gerarRelatorioPDF() {
    if (contagemInventario.size === 0) {
        alert("Nenhum item foi contado ainda. Adicione itens antes de gerar o relatório.");
        return;
    }

    const urlEndpoint = '/api/relatorio/gerar'

    const dadosParaApi = Array.from(contagemInventario.entries()).map(([endereco, inventarioDoEndereco]) => {
        return {
            Endereco: endereco,
            Itens: Array.from(inventarioDoEndereco.values()).map(item => ({
                CodigoProduto: item.produto,
                Quantidade: item.quantidade,
                Descricao: item.descricao
            }))
        }
    });

    mostrarStatus("Gerando relatório, por favor aguarde...", "info");

    try {
        const response = await fetch(urlEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dadosParaApi),
        });

        if (response.ok) {
            const blob = await response.blob();

            const header = response.headers.get('Content-Disposition');
            const parts = header.split(';');
            let filename = 'relatorio.pdf';

            if (header){
                parts.forEach(part => {
                    if (part.trim().startsWith('filename=')) {
                        filename = part.split('=')[1].trim().replaceAll(`"`,``);
                    }
                });
            }


            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.style.display = 'none';
            a.href = url;
            a.download = filename;

            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            mostrarStatus("Relatório PDF gerado com sucesso!", "sucesso");

        } else {
            const errorText = await response.text();

            mostrarStatus(`Erro ao gerar relatório: ${errorText}`, "erro");
            tocarBuzzerErro();
        }
    } catch (error) {
        console.error("Erro de rede ao tentar gerar o relatório:", error);
        mostrarStatus("Erro de conexão. Não foi possível comunicar com o servidor.", "erro");
        tocarBuzzerErro();
    }
}

function initializeInventarioPage() {

    const btnIniciarLeitor = document.getElementById('btn-iniciar-leitor');
    const btnIniciarCamera = document.getElementById('btn-iniciar-camera');
    const btnPararCamera = document.getElementById('btn-parar-camera');
    const btnGerarRelatorio = document.getElementById('btn-gerar-relatorio');
    const btnLimparInventario = document.getElementById('btn-limpar-inventario');
    const btnAlternarModo = document.getElementById('btn-alternar-modo');
    const btnRecontarEndereco = document.getElementById('btn-recontar-endereco');
    const btnCancelarRecontagem = document.getElementById('btn-cancelar-recontagem');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    if (btnIniciarLeitor) btnIniciarLeitor.addEventListener('click', iniciarModoLeitor);
    if (btnIniciarCamera) btnIniciarCamera.addEventListener('click', iniciarModoCamera);
    if (btnPararCamera) btnPararCamera.addEventListener('click', async () => {
        await pararCamera();

        if(contagemInventario.size === 0) {
            modoCameraEl.classList.add('hidden');
            areaResultadosEl.classList.add('hidden');
            controlesInventarioEl.classList.add('hidden');

            selecaoModoEl.classList.remove('hidden');
        } else{
            localStorage.setItem('ultimoModo', 'pausado');
            setTimeout(() => {
                location.reload();
            }, 500);
        }
    });

    if (btnLimparInventario) btnLimparInventario.addEventListener('click', limparInventario);
    if (btnGerarRelatorio) btnGerarRelatorio.addEventListener('click', gerarRelatorioPDF);
    if (btnAlternarModo) btnAlternarModo.addEventListener('click', alternarModoDeLeitura);

    if (btnRecontarEndereco) {
        btnRecontarEndereco.addEventListener('click', iniciarRecontagem);
    }

    if (btnCancelarRecontagem) {
        btnCancelarRecontagem.addEventListener('click', () => {
            cancelarRecontagem();
            mostrarStatus("Recontagem cancelada.", "info");
        });
    }
        
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', fecharModalManual);

    if (modalSaveBtn) modalSaveBtn.addEventListener('click', () =>
    {
        const quantidade = parseInt(modalQuantityInputEl.value, 10)

        if (isNaN(quantidade) || quantidade <= 0) {
            alert("Por favor, digite uma quantidade válida maior que zero.");
            return;
        }

        const { produto, descricao, codigoOriginal } = dadosModalAtual;
        const chaveComposta = `${produto}::${descricao}`;

        codigosBipados.add(codigoOriginal);

        if (codigosPorEndereco.has(enderecoAtual)) {
            codigosPorEndereco.get(enderecoAtual).add(codigoOriginal);
        }

        const inventarioDoEndereco = contagemInventario.get(enderecoAtual);
        const contagemAtual = inventarioDoEndereco.get(chaveComposta) || {
            quantidade: 0,
            produto: produto,
            descricao: descricao
        };

        contagemAtual.quantidade += quantidade;
        inventarioDoEndereco.set(chaveComposta, contagemAtual);

        atualizarTabela();
        mostrarStatus(`SUCESSO: ${quantidade}x ${produto} adicionado(s) ao endereço ${enderecoAtual}.`, 'sucesso');
        tocarBeep();
        salvarInventario();

        fecharModalManual();
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modalOverlayEl.classList.contains('hidden')) {
            fecharModalManual();
        }
        
        if (event.key === 'Escape' && aguardandoEnderecoParaRecontar) {
            cancelarRecontagem();
            mostrarStatus("Recontagem cancelada.", "info");
        }
    });

    carregarInventarioSalvo();
}

export { initializeInventarioPage };
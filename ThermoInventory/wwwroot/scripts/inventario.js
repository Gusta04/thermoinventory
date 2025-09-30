// Estado da aplicação
const contagemInventario = new Map();
const codigosBipados = new Set();
const TAMANHO_CODIGO_PRODUTO = 8; 
let isScanningPaused = false; 
const SCAN_COOLDOWN_MS = 2000; 
let modoAtual = null;

// Elementos da UI
let selecaoModoEl = document.getElementById('selecao-modo');
let modoLeitorUsbEl = document.getElementById('modo-leitor-usb');
let modoCameraEl = document.getElementById('modo-camera');
let areaResultadosEl = document.getElementById('area-resultados');
let leitorInput = document.getElementById('leitorInput');
let statusDiv = document.getElementById('status');
let tabelaInventarioBody = document.querySelector("#tabelaInventario tbody");
let html5QrCode = null;

let textoAlternarModo = document.getElementById('texto-alternar-modo');
let controlesInventarioEl = document.getElementById('controles-inventario');
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

function iniciarModoCamera() {
    localStorage.setItem('ultimoModo', 'camera');
    modoAtual = 'camera';

    selecaoModoEl.classList.add('hidden');
    modoLeitorUsbEl.classList.add('hidden');
    modoCameraEl.classList.remove('hidden');
    areaResultadosEl.classList.remove('hidden');
    controlesInventarioEl.classList.remove('hidden');
    textoAlternarModo.textContent = "Trocar para Leitor.";

    html5QrCode = new Html5Qrcode("camera-reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.DATA_MATRIX
        ]
    };

    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
        .catch(err => {
            console.error("Erro ao iniciar a câmera", err);
            mostrarStatus("Não foi possível iniciar a câmera. Verifique as permissões.", "erro");
        });
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

function pararModoCamera() {
    html5QrCode.stop().then(() => {
        console.log("Scanner da câmera parado.");
        modoCameraEl.classList.add('hidden');
        selecaoModoEl.classList.remove('hidden');
        controlesInventarioEl.classList.add('hidden');
    }).catch(err => console.error("Erro ao parar a câmera", err));
}

async function alternarModoDeLeitura() {
    console.log("teste");
    if (modoAtual === 'leitor') {
        iniciarModoCamera();
        
        
    } else if (modoAtual === 'camera') {
        await pararCamera();
        
        iniciarModoLeitor();
    }
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
//endregion **** Sons ****

//region **** Salvar e excluir inventário ****
function salvarInventario() {
    const dadosParaSalvar = {
        inventario: Array.from(contagemInventario.entries()),
        bipados: Array.from(codigosBipados)
    };

    localStorage.setItem('inventarioSalvo', JSON.stringify(dadosParaSalvar));
    console.log("Inventário salvo no cache.");
}

function carregarInventarioSalvo() {
    const dadosSalvos = localStorage.getItem('inventarioSalvo');

    if (dadosSalvos) {
        console.log("Inventário encontrado no cache. Carregando...");
        const dadosParseados = JSON.parse(dadosSalvos);

        const inventarioRecuperado = new Map(dadosParseados.inventario);
        const bipadosRecuperados = new Set(dadosParseados.bipados);

        if (inventarioRecuperado.size > 0) {
            contagemInventario.clear();
            inventarioRecuperado.forEach((qtde, prod) => contagemInventario.set(prod, qtde));

            codigosBipados.clear();
            bipadosRecuperados.forEach(codigo => codigosBipados.add(codigo));

            atualizarTabela();
            
            areaResultadosEl.classList.remove('hidden');
            selecaoModoEl.classList.add('hidden');

            const ultimoModo = localStorage.getItem('ultimoModo');
            
            if (ultimoModo === 'camera') {
                iniciarModoCamera();
            } else {
                modoLeitorUsbEl.classList.remove('hidden');
                leitorInput.focus();
            }
        }
    }
}

function limparInventario() {
    
    const confirmacao = confirm("Você tem certeza que deseja encerrar e limpar toda a contagem atual? Esta ação não pode ser desfeita.");

    if (confirmacao) {
        // noinspection JSVoidFunctionReturnValueUsed
        pararCamera().then(() => {
            localStorage.removeItem('inventarioSalvo');
            localStorage.removeItem('ultimoModo');
            console.log("Cache do inventário limpo pelo usuário.");
            location.reload();
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
        
        let descricaoFinal = '';
        
        if (codigoCompletoERP.startsWith('COMINFAD')){
            
            if (partesDoMeio.length >= 3){
                const infoAdicional = partesDoMeio[partesDoMeio.length - 1];
                
                const descricaoPrincipal =  partesDoMeio.slice(1, -1).join('-');
                descricaoFinal = `${descricaoPrincipal} - ${infoAdicional}`;
                
            }else {
                descricaoFinal = partesDoMeio.slice(1).join('-') || "Descrição Inválida";
            }
        }else {
            if (partesDoMeio.length >= 2){
                descricaoFinal = partesDoMeio.slice(1).join('-');
                
            }else {
                descricaoFinal = "Descrição Inválida";
            }
        }
        
        const pagina = partesDoMeio[0];
        
        const infoAdicional = partesDoMeio[partesDoMeio.length - 1];
        
        
        
        if(codigoCompletoERP.startsWith('COMINFAD')){
            descricaoFinal = `${descricaoPrincipal} - ${infoAdicional}`;
        }
        
        return {produto, descricao: descricaoFinal};
    }catch(error){
        console.error("Erro ao fazer a separação do código", error);
        return null;
    }
}

function processarCodigo(codigo) {
    if (!codigo) return;
    
    let dadosDoCodigo;
    let quantidadeASomar = 1;
    
    if(codigo.startsWith('COMINFAD') || codigo.startsWith('SEMINFAD')){
        const resultadoParse = parseCodigoComplexoERP(codigo);
        
        if(!resultadoParse){
            mostrarStatus(`ERRO: Formato de código do ERP inválido.`, 'erro');
            tocarBuzzerErro();
            return;
        }
        
        dadosDoCodigo = {
            produto: resultadoParse.produto.replaceAll('-', '.'),
            descricao: resultadoParse.descricao
        };

    } else{
        const codigoProdutoBruto = extrairCodigoProduto(codigo);
        
        if(!codigoProdutoBruto){
            mostrarStatus(`ERRO: Código '${codigo}' inválido ou curto demais.`, 'erro');
            tocarBuzzerErro();
            return;
        }
        
        dadosDoCodigo = {
            produto: codigoProdutoBruto.replaceAll('-', '.'),
            descricao: "(Descrição não informada)"
        };
    }
    
    const chaveComposta = `${dadosDoCodigo.produto}::${dadosDoCodigo.descricao}`;

    if (codigosBipados.has(codigo)) {
        mostrarStatus(`ERRO: A etiqueta ${codigo} já foi bipada!`, 'erro');
        
        tocarBuzzerErro();
        
        return;
    }
    
    codigosBipados.add(codigo);
    
    const contagemAtual = contagemInventario.get(chaveComposta) || {
        quantidade: 0,
        produto: dadosDoCodigo.produto,
        descricao: dadosDoCodigo.descricao};
    
    contagemAtual.quantidade += quantidadeASomar;
    contagemInventario.set(chaveComposta, contagemAtual);
    
    atualizarTabela();

    mostrarStatus(`SUCESSO: ${quantidadeASomar}x ${dadosDoCodigo.produto} adicionado. 
    Total: ${contagemAtual.quantidade}.`, 'sucesso');
    
    tocarBeep();
    
    salvarInventario();
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

function extrairCodigoProduto(codigoCompleto) {
    if (codigoCompleto.length < TAMANHO_CODIGO_PRODUTO) return null;
    return codigoCompleto.slice(-TAMANHO_CODIGO_PRODUTO);
}

function atualizarTabela() {
    tabelaInventarioBody.innerHTML = '';
    
    const listaDeItens = Array.from(contagemInventario.values());

    listaDeItens.sort((a, b) => {
        if (a.produto < b.produto) return -1;
        if (a.produto > b.produto) return 1;
        if (a.descricao < b.descricao) return -1;
        if (a.descricao > b.descricao) return 1;
        return 0;
    });

    for (const item of listaDeItens) {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `<td>${item.produto}</td><td>${item.quantidade}</td>`;
        
        tabelaInventarioBody.appendChild(tr);
    }
}

function mostrarStatus(mensagem, tipo) {
    statusDiv.textContent = mensagem;
    statusDiv.className = `status status-${tipo}`;
}
//endregion **** Funções auxiliares ****

async function gerarRelatorioPDF() {
    if (contagemInventario.size === 0) {
        alert("Nenhum item foi contado ainda. Adicione itens antes de gerar o relatório.");
        return;
    }
    
    const dadosParaApi = Array.from(contagemInventario.values()).map(item => ({
        CodigoProduto: item.produto,
        Quantidade: item.quantidade,
        Descricao: item.descricao,
    }));

    mostrarStatus("Gerando relatório em PDF, por favor aguarde...", "info");

    try {
        const response = await fetch('/api/relatorio/gerar', {
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
            
            parts.forEach(part => {
                if (part.trim().startsWith('filename=')) {
                    filename = part.split('=')[1].trim().replaceAll(`"`,``);
                }
            });
            
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

    if(btnIniciarLeitor) btnIniciarLeitor.addEventListener('click', iniciarModoLeitor);
    if(btnIniciarCamera) btnIniciarCamera.addEventListener('click', iniciarModoCamera);
    if(btnPararCamera) btnPararCamera.addEventListener('click', async () => {
        await pararModoCamera();
        
        if(contagemInventario.size === 0) {
            modoCameraEl.classList.add('hidden');
            areaResultadosEl.classList.add('hidden');    
            controlesInventarioEl.classList.add('hidden');
            
            selecaoModoEl.classList.remove('hidden');
        } else{
            location.reload();
        }
    });
    
    if(btnLimparInventario) btnLimparInventario.addEventListener('click', limparInventario);
    if(btnGerarRelatorio) btnGerarRelatorio.addEventListener('click', gerarRelatorioPDF);
    if(btnAlternarModo) btnAlternarModo.addEventListener('click', alternarModoDeLeitura);
    
    carregarInventarioSalvo();
}

export { initializeInventarioPage };
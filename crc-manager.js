/* ============================================
   CRC MANAGER
   ============================================ */

const VERSAO_SAVE = 4;
const SAVE_KEY = "crc-manager-v4";
const KEY_V3 = "crc-manager-v3";
const CHAVES_ANTIGAS = ["crc-manager", "crc-manager-v2"];

const NOME_CLUBE = "CRC Lajeosa";

const TITULARES = 5;
const MIN_PLANTEL = 8;
const MAX_PLANTEL = 10;

const CHANCE_LESAO = 0.06;   // por jogador em campo, por jornada

/* ============================================
   EQUIPAS
   O CRC usa os atributos dos jogadores.
   As outras têm força fixa (ataque / defesa).
   ============================================ */

const EQUIPAS = [

    { nome: "CRC Lajeosa" },

    { nome: "Gouveia FC",   ataque: 78, defesa: 74 },
    { nome: "Seia FC",      ataque: 75, defesa: 72 },
    { nome: "Sabugal",      ataque: 70, defesa: 68 },
    { nome: "Pinhel",       ataque: 68, defesa: 66 },
    { nome: "Trancoso",     ataque: 66, defesa: 64 },
    { nome: "Celorico",     ataque: 64, defesa: 60 },
    { nome: "Fornos",       ataque: 63, defesa: 62 },
    { nome: "Manteigas FC", ataque: 60, defesa: 58 },
    { nome: "Guarda FC",    ataque: 56, defesa: 55 }

];

// Ida e volta: cada equipa joga 2 vezes com cada uma das outras
const TOTAL_JORNADAS = (EQUIPAS.length - 1) * 2;

/* ============================================
   TREINOS
   ataque / defesa = pontos somados no jogo
   recupera = forma extra para todo o plantel
   ============================================ */

const TREINOS = {

    ofensivo: {
        ataque: 4,
        defesa: -2,
        custo: 100,
        recupera: 0,
        desc: "Mais golos marcados, mas também mais golos sofridos."
    },

    defensivo: {
        ataque: -2,
        defesa: 4,
        custo: 100,
        recupera: 0,
        desc: "Menos golos sofridos, mas menos capacidade atacante."
    },

    fisico: {
        ataque: 2,
        defesa: 2,
        custo: 250,
        recupera: 3,
        desc: "Equipa mais consistente e menos cansada."
    },

    moral: {
        ataque: 3,
        defesa: 3,
        custo: 500,
        recupera: 0,
        desc: "Equipa mais motivada."
    }

};

/* ============================================
   JOGO BASE
   Os 5 primeiros são titulares, os restantes suplentes
   ============================================ */

const JOGO_BASE = {

    dinheiro: 5000,
    jornada: 1,

    jogadores: [

        { nome: "João",    ataque: 72, defesa: 60, forma: 80, lesao: 0 },
        { nome: "Pedro",   ataque: 65, defesa: 72, forma: 76, lesao: 0 },
        { nome: "André",   ataque: 81, defesa: 58, forma: 74, lesao: 0 },
        { nome: "Tiago",   ataque: 70, defesa: 70, forma: 79, lesao: 0 },
        { nome: "Ricardo", ataque: 77, defesa: 63, forma: 82, lesao: 0 },

        { nome: "Miguel",  ataque: 62, defesa: 64, forma: 78, lesao: 0 },
        { nome: "Rui",     ataque: 66, defesa: 61, forma: 77, lesao: 0 },
        { nome: "Diogo",   ataque: 60, defesa: 67, forma: 80, lesao: 0 }

    ]

};

const NOMES_JOGADORES = [
    "Bruno", "Hugo", "Nuno", "Fábio", "Gonçalo", "Rafael",
    "Filipe", "Daniel", "Vasco", "Luís", "Sérgio", "Paulo",
    "Carlos", "Marco", "Telmo", "Duarte", "Simão", "Alex",
    "Cláudio", "Rodrigo", "Edgar", "Ivo", "Jorge", "Mário"
];

/* ============================================
   UTILITÁRIOS
   ============================================ */

function copiar(obj){
    return JSON.parse(JSON.stringify(obj));
}

function embaralhar(lista){

    const a = lista.slice();

    for(let i = a.length - 1; i > 0; i--){

        const j = Math.floor(Math.random() * (i + 1));

        [a[i], a[j]] = [a[j], a[i]];

    }

    return a;

}

// Distribuição de Poisson (para os golos)
function poisson(lambda){

    const L = Math.exp(-lambda);

    let k = 0;
    let p = 1;

    do{
        k++;
        p *= Math.random();
    }while(p > L);

    return k - 1;

}

/* ============================================
   CALENDÁRIO (método do círculo, ida e volta)
   Cada jornada é uma lista de [casa, fora]
   ============================================ */

function gerarCalendario(){

    const nomes = embaralhar(EQUIPAS.map(e => e.nome));
    const n = nomes.length;

    const ida = [];
    const t = nomes.slice();

    for(let r = 0; r < n - 1; r++){

        const jogos = [];

        for(let i = 0; i < n / 2; i++){

            let casa = t[i];
            let fora = t[n - 1 - i];

            // alterna casa/fora para não haver sempre o mesmo
            if((i + r) % 2 === 1){
                [casa, fora] = [fora, casa];
            }

            jogos.push([casa, fora]);

        }

        ida.push(jogos);

        // roda todas as equipas menos a primeira
        t.splice(1, 0, t.pop());

    }

    // segunda volta: mesmos jogos com o fator casa invertido
    const volta = ida.map(
        jogos => jogos.map(([c, f]) => [f, c])
    );

    return ida.concat(volta);

}

function novaTabela(){

    return EQUIPAS.map(e => ({
        nome: e.nome,
        j: 0,
        v: 0,
        e: 0,
        d: 0,
        gm: 0,
        gs: 0,
        pontos: 0
    }));

}

/* ============================================
   PLANTEL: QUEM ESTÁ EM CAMPO
   Os 5 primeiros jogadores saudáveis jogam.
   Se um titular estiver lesionado, entra o
   suplente seguinte automaticamente.
   ============================================ */

function emCampo(){

    const idx = [];

    jogo.jogadores.forEach((j, i) => {
        if(j.lesao <= 0 && idx.length < TITULARES) idx.push(i);
    });

    // caso raro: faltam jogadores saudáveis
    if(idx.length < TITULARES){

        jogo.jogadores.forEach((j, i) => {
            if(j.lesao > 0 && idx.length < TITULARES) idx.push(i);
        });

    }

    return idx;

}

/* ============================================
   MERCADO (1 contratação por época)
   ============================================ */

function precoJogador(ataque, defesa){

    return Math.max(
        1500,
        Math.round((ataque + defesa - 110) * 75 / 50) * 50
    );

}

function gerarMercado(plantel){

    const usados = new Set(plantel.map(j => j.nome));

    const nomes = embaralhar(
        NOMES_JOGADORES.filter(n => !usados.has(n))
    );

    const candidatos = [];

    for(let i = 0; i < 3; i++){

        const ataque = 60 + Math.floor(Math.random() * 25);
        const defesa = 56 + Math.floor(Math.random() * 25);

        candidatos.push({
            nome: nomes[i],
            ataque: ataque,
            defesa: defesa,
            forma: 80,
            lesao: 0,
            preco: precoJogador(ataque, defesa)
        });

    }

    return { comprou: false, contratado: null, candidatos: candidatos };

}

/* ============================================
   SIMULAÇÃO
   ============================================ */

function statsCRC(treino){

    const campo = emCampo().map(i => {

        const j = jogo.jogadores[i];

        // jogar lesionado (caso raro) rende muito menos
        const k = j.lesao > 0 ? 0.6 : 1;

        return {
            ataque: j.ataque * k,
            defesa: j.defesa * k,
            forma: j.forma
        };

    });

    const media = campo_ =>
        campo.reduce((s, j) => s + j[campo_], 0) / campo.length;

    // forma acima de 75 ajuda, abaixo prejudica
    const fator = 1 + (media("forma") - 75) / 300;

    return {
        ataque: media("ataque") * fator + treino.ataque,
        defesa: media("defesa") * fator + treino.defesa
    };

}

function statsEquipa(nome, treino){

    if(nome === NOME_CLUBE){
        return statsCRC(treino);
    }

    const e = EQUIPAS.find(x => x.nome === nome);

    // os adversários melhoram 1 ponto por época
    const nivel = jogo.epoca - 1;

    return {
        ataque: e.ataque + nivel,
        defesa: e.defesa + nivel
    };

}

function golosEsperados(ataque, defesaAdversaria, emCasa){

    const fatorCasa = emCasa ? 1.1 : 0.95;

    const xg =
        1.3 *
        Math.pow(ataque / defesaAdversaria, 1.5) *
        fatorCasa;

    return Math.min(4, Math.max(0.3, xg));

}

function simularJogo(casa, fora){

    return {

        casa: Math.min(
            7,
            poisson(golosEsperados(casa.ataque, fora.defesa, true))
        ),

        fora: Math.min(
            7,
            poisson(golosEsperados(fora.ataque, casa.defesa, false))
        )

    };

}

/* Cansaço e lesões depois de cada jornada.
   Devolve notícias para mostrar ao utilizador. */
function aplicarDesgaste(treino){

    const campo = emCampo();
    const noticias = [];

    jogo.jogadores.forEach((j, i) => {

        if(j.lesao > 0){

            // lesionado: conta uma jornada e recupera um pouco
            j.lesao--;
            j.forma = Math.min(100, j.forma + 3);

            if(j.lesao === 0){
                noticias.push(`✅ ${j.nome} recuperou da lesão`);
            }

        }
        else if(campo.includes(i)){

            // jogou: fica mais cansado
            j.forma = Math.max(40, j.forma - 2);

            if(Math.random() < CHANCE_LESAO){

                j.lesao = Math.random() < 0.5 ? 1 : 2;

                noticias.push(
                    `🤕 ${j.nome} lesionou-se ` +
                    `(${j.lesao} jornada${j.lesao > 1 ? "s" : ""})`
                );

            }

        }
        else{

            // descansou: recupera forma
            j.forma = Math.min(100, j.forma + 3);

        }

        // treino físico: recuperação extra para todos
        if(treino.recupera){
            j.forma = Math.min(100, j.forma + treino.recupera);
        }

    });

    return noticias;

}

/* ============================================
   CLASSIFICAÇÃO
   ============================================ */

function entradaTabela(nome){
    return jogo.tabela.find(e => e.nome === nome);
}

function registarResultado(casa, fora, golosCasa, golosFora){

    const a = entradaTabela(casa);
    const b = entradaTabela(fora);

    a.j++;
    b.j++;

    a.gm += golosCasa;
    a.gs += golosFora;

    b.gm += golosFora;
    b.gs += golosCasa;

    if(golosCasa > golosFora){

        a.v++;
        b.d++;
        a.pontos += 3;

    }
    else if(golosCasa < golosFora){

        b.v++;
        a.d++;
        b.pontos += 3;

    }
    else{

        a.e++;
        b.e++;
        a.pontos += 1;
        b.pontos += 1;

    }

}

// Pontos, depois diferença de golos, depois golos marcados
function ordenarTabela(tabela){

    return tabela.slice().sort((a, b) =>

        (b.pontos - a.pontos) ||
        ((b.gm - b.gs) - (a.gm - a.gs)) ||
        (b.gm - a.gm) ||
        a.nome.localeCompare(b.nome)

    );

}

/* ============================================
   ESTADO + GUARDAR / CARREGAR
   ============================================ */

function novoJogo(){

    const j = copiar(JOGO_BASE);

    j.versao = VERSAO_SAVE;
    j.epoca = 1;
    j.calendario = gerarCalendario();
    j.tabela = novaTabela();
    j.epocaTerminada = false;
    j.mercado = gerarMercado(j.jogadores);

    return j;

}

function saveValido(g){

    return !!(
        g &&
        g.versao === VERSAO_SAVE &&
        Array.isArray(g.jogadores) &&
        g.jogadores.length >= TITULARES &&
        g.jogadores.every(j => typeof j.lesao === "number") &&
        Array.isArray(g.calendario) &&
        g.calendario.length === TOTAL_JORNADAS &&
        Array.isArray(g.tabela) &&
        g.tabela.length === EQUIPAS.length &&
        typeof g.dinheiro === "number" &&
        typeof g.jornada === "number" &&
        typeof g.epoca === "number" &&
        g.mercado &&
        Array.isArray(g.mercado.candidatos)
    );

}

function lerSave(chave){

    try{
        return JSON.parse(localStorage.getItem(chave));
    }catch(e){
        return null;
    }

}

// Passa uma carreira da versão 3 (sem suplentes) para a 4
function migrarV3(g){

    g.jogadores.forEach(j => { j.lesao = 0; });

    copiar(JOGO_BASE).jogadores.slice(TITULARES).forEach(s => {

        if(!g.jogadores.some(j => j.nome === s.nome)){
            g.jogadores.push(s);
        }

    });

    g.versao = VERSAO_SAVE;
    g.epoca = 1;
    g.mercado = gerarMercado(g.jogadores);

    return g;

}

function carregar(){

    const atual = lerSave(SAVE_KEY);

    if(saveValido(atual)) return atual;

    const v3 = lerSave(KEY_V3);

    if(v3 && v3.versao === 3 && Array.isArray(v3.jogadores)){

        const migrado = migrarV3(v3);

        if(saveValido(migrado)) return migrado;

    }

    // Save inexistente, antigo ou corrompido → começa limpo
    return novoJogo();

}

let jogo = carregar();
let treinoSelecionado = "ofensivo";
let selecionado = null;   // jogador escolhido para trocar

function guardar(){

    try{
        localStorage.setItem(
            SAVE_KEY,
            JSON.stringify(jogo)
        );
    }catch(e){}

}

/* ============================================
   INTERFACE
   ============================================ */

function proximoJogo(){

    const jogos = jogo.calendario[jogo.jornada - 1];

    if(!jogos) return null;

    const par = jogos.find(
        ([c, f]) => c === NOME_CLUBE || f === NOME_CLUBE
    );

    return par ? { casa: par[0], fora: par[1] } : null;

}

function atualizar(){

    const crc = entradaTabela(NOME_CLUBE);

    document.getElementById("dinheiro").textContent =
        jogo.dinheiro + "€";

    document.getElementById("pontos").textContent =
        crc.pontos;

    document.getElementById("jornada").textContent =
        Math.min(jogo.jornada, TOTAL_JORNADAS) +
        "/" + TOTAL_JORNADAS;

    atualizarPlantel();
    atualizarMercado();

    const btn = document.getElementById("btnJogar");
    const adv = document.getElementById("adversario");

    if(jogo.epocaTerminada){

        adv.innerHTML = `🏁 Época ${jogo.epoca} terminada`;

        btn.disabled = false;
        btn.textContent = `➡️ Começar Época ${jogo.epoca + 1}`;

    }else{

        const p = proximoJogo();

        const local =
            p.casa === NOME_CLUBE ? "🏠 Em casa" : "✈️ Fora";

        adv.innerHTML = `
            <small>Época ${jogo.epoca} · Jornada ${jogo.jornada} · ${local}</small>
            <br>
            ${p.casa} vs ${p.fora}
        `;

        btn.disabled = false;
        btn.textContent = "▶️ Jogar Jornada";

    }

    atualizarClassificacao();

}

function atualizarPlantel(){

    const campo = emCampo();

    let html = "";

    jogo.jogadores.forEach((j, i) => {

        if(i === 0){
            html += `<div class="sec-plantel">Titulares</div>`;
        }

        if(i === TITULARES){
            html += `<div class="sec-plantel">Suplentes</div>`;
        }

        const lesionado = j.lesao > 0;
        const entra = i >= TITULARES && campo.includes(i);

        let tag = "";

        if(lesionado){
            tag = `<span class="tag tag-les">🤕 ${j.lesao} jornada${j.lesao > 1 ? "s" : ""}</span>`;
        }
        else if(entra){
            tag = `<span class="tag tag-entra">⬆️ joga</span>`;
        }

        html += `

            <div class="plantel-item jog
                        ${selecionado === i ? "sel" : ""}
                        ${lesionado ? "lesionado" : ""}"
                 onclick="selecionarJogador(${i})">

                <strong>${j.nome}</strong>
                ${tag}

                <br>

                ⚔️ ${j.ataque}

                🛡️ ${j.defesa}

                💪 ${Math.round(j.forma)}

            </div>

        `;

    });

    if(selecionado !== null && jogo.jogadores.length > MIN_PLANTEL){

        html += `
            <button class="btn-sec" onclick="dispensar()">
                🗑️ Dispensar ${jogo.jogadores[selecionado].nome}
            </button>
        `;

    }

    document.getElementById("plantel").innerHTML = html;

}

function atualizarMercado(){

    const m = jogo.mercado;
    const cheio = jogo.jogadores.length >= MAX_PLANTEL;

    let html = "";

    if(m.comprou){

        html = `
            <p>
                ✅ Contrataste <strong>${m.contratado.nome}</strong>
                por ${m.contratado.preco}€.
                <br>
                <small>Só podes contratar 1 jogador por época.</small>
            </p>
        `;

    }else{

        html = m.candidatos.map((c, i) => {

            const bloqueado = jogo.dinheiro < c.preco || cheio;

            return `

                <div class="plantel-item linha-mercado">

                    <div>
                        <strong>${c.nome}</strong>
                        <br>
                        ⚔️ ${c.ataque} 🛡️ ${c.defesa} 💪 ${c.forma}
                    </div>

                    <button class="btn-comprar"
                            onclick="contratar(${i})"
                            ${bloqueado ? "disabled" : ""}>
                        ${c.preco}€
                    </button>

                </div>

            `;

        }).join("");

        if(cheio){

            html += `
                <p>
                    <small>
                        Plantel cheio (${MAX_PLANTEL}).
                        Dispensa um jogador para contratar.
                    </small>
                </p>
            `;

        }

    }

    document.getElementById("mercado").innerHTML = html;

}

function mostrarTreino(){

    treinoSelecionado =
        document.getElementById("treino").value;

    const t = TREINOS[treinoSelecionado];

    const sinal = n => (n > 0 ? "+" : "") + n;

    document.getElementById("infoTreino").innerHTML = `
        ⚔️ ${sinal(t.ataque)} Ataque
        <br>
        🛡️ ${sinal(t.defesa)} Defesa
        <br>
        ${t.recupera ? `💪 +${t.recupera} Forma a todo o plantel<br>` : ""}
        💰 Custo: ${t.custo}€
        <br><br>
        ${t.desc}
    `;

}

function atualizarClassificacao(){

    const tabela = ordenarTabela(jogo.tabela);

    const cabecalho = `
        <div class="linha-tab cab">
            <span>#</span>
            <span>Equipa</span>
            <span>J</span>
            <span>V</span>
            <span>E</span>
            <span>D</span>
            <span>DG</span>
            <span>Pts</span>
        </div>
    `;

    const linhas = tabela.map((e, pos) => {

        const dg = e.gm - e.gs;

        return `
            <div class="linha-tab ${e.nome === NOME_CLUBE ? "meu-clube" : ""}">
                <span>${pos + 1}º</span>
                <span class="nome-eq">${e.nome}</span>
                <span>${e.j}</span>
                <span>${e.v}</span>
                <span>${e.e}</span>
                <span>${e.d}</span>
                <span>${dg > 0 ? "+" : ""}${dg}</span>
                <span><strong>${e.pontos}</strong></span>
            </div>
        `;

    }).join("");

    document.getElementById("classificacao").innerHTML =
        cabecalho + linhas;

}

// Faz o valor do dinheiro piscar (vermelho se desceu, verde se subiu)
function animarDinheiro(antes, depois){

    const el = document.getElementById("dinheiro");

    el.classList.remove("flash-perda", "flash-ganho");

    // força o browser a reiniciar a animação
    void el.offsetWidth;

    el.classList.add(
        depois < antes ? "flash-perda" : "flash-ganho"
    );

}

/* ============================================
   AÇÕES DO PLANTEL E MERCADO
   ============================================ */

// Toca num jogador e noutro para os trocar de lugar
function selecionarJogador(i){

    if(selecionado === null){

        selecionado = i;

    }
    else if(selecionado === i){

        selecionado = null;

    }
    else{

        const a = jogo.jogadores;

        [a[selecionado], a[i]] = [a[i], a[selecionado]];

        selecionado = null;

        guardar();

    }

    atualizar();

}

function dispensar(){

    if(
        selecionado === null ||
        jogo.jogadores.length <= MIN_PLANTEL
    ){
        return;
    }

    const j = jogo.jogadores[selecionado];

    if(!confirm(`Dispensar ${j.nome}? Não recebes dinheiro.`)){
        return;
    }

    jogo.jogadores.splice(selecionado, 1);

    selecionado = null;

    guardar();
    atualizar();

}

function contratar(i){

    const m = jogo.mercado;
    const c = m.candidatos[i];

    if(
        m.comprou ||
        !c ||
        jogo.dinheiro < c.preco ||
        jogo.jogadores.length >= MAX_PLANTEL
    ){
        return;
    }

    const dinheiroAntes = jogo.dinheiro;

    jogo.dinheiro -= c.preco;

    // entra como suplente (fim da lista)
    jogo.jogadores.push({
        nome: c.nome,
        ataque: c.ataque,
        defesa: c.defesa,
        forma: c.forma,
        lesao: 0
    });

    m.comprou = true;
    m.contratado = { nome: c.nome, preco: c.preco };

    guardar();
    atualizar();

    animarDinheiro(dinheiroAntes, jogo.dinheiro);

}

/* ============================================
   LÓGICA DO JOGO
   ============================================ */

function premioDaPosicao(posicao){

    if(posicao === 1) return 5000;
    if(posicao <= 3)  return 3000;

    return 1000;

}

// Continua a carreira: mantém plantel e dinheiro
function novaEpoca(){

    jogo.epoca++;
    jogo.jornada = 1;
    jogo.calendario = gerarCalendario();
    jogo.tabela = novaTabela();
    jogo.epocaTerminada = false;

    jogo.jogadores.forEach(j => {
        j.lesao = 0;
        j.forma = 80;
    });

    jogo.mercado = gerarMercado(jogo.jogadores);

    selecionado = null;

    document.getElementById("resultado").innerHTML = `
        <div class="resumo-dinheiro">
            🆕 <strong>Época ${jogo.epoca}</strong>
            <br>
            <small>
                Os adversários estão um pouco mais fortes.
                Há novos jogadores no mercado.
            </small>
        </div>
    `;

    guardar();
    atualizar();

}

function jogarJornada(){

    // Época terminada → botão serve para começar a seguinte
    if(jogo.epocaTerminada){
        novaEpoca();
        return;
    }

    const treino = TREINOS[treinoSelecionado];

    if(jogo.dinheiro < treino.custo){

        alert(
            "💰 Não tens dinheiro suficiente para este treino."
        );

        return;

    }

    // Dinheiro antes de qualquer alteração (para o resumo)
    const dinheiroAntes = jogo.dinheiro;

    jogo.dinheiro -= treino.custo;

    // Joga TODOS os jogos da jornada
    const jogosDaJornada = jogo.calendario[jogo.jornada - 1];

    const resultados = jogosDaJornada.map(([casa, fora]) => {

        const g = simularJogo(
            statsEquipa(casa, treino),
            statsEquipa(fora, treino)
        );

        registarResultado(casa, fora, g.casa, g.fora);

        return {
            casa: casa,
            fora: fora,
            golosCasa: g.casa,
            golosFora: g.fora
        };

    });

    // Cansaço e lesões (depois do jogo)
    const noticias = aplicarDesgaste(treino);

    selecionado = null;

    // Jogo do CRC
    const meu = resultados.find(
        r => r.casa === NOME_CLUBE || r.fora === NOME_CLUBE
    );

    const emCasa = meu.casa === NOME_CLUBE;

    const golosCRC = emCasa ? meu.golosCasa : meu.golosFora;
    const golosADV = emCasa ? meu.golosFora : meu.golosCasa;

    let classe = "";
    let texto  = "";
    let ganho  = 0;

    if(golosCRC > golosADV){

        ganho  = 500;
        classe = "vitoria";
        texto  = "✅ Vitória (+3 pontos)";

    }
    else if(golosCRC === golosADV){

        ganho  = 250;
        classe = "empate";
        texto  = "🤝 Empate (+1 ponto)";

    }
    else{

        ganho  = 100;
        classe = "derrota";
        texto  = "❌ Derrota";

    }

    jogo.dinheiro += ganho;

    jogo.jornada++;

    // Fim da época: prémio pela posição final
    let fimEpocaHTML = "";
    let premio = 0;

    if(jogo.jornada > TOTAL_JORNADAS){

        const posicao =
            ordenarTabela(jogo.tabela)
            .findIndex(e => e.nome === NOME_CLUBE) + 1;

        premio = premioDaPosicao(posicao);

        jogo.dinheiro += premio;
        jogo.epocaTerminada = true;

        fimEpocaHTML = `
            <div class="resumo-dinheiro">

                🏆 <strong>FIM DA ÉPOCA ${jogo.epoca}</strong>
                <br>
                Posição final: <strong>${posicao}º</strong>
                <br>
                Prémio: <span class="vitoria">+${premio}€</span>
                <br>
                <small>
                    Carrega em "Começar Época ${jogo.epoca + 1}" para
                    continuar com o mesmo plantel, ou em "Nova Carreira"
                    para recomeçar do zero.
                </small>

            </div>
        `;

    }

    const saldo = ganho - treino.custo + premio;

    const classeSaldo =
        saldo > 0 ? "vitoria" :
        saldo < 0 ? "derrota" : "empate";

    const outros = resultados
        .filter(r => r !== meu)
        .map(r => `
            <div class="outro-jogo">
                ${r.casa}
                <strong>${r.golosCasa} - ${r.golosFora}</strong>
                ${r.fora}
            </div>
        `).join("");

    const noticiasHTML = noticias.length ? `
        <div class="outros-jogos">
            <small>🩺 Notícias do plantel</small>
            ${noticias.map(n => `<div class="outro-jogo">${n}</div>`).join("")}
        </div>
    ` : "";

    document.getElementById("resultado").innerHTML = `

        ${meu.casa}
        <strong>${meu.golosCasa} - ${meu.golosFora}</strong>
        ${meu.fora}

        <br><br>

        <span class="${classe}">
            ${texto}
        </span>

        <div class="resumo-dinheiro">

            🏋️ Treino:
            <span class="derrota">-${treino.custo}€</span>
            <br>

            ⚽ Jogo:
            <span class="vitoria">+${ganho}€</span>
            <br>

            ${premio > 0 ? `
                🏆 Prémio:
                <span class="vitoria">+${premio}€</span>
                <br>
            ` : ""}

            📊 Saldo da jornada:
            <span class="${classeSaldo}">
                ${saldo >= 0 ? "+" : ""}${saldo}€
            </span>
            <br>

            💰 ${dinheiroAntes}€ → <strong>${jogo.dinheiro}€</strong>

        </div>

        ${noticiasHTML}

        ${fimEpocaHTML}

        <div class="outros-jogos">
            <small>📋 Outros resultados</small>
            ${outros}
        </div>

    `;

    guardar();
    atualizar();

    animarDinheiro(dinheiroAntes, jogo.dinheiro);

}

function reiniciar(){

    if(confirm("Começar nova carreira?")){

        localStorage.removeItem(SAVE_KEY);

        jogo = novoJogo();

        treinoSelecionado = "ofensivo";
        selecionado = null;

        document.getElementById("treino").value = "ofensivo";

        mostrarTreino();

        document.getElementById("resultado").innerHTML = "";

        guardar();
        atualizar();

    }

}

/* ============================================
   ARRANQUE
   ============================================ */

mostrarTreino();
atualizar();

// Guarda já na versão atual e limpa saves de versões anteriores
guardar();

CHAVES_ANTIGAS.concat([KEY_V3]).forEach(k => {
    try{ localStorage.removeItem(k); }catch(e){}
});

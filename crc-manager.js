/* ============================================
   CRC MANAGER
   ============================================ */

const VERSAO_SAVE = 3;
const SAVE_KEY = "crc-manager-v3";
const CHAVES_ANTIGAS = ["crc-manager", "crc-manager-v2"];

const NOME_CLUBE = "CRC Lajeosa";

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
   ============================================ */

const TREINOS = {

    ofensivo: {
        icone: "⚔️",
        ataque: 4,
        defesa: -2,
        custo: 100,
        desc: "Mais golos marcados, mas também mais golos sofridos."
    },

    defensivo: {
        icone: "🛡️",
        ataque: -2,
        defesa: 4,
        custo: 100,
        desc: "Menos golos sofridos, mas menos capacidade atacante."
    },

    fisico: {
        icone: "🏃",
        ataque: 2,
        defesa: 2,
        custo: 250,
        desc: "Equipa mais consistente."
    },

    moral: {
        icone: "😊",
        ataque: 3,
        defesa: 3,
        custo: 500,
        desc: "Equipa mais motivada."
    }

};

/* ============================================
   JOGO BASE
   ============================================ */

const JOGO_BASE = {

    dinheiro: 5000,
    jornada: 1,

    jogadores: [

        { nome: "João",    ataque: 72, defesa: 60, forma: 80 },
        { nome: "Pedro",   ataque: 65, defesa: 72, forma: 76 },
        { nome: "André",   ataque: 81, defesa: 58, forma: 74 },
        { nome: "Tiago",   ataque: 70, defesa: 70, forma: 79 },
        { nome: "Ricardo", ataque: 77, defesa: 63, forma: 82 }

    ]

};

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

/* ============================================
   SIMULAÇÃO
   ============================================ */

function statsCRC(treino){

    const n = jogo.jogadores.length;

    const media = campo =>
        jogo.jogadores.reduce((s, j) => s + j[campo], 0) / n;

    // forma acima de 75 ajuda um pouco, abaixo prejudica
    const fator = 1 + (media("forma") - 75) / 500;

    return {
        ataque: media("ataque") * fator + treino.ataque,
        defesa: media("defesa") * fator + treino.defesa
    };

}

function statsEquipa(nome, treino){

    if(nome === NOME_CLUBE){
        return statsCRC(treino);
    }

    return EQUIPAS.find(e => e.nome === nome);

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
    j.calendario = gerarCalendario();

    j.tabela = EQUIPAS.map(e => ({
        nome: e.nome,
        j: 0,
        v: 0,
        e: 0,
        d: 0,
        gm: 0,
        gs: 0,
        pontos: 0
    }));

    j.epocaTerminada = false;

    return j;

}

function carregar(){

    try{

        const g = JSON.parse(
            localStorage.getItem(SAVE_KEY)
        );

        // Só aceita o save se tiver a estrutura completa
        if(
            g &&
            g.versao === VERSAO_SAVE &&
            Array.isArray(g.jogadores) &&
            Array.isArray(g.calendario) &&
            g.calendario.length === TOTAL_JORNADAS &&
            Array.isArray(g.tabela) &&
            g.tabela.length === EQUIPAS.length &&
            typeof g.dinheiro === "number" &&
            typeof g.jornada === "number"
        ){
            return g;
        }

    }catch(e){}

    // Save inexistente, antigo ou corrompido → começa limpo
    return novoJogo();

}

let jogo = carregar();
let treinoSelecionado = "ofensivo";

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

    document.getElementById("plantel").innerHTML =
        jogo.jogadores.map(j => `

            <div class="plantel-item">

                <strong>${j.nome}</strong>

                <br>

                ⚔️ ${j.ataque}

                🛡️ ${j.defesa}

                💪 ${j.forma}

            </div>

        `).join("");

    const btn = document.getElementById("btnJogar");
    const adv = document.getElementById("adversario");

    if(jogo.epocaTerminada){

        adv.innerHTML = "🏁 Época terminada";

        btn.disabled = true;
        btn.textContent = "🏁 Época terminada";

    }else{

        const p = proximoJogo();

        const local =
            p.casa === NOME_CLUBE ? "🏠 Em casa" : "✈️ Fora";

        adv.innerHTML = `
            <small>Jornada ${jogo.jornada} · ${local}</small>
            <br>
            ${p.casa} vs ${p.fora}
        `;

        btn.disabled = false;
        btn.textContent = "▶️ Jogar Jornada";

    }

    atualizarClassificacao();

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
   LÓGICA DO JOGO
   ============================================ */

function premioDaPosicao(posicao){

    if(posicao === 1) return 5000;
    if(posicao <= 3)  return 3000;

    return 1000;

}

function jogarJornada(){

    // Época já terminada → não dá prémio outra vez
    if(jogo.epocaTerminada){
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

                🏆 <strong>FIM DA ÉPOCA</strong>
                <br>
                Posição final: <strong>${posicao}º</strong>
                <br>
                Prémio: <span class="vitoria">+${premio}€</span>
                <br>
                <small>
                    Carrega em "Nova Carreira" para começar outra época.
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

// Remove saves de versões anteriores (estrutura incompatível)
CHAVES_ANTIGAS.forEach(k => {
    try{ localStorage.removeItem(k); }catch(e){}
});

mostrarTreino();
atualizar();

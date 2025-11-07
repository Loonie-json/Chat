const WebSocket = require("ws");
const blessed = require("blessed");

const ws = new WebSocket("ws://node.botbores.shop:3051")
let nome = ""
let pegouNome = false
let listaUsuarios = [];

const screen = blessed.screen({
  smartCSR: true,
  title: 'CHAT DO √TD LOONIE'
})
//Jz gostoso
const chatBoxPrivado = blessed.box({
  top: 0,
  left: 0,
  width: '80%',
  height: '40%',
  label: "Privados",
  content: '',
  tags: true,
  scrollable: true,
  alwaysScroll: true,
  border: { type: 'line' },
  scrollbar: { ch: ' ', inverse: true },
  style: {
    fg: 'white',
    border: { fg: 'magenta' },
    scrollbar: { bg: 'magenta' }
  }
});

const chatBoxGeral = blessed.box({
  top: "40%",
  left: 0,
  width: '100%',
  height: '50%',
  label: "Geral",
  content: '',
  tags: true,
  scrollable: true,
  alwaysScroll: true,
  border: { type: 'line' },
  scrollbar: { ch: ' ', inverse: true },
  style: {
    fg: 'white',
    border: { fg: 'blue' },
    scrollbar: { bg: 'blue' }
  }
});

const input = blessed.textbox({
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  label: "Digite aqui",
  inputOnFocus: true,
  border: { type: 'line', fg: 'blue' },
  style: {
    fg: 'white',
    bg: 'gray',
    focus: { border: { fg: 'blue' } }
  }
})

const userBox = blessed.box({
  top: 0,
  right: 0,
  width: '20%',
  height: '40%',
  label: 'Online',
  border: { type: 'line' },
  tags: true,
  style: {
    border: { fg: 'blue' }
  }
})

screen.append(chatBoxPrivado)
screen.append(chatBoxGeral)
screen.append(userBox)
screen.append(input);

screen.render();
input.focus();
//Void é outro dlc
function atualizarSidebar() {
  userBox.setLabel(`Online: ${listaUsuarios.length}`)
  userBox.setContent(listaUsuarios.map(u => `- ${u}`).join("\n"));
  screen.render()
}

function mostrarPrivado(nomeUsuario, texto, cor = 'white') {
  chatBoxPrivado.pushLine(`{${cor}-fg}${nomeUsuario} >>{/} ${texto}`);
  chatBoxPrivado.setScrollPerc(100)
  screen.render();
}
//Mas Jz >>>
function mostrarGeral(nomeUsuario, texto, cor = 'white') {
  chatBoxGeral.pushLine(`{${cor}-fg}${nomeUsuario} >>{/} ${texto}`);
  chatBoxGeral.setScrollPerc(100)
  screen.render();
}

mostrarGeral("Sistema", "Ponha seu nick ai pra ser identificado(cpf tbm)", "red")

input.on("submit", texto => {

  if (!pegouNome) {
    nome = texto.trim();
    if (!nome) {
      mostrarGeral("Sistema", "Digite seu nome, porra!", "red");
      input.setValue("");
      input.focus();
      screen.render();
      return;
    }

    pegouNome = true;
    mostrarGeral("Sistema", `Bem-vindo, ${nome}!`, "yellow");

    ws.send(JSON.stringify({ tipo: "login", nome }));

    input.setValue("");
    input.focus();
    screen.render();
    return
  }

  texto = texto.trim();
  if (!texto) {
    input.setValue("");
    input.focus();
    screen.render();
    return
  }

  if (texto.startsWith("/pv ")) {
    const [, para, ...resto] = texto.split(" ")
    const msg = resto.join(" ")

    if (!para || !msg) {
      mostrarPrivado("Sistema", "Formato: /pv NOME msg", "red");
      input.clearValue();
      input.focus();
      screen.render();
      return
    }

    ws.send(JSON.stringify({
      tipo: "pv",
      para,
      texto: msg
    }))

    mostrarPrivado(`Você → ${para}`, msg, "magenta");

    input.clearValue();
    input.focus();
    screen.render();
    return;
  }

  if (texto === "/off") {
    ws.send(JSON.stringify({ tipo: "kill", nome }));
    process.exit();
  }

  ws.send(JSON.stringify({ tipo: "msg", nome, texto }));
  mostrarGeral("Você", texto, "blue");

  input.setValue("");
  input.focus();
  screen.render()
})

ws.on("message", raw => {
  const data = JSON.parse(raw);

  if (data.tipo === "msg")
    return mostrarGeral(data.nome, data.texto, "green");

  if (data.tipo === "pv")
    return mostrarPrivado(`${data.de}`, data.texto, "magenta");

  if (data.tipo === "online") {
    listaUsuarios = data.usuarios;  
    atualizarSidebar();
  }
})

ws.on("close", () => {
  mostrarGeral('Sistema', 'Servidor desconectado.', 'red');
  process.exit();
})

function sair() {
  screen.destroy()
  screen.leave()
  process.exit(0)
}

screen.key(['escape', 'C-c'], sair);

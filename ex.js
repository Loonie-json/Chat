const express = require('express');
const { exec, spawn } = require('child_process');
const os = require('os');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let mensagens = [];
let cloudflaredProcess = null;
let tunnelUrl = null;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chat Global - Cloudflare Tunnel</title>
        <style>
            body {
                font-family: Arial;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f0f0f0;
            }
            .container {
                background: white;
                border-radius: 10px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .status {
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 20px;
                text-align: center;
                font-weight: bold;
            }
            .status-online {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            .status-offline {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            .tunnel-info {
                background: #e3f2fd;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 20px;
                word-break: break-all;
            }
            .mensagens {
                border: 1px solid #ddd;
                height: 400px;
                overflow-y: scroll;
                padding: 10px;
                margin-bottom: 20px;
                background: #fafafa;
            }
            .msg {
                margin: 10px 0;
                padding: 8px;
                background: #e3f2fd;
                border-radius: 5px;
            }
            .msg-author {
                font-weight: bold;
                color: #1976d2;
            }
            .msg-time {
                font-size: 11px;
                color: #999;
                margin-left: 10px;
            }
            input, textarea {
                width: 100%;
                padding: 10px;
                margin: 5px 0;
                border: 1px solid #ddd;
                border-radius: 5px;
                box-sizing: border-box;
            }
            button {
                background: #4CAF50;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                width: 100%;
                font-size: 16px;
                margin-top: 5px;
            }
            button:hover {
                background: #45a049;
            }
            .btn-tunnel {
                background: #f39c12;
                margin-bottom: 10px;
            }
            .btn-tunnel:hover {
                background: #e67e22;
            }
            .btn-stop {
                background: #e74c3c;
            }
            .btn-stop:hover {
                background: #c0392b;
            }
            .url {
                color: #2980b9;
                text-decoration: none;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🌍 Chat Global com Cloudflare Tunnel</h1>
            
            <div id="status" class="status status-offline">
                🔴 Tunnel OFFLINE - Ative para acesso externo
            </div>
            
            <div id="tunnelInfo" class="tunnel-info" style="display:none;">
                <strong>🔗 Link público (compartilhe com qualquer pessoa):</strong><br>
                <a id="tunnelUrl" href="#" target="_blank" class="url"></a>
                <br><small>✅ Qualquer pessoa com este link pode acessar o chat!</small>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button id="btnStart" class="btn-tunnel" onclick="startTunnel()">🚀 Ativar Tunnel (Acesso Global)</button>
                <button id="btnStop" class="btn-stop" onclick="stopTunnel()" style="display:none;">⏹️ Desativar Tunnel</button>
            </div>
            
            <div class="mensagens" id="mensagens">
                <div class="msg">💬 Ative o tunnel para compartilhar com qualquer pessoa no mundo!</div>
            </div>
            
            <div>
                <input type="text" id="nome" placeholder="Seu nome" value="Anônimo">
                <textarea id="texto" rows="3" placeholder="Digite sua mensagem..."></textarea>
                <button onclick="enviarMensagem()">📤 Enviar Mensagem</button>
                <button onclick="carregarMensagens()" style="background: #2196F3;">🔄 Atualizar</button>
            </div>
        </div>

        <script>
            // Carrega status do tunnel ao iniciar
            carregarStatus();
            
            // Carrega mensagens automaticamente a cada 3 segundos
            carregarMensagens();
            setInterval(carregarMensagens, 3000);
            
            async function carregarStatus() {
                const response = await fetch('/tunnel-status');
                const data = await response.json();
                
                if (data.active && data.url) {
                    document.getElementById('status').className = 'status status-online';
                    document.getElementById('status').innerHTML = '🟢 Tunnel ONLINE - Chat acessível globalmente!';
                    document.getElementById('tunnelInfo').style.display = 'block';
                    document.getElementById('tunnelUrl').href = data.url;
                    document.getElementById('tunnelUrl').textContent = data.url;
                    document.getElementById('btnStart').style.display = 'none';
                    document.getElementById('btnStop').style.display = 'block';
                } else {
                    document.getElementById('status').className = 'status status-offline';
                    document.getElementById('status').innerHTML = '🔴 Tunnel OFFLINE - Apenas acesso local';
                    document.getElementById('tunnelInfo').style.display = 'none';
                    document.getElementById('btnStart').style.display = 'block';
                    document.getElementById('btnStop').style.display = 'none';
                }
            }
            
            async function startTunnel() {
                const btn = document.getElementById('btnStart');
                btn.disabled = true;
                btn.textContent = '🔄 Iniciando tunnel...';
                
                const response = await fetch('/start-tunnel', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    alert('✅ Tunnel ativado! Clique em OK para atualizar.');
                    carregarStatus();
                } else {
                    alert('❌ Erro: ' + data.error);
                }
                
                btn.disabled = false;
                btn.textContent = '🚀 Ativar Tunnel (Acesso Global)';
            }
            
            async function stopTunnel() {
                const response = await fetch('/stop-tunnel', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    alert('⏹️ Tunnel desativado');
                    carregarStatus();
                }
            }
            
            async function enviarMensagem() {
                const nome = document.getElementById('nome').value;
                const texto = document.getElementById('texto').value;
                
                if (!texto.trim()) {
                    alert('Digite uma mensagem');
                    return;
                }
                
                await fetch('/mensagem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, texto })
                });
                
                document.getElementById('texto').value = '';
                carregarMensagens();
            }
            
            async function carregarMensagens() {
                const response = await fetch('/mensagens');
                const mensagens = await response.json();
                
                const divMensagens = document.getElementById('mensagens');
                divMensagens.innerHTML = '';
                
                if (mensagens.length === 0) {
                    divMensagens.innerHTML = '<div class="msg">Nenhuma mensagem ainda. Seja o primeiro!</div>';
                } else {
                    mensagens.forEach(msg => {
                        divMensagens.innerHTML += \`
                            <div class="msg">
                                <span class="msg-author">\${msg.nome}</span>
                                <span class="msg-time">\${msg.hora}</span>
                                <div>\${msg.texto}</div>
                            </div>
                        \`;
                    });
                    
                    divMensagens.scrollTop = divMensagens.scrollHeight;
                }
            }
        </script>
    </body>
    </html>
  `);
});

// Rotas da API
app.get('/mensagens', (req, res) => {
  res.json(mensagens);
});

app.post('/mensagem', (req, res) => {
  const { nome, texto } = req.body;
  
  const novaMensagem = {
    nome: nome || 'Anônimo',
    texto: texto,
    hora: new Date().toLocaleTimeString(),
    data: new Date().toISOString()
  };
  
  mensagens.push(novaMensagem);
  
  if (mensagens.length > 50) {
    mensagens = mensagens.slice(-50);
  }
  
  console.log(`📨 ${novaMensagem.nome}: ${novaMensagem.texto}`);
  res.json({ success: true });
});

// Rotas para controle do tunnel
app.get('/tunnel-status', (req, res) => {
  res.json({ 
    active: cloudflaredProcess !== null, 
    url: tunnelUrl 
  });
});

app.post('/start-tunnel', (req, res) => {
  if (cloudflaredProcess) {
    return res.json({ success: true, url: tunnelUrl });
  }
  
  console.log('🚀 Iniciando Cloudflare Tunnel...');
  
  // Usa o executável do sistema (instalado via pkg install cloudflared)
  cloudflaredProcess = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`]);
  
  cloudflaredProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    
    const urlMatch = output.match(/https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com/);
    if (urlMatch && !tunnelUrl) {
      tunnelUrl = urlMatch[0];
      console.log(`✨ Tunnel URL: ${tunnelUrl}`);
    }
  });
  
  cloudflaredProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.error('Tunnel log:', error);
    
    const urlMatch = error.match(/https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com/);
    if (urlMatch && !tunnelUrl) {
      tunnelUrl = urlMatch[0];
      console.log(`✨ Tunnel URL: ${tunnelUrl}`);
    }
  });
  
  cloudflaredProcess.on('close', (code) => {
    console.log(`Tunnel finalizado com código ${code}`);
    cloudflaredProcess = null;
    tunnelUrl = null;
  });
  
  // Aguarda a URL ser encontrada
  setTimeout(() => {
    if (tunnelUrl) {
      res.json({ success: true, url: tunnelUrl });
    } else {
      res.json({ success: false, error: 'Túnel não iniciou corretamente' });
    }
  }, 5000);
});

app.post('/stop-tunnel', (req, res) => {
  if (cloudflaredProcess) {
    cloudflaredProcess.kill();
    cloudflaredProcess = null;
    tunnelUrl = null;
    console.log('⏹️ Tunnel finalizado');
    res.json({ success: true });
  } else {
    res.json({ success: false, error: 'Nenhum tunnel ativo' });
  }
});

// Inicia servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📱 Acesse localmente: http://localhost:${PORT}`);
  
  // Mostra IPs da rede local
  const networkInterfaces = os.networkInterfaces();
  console.log(`\n📡 Na mesma rede Wi-Fi, acesse via:`);
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   → http://${iface.address}:${PORT}`);
      }
    }
  }
  
  console.log(`\n💡 Para acesso de qualquer lugar:`);
  console.log(`   1. Clique em "Ativar Tunnel" no chat`);
  console.log(`   2. Compartilhe a URL gerada com qualquer pessoa`);
  console.log(`\n🚀 Servidor pronto!\n`);
});

// Limpeza ao fechar
process.on('SIGINT', () => {
  if (cloudflaredProcess) {
    cloudflaredProcess.kill();
  }
  console.log('\n👋 Servidor encerrado');
  process.exit();
});

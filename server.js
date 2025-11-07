// SERVER FODA [√TD]
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 3051 });

let users = new Map(); // ws → nome

function broadcast(data, except = null) {
    const msg = JSON.stringify(data);
    for (const [sock] of users) {
        if (sock !== except && sock.readyState === 1) {
            sock.send(msg);
        }
    }
}

function enviarLista() {
    broadcast({
        tipo: "online",
        usuarios: [...users.values()]
    });
}

wss.on("connection", ws => {

    ws.on("message", raw => {
        let data;
        try { data = JSON.parse(raw); } catch { return; }

        if (data.tipo === "login") {
            users.set(ws, data.nome);
            enviarLista();
            return;
        }
        
        if (data.tipo === "kill") {
        console.log("Servidor desligando a pedido do usuário:", data.nome);
        broadcast({ tipo: "msg", 
		nome: "Sistema", 
		texto: `⚠ ${data.nome} desligou o servidor` 
	})
        setTimeout(() => {
        wss.close();      
        process.exit();   
	}, 200)
             return;
        }

        if (data.tipo === "msg") {
            broadcast({
                tipo: "msg",
                nome: users.get(ws),
                texto: data.texto
            }, ws);
            return;
        }

        if (data.tipo === "pv") {
            const alvo = data.para;
            for (const [sock, nome] of users) {
                if (nome === alvo) {
                    sock.send(JSON.stringify({
                        tipo: "pv",
                        de: users.get(ws),
                        texto: data.texto
                    }));
                }
            }
            return;
        }
    });

    ws.on("close", () => {
        users.delete(ws);
        enviarLista();
    });
})

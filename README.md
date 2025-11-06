#!/usr/bin/env python3
# run_heart_page.py
# Gera um arquivo HTML com um coração em tela cheia e um cartão clicável.
# Inicia um servidor HTTP local e abre a página no navegador.

import http.server
import socketserver
import threading
import webbrowser
from pathlib import Path
import textwrap
import sys

HTML = textwrap.dedent("""
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Coração</title>
  <style>
    :root { --bg: #000; --heart: #e03434; --card-bg: rgba(255,255,255,0.95); --glass: rgba(255,255,255,0.06); }
    html,body { height:100%; margin:0; background:var(--bg); font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color:#111; }
    /* Full-screen centered container */
    .stage {
      position:relative;
      height:100vh;
      width:100vw;
      overflow:hidden;
      display:flex;
      align-items:center;
      justify-content:center;
    }

    /* Big heart centered and behind everything */
    .heart {
      position:absolute;
      width:62vmin;
      height:62vmin;
      left:50%;
      top:50%;
      transform:translate(-50%,-50%) rotate(-45deg);
      background:var(--heart);
      border-radius:20% 20% 2% 2%;
      z-index:0;
      filter:drop-shadow(0 5px 30px rgba(0,0,0,0.6));
    }
    .heart::before,
    .heart::after {
      content:"";
      position:absolute;
      width:62vmin;
      height:62vmin;
      background:var(--heart);
      border-radius:50%;
      top:-31vmin;
      left:0;
    }
    .heart::after {
      left:31vmin;
      top:0;
    }
    /* Slight pulsation */
    @keyframes pulse {
      0% { transform:translate(-50%,-50%) rotate(-45deg) scale(0.98); }
      50% { transform:translate(-50%,-50%) rotate(-45deg) scale(1.02); }
      100% { transform:translate(-50%,-50%) rotate(-45deg) scale(0.98); }
    }
    .heart { animation: pulse 2.4s ease-in-out infinite; }

    /* Center card */
    .card {
      position:relative;
      z-index:2;
      background:var(--card-bg);
      padding:18px 28px;
      border-radius:12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.6);
      cursor:pointer;
      text-align:center;
      user-select:none;
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .card:hover { transform:translateY(-4px); box-shadow: 0 14px 40px rgba(0,0,0,0.6); }
    .card h1 { margin:0; font-size:20px; letter-spacing:0.6px; color:#111; }
    .card p { margin:6px 0 0; font-size:13px; color:#333; }

    /* Modal card (hidden initially) */
    .modal {
      position:fixed;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:4;
      background: linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.55));
      opacity:0;
      pointer-events:none;
      transition: opacity .18s ease;
    }
    .modal.show { opacity:1; pointer-events:auto; }
    .modal-card {
      background: white;
      padding:22px 30px;
      border-radius:14px;
      text-align:center;
      box-shadow: 0 18px 60px rgba(0,0,0,0.6);
      transform: translateY(8px);
      transition: transform .18s ease, opacity .18s ease;
    }
    .modal.show .modal-card { transform: translateY(0); }

    .close-btn {
      margin-top:12px;
      display:inline-block;
      padding:8px 14px;
      border-radius:10px;
      background:transparent;
      border:1px solid rgba(0,0,0,0.08);
      cursor:pointer;
      font-weight:600;
    }

    /* Small screen tweak */
    @media (max-width:480px) {
      .card h1 { font-size:18px; }
      .heart { width:86vmin; height:86vmin; top:52%; left:50%; }
    }
  </style>
</head>
<body>
  <div class="stage" role="main">
    <div class="heart" aria-hidden="true"></div>

    <div class="card" id="mainCard" role="button" aria-pressed="false" tabindex="0">
      <h1>clique aqui</h1>
      <p>toque para receber uma mensagem</p>
    </div>
  </div>

  <div class="modal" id="modal" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="modal-card" id="modalCard">
      <h2 style="margin:0 0 6px 0; color:#b30059;">você é linda</h2>
      <p style="margin:0;color:#444;">✨ Nunca esqueça disso ✨</p>
      <button class="close-btn" id="closeBtn">Fechar</button>
    </div>
  </div>

  <script>
    const mainCard = document.getElementById('mainCard');
    const modal = document.getElementById('modal');
    const closeBtn = document.getElementById('closeBtn');

    function openModal() {
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      mainCard.setAttribute('aria-pressed', 'true');
    }
    function closeModal() {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      mainCard.setAttribute('aria-pressed', 'false');
    }

    // Click / keyboard accessibility
    mainCard.addEventListener('click', (e) => {
      openModal();
    });
    mainCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal();
      }
    });
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // allow Esc to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>
""")

def write_file(path: Path):
    path.write_text(HTML, encoding="utf-8")
    print(f"Criado: {path.resolve()}")

def start_server_and_open(page_name="heart.html"):
    # escreve o arquivo na pasta atual
    out = Path.cwd() / page_name
    write_file(out)

    Handler = http.server.SimpleHTTPRequestHandler

    # Procura porta livre (0 -> sistema escolhe)
    with socketserver.TCPServer(("localhost", 0), Handler) as httpd:
        host, port = httpd.server_address
        url = f"http://{host}:{port}/{page_name}"
        print(f"Abrindo {url} ...")
        # inicia servidor em thread daemon
        server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        server_thread.start()

        # abre no navegador padrão
        try:
            webbrowser.open(url)
        except Exception as e:
            print("Não foi possível abrir o navegador automaticamente:", e)
            print("Abra manualmente o URL acima.")

        print("Servidor rodando localmente. Pressione Ctrl+C para encerrar.")
        try:
            # mantém o programa vivo até Ctrl+C
            server_thread.join()
        except KeyboardInterrupt:
            print("\nInterrompido pelo usuário. Finalizando servidor...")
            httpd.shutdown()
            httpd.server_close()
            print("Servidor finalizado.")

if __name__ == "__main__":
    try:
        start_server_and_open("heart.html")
    except Exception as err:
        print("Erro ao iniciar:", err)
        sys.exit(1)
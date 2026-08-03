# Peça 3 — trocar emojis por ícones

Pré-requisito: Peça 1 (novo `<style>`) e Peça 2 (sprite + `const ic = ...`) já aplicadas.

Faça cada troca abaixo com o "Localizar e substituir" do editor. São exatas —
copie o lado **LOCALIZAR** inteiro e cole o **SUBSTITUIR** no lugar.

---

## A) No HTML

**A1.** botão de alerta de confirmação (⏳)
- LOCALIZAR: `title="Confirmações a fazer">⏳</span>`
- SUBSTITUIR: `title="Confirmações a fazer"><svg class="ic"><use href="#i-clock"/></svg></span>`

**A2.** botão de alerta de snooze (⚠️)
- LOCALIZAR: `title="Retornos pendentes hoje">⚠️</span>`
- SUBSTITUIR: `title="Retornos pendentes hoje"><svg class="ic"><use href="#i-alert"/></svg></span>`

**A3.** cabeçalho da tabela Equipe — Pendentes (⏳)
- LOCALIZAR: `>⏳ Pend.</th>`
- SUBSTITUIR: `><svg class="ic"><use href="#i-clock"/></svg> Pend.</th>`

**A4.** cabeçalho da tabela Equipe — Confirmar (📞)
- LOCALIZAR: `>📞 Confirmar</th>`
- SUBSTITUIR: `><svg class="ic"><use href="#i-phone"/></svg> Confirmar</th>`

**A5.** cabeçalho da tabela Equipe — Vencido (💤)
- LOCALIZAR: `>💤 Vencido</th>`
- SUBSTITUIR: `><svg class="ic"><use href="#i-moon"/></svg> Vencido</th>`

**A6.** selo "somente leitura" (🔒)
- LOCALIZAR: `<span class="somente-leitura">🔒 somente leitura</span>`
- SUBSTITUIR: `<span class="somente-leitura"><svg class="ic"><use href="#i-lock"/></svg> somente leitura</span>`

**A7.** aviso de sucesso no modal (📲)
- LOCALIZAR: `📲 <b>Enviar confirmação de reagendamento</b>`
- SUBSTITUIR: `<svg class="ic"><use href="#i-send"/></svg> <b>Enviar confirmação de reagendamento</b>`

---

## B) No JavaScript

**B1.** avatar do modo público (📊 → letra R)
- LOCALIZAR: `$('avatar').textContent='📊';`
- SUBSTITUIR: `$('avatar').textContent='R';`

**B2.** snooze sem data
- LOCALIZAR: `<span class="badge aviso">⚠️ Snooze sem data</span>`
- SUBSTITUIR: `<span class="badge aviso">'+ic('alert')+' Snooze sem data</span>`

**B3.** snooze atrasado
- LOCALIZAR: `<span class="badge urgente">🚨 Atrasado '+Math.abs(dd)+'d</span>`
- SUBSTITUIR: `<span class="badge urgente">'+ic('siren')+' Atrasado '+Math.abs(dd)+'d</span>`

**B4.** snooze retorno hoje
- LOCALIZAR: `<span class="badge urgente">🚨 Retorno hoje</span>`
- SUBSTITUIR: `<span class="badge urgente">'+ic('siren')+' Retorno hoje</span>`

**B5.** snooze retorno amanhã
- LOCALIZAR: `<span class="badge aviso">⚠️ Retorno amanhã</span>`
- SUBSTITUIR: `<span class="badge aviso">'+ic('alert')+' Retorno amanhã</span>`

**B6.** confirmação sem data de job
- LOCALIZAR: `<span class="badge aviso">⚠️ Sem data de job</span>`
- SUBSTITUIR: `<span class="badge aviso">'+ic('alert')+' Sem data de job</span>`

**B7.** confirmar — job na janela
- LOCALIZAR: `<span class="badge urgente">📞 Confirmar — job `
- SUBSTITUIR: `<span class="badge urgente">'+ic('phone')+' Confirmar — job `

**B8.** confirmar amanhã
- LOCALIZAR: `<span class="badge aviso">⚠️ Confirmar amanhã · job `
- SUBSTITUIR: `<span class="badge aviso">'+ic('alert')+' Confirmar amanhã · job `

**B9.** comunicação tratada (✅)
- LOCALIZAR: `<span class="badge confirmacao">✅ D'+r.dia+' tratado</span>`
- SUBSTITUIR: `<span class="badge confirmacao">'+ic('check')+' D'+r.dia+' tratado</span>`

**B10.** comunicação de hoje (📢)
- LOCALIZAR: `<span class="badge aviso">📢 Comunicação D'+r.dia+' · HOJE</span>`
- SUBSTITUIR: `<span class="badge aviso">'+ic('bell')+' Comunicação D'+r.dia+' · HOJE</span>`

**B11.** chip de toques (☎ / 💬)
- LOCALIZAR: `chips.push('<span class="chip">☎'+(j.f1Calls+j.f2Calls+j.f3Calls)+' · 💬'+(j.f1Wpps+j.f2Wpps+j.f3Wpps)+'</span>');`
- SUBSTITUIR: `chips.push('<span class="chip">'+ic('phone')+'<span class="cnt">'+(j.f1Calls+j.f2Calls+j.f3Calls)+'</span>'+ic('chat')+'<span class="cnt">'+(j.f1Wpps+j.f2Wpps+j.f3Wpps)+'</span></span>');`

**B12.** chip de analista na fila (👤)
- LOCALIZAR: `chips.push('<span class="chip">👤 '+esc(j.analista)+'</span>');`
- SUBSTITUIR: `chips.push('<span class="chip">'+ic('user')+' '+esc(j.analista)+'</span>');`

**B13.** link do magiclink (🔗)
- LOCALIZAR: `title="Abrir magiclink">🔗</a>`
- SUBSTITUIR: `title="Abrir magiclink">'+ic('link')+'</a>`

**B14.** mensagem "tudo tratado" (🎉 — só remover)
- LOCALIZAR: `tudo tratado! 🎉`
- SUBSTITUIR: `tudo tratado!`

**B15.** KPI Pendentes no Dashboard (⏳) e na Equipe (⏳)
- LOCALIZAR (aparece 2x — use "substituir tudo"): `<div class="l">⏳ Pendentes</div>`
- SUBSTITUIR: `<div class="l">${ic('clock')} Pendentes</div>`

**B16.** KPI Agir agora no Dashboard (🚨)
- LOCALIZAR: `<div class="l">🚨 Agir agora</div>`
- SUBSTITUIR: `<div class="l">${ic('siren')} Agir agora</div>`

**B17.** chip de analista no Acompanhar (👤)
- LOCALIZAR: `+'<span class="chip">👤 '+esc(j.analista||'(sem dono)')+'</span></div>'`
- SUBSTITUIR: `+'<span class="chip">'+ic('user')+' '+esc(j.analista||'(sem dono)')+'</span></div>'`

**B18.** botão copiar ID PP (📋)
- LOCALIZAR: `>📋 copiar p/ Twilio</button>`
- SUBSTITUIR: `>'+ic('copy')+' copiar p/ Twilio</button>`

---

## Conferência final

Depois de aplicar tudo, procure no arquivo por estes caracteres — não deve
sobrar nenhum: ⏳ ⚠️ 🚨 📢 ✅ ☎ 💬 👤 🔗 📋 📲 💤 🔒 📊 🎉

Os símbolos ▲ ▼ ▬ (nos cartões "vs. LW") e ↻ ⇄ ⬇ (botões de ferramenta) são
propositais e podem ficar — são glifos neutros, não emojis.

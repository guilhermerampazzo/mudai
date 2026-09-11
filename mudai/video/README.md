# Vídeo de propaganda — Mudaí

Campanha de 24 segundos, formato vertical, foco em conversão (fazer baixar).

## O que tem nesta pasta

```
video/
  README.md                 este arquivo (leia primeiro)
  prompts-para-colar.txt    os 3 prompts prontos, em texto limpo, para o Flow
  roteiro-8s.md             3 blocos de 8s explicados (funciona no Veo e no Seedance)
  roteiro-24s.md            1 geração de 24s (só funciona no Seedance 2.5)
  telas/                    8 prints reais do app, prontos para usar
  telas/_capturadas.json    lista das telas
```

**Vai gerar no Flow? Use o `prompts-para-colar.txt`.** Ele tem só o texto dos
prompts, sem markdown — é só copiar e colar. Os `.md` explicam o raciocínio de
cada bloco, mas não devem ser colados no Flow (o campo lá é texto puro, então
`#`, `**` e tabelas viram lixo dentro do prompt).

## Antes de gastar crédito: o limite de cada ferramenta

Isso muda qual roteiro você consegue usar:

| Ferramenta | Duração máxima por geração | Áudio | Serve para |
|---|---|---|---|
| **Google Veo 3.1** | **8 segundos** | sim, nativo | só o roteiro de 8s (3 gerações) |
| **Seedance 2.5** (OpenRouter) | **30 segundos** | sim, nativo | os dois roteiros |

Ou seja: **os 24s de uma vez não rodam no Veo**, por limite técnico, não por escolha.
O roteiro de 8 em 8 é o caminho seguro — funciona nas duas ferramentas.

O Seedance 2.5 tem outra vantagem para este projeto: aceita até 50 arquivos de
referência (imagem, vídeo, áudio) numa mesma geração. Dá para mandar o ícone do
app e os prints como referência, o que ajuda a manter a identidade.

## A parte que ninguém te conta

Modelo de vídeo **não sabe desenhar tela de aplicativo**. Ele vai inventar texto
embaralhado, botão torto e gráfico sem sentido. Se você pedir "mostre a tela do
app", o resultado vai parecer amador.

A saída é dividir o trabalho:

- **IA gera o abstrato:** fundo, logo nascendo, pétala voando, luz, transições, movimento.
- **Você cola as telas reais por cima**, na edição, usando os prints desta pasta.

Isso não é gambiarra, é como as produtoras fazem: as telas aparecem nítidas e
legíveis, e o resto tem aquele movimento que só a IA entrega.

Para colar: CapCut (grátis, no PC), DaVinci Resolve (grátis) ou Premiere.
No CapCut: sobrepor imagem, ajustar na tela do celular, animar entrada com
"corte rápido" ou "deslizar".

## A ideia criativa

**"A muda nasce"**

Tudo acontece no verde da marca (`#1b4332`), com a marca branca e o mostarda
(`#e9b44c`) como acento. Nada de foto realista, nada de gente — só forma
geométrica, flat, no estilo dos três vídeos que você mandou.

O fio condutor é uma **pétala**. Ela nasce junto com a logo, se solta, voa na
direção da câmera e, ao passar, vira a tela do app. A pétala é a transição, não
um enfeite — assim o vídeo tem uma ideia só, e não vários efeitos soltos.

**Estrutura em uma frase:** nasce a marca → a pétala voa → o app prova.

## As telas que escolhi (e por quê)

| Arquivo | Onde entra | Por que |
|---|---|---|
| `04-identificar.png` | 1ª tela | É o efeito uau: foto → Costela-de-adão, 98%. Vende sozinho |
| `05-chat-hachimi.png` | 2ª tela | Mostra conversa de gente real, não robô. É o diferencial |
| `07-minhas-plantas.png` | 3ª tela | Puxa o emocional: suas plantas como pets, com nota de saúde |
| `03-medidor-luz.png` | 4ª tela | Prova que é útil de verdade: 2.385 lux na tela ⚠️ veja abaixo |
| `06-posicao-sol.png` | reserva | Bússola solar com azimute e elevação reais |
| `01-descobrir.png` | reserva | 200 plantas — bom para falar de variedade |
| `02-ficha-planta.png` | reserva | Ficha completa com os gráficos |
| `00-boas-vindas.png` | reserva | Abertura do app, se quiser outro começo |

Todas são print real, 1170x2532 (3x), já com os dados verdadeiros: a Juju com
saúde 100, a Gordinha com 59, o Hachimi respondendo sobre folha amarela e a
identificação acertando a Espada-de-são-jorge com 88%.

Para recapturar (depois de mudar algo no app):

```bash
cd mudai/app
set NODE_ENV=development
set MUDAI_SESSAO=<token-de-sessão>
node scripts/capturar-telas.mjs
```

O script pega os dados reais de produção e injeta as três plantas (Juju,
Gordinha e Zazá) antes de fotografar, para nenhuma tela aparecer vazia.

### ⚠️ A tela do medidor precisa ser recapturada no celular

`03-medidor-luz.png` foi capturada no navegador, que **não tem sensor de luz**.
Por isso ela mostra `lux · demo` e o aviso "Aguardando sensor… (demonstração)".

Isso é de propósito: o app avisa quando o número não veio do hardware, em vez de
mostrar valor inventado como se fosse real. Nada de errado com o app — mas em
propaganda não pega bem.

**Como resolver:** abra o app no celular (que tem sensor), vá em Medidor de Luz e
tire print do aparelho. O texto vira `lux · real`. Se não der, use
`06-posicao-sol.png` no lugar dela — é igualmente visual e não tem esse aviso.



## Trilha e som

Vídeo de conversão vive de som. O que usar:

- **Base:** batida eletrônica leve, sem voz, começando baixa e crescendo.
  Batida "seca" no segundo 8 (quando a pétala se solta) e no 16 (quando entra a
  primeira tela) — esses dois "tacs" amarram os cortes.
- **Detalhe:** som de "whoosh" na pétala voando, e um "clique" curto a cada troca
  de tela. É o que faz parecer profissional.
- **Veo e Seedance geram áudio.** Vale pedir, mas trate como rascunho: trilha boa
  você troca na edição por uma de banco livre (Pixabay Music, Free Music Archive).

## Checklist antes de publicar

- [ ] Vídeo em 1080x1920 (vertical), 24s, 30 ou 60 fps
- [ ] As 4 telas legíveis no celular de quem assiste (teste no seu)
- [ ] Marca aparece nos 2 primeiros segundos e no fim
- [ ] Chamada final clara: "Baixe grátis" + seta ou selo
- [ ] Sem texto pequeno demais (some no feed)
- [ ] Som testado no mudo: o vídeo tem que fazer sentido sem áudio

# Roteiro 24s — geração única e contínua

Formato: **1080x1920 (vertical)**, 24 segundos numa geração só.

> **Importante:** isto **só roda no Seedance 2.5** (OpenRouter), que gera até 30s
> de uma vez. O Google Veo para em 8s por geração, então não aceita este roteiro.
> Se for usar o Veo, vá para o `roteiro-8s.md`.

A proposta é a mesma do roteiro em blocos: a marca nasce, a pétala voa, o app
prova. A diferença é que aqui é um movimento só, sem corte — o que dá uma
continuidade que os blocos separados não conseguem.

---

## Linha do tempo

| Tempo | O que acontece |
|---|---|
| **0,0s–1,5s** | Verde da marca (`#1b4332`) vazio. Um ponto de luz cai do alto e pousa no centro. |
| **1,5s–4,0s** | Do ponto nasce um caule branco que sobe e se curva. Quatro folhas geométricas abrem uma a uma. |
| **4,0s–6,0s** | As folhas se encaixam na marca Mudaí. Luz mostarda pulsa atrás, uma vez. |
| **6,0s–8,0s** | A marca respira (cresce e volta). Uma pétala se solta e começa a cair devagar. |
| **8,0s–11,0s** | A pétala acelera e vem na direção da câmera, crescendo, com rastro mostarda. |
| **11,0s–12,0s** | Ela preenche a tela inteira, desfocada pelo movimento, e o quadro vira luz branca. |
| **12,0s–16,0s** | A luz se abre em quatro painéis de vidro (formato celular) que flutuam para dentro. |
| **16,0s–21,0s** | **Cole as telas reais** aqui, uma por painel: identificar, chat, minhas plantas, medidor (veja a nota no `README.md` sobre a do medidor). |
| **21,0s–22,5s** | Os painéis saem flutuando. O quadro limpa para o centro. |
| **22,5s–24,0s** | **Cole a marca** no centro e `Baixe grátis` embaixo. Segura até o fim. |

Os tempos de 16s em diante são de composição: a IA entrega os painéis vazios e
você coloca os prints por cima.

---

## Prompt (copiar inteiro)

```
Abstract minimal motion graphics animation, flat 2D vector style, one continuous
24-second shot with no cuts.

Deep dark green background (#1b4332), solid, no texture.

0 to 6 seconds: A single tiny glowing white point of light falls from the top of
the frame and lands gently in the center. From that point, a thin white stem
grows upward, curving like a seedling reaching for light. Four white geometric
leaves unfurl one by one, each rotating smoothly into place, opening like a young
plant. The leaves settle into a symmetrical abstract plant mark. A soft mustard
yellow (#e9b44c) glow pulses once behind the mark and fades.

6 to 12 seconds: The plant mark breathes once, growing slightly and returning. A
single white geometric petal detaches from it and falls in slow motion, spinning
gently. Halfway down it accelerates hard toward the camera and grows enormous,
filling the entire frame with heavy motion blur. Mustard yellow light streaks
trail behind it. The petal washes past the camera and the frame fills completely
with soft white light.

12 to 24 seconds: The white light opens and reveals four tall rectangular glass
panels, phone-shaped, floating in the deep green space, slightly angled in 3D,
with subtle drop shadows and soft reflections. They drift into a loose
overlapping arrangement. A soft light sweep passes across them. The panels are
completely empty and frosted. Then they drift away off-frame and the composition
clears to the center, leaving a soft radial glow that holds steady until the end.

Smooth continuous camera motion throughout, confident easing, premium and calm,
generous negative space. 24 seconds.

No text, no letters, no words, no captions, no logos, no realistic plants, no
people. Pure geometric shapes only. The glass panels are empty — no screens, no
interface, no icons, no app elements.
```

---

## Se preferir com áudio

O Seedance 2.5 gera áudio junto. Você pode acrescentar ao fim do prompt:

```
Audio: soft ambient electronic bed, low and calm at the start, a clean deep tone
as the plant forms, a long whoosh as the petal rushes past, gentle rising
tension as the panels appear, ending on a clean warm chord.
```

Mas trate como rascunho. Para propaganda, trilha de banco livre dá um resultado
mais controlado — e você precisa dos "tacs" nos cortes, que a IA não acerta no
tempo exato.

---

## Por que talvez valha gerar em blocos mesmo assim

O 24s de uma vez tem uma vantagem óbvia: o movimento não quebra. Tem duas
desvantagens que você só descobre depois de gastar crédito:

1. **Controle.** Se a pétala sair feia no segundo 9, você refaz os 24 segundos
   inteiros. Nos blocos, refaz só os 8.
2. **Texto embaralhado.** Quanto mais longo o vídeo, mais chance do modelo
   inventar letra em algum ponto. Em 24s é bem provável.

Sugestão prática: se o Seedance é o plano, tente o 24s primeiro, porque o
resultado contínuo é melhor. Se não vier bom em duas tentativas, caia para os
blocos.

---

## Depois de gerar

Igual ao roteiro em blocos:

1. Sobreponha as 4 telas reais nos painéis (16s a 21s), ~1s cada:
   `04-identificar.png`, `05-chat-hachimi.png`, `07-minhas-plantas.png`,
   `03-medidor-luz.png`.
2. Sobreponha a marca (`../logo/mudai-icone.svg`) e `Baixe grátis` no fim.
3. Exporte em 1080x1920, 30 ou 60fps.
4. Assista no celular, não no monitor — é lá que o vídeo vai ser visto.

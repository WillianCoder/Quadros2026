/*
 * Catálogo do site: quadros, áreas de LED, opções, preços, textos e dúvidas.
 * Edite pelo Painel (admin.html) ou à mão — o conteúdo depois do sinal de igual
 * precisa ser JSON válido. Formato explicado em docs/ARQUITETURA.md.
 */
window.CATALOGO = {
  "textos": {
    "heroTitulo": "Seu carro ou moto num quadro que acende.",
    "heroDestaque": "Você escolhe onde vai o LED.",
    "heroTexto": "Faróis, rodas, neon embaixo, contorno… Toque no quadro, escolha as cores e o efeito e veja na hora como vai ficar na sua parede.",
    "bio": "Quadros de carros e motos com LED 🔥 Você escolhe onde acende. Envio para todo o Brasil."
  },
  "categorias": [
    {
      "id": "esportivos",
      "nome": "Esportivos",
      "emoji": "🏁"
    },
    {
      "id": "classicos",
      "nome": "Clássicos",
      "emoji": "🚘"
    },
    {
      "id": "rebaixados",
      "nome": "Rebaixados",
      "emoji": "🔊"
    },
    {
      "id": "motos",
      "nome": "Motos",
      "emoji": "🏍️"
    },
    {
      "id": "pesados",
      "nome": "Caminhões",
      "emoji": "🚛"
    }
  ],
  "quadros": [
    {
      "id": "esportivo-gt",
      "nome": "Esportivo GT Night",
      "categoria": "esportivos",
      "ativo": true,
      "destaque": true,
      "selo": "Mais pedido",
      "descricao": "Cupê esportivo na cidade neon. Fica lindo com faróis brancos, rodas e neon embaixo.",
      "imagem": "assets/img/quadros/esportivo-gt.svg",
      "proporcao": 1.5,
      "preco": 189,
      "leds": [
        {
          "id": "farois",
          "nome": "Faróis",
          "tipo": "linha",
          "pontos": [
            [
              82.67,
              58
            ],
            [
              86.13,
              59.7
            ]
          ],
          "preco": 0,
          "cor": "branco-frio",
          "padrao": true
        },
        {
          "id": "lanternas",
          "nome": "Lanternas",
          "tipo": "linha",
          "pontos": [
            [
              14,
              58.8
            ],
            [
              15.33,
              58.4
            ],
            [
              15.47,
              60.8
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "rodas",
          "nome": "Rodas (anel nos aros)",
          "tipo": "anel",
          "pontos": [
            [
              28.67,
              70,
              4.67
            ],
            [
              72,
              70,
              4.67
            ]
          ],
          "preco": 25,
          "cor": "azul-gelo",
          "padrao": false
        },
        {
          "id": "neon",
          "nome": "Neon embaixo do carro",
          "tipo": "linha",
          "pontos": [
            [
              22,
              77
            ],
            [
              79.33,
              77
            ]
          ],
          "preco": 30,
          "cor": "roxo",
          "padrao": true
        },
        {
          "id": "teto",
          "nome": "Linha do teto",
          "tipo": "linha",
          "pontos": [
            [
              31.33,
              52.4
            ],
            [
              37.67,
              47.4
            ],
            [
              44.13,
              45.2
            ],
            [
              50.67,
              44
            ],
            [
              56.4,
              47.4
            ],
            [
              62,
              52.2
            ]
          ],
          "preco": 20,
          "cor": "rosa",
          "padrao": false
        }
      ]
    },
    {
      "id": "hatch-rebaixado",
      "nome": "Hatch Rebaixado",
      "categoria": "rebaixados",
      "ativo": true,
      "destaque": true,
      "selo": "",
      "descricao": "O queridinho da quebrada: rebaixado, roda dourada e neon no chão.",
      "imagem": "assets/img/quadros/hatch-rebaixado.svg",
      "proporcao": 1.5,
      "preco": 179,
      "leds": [
        {
          "id": "farois",
          "nome": "Faróis",
          "tipo": "linha",
          "pontos": [
            [
              80.4,
              59.8
            ],
            [
              83.07,
              61.8
            ]
          ],
          "preco": 0,
          "cor": "branco-frio",
          "padrao": true
        },
        {
          "id": "lanternas",
          "nome": "Lanternas",
          "tipo": "linha",
          "pontos": [
            [
              18.47,
              56.4
            ],
            [
              18.47,
              60.2
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "neon",
          "nome": "Neon embaixo do carro",
          "tipo": "linha",
          "pontos": [
            [
              24.67,
              76.8
            ],
            [
              78,
              76.8
            ]
          ],
          "preco": 30,
          "cor": "azul-gelo",
          "padrao": true
        },
        {
          "id": "rodas",
          "nome": "Rodas (anel nos aros)",
          "tipo": "anel",
          "pontos": [
            [
              30.4,
              72,
              4.53
            ],
            [
              71.87,
              72,
              4.53
            ]
          ],
          "preco": 25,
          "cor": "amarelo",
          "padrao": false
        },
        {
          "id": "friso",
          "nome": "Friso lateral",
          "tipo": "linha",
          "pontos": [
            [
              20,
              55.6
            ],
            [
              81.33,
              55.6
            ]
          ],
          "preco": 20,
          "cor": "azul-gelo",
          "padrao": false
        }
      ]
    },
    {
      "id": "sedan-classico",
      "nome": "Sedã Clássico 70",
      "categoria": "classicos",
      "ativo": true,
      "destaque": false,
      "selo": "",
      "descricao": "Clássico nacional no pôr do sol, com faixa cromada e faróis acesos.",
      "imagem": "assets/img/quadros/muscle-classico.svg",
      "proporcao": 1.5,
      "preco": 189,
      "leds": [
        {
          "id": "farois",
          "nome": "Faróis",
          "tipo": "linha",
          "pontos": [
            [
              87,
              60
            ],
            [
              87,
              63
            ]
          ],
          "preco": 0,
          "cor": "branco-quente",
          "padrao": true
        },
        {
          "id": "lanternas",
          "nome": "Lanternas",
          "tipo": "linha",
          "pontos": [
            [
              12.93,
              59.8
            ],
            [
              12.93,
              62.4
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "faixa",
          "nome": "Faixa lateral",
          "tipo": "linha",
          "pontos": [
            [
              15.47,
              64
            ],
            [
              85.2,
              64
            ]
          ],
          "preco": 20,
          "cor": "laranja",
          "padrao": true
        },
        {
          "id": "rodas",
          "nome": "Rodas (anel nos aros)",
          "tipo": "anel",
          "pontos": [
            [
              28,
              70.6,
              4
            ],
            [
              72.67,
              70.6,
              4
            ]
          ],
          "preco": 25,
          "cor": "branco-quente",
          "padrao": false
        },
        {
          "id": "neon",
          "nome": "Neon embaixo do carro",
          "tipo": "linha",
          "pontos": [
            [
              22,
              77.8
            ],
            [
              79.33,
              77.8
            ]
          ],
          "preco": 30,
          "cor": "laranja",
          "padrao": false
        }
      ]
    },
    {
      "id": "retro-classico",
      "nome": "Retrô Clássico",
      "categoria": "classicos",
      "ativo": true,
      "destaque": false,
      "selo": "Novo",
      "descricao": "Carrinho retrô sob a lua cheia. Combina com luz quente e neon turquesa.",
      "imagem": "assets/img/quadros/fusca-classico.svg",
      "proporcao": 1.5,
      "preco": 179,
      "leds": [
        {
          "id": "farol",
          "nome": "Farol",
          "tipo": "pontos",
          "pontos": [
            [
              76.67,
              60
            ]
          ],
          "preco": 0,
          "cor": "branco-quente",
          "padrao": true
        },
        {
          "id": "lanterna",
          "nome": "Lanterna",
          "tipo": "pontos",
          "pontos": [
            [
              23.33,
              60
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "rodas",
          "nome": "Rodas (anel nos aros)",
          "tipo": "anel",
          "pontos": [
            [
              29.67,
              71.6,
              4
            ],
            [
              72,
              71.6,
              4
            ]
          ],
          "preco": 25,
          "cor": "verde",
          "padrao": false
        },
        {
          "id": "neon",
          "nome": "Neon embaixo do carro",
          "tipo": "linha",
          "pontos": [
            [
              22,
              79
            ],
            [
              80.67,
              79
            ]
          ],
          "preco": 30,
          "cor": "verde",
          "padrao": true
        },
        {
          "id": "teto",
          "nome": "Linha do teto",
          "tipo": "linha",
          "pontos": [
            [
              20,
              52
            ],
            [
              24,
              46
            ],
            [
              31.33,
              40.4
            ],
            [
              41.33,
              37.4
            ],
            [
              51.33,
              36.2
            ],
            [
              58.67,
              42
            ],
            [
              64,
              48
            ],
            [
              67.33,
              54
            ]
          ],
          "preco": 20,
          "cor": "branco-quente",
          "padrao": false
        },
        {
          "id": "lua",
          "nome": "Lua",
          "tipo": "anel",
          "pontos": [
            [
              82.67,
              21,
              5.07
            ]
          ],
          "preco": 15,
          "cor": "branco-quente",
          "padrao": false
        }
      ]
    },
    {
      "id": "moto-esportiva",
      "nome": "Moto Esportiva Racing",
      "categoria": "motos",
      "ativo": true,
      "destaque": true,
      "selo": "",
      "descricao": "Moto esportiva na pista. Farol, rodas e neon embaixo do motor.",
      "imagem": "assets/img/quadros/moto-esportiva.svg",
      "proporcao": 1.5,
      "preco": 179,
      "leds": [
        {
          "id": "farol",
          "nome": "Farol",
          "tipo": "linha",
          "pontos": [
            [
              73.2,
              52.6
            ],
            [
              75.07,
              53
            ]
          ],
          "preco": 0,
          "cor": "branco-frio",
          "padrao": true
        },
        {
          "id": "lanterna",
          "nome": "Lanterna",
          "tipo": "pontos",
          "pontos": [
            [
              26,
              42.6
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "rodas",
          "nome": "Rodas (anel nos aros)",
          "tipo": "anel",
          "pontos": [
            [
              28.67,
              72.2,
              6
            ],
            [
              72,
              72.2,
              6
            ]
          ],
          "preco": 25,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "neon",
          "nome": "Neon embaixo do motor",
          "tipo": "linha",
          "pontos": [
            [
              37.33,
              78
            ],
            [
              64,
              78
            ]
          ],
          "preco": 25,
          "cor": "vermelho",
          "padrao": false
        },
        {
          "id": "filete",
          "nome": "Filete da carenagem",
          "tipo": "linha",
          "pontos": [
            [
              32,
              49.4
            ],
            [
              46.67,
              52.4
            ],
            [
              60,
              52
            ]
          ],
          "preco": 20,
          "cor": "branco-frio",
          "padrao": false
        }
      ]
    },
    {
      "id": "moto-custom",
      "nome": "Custom Chopper",
      "categoria": "motos",
      "ativo": true,
      "destaque": false,
      "selo": "",
      "descricao": "Chopper de garfo longo na estrada do deserto. Visual de garagem de respeito.",
      "imagem": "assets/img/quadros/moto-custom.svg",
      "proporcao": 1.5,
      "preco": 189,
      "leds": [
        {
          "id": "farol",
          "nome": "Farol",
          "tipo": "pontos",
          "pontos": [
            [
              67.87,
              47
            ]
          ],
          "preco": 0,
          "cor": "branco-quente",
          "padrao": true
        },
        {
          "id": "lanterna",
          "nome": "Lanterna",
          "tipo": "pontos",
          "pontos": [
            [
              18.2,
              64.9
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "rodas",
          "nome": "Rodas (anel nos aros)",
          "tipo": "anel",
          "pontos": [
            [
              26.67,
              72.8,
              5.87
            ],
            [
              78,
              72.8,
              5.87
            ]
          ],
          "preco": 25,
          "cor": "laranja",
          "padrao": false
        },
        {
          "id": "motor",
          "nome": "Luz embaixo do motor",
          "tipo": "linha",
          "pontos": [
            [
              40,
              77.2
            ],
            [
              60,
              76.2
            ]
          ],
          "preco": 25,
          "cor": "laranja",
          "padrao": true
        },
        {
          "id": "tanque",
          "nome": "Filete do tanque",
          "tipo": "linha",
          "pontos": [
            [
              48.67,
              54
            ],
            [
              53.33,
              51.2
            ],
            [
              60,
              51.6
            ]
          ],
          "preco": 15,
          "cor": "laranja",
          "padrao": false
        }
      ]
    },
    {
      "id": "caminhao-estrada",
      "nome": "Caminhão Estradeiro",
      "categoria": "pesados",
      "ativo": true,
      "destaque": false,
      "selo": "",
      "descricao": "Cavalo e baú na estrada à noite, com as luzinhas do teto e da lateral — do jeito que caminhoneiro gosta.",
      "imagem": "assets/img/quadros/caminhao-estrada.svg",
      "proporcao": 1.5,
      "preco": 199,
      "leds": [
        {
          "id": "farol",
          "nome": "Farol",
          "tipo": "pontos",
          "pontos": [
            [
              92.07,
              66.4
            ]
          ],
          "preco": 0,
          "cor": "branco-frio",
          "padrao": true
        },
        {
          "id": "teto",
          "nome": "Luzes do teto da cabine",
          "tipo": "pontos",
          "pontos": [
            [
              69.33,
              22.2
            ],
            [
              73.33,
              22.2
            ],
            [
              77.33,
              22.2
            ],
            [
              81.33,
              22.2
            ],
            [
              85.33,
              22.2
            ]
          ],
          "preco": 15,
          "cor": "laranja",
          "padrao": true
        },
        {
          "id": "laterais",
          "nome": "Luzes laterais do baú",
          "tipo": "pontos",
          "pontos": [
            [
              10,
              66.4
            ],
            [
              18,
              66.4
            ],
            [
              26,
              66.4
            ],
            [
              34,
              66.4
            ],
            [
              42,
              66.4
            ],
            [
              50,
              66.4
            ],
            [
              58,
              66.4
            ]
          ],
          "preco": 20,
          "cor": "amarelo",
          "padrao": true
        },
        {
          "id": "contorno-bau",
          "nome": "Contorno do baú",
          "tipo": "linha",
          "pontos": [
            [
              6.13,
              25.2
            ],
            [
              61.87,
              25.2
            ],
            [
              61.87,
              67.8
            ],
            [
              6.13,
              67.8
            ],
            [
              6.13,
              25.2
            ]
          ],
          "preco": 30,
          "cor": "azul-gelo",
          "padrao": false
        },
        {
          "id": "lanterna",
          "nome": "Lanterna traseira",
          "tipo": "linha",
          "pontos": [
            [
              5.8,
              61.2
            ],
            [
              5.8,
              66.8
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "rodas",
          "nome": "Rodas (anel nos aros)",
          "tipo": "anel",
          "pontos": [
            [
              82.67,
              73,
              3.07
            ],
            [
              66.67,
              73,
              3.07
            ],
            [
              56,
              73,
              3.07
            ],
            [
              17.33,
              73,
              3.07
            ],
            [
              28,
              73,
              3.07
            ]
          ],
          "preco": 25,
          "cor": "azul-gelo",
          "padrao": false
        }
      ]
    }
  ],
  "opcoes": {
    "tamanhos": [
      {
        "id": "p",
        "nome": "30 × 45 cm",
        "acrescimo": 0
      },
      {
        "id": "m",
        "nome": "40 × 60 cm",
        "acrescimo": 70
      },
      {
        "id": "g",
        "nome": "60 × 90 cm",
        "acrescimo": 180
      }
    ],
    "molduras": [
      {
        "id": "preta",
        "nome": "Preta fosca",
        "cor": "#121214",
        "preco": 0
      },
      {
        "id": "branca",
        "nome": "Branca",
        "cor": "#ececec",
        "preco": 0
      },
      {
        "id": "madeira",
        "nome": "Madeira",
        "cor": "#6b4423",
        "preco": 20
      },
      {
        "id": "aluminio",
        "nome": "Alumínio",
        "cor": "#aeb3ba",
        "preco": 30
      }
    ],
    "cores": [
      {
        "id": "branco-frio",
        "nome": "Branco frio",
        "hex": "#e9f6ff"
      },
      {
        "id": "branco-quente",
        "nome": "Branco quente",
        "hex": "#ffd59a"
      },
      {
        "id": "azul-gelo",
        "nome": "Azul gelo",
        "hex": "#3fd2ff"
      },
      {
        "id": "azul",
        "nome": "Azul",
        "hex": "#2f6bff"
      },
      {
        "id": "vermelho",
        "nome": "Vermelho",
        "hex": "#ff2a2a"
      },
      {
        "id": "verde",
        "nome": "Verde",
        "hex": "#22ff8a"
      },
      {
        "id": "roxo",
        "nome": "Roxo",
        "hex": "#a44dff"
      },
      {
        "id": "rosa",
        "nome": "Rosa",
        "hex": "#ff4fd8"
      },
      {
        "id": "amarelo",
        "nome": "Amarelo",
        "hex": "#ffd400"
      },
      {
        "id": "laranja",
        "nome": "Laranja",
        "hex": "#ff8a1f"
      }
    ],
    "rgb": {
      "ativo": true,
      "nome": "RGB com controle remoto (muda de cor quando quiser)",
      "preco": 40
    },
    "efeitos": [
      {
        "id": "fixo",
        "nome": "Fixo",
        "descricao": "Luz acesa direto"
      },
      {
        "id": "respirar",
        "nome": "Respirando",
        "descricao": "Acende e apaga devagar"
      },
      {
        "id": "piscar",
        "nome": "Pisca",
        "descricao": "Pisca no ritmo"
      },
      {
        "id": "sequencial",
        "nome": "Sequencial",
        "descricao": "Luz correndo, uma após a outra"
      },
      {
        "id": "arcoiris",
        "nome": "Arco-íris",
        "descricao": "Troca de cor sozinho (precisa do RGB)",
        "soRgb": true
      }
    ],
    "contorno": {
      "ativo": true,
      "nome": "LED no contorno do quadro",
      "preco": 45
    },
    "fundo": {
      "ativo": true,
      "nome": "Luz atrás do quadro (efeito flutuante na parede)",
      "preco": 50
    },
    "pontoExtra": {
      "ativo": true,
      "preco": 12,
      "max": 12
    },
    "personalizado": {
      "ativo": true,
      "nome": "Seu veículo no quadro",
      "descricao": "Mande a foto do SEU carro, moto ou caminhão e marque onde quer o LED.",
      "preco": 229,
      "proporcao": 1.5
    },
    "extras": [
      {
        "id": "placa",
        "nome": "Plaquinha com nome ou placa do veículo",
        "preco": 25
      },
      {
        "id": "presente",
        "nome": "Embalagem para presente",
        "preco": 15
      },
      {
        "id": "timer",
        "nome": "Desliga sozinho (timer)",
        "preco": 15
      }
    ],
    "prazo": "7 a 12 dias úteis para produzir",
    "frete": "Enviamos para todo o Brasil. O frete é calculado pelo CEP no WhatsApp.",
    "pagamento": "Pix ou cartão — combinado pelo WhatsApp."
  },
  "faq": [
    {
      "p": "Como funciona a escolha dos LEDs?",
      "r": "No “Monte o seu”, você toca nas partes do veículo (faróis, rodas, neon…) para acender ou apagar, escolhe a cor de cada uma e o efeito. Também dá para tocar em qualquer lugar do quadro e colocar um LED extra onde quiser. A prévia mostra exatamente como vai ficar."
    },
    {
      "p": "Posso fazer um quadro com o MEU carro ou moto?",
      "r": "Pode! Escolha “Seu veículo no quadro”, envie a foto e marque onde quer as luzes. Depois a gente confirma tudo com você pelo WhatsApp antes de produzir."
    },
    {
      "p": "Como o quadro é ligado?",
      "r": "Na tomada, com fonte bivolt, ou em USB. Com o opcional RGB vem um controle remoto para mudar a cor e o efeito."
    },
    {
      "p": "Quanto tempo demora?",
      "r": "A produção leva de 7 a 12 dias úteis depois da confirmação. O prazo do frete depende da sua cidade."
    },
    {
      "p": "Como pago?",
      "r": "Pix ou cartão. Tudo combinado pelo WhatsApp depois que você monta o quadro."
    },
    {
      "p": "Gasta muita energia?",
      "r": "Não. LED consome muito pouco — dá para deixar ligado a noite toda sem pesar na conta."
    }
  ],
  "depoimentos": []
};

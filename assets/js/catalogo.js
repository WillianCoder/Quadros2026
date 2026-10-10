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
    },
    {
      "id": "militares",
      "nome": "Militares",
      "emoji": "🪖"
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
      "id": "turbo-jdm",
      "nome": "Turbo JDM",
      "categoria": "esportivos",
      "ativo": true,
      "destaque": true,
      "selo": "Novo",
      "descricao": "Esportivo turbinado com aerofólio e chama no escapamento. Fica insano com neon rosa embaixo.",
      "imagem": "assets/img/quadros/turbo-jdm.svg",
      "proporcao": 1.5,
      "preco": 199,
      "leds": [
        {
          "id": "farois",
          "nome": "Faróis",
          "tipo": "linha",
          "pontos": [
            [
              82.93,
              59.2
            ],
            [
              86.53,
              61.2
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
              13.93,
              58.2
            ],
            [
              13.93,
              61.2
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "chama",
          "nome": "Chama do escapamento (turbo)",
          "tipo": "pontos",
          "pontos": [
            [
              9.2,
              68.7
            ],
            [
              7.87,
              68.7
            ]
          ],
          "preco": 20,
          "cor": "laranja",
          "padrao": true
        },
        {
          "id": "neon",
          "nome": "Neon embaixo do carro",
          "tipo": "linha",
          "pontos": [
            [
              22.67,
              77.2
            ],
            [
              79.33,
              77.2
            ]
          ],
          "preco": 30,
          "cor": "rosa",
          "padrao": true
        },
        {
          "id": "rodas",
          "nome": "Rodas (anel nos aros)",
          "tipo": "anel",
          "pontos": [
            [
              29.73,
              71.2,
              4.8
            ],
            [
              72.4,
              71.2,
              4.8
            ]
          ],
          "preco": 25,
          "cor": "azul-gelo",
          "padrao": false
        },
        {
          "id": "aerofolio",
          "nome": "Aerofólio",
          "tipo": "linha",
          "pontos": [
            [
              12.27,
              47.2
            ],
            [
              24.13,
              47.2
            ]
          ],
          "preco": 15,
          "cor": "azul-gelo",
          "padrao": false
        },
        {
          "id": "faixa",
          "nome": "Faixa lateral",
          "tipo": "linha",
          "pontos": [
            [
              14,
              64
            ],
            [
              86.8,
              64
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
    },
    {
      "id": "tanque-militar",
      "nome": "Tanque de Guerra",
      "categoria": "militares",
      "ativo": true,
      "destaque": false,
      "selo": "Novo",
      "descricao": "Blindado de esteira no pôr do sol do deserto. LED no canhão, na torre e embaixo da esteira.",
      "imagem": "assets/img/quadros/tanque-militar.svg",
      "proporcao": 1.5,
      "preco": 219,
      "leds": [
        {
          "id": "farol",
          "nome": "Farol",
          "tipo": "pontos",
          "pontos": [
            [
              84,
              61.2
            ]
          ],
          "preco": 0,
          "cor": "branco-quente",
          "padrao": true
        },
        {
          "id": "lanterna",
          "nome": "Lanterna traseira",
          "tipo": "linha",
          "pontos": [
            [
              14.07,
              60.2
            ],
            [
              14.07,
              62.8
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "canhao",
          "nome": "Linha do canhão",
          "tipo": "linha",
          "pontos": [
            [
              66,
              47
            ],
            [
              95.33,
              47
            ]
          ],
          "preco": 20,
          "cor": "verde",
          "padrao": true
        },
        {
          "id": "disparo",
          "nome": "Clarão na boca do canhão",
          "tipo": "pontos",
          "pontos": [
            [
              96.4,
              47
            ]
          ],
          "preco": 15,
          "cor": "laranja",
          "padrao": false
        },
        {
          "id": "torre",
          "nome": "Contorno da torre",
          "tipo": "linha",
          "pontos": [
            [
              31.33,
              55.2
            ],
            [
              34.67,
              44.6
            ],
            [
              36,
              42.2
            ],
            [
              39.33,
              41.8
            ],
            [
              60,
              41.4
            ],
            [
              64,
              41.6
            ],
            [
              66,
              45
            ],
            [
              70,
              54.8
            ]
          ],
          "preco": 25,
          "cor": "verde",
          "padrao": false
        },
        {
          "id": "esteira",
          "nome": "Neon embaixo da esteira",
          "tipo": "linha",
          "pontos": [
            [
              20,
              80
            ],
            [
              79.33,
              80
            ]
          ],
          "preco": 30,
          "cor": "verde",
          "padrao": true
        }
      ]
    },
    {
      "id": "jipe-militar",
      "nome": "Jipe Militar 4x4",
      "categoria": "militares",
      "ativo": true,
      "destaque": false,
      "selo": "",
      "descricao": "Utilitário militar no deserto à noite, com pneus off-road e giroflex no teto.",
      "imagem": "assets/img/quadros/jipe-militar.svg",
      "proporcao": 1.5,
      "preco": 199,
      "leds": [
        {
          "id": "farois",
          "nome": "Faróis",
          "tipo": "linha",
          "pontos": [
            [
              87.4,
              56.2
            ],
            [
              87.4,
              59.8
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
              12.8,
              56.2
            ],
            [
              12.8,
              59.4
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "teto",
          "nome": "Luzes do teto",
          "tipo": "pontos",
          "pontos": [
            [
              58.33,
              36.4
            ],
            [
              61,
              36.4
            ]
          ],
          "preco": 15,
          "cor": "amarelo",
          "padrao": true
        },
        {
          "id": "rodas",
          "nome": "Rodas (anel nos aros)",
          "tipo": "anel",
          "pontos": [
            [
              29.33,
              71.6,
              4.4
            ],
            [
              70.8,
              71.6,
              4.4
            ]
          ],
          "preco": 25,
          "cor": "laranja",
          "padrao": false
        },
        {
          "id": "neon",
          "nome": "Neon embaixo do jipe",
          "tipo": "linha",
          "pontos": [
            [
              22,
              80
            ],
            [
              79.33,
              80
            ]
          ],
          "preco": 30,
          "cor": "verde",
          "padrao": false
        }
      ]
    },
    {
      "id": "helicoptero-militar",
      "nome": "Helicóptero Militar",
      "categoria": "militares",
      "ativo": true,
      "destaque": false,
      "selo": "",
      "descricao": "Helicóptero de combate sob a lua. O rotor aceso é o que mais chama atenção.",
      "imagem": "assets/img/quadros/helicoptero-militar.svg",
      "proporcao": 1.5,
      "preco": 209,
      "leds": [
        {
          "id": "rotor",
          "nome": "Hélice principal (rotor)",
          "tipo": "linha",
          "pontos": [
            [
              10,
              30
            ],
            [
              52.67,
              28.8
            ],
            [
              96,
              30
            ]
          ],
          "preco": 25,
          "cor": "azul-gelo",
          "padrao": true
        },
        {
          "id": "cauda",
          "nome": "Hélice da cauda",
          "tipo": "anel",
          "pontos": [
            [
              9.33,
              38,
              3.87
            ]
          ],
          "preco": 15,
          "cor": "azul-gelo",
          "padrao": false
        },
        {
          "id": "holofote",
          "nome": "Holofote",
          "tipo": "pontos",
          "pontos": [
            [
              81.67,
              58
            ]
          ],
          "preco": 0,
          "cor": "branco-frio",
          "padrao": true
        },
        {
          "id": "navegacao",
          "nome": "Luzes de navegação",
          "tipo": "pontos",
          "pontos": [
            [
              34.67,
              50
            ],
            [
              11,
              44
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "neon",
          "nome": "Neon embaixo",
          "tipo": "linha",
          "pontos": [
            [
              40,
              72.2
            ],
            [
              80,
              72.2
            ]
          ],
          "preco": 30,
          "cor": "verde",
          "padrao": false
        }
      ]
    },
    {
      "id": "foto-abrams-disparo",
      "nome": "Abrams em Disparo (foto real)",
      "categoria": "militares",
      "ativo": true,
      "destaque": true,
      "selo": "Foto real",
      "descricao": "Tanque M1A1 Abrams no momento do disparo. Acenda o canhão, a torre e as rodas da esteira.",
      "imagem": "assets/img/quadros/foto-abrams-disparo.jpg",
      "proporcao": 1.5,
      "preco": 229,
      "credito": {
        "autor": "Alex C. Sauceda, U.S. Marine Corps",
        "licenca": "Domínio público",
        "fonte": "https://commons.wikimedia.org/wiki/File:Firing_M1A1_tank_in_Djibouti.jpg"
      },
      "leds": [
        {
          "id": "canhao",
          "nome": "Linha do canhão",
          "tipo": "linha",
          "pontos": [
            [
              52,
              43.3
            ],
            [
              72.5,
              46.4
            ]
          ],
          "preco": 20,
          "cor": "laranja",
          "padrao": true
        },
        {
          "id": "disparo",
          "nome": "Clarão do disparo",
          "tipo": "pontos",
          "pontos": [
            [
              73.5,
              46.8
            ]
          ],
          "preco": 15,
          "cor": "amarelo",
          "padrao": true
        },
        {
          "id": "torre",
          "nome": "Contorno da torre",
          "tipo": "linha",
          "pontos": [
            [
              5.5,
              34.5
            ],
            [
              42,
              34.5
            ],
            [
              45.5,
              35.5
            ],
            [
              52,
              42
            ]
          ],
          "preco": 25,
          "cor": "verde",
          "padrao": false
        },
        {
          "id": "rodas",
          "nome": "Rodas da esteira",
          "tipo": "anel",
          "pontos": [
            [
              20.5,
              63.6,
              2.3
            ],
            [
              27.1,
              63.6,
              2.3
            ],
            [
              33.3,
              63.6,
              2.3
            ],
            [
              39,
              63.6,
              2.3
            ],
            [
              44.3,
              63.6,
              2.3
            ],
            [
              49,
              63.6,
              2.3
            ],
            [
              53.8,
              63.6,
              2.3
            ]
          ],
          "preco": 25,
          "cor": "azul-gelo",
          "padrao": false
        },
        {
          "id": "esteira",
          "nome": "Neon embaixo da esteira",
          "tipo": "linha",
          "pontos": [
            [
              7.6,
              69.5
            ],
            [
              57,
              64.6
            ]
          ],
          "preco": 30,
          "cor": "verde",
          "padrao": true
        }
      ]
    },
    {
      "id": "foto-abrams-noite",
      "nome": "Abrams na Neve à Noite (foto real)",
      "categoria": "militares",
      "ativo": true,
      "destaque": false,
      "selo": "Foto real",
      "descricao": "Tanque Abrams na neve, no fim da tarde. Lanternas, antenas e esteira acesas ficam incríveis no azul.",
      "imagem": "assets/img/quadros/foto-abrams-noite.jpg",
      "proporcao": 1.5,
      "preco": 229,
      "credito": {
        "autor": "Sgt. Randis Monroe, U.S. Army",
        "licenca": "Domínio público",
        "fonte": "https://commons.wikimedia.org/wiki/File:Abrams_Tank_Ready_to_Engage_(6521429).jpg"
      },
      "leds": [
        {
          "id": "lanternas",
          "nome": "Lanternas traseiras",
          "tipo": "pontos",
          "pontos": [
            [
              1.5,
              54.6
            ],
            [
              31.7,
              55.3
            ]
          ],
          "preco": 0,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "antenas",
          "nome": "Ponta das antenas",
          "tipo": "pontos",
          "pontos": [
            [
              23.6,
              5.8
            ],
            [
              44.1,
              4.4
            ]
          ],
          "preco": 15,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "canhao",
          "nome": "Linha do canhão",
          "tipo": "linha",
          "pontos": [
            [
              78,
              51.6
            ],
            [
              92.8,
              54.3
            ]
          ],
          "preco": 20,
          "cor": "azul-gelo",
          "padrao": true
        },
        {
          "id": "torre",
          "nome": "Contorno da torre",
          "tipo": "linha",
          "pontos": [
            [
              11.4,
              41.4
            ],
            [
              45.7,
              40.8
            ],
            [
              69.5,
              41.4
            ],
            [
              72.4,
              45.7
            ]
          ],
          "preco": 25,
          "cor": "azul-gelo",
          "padrao": false
        },
        {
          "id": "rodas",
          "nome": "Rodas da esteira",
          "tipo": "anel",
          "pontos": [
            [
              44.8,
              80,
              2.7
            ],
            [
              51.4,
              80,
              2.7
            ],
            [
              57.1,
              80,
              2.7
            ],
            [
              62.9,
              80,
              2.7
            ],
            [
              68.6,
              80,
              2.7
            ],
            [
              74.3,
              80,
              2.7
            ],
            [
              80,
              80,
              2.7
            ]
          ],
          "preco": 25,
          "cor": "azul-gelo",
          "padrao": false
        },
        {
          "id": "esteira",
          "nome": "Neon embaixo da esteira",
          "tipo": "linha",
          "pontos": [
            [
              6,
              84.5
            ],
            [
              89,
              83.5
            ]
          ],
          "preco": 30,
          "cor": "azul",
          "padrao": false
        }
      ]
    },
    {
      "id": "foto-abrams-fogo",
      "nome": "Abrams Iluminado (foto real)",
      "categoria": "militares",
      "ativo": true,
      "destaque": false,
      "selo": "Foto real",
      "descricao": "Abrams iluminado por sinalizadores numa noite de neve. Visual quente, perfeito com LED laranja e vermelho.",
      "imagem": "assets/img/quadros/foto-abrams-fogo.jpg",
      "proporcao": 1.5,
      "preco": 229,
      "credito": {
        "autor": "Sgt. Randis Monroe, U.S. Army",
        "licenca": "Domínio público",
        "fonte": "https://commons.wikimedia.org/wiki/File:Abrams_Tank_Ready_to_Engage_(6521431).jpg"
      },
      "leds": [
        {
          "id": "canhao",
          "nome": "Linha do canhão",
          "tipo": "linha",
          "pontos": [
            [
              54.3,
              59.3
            ],
            [
              76.8,
              59.3
            ]
          ],
          "preco": 20,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "disparo",
          "nome": "Clarão na boca do canhão",
          "tipo": "pontos",
          "pontos": [
            [
              77.5,
              59.3
            ]
          ],
          "preco": 15,
          "cor": "laranja",
          "padrao": true
        },
        {
          "id": "antenas",
          "nome": "Ponta das antenas",
          "tipo": "pontos",
          "pontos": [
            [
              8.4,
              25
            ],
            [
              20.6,
              24.4
            ]
          ],
          "preco": 15,
          "cor": "vermelho",
          "padrao": false
        },
        {
          "id": "farol",
          "nome": "Farol dianteiro",
          "tipo": "pontos",
          "pontos": [
            [
              70.8,
              71.4
            ]
          ],
          "preco": 0,
          "cor": "branco-quente",
          "padrao": true
        },
        {
          "id": "rodas",
          "nome": "Rodas da esteira",
          "tipo": "anel",
          "pontos": [
            [
              16.7,
              83.6,
              2.6
            ],
            [
              23.3,
              83.6,
              2.6
            ],
            [
              30,
              83.6,
              2.6
            ],
            [
              36.2,
              83.6,
              2.6
            ],
            [
              42.4,
              83.6,
              2.6
            ],
            [
              48.6,
              83.6,
              2.6
            ],
            [
              53.8,
              83.6,
              2.6
            ]
          ],
          "preco": 25,
          "cor": "laranja",
          "padrao": false
        },
        {
          "id": "esteira",
          "nome": "Neon embaixo da esteira",
          "tipo": "linha",
          "pontos": [
            [
              12.4,
              88
            ],
            [
              70.5,
              80.5
            ]
          ],
          "preco": 30,
          "cor": "vermelho",
          "padrao": false
        }
      ]
    },
    {
      "id": "foto-humvee",
      "nome": "Humvee Militar (foto real)",
      "categoria": "militares",
      "ativo": true,
      "destaque": false,
      "selo": "Foto real",
      "descricao": "Humvee das forças especiais com helicópteros ao fundo. LED no quebra-mato, faróis, teto e rodas.",
      "imagem": "assets/img/quadros/foto-humvee.jpg",
      "proporcao": 1.5,
      "preco": 219,
      "credito": {
        "autor": "Staff Sgt. Elizabeth Pena",
        "licenca": "Domínio público",
        "fonte": "https://commons.wikimedia.org/wiki/File:Romanian_Special_Forces_Humvee.jpg"
      },
      "leds": [
        {
          "id": "farois",
          "nome": "Faróis",
          "tipo": "pontos",
          "pontos": [
            [
              79.8,
              61.4
            ],
            [
              84.8,
              61
            ]
          ],
          "preco": 0,
          "cor": "branco-frio",
          "padrao": true
        },
        {
          "id": "setas",
          "nome": "Luz de seta",
          "tipo": "pontos",
          "pontos": [
            [
              72.1,
              61
            ]
          ],
          "preco": 0,
          "cor": "laranja",
          "padrao": true
        },
        {
          "id": "quebramato",
          "nome": "Quebra-mato (para-choque)",
          "tipo": "linha",
          "pontos": [
            [
              77.1,
              55
            ],
            [
              91.4,
              54.6
            ],
            [
              91.7,
              60
            ]
          ],
          "preco": 20,
          "cor": "azul-gelo",
          "padrao": true
        },
        {
          "id": "teto",
          "nome": "Linha do teto",
          "tipo": "linha",
          "pontos": [
            [
              17,
              38.6
            ],
            [
              64,
              37.9
            ]
          ],
          "preco": 20,
          "cor": "amarelo",
          "padrao": false
        },
        {
          "id": "rodas",
          "nome": "Rodas (anel nos pneus)",
          "tipo": "anel",
          "pontos": [
            [
              11,
              75.7,
              7.4
            ],
            [
              65.7,
              77.1,
              7.4
            ]
          ],
          "preco": 25,
          "cor": "verde",
          "padrao": false
        },
        {
          "id": "neon",
          "nome": "Neon embaixo",
          "tipo": "linha",
          "pontos": [
            [
              12,
              86
            ],
            [
              88,
              86
            ]
          ],
          "preco": 30,
          "cor": "verde",
          "padrao": false
        }
      ]
    },
    {
      "id": "foto-chopper-vermelha",
      "nome": "Chopper Flames (foto real)",
      "categoria": "motos",
      "ativo": true,
      "destaque": true,
      "selo": "Foto real",
      "descricao": "Chopper vermelha com pintura de chamas e muito cromado. Farol, rodas e neon embaixo do motor.",
      "imagem": "assets/img/quadros/foto-chopper-vermelha.jpg",
      "proporcao": 1.5,
      "preco": 219,
      "credito": {
        "autor": "paulbr75 (Pixabay)",
        "licenca": "CC0",
        "fonte": "https://commons.wikimedia.org/wiki/File:Motorcycle-1698615_1920.jpg"
      },
      "leds": [
        {
          "id": "farol",
          "nome": "Farol",
          "tipo": "pontos",
          "pontos": [
            [
              68.8,
              36.9
            ]
          ],
          "preco": 0,
          "cor": "branco-quente",
          "padrao": true
        },
        {
          "id": "lanterna",
          "nome": "Lanterna traseira",
          "tipo": "pontos",
          "pontos": [
            [
              8.6,
              49.3
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
              17.1,
              71.4,
              7.6
            ],
            [
              79,
              74.3,
              9.6
            ]
          ],
          "preco": 25,
          "cor": "vermelho",
          "padrao": true
        },
        {
          "id": "motor",
          "nome": "Neon embaixo do motor",
          "tipo": "linha",
          "pontos": [
            [
              28,
              81
            ],
            [
              58,
              81
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
              41.9,
              42.9
            ],
            [
              49.5,
              36.4
            ],
            [
              57.1,
              35.7
            ]
          ],
          "preco": 15,
          "cor": "amarelo",
          "padrao": false
        },
        {
          "id": "escape",
          "nome": "Escapamento",
          "tipo": "linha",
          "pontos": [
            [
              15.2,
              70.7
            ],
            [
              40,
              71.4
            ]
          ],
          "preco": 20,
          "cor": "laranja",
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

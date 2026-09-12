// Cadastro de disciplinas do Planejador Acadêmico.

const disciplinaAjustes = {
  "FFW361": " (Agentes infecciosos)",
  "FFW362": " (Imunologia)",
  "FFW471": " (Cardio / Renal)",
  "FFW472": " (Endócrino)",
  "FFW481": " (Neurologia)",
  "FFW591": " (Parasitologia)",
  "FFW502": " (Oncologia)"
};

const aliasesPesquisaDisciplinas = {
  "orgexp": "quimica organica experimental",
  "f1": "farmacocinetica e farmacodinamica",
  "exp": "experimental",
  "cif": "cuidado integrado em farmacia",
  "pcq": "producao e controle de qualidade",
  "bqm": "bioquimica",
  "qfm": "quimica farmaceutica",
  "fisqui": "fisico-quimica"
};

const disciplinas = [
  {"periodo":"1","codigo":"BMW103","nome":"Bases Morfológicas Aplicadas à Farmácia","pre":"","co":"","cred":6,"ch":105},
  {"periodo":"1","codigo":"BQM101","nome":"Bioquímica I","pre":"","co":"","cred":3,"ch":45},
  {"periodo":"1","codigo":"FFW111","nome":"Farmacêutico e Sociedade","pre":"","co":"","cred":2,"ch":30},
  {"periodo":"1","codigo":"IQG114","nome":"Química Geral I","pre":"","co":"","cred":4,"ch":60},
  {"periodo":"1","codigo":"MAC108","nome":"Cálculo para Farmácia","pre":"","co":"","cred":3,"ch":45},
  {"periodo":"2","codigo":"BQM103","nome":"Bioquímica II","pre":"BQM101","co":"","cred":3,"ch":45},
  {"periodo":"2","codigo":"IQF235","nome":"Físico-Química I","pre":"MAC108; IQG114","co":"","cred":2,"ch":30},
  {"periodo":"2","codigo":"CFF122","nome":"Fisiologia Humana","pre":"BMW103; BQM101","co":"","cred":6,"ch":90},
  {"periodo":"2","codigo":"FFW121","nome":"Políticas e Planejamento em Saúde Pública","pre":"FFW111","co":"","cred":2,"ch":30},
  {"periodo":"2","codigo":"IQG122","nome":"Química Inorgânica Estrutural FF","pre":"IQG114","co":"","cred":2,"ch":30},
  {"periodo":"2","codigo":"IQO120","nome":"Química Orgânica I","pre":"IQG114","co":"","cred":4,"ch":60},
  {"periodo":"3","codigo":"BMF310","nome":"Farmacocinética e Farmacodinâmica Fundamental","pre":"CFF122","co":"","cred":4,"ch":60},
  {"periodo":"3","codigo":"FFW231","nome":"Farmácia Clínica","pre":"FFW111; CFF122","co":"","cred":2,"ch":30},
  {"periodo":"3","codigo":"FFW232","nome":"Diagnóstico Laboratorial no Cuidado Farmacêutico","pre":"BQM103; CFF122","co":"","cred":2,"ch":30},
  {"periodo":"3","codigo":"IQA123","nome":"Química Analítica Farmacêutica I","pre":"IQG114","co":"","cred":2,"ch":30},
  {"periodo":"3","codigo":"IQF232","nome":"Físico-Química II","pre":"IQF235","co":"","cred":2,"ch":30},
  {"periodo":"3","codigo":"IQO220","nome":"Métodos Espectrométricos","pre":"IQO120","co":"","cred":3,"ch":60},
  {"periodo":"3","codigo":"IQO230","nome":"Química Orgânica II","pre":"IQO120","co":"","cred":4,"ch":60},
  {"periodo":"4","codigo":"FFW241","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos I (PCQ I)","pre":"IQA123; IQO220","co":"","cred":3,"ch":60},
  {"periodo":"4","codigo":"FFW243","nome":"Métodos Computacionais Aplicados às Ciências Farmacêuticas (MACF)","pre":"BMF310; IQO230","co":"FFW242","cred":1,"ch":30},
  {"periodo":"4","codigo":"FFW242","nome":"Química Farmacêutica e Medicinal I","pre":"BMF310; IQO230","co":"","cred":2,"ch":30},
  {"periodo":"4","codigo":"IQA240","nome":"Química Analítica Farmacêutica Experimental","pre":"IQA123","co":"IQA233","cred":1,"ch":30},
  {"periodo":"4","codigo":"IQA233","nome":"Química Analítica Farmacêutica II","pre":"IQA123","co":"","cred":2,"ch":30},
  {"periodo":"4","codigo":"IQG241","nome":"Química de Coordenações","pre":"IQG122","co":"","cred":2,"ch":30},
  {"periodo":"4","codigo":"IQO242","nome":"Química Orgânica Experimental FF","pre":"IQO230; IQO220","co":"","cred":2,"ch":60},
  {"periodo":"5","codigo":"FFW353","nome":"Gestão e Planejamento da Assistência Farmacêutica","pre":"FFW121","co":"","cred":4,"ch":60},
  {"periodo":"5","codigo":"FFW351","nome":"Toxicologia Geral","pre":"FFW242","co":"FFW352","cred":2,"ch":30},
  {"periodo":"5","codigo":"FFW352","nome":"Química Farmacêutica II & Toxicológica","pre":"FFW242; FFW243","co":"FFW351","cred":2,"ch":30},
  {"periodo":"5","codigo":"IMW360","nome":"Microbiologia e Imunologia Fundamental","pre":"CFF122; BQM103","co":"","cred":5,"ch":90},
  {"periodo":"5","codigo":"FFW354","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos II","pre":"FFW241","co":"","cred":4,"ch":60},
  {"periodo":"5","codigo":"FFW355","nome":"Hematologia F","pre":"FFW232; BMF310","co":"","cred":2,"ch":30},
  {"periodo":"6","codigo":"FFW361","nome":"Cuidado Integrado em Farmácia I","pre":"IMW360; FFW242; FFW231; FFW232","co":"","cred":5,"ch":90},
  {"periodo":"6","codigo":"FFW363","nome":"Farmacobotânica","pre":"BMW103","co":"","cred":1,"ch":30},
  {"periodo":"6","codigo":"FFW362","nome":"Cuidado Integrado em Farmácia II","pre":"IMW360; FFW231; FFW232; FFW242","co":"","cred":4,"ch":60},
  {"periodo":"6","codigo":"FFW364","nome":"Gestão Farmacêutica","pre":"FFW121","co":"","cred":2,"ch":30},
  {"periodo":"6","codigo":"FFW365","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos III","pre":"FFW241","co":"","cred":3,"ch":45},
  {"periodo":"7","codigo":"FFW471","nome":"Cuidado Integrado em Farmácia III","pre":"FFW242; FFW231; FFW232","co":"","cred":6,"ch":90},
  {"periodo":"7","codigo":"FFW472","nome":"Cuidado Integrado em Farmácia IV","pre":"FFW242; FFW231; FFW232","co":"","cred":4,"ch":60},
  {"periodo":"7","codigo":"FFW473","nome":"Farmacognosia","pre":"IQO242; FFW363","co":"","cred":4,"ch":90},
  {"periodo":"7","codigo":"FFW474","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos IV","pre":"FFW354; FFW365","co":"","cred":2,"ch":60},
  {"periodo":"8","codigo":"FFW481","nome":"Cuidado Integrado em Farmácia V","pre":"FFW242; FFW231; FFW232","co":"","cred":4,"ch":75},
  {"periodo":"8","codigo":"FFW482","nome":"Farmacoepidemiologia e Bioestatística Aplicada","pre":"FFW121","co":"","cred":3,"ch":45},
  {"periodo":"8","codigo":"FFW483","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos V","pre":"FFW354; FFW365","co":"","cred":2,"ch":30},
  {"periodo":"8","codigo":"FFW484","nome":"Genética e Biologia Molecular Aplicadas","pre":"BMW103; BQM103","co":"","cred":2,"ch":30},
  {"periodo":"8","codigo":"FFW485","nome":"Biotecnologia Farmacêutica","pre":"IMW360","co":"","cred":2,"ch":30},
  {"periodo":"8","codigo":"FFW486","nome":"Metodologia Científica","pre":"","co":"","cred":2,"ch":30},
  {"periodo":"9","codigo":"FFW591","nome":"Cuidado Integrado em Farmácia VI","pre":"FFW242; FFW231; FFW232","co":"","cred":6,"ch":90},
  {"periodo":"9","codigo":"FFW592","nome":"Processamento e Controle de Qualidade de Alimentos","pre":"IQA233; BQM103","co":"","cred":3,"ch":60},
  {"periodo":"9","codigo":"FFW593","nome":"Produção e Controle de Qualidade de Produtos Farmacêuticos VI","pre":"FFW483","co":"","cred":1,"ch":30},
  {"periodo":"9","codigo":"IEE326","nome":"Economia e Administração de Empresas","pre":"","co":"","cred":3,"ch":45},
  {"periodo":"9","codigo":"FFWK03","nome":"Trabalho de Conclusão de Curso (TCC)","pre":"FFW486","co":"","cred":1,"ch":45},
  {"periodo":"10","codigo":"FFW501","nome":"Farmacoterapia no Cuidado Farmacêutico","pre":"FFW361; FFW362; FFW471; FFW472; FFW481; FFW591","co":"","cred":3,"ch":60},
  {"periodo":"10","codigo":"FFW502","nome":"Cuidado Integrado em Farmácia VII","pre":"FFW242; FFW231; FFW232","co":"","cred":4,"ch":60},
  {"periodo":"10","codigo":"FFW503","nome":"Produção e Controle de Qualidade em Farmácia VII","pre":"FFW473; FFW483","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFM010","nome":"Análise Proteo Apli Diag Terap","pre":"BMW103; BQM103","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFC501","nome":"Bioquímica Clin Experimental","pre":"FFW232","co":"","cred":2,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"FFC008","nome":"Citopatologia Clinica Aplicada","pre":"FFW232","co":"","cred":3,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"FFC005","nome":"Hematologia Clínica","pre":"FFW355","co":"","cred":3,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"FFC009","nome":"Micologia Médica","pre":"FFW591","co":"","cred":3,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"FFC007","nome":"Microbiologia Clínica Aplicada","pre":"FFW361","co":"","cred":3,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"FFC004","nome":"Parasitologia Clínica Avançada","pre":"FFW472","co":"","cred":3,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"FFC003","nome":"Toxico Aplic Análises Clínicas","pre":"IMW360","co":"","cred":3,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"FFM009","nome":"Bases da Terapêutica Racional","pre":"FFW471","co":"FFW482","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFI005","nome":"Bases Mol Doenças Metabólicas","pre":"","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFW003","nome":"Diabetes","pre":"CFF122; BQM103","co":"","cred":3,"ch":45},
  {"periodo":"Escolha Condicionada","codigo":"FFM024","nome":"Farmácia Estética","pre":"FFW483","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"BMF001","nome":"Farmacologia Clínica","pre":"FFW471","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFM012","nome":"Farmacometria Lab Clínico","pre":"BMF310","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFI019","nome":"Metabol Lipídeos e Obesidade","pre":"BQM103","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFP002","nome":"Téc Aplicações de Injetáveis","pre":"","co":"","cred":2,"ch":45},
  {"periodo":"Escolha Condicionada","codigo":"FFP001","nome":"Técnicas de Socorrismo","pre":"","co":"","cred":2,"ch":45},
  {"periodo":"Escolha Condicionada","codigo":"FFP015","nome":"Bases da Fitoterapia","pre":"FFW473","co":"","cred":4,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"FFP007","nome":"Botânica Aplicada","pre":"FFW363","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFM413","nome":"Farmacotécnica Homeopática","pre":"FFW354","co":"","cred":3,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"FFP304","nome":"Introd à Quím de Prod Naturais","pre":"IQO230","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFP004","nome":"Ctrl Micr. Drogas e Alim Orig Veg","pre":"FFW363","co":"","cred":2,"ch":45},
  {"periodo":"Escolha Condicionada","codigo":"FFP016","nome":"Tópicos Especiais em Produtos Naturais","pre":"FFW473","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFI013","nome":"Biocatal Processos Industriais","pre":"BQM103; IQO230","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFM027","nome":"Cosmetologia","pre":"FFW483","co":"","cred":2,"ch":45},
  {"periodo":"Escolha Condicionada","codigo":"FFM022","nome":"Química Industr Farmacêutica","pre":"IQO230","co":"","cred":3,"ch":45},
  {"periodo":"Escolha Condicionada","codigo":"FFM018","nome":"Téc de Purificação na Ind Farm","pre":"BQM103","co":"","cred":2,"ch":35},
  {"periodo":"Escolha Condicionada","codigo":"FFM415","nome":"Tecnologia Farmacêutica","pre":"FFW354","co":"","cred":4,"ch":90},
  {"periodo":"Escolha Condicionada","codigo":"FFM026","nome":"Tópicos Especiais em Cromatografia na Indústria Farmacêutica","pre":"FFW241","co":"","cred":1,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFW006","nome":"Tec Prod Hemocomp Hemoderiv","pre":"FFW355","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"PNN015","nome":"Cromatografia","pre":"IQO230","co":"","cred":3,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"FFC015","nome":"Análises Forenses","pre":"","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFP008","nome":"Botânica Forense","pre":"FFW353","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFM006","nome":"Téc Mod de Proteína Ap C Farmacêuticas","pre":"IQG114","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFI021","nome":"Empreendedorismo Ciênc Farmac","pre":"","co":"","cred":3,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"FFW007","nome":"Gestão de Proj e Comport Organiz","pre":"","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFW008","nome":"Gestão Farmacêutica Aplicada","pre":"","co":"","cred":1,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFI010","nome":"Inovação Ciênc Farmacêuticas","pre":"","co":"","cred":3,"ch":45},
  {"periodo":"Escolha Condicionada","codigo":"FFM025","nome":"Patentes Farmacêuticas e Farmoquímicas","pre":"","co":"","cred":2,"ch":30},
  {"periodo":"Escolha Condicionada","codigo":"FFW005","nome":"História Descoberta Fármacos","pre":"","co":"","cred":1,"ch":15},
  {"periodo":"Escolha Condicionada","codigo":"LEB599","nome":"Líng Bras de Sinais","pre":"","co":"","cred":4,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"NEP148","nome":"Direitos Humanos e Racismo","pre":"","co":"","cred":4,"ch":60},
  {"periodo":"Escolha Condicionada","codigo":"NEP149","nome":"Direitos Humanos e Meio Ambiente","pre":"","co":"","cred":4,"ch":60}
];

// Contatos importantes extraídos do índice. Os dados abaixo reproduzem apenas o conteúdo existente no index.html.
const contatosImportantes = [
  {
    "nome": "Biotecnologia Farmacêutica (BIOTECFAR)",
    "chefe": "Chefe: Profª Yraima Cordeiro",
    "local": "",
    "professores": [
      {
        "nome": "Ana Luiza Palhares de Miranda",
        "email": "analuisapharma60@gmail.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Cláudia Pinto Figueiredo",
        "email": "claufig@gmail.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Daniela Uziel",
        "email": "daniela.uziel@ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "David Majerowicz",
        "email": "majerowicz@gmail.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Diego Allonso R.S. Silva",
        "email": "diegoallonso@pharma.ufrj.br",
        "extras": [
          "diegoallonso@gmail.com"
        ],
        "cargo": ""
      },
      {
        "nome": "Evelin Andrade Manoel",
        "email": "biorecados@yahoo.com.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Giselle Fazzioni Passos",
        "email": "gfazzioni@yahoo.com.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Heitor Affonso de Paula Neto",
        "email": "heitorapneto@gmail.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Mariana Juliani do Amaral",
        "email": "mjdoamaral@farmacia.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Mauro Sola Penna",
        "email": "msolapenna@me.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Patricia Zancan",
        "email": "pzancan@me.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Renato Sampaio Carvalho",
        "email": "rscarvalho@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Robson da Costa",
        "email": "rbsndcst@gmail.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Yraima Cordeiro",
        "email": "yraima@pharma.ufrj.br",
        "extras": [
          "yraimacordeiro@gmail.com"
        ],
        "cargo": ""
      }
    ]
  },
  {
    "nome": "Análises Clínicas e Toxicológicas (DACT)",
    "chefe": "Chefe: Profª Aloa Machado de Souza",
    "local": "LOCAL: Bloco A, Sala 16, 2º andar",
    "professores": [
      {
        "nome": "Alexandre dos Santos Pyrrho",
        "email": "pyrrho@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Aloa Machado de Souza",
        "email": "Aloa.machado@gmail.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "André Luiz Costa de Araújo",
        "email": "alcaraujo@gmail.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Flavia Serra Frattani Ferreira",
        "email": "flaviafrattani@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Helena Keiko Toma",
        "email": "hktoma@globo.com",
        "extras": [
          "lacmac@pharma.ufrj.br"
        ],
        "cargo": ""
      },
      {
        "nome": "Hilton Antonio Mata dos Santos",
        "email": "hilton@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Janayna Albuquerque dos Santos",
        "email": "janayna@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Lilian de Oliveira Moreira",
        "email": "lilian@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Lívia Cristina Liporagi",
        "email": "liporagi@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Luciana Pereira Rangel",
        "email": "luprangel@gmail.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Luciana Wermelinger",
        "email": "lwserrao@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Marcelo de Padula",
        "email": "marcelo@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Mario Gandra",
        "email": "mariogandra@gmail.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Nancy dos Santos Barbi",
        "email": "nancybarbi@yahoo.com.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Pablo Trindade",
        "email": "pablotrindade@gmail.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Paulo Murillo Neufeld",
        "email": "pmneufeld@pharma.ufrj.br",
        "extras": [
          "pmneufeld@yahoo.com.br"
        ],
        "cargo": ""
      },
      {
        "nome": "Plínio Cunha",
        "email": "pliniocs@yahoo.com.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Priscilla Chistina Olsen",
        "email": "priolsen@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Reginaldo Almeida da Trindade",
        "email": "rtrindade@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Roseli Vigio Ribeiro",
        "email": "rvigioribeiro@pharma.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Sergio Lisboa Machado",
        "email": "machadosl@globo.com",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Virginia Martins Carvalho",
        "email": "mcfarm@gmail.com",
        "extras": [],
        "cargo": ""
      }
    ]
  },
  {
    "nome": "Produtos Naturais e Alimentos (DPNA)",
    "chefe": "Chefe: Profª Juliana Villela Paulino",
    "local": "LOCAL: Bloco A, Sala 16, 2º andar",
    "professores": [
      {
        "nome": "Juliana Villela Paulino",
        "email": "jvillelapaulino@pharma.ufrj.br",
        "extras": [
          "jvillelapaulino@yahoo.com.br"
        ],
        "cargo": ""
      }
    ]
  },
  {
    "nome": "Instituto de Química (IQ)",
    "chefe": "",
    "local": "",
    "professores": [
      {
        "nome": "Alexandre Braga da Rocha",
        "email": "rocha@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Alexandre Guedes Torres",
        "email": "torres@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Ana Lúcia de Lima",
        "email": "analima@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Anita Ferreira do Valle",
        "email": "avalle@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Annelise Casellato",
        "email": "casellato@iq.ufrj.br",
        "extras": [],
        "cargo": "[Vice Dep. de Química Inorgânica]"
      },
      {
        "nome": "Antonio Carlos de Oliveira Guerra",
        "email": "acog@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Carlos Adam Conte Junior",
        "email": "conte@iq.ufrj.br",
        "extras": [],
        "cargo": "[Vice-diretor do IQ]"
      },
      {
        "nome": "Carlos Alberto da Silva Riehl",
        "email": "riehl@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Carlos Eduardo Rodrigues de Paula",
        "email": "carlosdepaula@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Carlos Roland Kaiser",
        "email": "kaiser@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Cássia Curan Turci",
        "email": "cassia@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Celeste Yara dos Santos Siqueira",
        "email": "celesteyara@iq.ufrj.br",
        "extras": [],
        "cargo": "[Chefe Dep. de Química Analítica]"
      },
      {
        "nome": "Cláudia Moraes de Rezende",
        "email": "crezende@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Cláudio Cerqueira Lopes",
        "email": "claudioc@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Cláudio José de Araújo Mota",
        "email": "cmota@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Cristiane Dinis Ano Bom",
        "email": "anobom@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Daniel Perrone Moreira",
        "email": "danielperronemoreira@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Débora de Almeida Azevedo",
        "email": "debora@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Denise Maria Guimarães Freire",
        "email": "freire@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Elba Pinto da Silva Bon",
        "email": "elba1996@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Elis Cristina Araújo Eleutherio",
        "email": "eliscael@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Elizabeth Roditi Lachter",
        "email": "lachter@iq.ufrj.br",
        "extras": [],
        "cargo": "[Chefe Dep. de Química Orgânica]"
      },
      {
        "nome": "Fernando Henrique Cincotto",
        "email": "fernandocincotto@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Gerardo Gerson Bezerra de Souza",
        "email": "gerson@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Guilherme Cordeiro da Graça de Oliveira",
        "email": "cordeiro@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "João Francisco Cajaíba da Silva",
        "email": "cajaiba@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Joel Jones Junior",
        "email": "jjones@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Joaquim Fernando Mendes da Silva",
        "email": "joaquim@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "José Celestino de Barros Neto",
        "email": "jbarros@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Júlio Carlos Afonso",
        "email": "julio@iq.ufrj.br",
        "extras": [],
        "cargo": "[Vice Dep. de Química Analítica]"
      },
      {
        "nome": "Jussara Lopes de Miranda",
        "email": "jussara@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Lígia Maria Marino Valente",
        "email": "valente@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Luciana Pizzatti Barboza",
        "email": "pizzatti@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Lucidalva dos Santos Pinheiro",
        "email": "lucidalva@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Luiz Claudio dos Santos Ribeiro",
        "email": "luiz.oberti@uol.com.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Magaly Girão Albuquerque",
        "email": "magaly@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Magno Rodrigues Junqueira",
        "email": "magnojunqueira@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Maiara Oliveira Salles",
        "email": "maiara@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Marcelo Maciel Pereira",
        "email": "maciel@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Márcia Nogueira da Silva de la Cruz",
        "email": "marcianogueira@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Márcia Regina Soares da Silva",
        "email": "marcia@iq.ufrj.br",
        "extras": [],
        "cargo": "[Chefe Dep. de Bioquímica]"
      },
      {
        "nome": "Marciela Scarpellini",
        "email": "marciela@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Marcio Contrucci Saraiva de Mattos",
        "email": "mmattos@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Marcos Dias Pereira",
        "email": "marcosdp@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Mauro dos Santos de Carvalho",
        "email": "mauro@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Nanci Câmara de Lucas Garden",
        "email": "nancicl@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Pedro Nothaft Romano",
        "email": "pedroromano@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Rafael Dias Mesquita",
        "email": "rdmesquita@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Ricardo Erthal Santelli",
        "email": "santelli@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Ricardo Rodrigues de Oliveira Junior",
        "email": "rrjunior@iq.ufrj.br",
        "extras": [],
        "cargo": "[Vice Dep. de Físico-Química]"
      },
      {
        "nome": "Roberto Marchiori",
        "email": "r_marchi@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Roberto Salgado Amado",
        "email": "roberto@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Rosane Aguiar da Silva San Gil",
        "email": "rsangil@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Sabrina Baptista Ferreira",
        "email": "sabrinab@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Sérgio de Paula Machado",
        "email": "sergiopm@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Thaís Delazare",
        "email": "thdelazare@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Thiago Messias Cardozo",
        "email": "thiago@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Victor de Oliveira Rodrigues",
        "email": "vicerodrigues@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Vinícius Figueiredo Sardela",
        "email": "viniciussardela@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      },
      {
        "nome": "Viviane Gomes Teixeira",
        "email": "vgomes@iq.ufrj.br",
        "extras": [],
        "cargo": ""
      }
    ]
  }
];

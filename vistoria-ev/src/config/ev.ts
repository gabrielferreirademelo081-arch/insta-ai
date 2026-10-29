import type { Campos, ItemDef, SubSlotDef, TipoConfig } from './types';

/**
 * Configuração da vistoria de EV (estrutura vertical).
 * Para mudar checklist, campos ou pastas, edite SÓ este arquivo.
 */

const OPERADORAS = ['Claro', 'Oi', 'TIM', 'Vivo', 'Nextel', 'Sky', 'Outra'];

/** Faces: 3 se a seção típica for triangular, senão 4 (A–D). */
function faces(campos: Campos): string[] {
  return (campos.secaoTipica || '').toLowerCase() === 'triangular' ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
}

const subFaces = (campos: Campos): SubSlotDef[] =>
  faces(campos).map((f) => ({ id: f, label: `Face ${f}`, apelido: f }));

const subFacesZoom = (campos: Campos): SubSlotDef[] =>
  faces(campos).flatMap((f) =>
    (['BASE', 'MEIO', 'TOPO'] as const).map((p) => ({
      id: `${f}-${p}`,
      label: `Face ${f} — ${p.toLowerCase()}`,
      apelido: `${f}-${p}`,
    })),
  );

const subVisadas = (): SubSlotDef[] =>
  Array.from({ length: 12 }, (_, i) => {
    const g = String(i * 30).padStart(3, '0');
    return { id: g, label: `${i * 30}°`, apelido: g };
  });

const LEMBRETE_NUMERAR = 'Numerar as emendas/antenas antes de fotografar.';

const checklist: ItemDef[] = [
  { num: 1, titulo: 'Entrada/frente do site', apelido: 'ENTRADA' },
  { num: 2, titulo: 'GPS', apelido: 'GPS' },
  { num: 3, titulo: 'Faces da EV (todas, sem zoom)', apelido: 'FACES', subslots: subFaces },
  { num: 4, titulo: 'Faces com zoom (base, meio, topo)', apelido: 'FACES-ZOOM', subslots: subFacesZoom },
  { num: 5, titulo: 'Calçada externa (esq. e dir.)', apelido: 'CALCADA' },
  { num: 6, titulo: 'Estrada de acesso (esq. e dir.)', apelido: 'ESTRADA-ACESSO' },
  { num: 7, titulo: 'Padrão, poste e quadro de energia', apelido: 'PADRAO-ENERGIA' },
  { num: 8, titulo: 'Portão/cadeado', apelido: 'PORTAO-CADEADO' },
  { num: 9, titulo: 'Medidores (cada operadora, nº legível)', apelido: 'MEDIDORES' },
  { num: 10, titulo: 'Placa de identificação do site e da EV', apelido: 'PLACA-IDENT' },
  { num: 11, titulo: 'Fechamento do site (4 lados)', apelido: 'FECHAMENTO' },
  { num: 12, titulo: 'Interior do site (4 lados)', apelido: 'INTERIOR' },
  { num: 13, titulo: 'Iluminação do site', apelido: 'ILUMINACAO' },
  { num: 14, titulo: 'Caixas de passagem', apelido: 'CAIXAS-PASSAGEM' },
  { num: 15, titulo: 'Aterramento da EV, portão e esteira horizontal', apelido: 'ATERRAMENTO' },
  { num: 16, titulo: 'Poço de inspeção do aterramento', apelido: 'POCO-INSPECAO' },
  { num: 17, titulo: 'Equipamentos das operadoras (todos)', apelido: 'EQUIP-OPERADORAS' },
  { num: 18, titulo: 'Etiqueta das operadoras nos equipamentos', apelido: 'ETIQUETA-OPERADORAS' },
  { num: 19, titulo: 'Escada de acesso da EV', apelido: 'ESCADA' },
  { num: 20, titulo: 'QCAB na estrutura e eletrodutos', apelido: 'QCAB-ELETRODUTOS' },
  { num: 21, titulo: 'Esteiramento horizontal', apelido: 'ESTEIRA-HORIZ' },
  { num: 22, titulo: 'Esteiramento vertical (base, meio e topo)', apelido: 'ESTEIRA-VERT' },
  { num: 23, titulo: 'Base da EV (todos os montantes)', apelido: 'BASE' },
  { num: 24, titulo: 'Ancoragem da EV (todos os montantes)', apelido: 'ANCORAGEM' },
  { num: 25, titulo: 'Detalhe placa de base/ancoragem (com medidas)', apelido: 'PLACA-BASE' },
  { num: 26, titulo: 'Pitoco e enrijecedores (com medidas)', apelido: 'PITOCO-ENRIJ' },
  { num: 27, titulo: 'Alinhamento da estrutura (todos os montantes)', apelido: 'ALINHAMENTO' },
  { num: 28, titulo: 'Trava-quedas (fixação inferior, superior e cabo)', apelido: 'TRAVA-QUEDAS' },
  { num: 29, titulo: 'Plataformas (identificar a altura no mapeamento)', apelido: 'PLATAFORMAS' },
  { num: 30, titulo: 'Balizamento (intermediário, topo e eletrodutos)', apelido: 'BALIZAMENTO' },
  { num: 31, titulo: 'Fotocélula', apelido: 'FOTOCELULA' },
  { num: 32, titulo: 'Para-raios (mastro, cabos, base e fixação)', apelido: 'PARA-RAIOS' },
  { num: 33, titulo: 'Visadas (0° a 330°, 12 fotos)', apelido: 'VISADA', subslots: subVisadas },
  { num: 34, titulo: 'Trena medindo a altura da EV', apelido: 'TRENA-ALTURA' },
  { num: 35, titulo: 'Detalhe transição trecho piramidal/reto', apelido: 'TRANSICAO' },
  { num: 36, titulo: 'Vista superior do site (4 lados)', apelido: 'VISTA-SUPERIOR' },
  { num: 37, titulo: 'Medidas dos perfis montantes (largura x espessura)', apelido: 'PERFIS-MONTANTES' },
  { num: 38, titulo: 'Emendas, qtd de parafusos e tipo de cisalhamento', apelido: 'EMENDAS', lembrete: LEMBRETE_NUMERAR },
  { num: 39, titulo: 'Parafusos mostrando a identificação (A394, A325...)', apelido: 'PARAFUSOS-IDENT' },
  { num: 40, titulo: 'Travamentos horizontais', apelido: 'TRAV-HORIZ' },
  { num: 41, titulo: 'Travamentos diagonais', apelido: 'TRAV-DIAG' },
  { num: 42, titulo: 'Reforço de montantes (com emendas e clips)', apelido: 'REFORCO-MONTANTES' },
  { num: 43, titulo: 'Antenas (usar tabela de antenas)', apelido: 'ANTENAS', lembrete: LEMBRETE_NUMERAR, vinculaAntena: true },
];

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const evConfig: TipoConfig = {
  tipo: 'EV',
  nome: 'Estrutura vertical (EV)',
  campoObra: 'obra',
  campoIdSite: 'idSite',
  bloquearExportComPendentes: false,
  pastaPadrao: 'OUTROS',

  registro: [
    {
      titulo: 'Identificação',
      campos: [
        { key: 'obra', label: 'Obra KK', tipo: 'texto', obrigatorio: true, placeholder: 'ex.: 126/843' },
        { key: 'idSite', label: 'ID do site', tipo: 'texto', obrigatorio: true },
        { key: 'data', label: 'Data', tipo: 'data', obrigatorio: true, padrao: 'hoje' },
        { key: 'vistoriador', label: 'Vistoriador', tipo: 'texto' },
      ],
    },
    {
      titulo: 'Endereço',
      campos: [
        { key: 'endereco', label: 'Endereço', tipo: 'texto', obrigatorio: true },
        { key: 'bairro', label: 'Bairro', tipo: 'texto' },
        { key: 'cep', label: 'CEP', tipo: 'texto', placeholder: '00000-000' },
        { key: 'cidadeUf', label: 'Cidade/UF', tipo: 'texto' },
        { key: 'latLong', label: 'Latitude, longitude', tipo: 'geo' },
      ],
    },
    {
      titulo: 'Alturas',
      campos: [
        { key: 'alturaEv', label: 'Altura da EV (m)', tipo: 'numero' },
        { key: 'alturaEdificacao', label: 'Altura da edificação (m)', tipo: 'numero' },
      ],
    },
    {
      titulo: 'Placa da EV',
      campos: [
        { key: 'placaVO', label: 'VO', tipo: 'texto' },
        { key: 'placaS1', label: 'S1', tipo: 'texto' },
        { key: 'placaS2', label: 'S2', tipo: 'texto' },
        { key: 'placaS3', label: 'S3', tipo: 'texto' },
        { key: 'placaAEV', label: 'AEV', tipo: 'texto' },
        { key: 'placaFabricante', label: 'Fabricante', tipo: 'texto' },
        { key: 'placaModelo', label: 'Modelo', tipo: 'texto' },
      ],
    },
    {
      titulo: 'Estrutura',
      campos: [
        { key: 'tipoSite', label: 'Tipo de site', tipo: 'opcoes', opcoes: ['Greenfield', 'Rooftop'] },
        {
          key: 'estrutura',
          label: 'Estrutura',
          tipo: 'opcoes',
          opcoes: ['Torre autoportante', 'Torre estaiada', 'Poste', 'Mastro'],
        },
        { key: 'secaoTipica', label: 'Seção típica', tipo: 'opcoes', opcoes: ['Quadrada', 'Triangular', 'Circular'] },
        { key: 'largBase', label: 'Largura base da EV (mm)', tipo: 'numero' },
        { key: 'largTopo', label: 'Largura topo da EV (mm)', tipo: 'numero' },
        { key: 'largEsteira', label: 'Largura da esteira (mm)', tipo: 'texto', placeholder: 'ex.: 470+560' },
      ],
    },
    {
      titulo: 'Acesso',
      campos: [
        { key: 'viaTipo', label: 'Tipo de via', tipo: 'opcoes', opcoes: ['Pavimentada', 'Terra', 'Pluvial', 'Outros'] },
        { key: 'viaCondicao', label: 'Condição', tipo: 'opcoes', opcoes: ['Boa', 'Ruim'] },
        {
          key: 'acessoTipo',
          label: 'Tipo de acesso',
          tipo: 'opcoes',
          opcoes: ['Cadeado segredo', 'Cadeado chave padrão', 'Chave especial'],
        },
        { key: 'acessoSegredo', label: 'Segredo', tipo: 'texto' },
        { key: 'acessoObs', label: 'Observação do acesso', tipo: 'texto' },
      ],
    },
    {
      titulo: 'Energia',
      campos: [
        {
          key: 'energiaRede',
          label: 'Tipo de rede',
          tipo: 'opcoes',
          opcoes: ['Monofásica', 'Bifásica', 'Trifásica', 'Outros'],
        },
        { key: 'medClaro', label: 'Medidor Claro (nº)', tipo: 'texto' },
        { key: 'medOi', label: 'Medidor Oi (nº)', tipo: 'texto' },
        { key: 'medTim', label: 'Medidor TIM (nº)', tipo: 'texto' },
        { key: 'medVivo', label: 'Medidor Vivo (nº)', tipo: 'texto' },
        { key: 'medNextel', label: 'Medidor Nextel (nº)', tipo: 'texto' },
        { key: 'medSky', label: 'Medidor Sky (nº)', tipo: 'texto' },
        { key: 'medOutro', label: 'Medidor outro (operadora e nº)', tipo: 'texto' },
      ],
    },
    {
      titulo: 'Observações',
      campos: [{ key: 'observacoes', label: 'Observações gerais', tipo: 'textoLongo' }],
    },
  ],

  checklist,

  patologias: [
    { num: 1, titulo: 'Portão de acesso/cercas danificadas', apelido: 'PORTAO-CERCA' },
    { num: 2, titulo: 'Placa de identificação ilegível', apelido: 'PLACA-ILEGIVEL' },
    { num: 3, titulo: 'Estrutura com pintura sem aderência/sem pintura', apelido: 'PINTURA' },
    { num: 4, titulo: 'Oxidação/corrosão de peças', apelido: 'OXIDACAO' },
    { num: 5, titulo: 'Chumbadores curtos na ancoragem', apelido: 'CHUMBADORES-CURTOS' },
    { num: 6, titulo: 'Falta de peças na estrutura (indicar no mapeamento)', apelido: 'FALTA-PECAS' },
    { num: 7, titulo: 'Peças sem parafusos (indicar no mapeamento)', apelido: 'PECAS-SEM-PARAFUSO' },
    { num: 8, titulo: 'Parafusos sem pallnuts/porcas ou sem aperto', apelido: 'PARAFUSOS-SEM-PORCA' },
    { num: 9, titulo: 'Antena MW maior que ϕ1,20m fixada em suporte de canto', apelido: 'MW-SUPORTE-CANTO' },
    { num: 10, titulo: 'Montantes desalinhados', apelido: 'MONTANTES-DESALINH' },
    { num: 11, titulo: 'Montantes tubulares sem fechamento de topo', apelido: 'TUBULAR-SEM-TAMPA' },
    { num: 12, titulo: 'Suportes de antenas oxidados/corroídos', apelido: 'SUPORTE-OXIDADO' },
    { num: 13, titulo: 'Balizamento danificado', apelido: 'BALIZAMENTO-DANIF' },
    { num: 14, titulo: 'Vegetação alta no site', apelido: 'VEGETACAO' },
    { num: 15, titulo: 'Lixo/resto de materiais no site', apelido: 'LIXO' },
    { num: 16, titulo: 'Vandalismo no site', apelido: 'VANDALISMO' },
    { num: 17, titulo: 'Outros', apelido: 'OUTROS-1', textoLivre: true },
    { num: 18, titulo: 'Outros', apelido: 'OUTROS-2', textoLivre: true },
  ],

  pranchas: [
    { num: 1, titulo: 'Croqui do site', apelido: 'CROQUI' },
    {
      num: 2,
      titulo: 'Silhueta',
      apelido: 'SILHUETA',
      subslots: () => [
        { id: 'FRENTE', label: 'Frente', apelido: 'FRENTE' },
        { id: 'VERSO', label: 'Verso', apelido: 'VERSO' },
      ],
    },
    { num: 3, titulo: 'Tabela de emendas dos montantes', apelido: 'TABELA-EMENDAS' },
  ],

  // Mapeamento item → pasta (hipótese; ajuste à vontade).
  pastas: [
    { nome: 'GERAIS', itens: [1, 2, ...range(5, 16), ...range(19, 22)] },
    { nome: 'FACES', itens: [3, 4] },
    { nome: 'VISADAS', itens: [33] },
    { nome: 'ANTENAS', itens: [17, 18, 43] },
    { nome: 'TORRE', itens: [...range(23, 32), ...range(34, 42)] },
    { nome: 'PATOLOGIAS', patologias: true },
    { nome: 'PRANCHAS', pranchas: true },
  ],

  antena: [
    { key: 'numero', label: 'Nº da antena', tipo: 'texto' },
    { key: 'status', label: 'Status', tipo: 'opcoes', opcoes: ['Ativa', 'Inativa'] },
    { key: 'operadora', label: 'Operadora', tipo: 'texto', obrigatorio: true, sugestoes: OPERADORAS },
    { key: 'tipo', label: 'Tipo de antena', tipo: 'texto', sugestoes: ['RF', 'MW', 'RRU', 'AAU', 'AIR', 'GPS'] },
    { key: 'fabricante', label: 'Fabricante', tipo: 'texto' },
    { key: 'modelo', label: 'Modelo', tipo: 'texto' },
    { key: 'alturaCentro', label: 'Altura do centro (m)', tipo: 'numero' },
    { key: 'montante', label: 'Montante', tipo: 'texto' },
    { key: 'face', label: 'Face', tipo: 'texto' },
    { key: 'azimute', label: 'Azimute (°)', tipo: 'numero' },
    { key: 'diametro', label: 'Diâmetro (m)', tipo: 'numero' },
    { key: 'comprimento', label: 'Comprimento (m)', tipo: 'numero' },
    { key: 'largura', label: 'Largura (m)', tipo: 'numero' },
    { key: 'caboDiametro', label: 'Cabos ϕ (pol)', tipo: 'texto', sugestoes: ['1/2', '7/8', '1 1/4', '1 5/8'] },
    { key: 'caboQtd', label: 'Cabos (qtde)', tipo: 'numero' },
  ],

  antenaExtras: [
    { key: 'antLargEsteiraVert', label: 'Largura da esteira vertical', tipo: 'texto' },
    { key: 'antOcupBase', label: 'Ocupação de cabos — base', tipo: 'texto' },
    { key: 'antOcupMeio', label: 'Ocupação de cabos — meio', tipo: 'texto' },
    { key: 'antOcupTopo', label: 'Ocupação de cabos — topo', tipo: 'texto' },
  ],
};

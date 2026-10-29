/** Tipos da configuração. Um tipo de vistoria (EV, FD, rooftop...) = um TipoConfig. */

export type Campos = Record<string, string>;

export type TipoCampo = 'texto' | 'numero' | 'data' | 'opcoes' | 'textoLongo' | 'geo';

export interface CampoDef {
  key: string;
  label: string;
  tipo: TipoCampo;
  obrigatorio?: boolean;
  /** Para tipo 'opcoes': botões de escolha única. */
  opcoes?: string[];
  /** Sugestões de preenchimento (datalist), o valor continua livre. */
  sugestoes?: string[];
  placeholder?: string;
  /** Valor inicial ao criar a vistoria. 'hoje' = data atual. */
  padrao?: string;
  /** Para tipo 'numero': faixa aceita (fora dela mostra aviso). */
  min?: number;
  max?: number;
  formato?: 'cep';
}

export interface GrupoCampos {
  titulo: string;
  campos: CampoDef[];
}

export interface SubSlotDef {
  id: string;
  label: string;
  /** Vai no nome do arquivo: {ITEM.apelido}-{apelido}. */
  apelido: string;
}

export interface ItemDef {
  num: number;
  titulo: string;
  /** Descrição curta usada no nome do arquivo (sem acento/espaço). */
  apelido: string;
  /** Aviso mostrado antes de fotografar. */
  lembrete?: string;
  /** Divide o item em várias fotos fixas (faces, visadas...). Pode depender do registro. */
  subslots?: (campos: Campos) => SubSlotDef[];
  /** Fotos podem ser vinculadas ao nº de uma antena da tabela. */
  vinculaAntena?: boolean;
}

export interface PatologiaDef {
  num: number;
  titulo: string;
  apelido: string;
  /** "Outros": exige descrição em texto quando encontrada. */
  textoLivre?: boolean;
}

export interface PastaDef {
  nome: string;
  /** Números dos itens do checklist de fotos que vão nesta pasta. */
  itens?: number[];
  patologias?: boolean;
  pranchas?: boolean;
}

export interface TipoConfig {
  tipo: string;
  nome: string;
  registro: GrupoCampos[];
  /** Campos usados no título/nomes: obra e ID do site. */
  campoObra: string;
  campoIdSite: string;
  checklist: ItemDef[];
  patologias: PatologiaDef[];
  pranchas: ItemDef[];
  pastas: PastaDef[];
  /** Pasta para itens sem mapeamento. */
  pastaPadrao: string;
  antena: CampoDef[];
  /** Campos extras da tabela de antenas (salvos junto do registro). */
  antenaExtras: CampoDef[];
  /** Campo do registro (Sim/Não) que liga o carimbo nas fotos. Vazio = Sim. */
  campoCarimbo?: string;
  /** A altura da antena não pode passar a altura da EV. */
  limiteAlturaAntena?: { campoAntena: string; campoRegistro: string };
  /** Limites da checagem automática de foto (hipótese inicial; ajuste com fotos reais). */
  qualidadeFoto: { brilhoMinimo: number; nitidezMinima: number };
  /** true = não deixa exportar com pendências; false = só avisa. */
  bloquearExportComPendentes: boolean;
}

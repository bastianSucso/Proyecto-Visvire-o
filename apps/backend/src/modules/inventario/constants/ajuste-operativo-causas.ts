export const AJUSTE_OPERATIVO_CAUSAS = [
  'USO_NEGOCIO',
] as const;

export type AjusteOperativoCausa = (typeof AJUSTE_OPERATIVO_CAUSAS)[number];

export const AJUSTE_OPERATIVO_CAUSAS_LABEL: Record<AjusteOperativoCausa, string> = {
  USO_NEGOCIO: 'Uso del negocio',
};

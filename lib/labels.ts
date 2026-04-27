const TYPE_LABELS: Record<string, string> = {
  analysis: "Análisis",
  concept: "Conceptos",
  entity: "Entidades",
  overview: "Panorama general",
  source: "Fuentes",
  system: "Sistema",
  topic: "Temas",
};

const TYPE_SINGULAR_LABELS: Record<string, string> = {
  analysis: "Análisis",
  concept: "Concepto",
  entity: "Entidad",
  overview: "Panorama general",
  source: "Fuente",
  system: "Sistema",
  topic: "Tema",
};

export function getTypeLabel(type: string, plural = false): string {
  return (plural ? TYPE_LABELS[type] : TYPE_SINGULAR_LABELS[type]) ?? type;
}

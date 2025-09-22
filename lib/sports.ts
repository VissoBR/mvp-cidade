// lib/sports.ts
export type Sport = {
  id: string;
  name: string;
  category: "praia" | "clube" | "bem-estar" | "cultura";
};

export const SPORTS: Sport[] = [
  { id: "corrida", name: "Corrida/Caminhada", category: "praia" },
  { id: "futevolei", name: "Futevôlei", category: "praia" },
  { id: "volei_praia", name: "Vôlei de Praia", category: "praia" },
  { id: "beach_tennis", name: "Beach Tennis", category: "praia" },
  { id: "frescobol", name: "Frescobol", category: "praia" },
  { id: "surf", name: "Surf/Bodyboard", category: "praia" },
  { id: "natacao", name: "Natação", category: "clube" },
  { id: "sup", name: "Stand Up Paddle (SUP)", category: "praia" },
  { id: "canoagem", name: "Canoagem/Caiaque", category: "praia" },
  { id: "futebol", name: "Futebol", category: "clube" },
  { id: "tenis", name: "Tênis", category: "clube" },
  { id: "bike", name: "Bicicleta", category: "clube" },
  { id: "slackline", name: "Slackline", category: "clube" },
  { id: "skate", name: "Skate/Patins/Roller", category: "clube" },
  { id: "funcional", name: "Treino Funcional", category: "clube" },
  { id: "yoga", name: "Yoga", category: "bem-estar" },
  { id: "pilates", name: "Pilates Solo", category: "bem-estar" },
  { id: "meditacao", name: "Meditação/Mindfulness", category: "bem-estar" },
  { id: "danca", name: "Dança/Zumba", category: "bem-estar" },
  { id: "capoeira", name: "Capoeira", category: "cultura" },
  { id: "tecido", name: "Tecido Acrobático", category: "cultura" },
];

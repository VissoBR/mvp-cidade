// lib/sportIcons.ts
// Mapeia id do esporte -> asset local (require estático)
export const SPORT_ICONS: Record<string, any> = {
  corrida:       require("../assets/icons/corrida.png"),
  futevolei:     require("../assets/icons/futevolei.png"),
  volei_praia:   require("../assets/icons/volei_praia.png"),
  beach_tennis:  require("../assets/icons/beach_tennis.png"),
  frescobol:     require("../assets/icons/frescobol.png"),
  surf:          require("../assets/icons/surf.png"),
  sup:           require("../assets/icons/sup.png"),
  canoagem:      require("../assets/icons/canoagem.png"),
  futebol:       require("../assets/icons/futebol.png"),
  tenis:         require("../assets/icons/tenis.png"),
  natacao:       require("../assets/icons/natacao.png"),
  bike:          require("../assets/icons/bike.png"),
  slackline:     require("../assets/icons/slackline.png"),
  skate:         require("../assets/icons/skate.png"),
  funcional:     require("../assets/icons/funcional.png"),
  yoga:          require("../assets/icons/yoga.png"),
  pilates:       require("../assets/icons/pilates.png"),
  meditacao:     require("../assets/icons/meditacao.png"),
  danca:         require("../assets/icons/danca.png"),
  capoeira:      require("../assets/icons/capoeira.png"),
  tecido:        require("../assets/icons/tecido.png"),
};

// Ícone padrão se faltar algum específico
export const DEFAULT_ICON = require("../assets/icons/corrida.png");

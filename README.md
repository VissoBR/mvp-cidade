# MVP Cidade (Expo + Supabase)

## Requisitos
- Node 18+
- Expo Go no celular
- Conta Supabase

## Setup
1. Crie `.env` na raiz:
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

2. Instale deps:
npm i
npx expo install expo-location react-native-maps @react-native-picker/picker @react-native-community/datetimepicker

3. Rode:
npx expo start


## Scripts úteis
- `npx expo start -c` — iniciar limpando cache
- `npm run lint` — (se configurado)

## Estrutura
- `app/` — telas (Expo Router)
- `store/` — Zustand stores
- `lib/` — supabase client, catálogo, cores
- `components/` — UI compartilhada

// app/create.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Button, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import MapPicker from "../components/MapPicker";
import { SPORTS } from "../lib/sports";
import { useActivities } from "../store/useActivities";

export default function Create() {
  const { createActivity } = useActivities();

  // Form
  const [title, setTitle] = useState("Treino de corrida 5k");
  const [sport, setSport] = useState("corrida");
  const [description, setDescription] = useState("Ritmo leve, ponto de encontro no quiosque X");
  const router = useRouter();


  // Data/hora em um único Date (mais simples de manter)
  const [startsAtDate, setStartsAtDate] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Local: começa (fallback) num ponto padrão; depois centra no GPS
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: -22.9, lng: -43.2 });
  const [saving, setSaving] = useState(false);

  // Pegar GPS para posicionar o MapPicker inicialmente
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords((prev) => ({
          ...prev,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        }));
      }
    })();
  }, []);

  // Helpers de data/hora
  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  function onChangeDate(e: any, selected?: Date) {
    setShowDatePicker(false);
    if (selected) {
      const next = new Date(startsAtDate);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setStartsAtDate(next);
    }
  }

  function onChangeTime(e: any, selected?: Date) {
    setShowTimePicker(false);
    if (selected) {
      const next = new Date(startsAtDate);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setStartsAtDate(next);
    }
  }

  async function onSubmit() {
    if (!title.trim()) return Alert.alert("Atenção", "Digite um título.");
    if (!sport) return Alert.alert("Atenção", "Selecione um esporte.");
    if (Number.isNaN(coords.lat) || Number.isNaN(coords.lng)) {
      return Alert.alert("Atenção", "Escolha um local no mapa (arraste o pin ou toque e segure).");
    }

    // Monta ISO em UTC a partir do Date local
    const startsISO = new Date(startsAtDate).toISOString();

    setSaving(true);
    const id = await createActivity({
      title,
      sport,                // id do catálogo (ex.: "corrida")
      starts_at: startsISO, // ISO válido
      lat: coords.lat,
      lng: coords.lng,
      description,
    } as any);
    setSaving(false);

    if (id) {
      Alert.alert("Sucesso", "Atividade criada!");
      setTimeout(() => router.replace("/"), 0);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>Criar Atividade</Text>

        <Text>Título</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: Treino de corrida 5k"
          style={{ borderWidth: 1, padding: 8, borderRadius: 6 }}
        />

        <Text>Esporte</Text>
        <View style={{ borderWidth: 1, borderRadius: 6, overflow: "hidden" }}>
          <Picker selectedValue={sport} onValueChange={setSport}>
            {SPORTS.map((s) => (
              <Picker.Item key={s.id} label={`${s.name} (${s.category})`} value={s.id} />
            ))}
          </Picker>
        </View>

        <Text>Data e hora</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title={`Data: ${formatDate(startsAtDate)}`} onPress={() => setShowDatePicker(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title={`Hora: ${formatTime(startsAtDate)}`} onPress={() => setShowTimePicker(true)} />
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={startsAtDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={onChangeDate}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={startsAtDate}
            mode="time"
            is24Hour
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onChangeTime}
          />
        )}

        <Text>Local da atividade</Text>
        <MapPicker
          value={coords}
          onChange={setCoords}
          initialRegion={{
            latitude: coords.lat,
            longitude: coords.lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        />
        <Text style={{ color: "#555" }}>
          Dica: arraste o pin ou toque e segure no mapa para marcar o ponto exato.
        </Text>

        <Text>Descrição</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Informações rápidas do encontro"
          style={{ borderWidth: 1, padding: 8, borderRadius: 6 }}
          multiline
        />

        <Button title={saving ? "Salvando..." : "Salvar"} onPress={onSubmit} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chi tiết sự kiện</Text>
      <Text>Mã sự kiện: {eventId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
});

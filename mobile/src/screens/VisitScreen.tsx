import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Signature from "react-native-signature-canvas";
import { clockIn, clockOut, uploadVisitMedia } from "../api/client";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import type { Lead, SalesVisit } from "../types/lead";

type Props = {
  lead: Lead;
  onBack: () => void;
  onCompleted: () => void;
};

export function VisitScreen({ lead, onBack, onCompleted }: Props) {
  const [visit, setVisit] = useState<SalesVisit | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientTitle, setClientTitle] = useState("");
  const [visitResult, setVisitResult] = useState("interested");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      throw new Error("Location permission is required for sales visit verification.");
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    const mocked = (position as unknown as { mocked?: boolean }).mocked;

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy_m: Math.round(position.coords.accuracy ?? 0),
      risk_signals: mocked ? [{ type: "mock_location", value: true }] : [],
      device_metadata: {
        platform: "expo",
        location_timestamp: position.timestamp,
      },
    };
  }

  async function startVisit() {
    setLoading(true);
    setError(null);
    try {
      const location = await getLocation();
      const payload = await clockIn(lead.id, {
        ...location,
        notes,
      });
      setVisit(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clock in");
    } finally {
      setLoading(false);
    }
  }

  async function capturePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required to capture visit evidence.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      setPhotoUri(uri ?? null);
      if (visit && uri) {
        await uploadVisitMedia(visit.id, "photo", uri, { source: "camera" });
      }
    }
  }

  async function saveSignature(signature: string) {
    if (!visit) {
      setError("Clock in before capturing signature.");
      return;
    }

    const base64 = signature.replace(/^data:image\/png;base64,/, "");
    const uri = `${FileSystem.cacheDirectory}leadsy-signature-${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    setSignatureUri(uri);
    await uploadVisitMedia(visit.id, "signature", uri, { client_name: clientName });
  }

  async function finishVisit() {
    if (!visit) return;

    setLoading(true);
    setError(null);
    try {
      const location = await getLocation();
      await clockOut(visit.id, {
        ...location,
        visit_result: visitResult,
        notes,
        client_name: clientName || undefined,
        client_title: clientTitle || undefined,
      });
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clock out");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PrimaryButton tone="secondary" onPress={onBack}>
        Back
      </PrimaryButton>

      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Sales Visit</Text>
        <Text style={styles.title}>{lead.company_name}</Text>
        <Text style={styles.meta}>{visit ? `Clocked in • ${visit.risk_status}` : "Ready for GPS clock-in"}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!visit ? (
        <PrimaryButton loading={loading} onPress={startVisit}>
          Clock In
        </PrimaryButton>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Visit Evidence</Text>
        <PrimaryButton disabled={!visit} tone="secondary" onPress={capturePhoto}>
          Take Photo
        </PrimaryButton>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.image} /> : null}

        <TextInput
          onChangeText={setClientName}
          placeholder="Client name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={clientName}
        />
        <TextInput
          onChangeText={setClientTitle}
          placeholder="Client title"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={clientTitle}
        />

        <View style={styles.signatureBox}>
          <Signature
            autoClear
            descriptionText=""
            onOK={saveSignature}
            webStyle=".m-signature-pad { box-shadow: none; border: 0; } .m-signature-pad--footer { display: none; }"
          />
        </View>
        {signatureUri ? <Text style={styles.success}>Signature saved.</Text> : null}
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Visit Result</Text>
        <TextInput
          onChangeText={setVisitResult}
          placeholder="Result, e.g. interested, proposal_requested"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={visitResult}
        />
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder="Visit notes"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.textArea]}
          value={notes}
        />
      </View>

      <PrimaryButton disabled={!visit} loading={loading} onPress={finishVisit}>
        Clock Out
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 56,
    gap: 14,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  meta: {
    color: colors.textMuted,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  error: {
    color: colors.danger,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  success: {
    color: colors.success,
    fontWeight: "700",
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  signatureBox: {
    height: 220,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
});

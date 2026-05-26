import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { getLead } from "../api/client";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import type { Lead } from "../types/lead";

type Props = {
  initialLead: Lead;
  onBack: () => void;
  onStartVisit: (lead: Lead) => void;
};

export function LeadDetailScreen({ initialLead, onBack, onStartVisit }: Props) {
  const [lead, setLead] = useState(initialLead);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLead(initialLead.id)
      .then((payload) => setLead(payload.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to refresh lead"));
  }, [initialLead.id]);

  const stage = lead.funnel_stage ?? lead.funnelStage;

  function openMaps() {
    const query = lead.lat && lead.lng ? `${lead.lat},${lead.lng}` : encodeURIComponent(lead.address ?? lead.company_name);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  }

  function openWhatsApp() {
    if (!lead.phone) return;
    const phone = lead.phone.replace(/[^\d]/g, "");
    void Linking.openURL(`https://wa.me/${phone}`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PrimaryButton tone="secondary" onPress={onBack}>
        Back
      </PrimaryButton>

      <View style={styles.panel}>
        <Text style={styles.title}>{lead.company_name}</Text>
        <Text style={styles.meta}>{lead.business_category ?? stage?.name ?? "Lead"}</Text>
        <Text style={styles.address}>{lead.address ?? "No address"}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.grid}>
        <PrimaryButton disabled={!lead.phone} onPress={() => lead.phone && Linking.openURL(`tel:${lead.phone}`)}>
          Call
        </PrimaryButton>
        <PrimaryButton disabled={!lead.phone} tone="secondary" onPress={openWhatsApp}>
          WhatsApp
        </PrimaryButton>
        <PrimaryButton disabled={!lead.email} tone="secondary" onPress={() => lead.email && Linking.openURL(`mailto:${lead.email}`)}>
          Email
        </PrimaryButton>
        <PrimaryButton tone="secondary" onPress={openMaps}>
          Maps
        </PrimaryButton>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Sales Context</Text>
        <Info label="Score" value={lead.lead_score?.toString() ?? "-"} />
        <Info label="Qualification" value={lead.qualification_status ?? "-"} />
        <Info label="Stage" value={stage?.name ?? "-"} />
        <Info label="Owner" value={lead.owner?.name ?? "-"} />
      </View>

      <PrimaryButton onPress={() => onStartVisit(lead)}>Start Visit</PrimaryButton>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "800",
  },
  meta: {
    color: colors.textMuted,
    fontWeight: "700",
  },
  address: {
    color: colors.text,
    lineHeight: 20,
  },
  error: {
    color: colors.danger,
  },
  grid: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  infoLabel: {
    color: colors.textMuted,
  },
  infoValue: {
    color: colors.text,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
});

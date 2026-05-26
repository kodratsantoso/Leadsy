import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import type { Lead } from "../types/lead";

type Props = {
  lead: Lead;
  onPress: () => void;
};

export function LeadCard({ lead, onPress }: Props) {
  const stage = lead.funnel_stage ?? lead.funnelStage;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {lead.company_name}
        </Text>
        <Text style={styles.score}>{lead.lead_score ?? "-"}</Text>
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {lead.business_category ?? stage?.name ?? lead.qualification_status ?? "Uncategorized"}
      </Text>
      <Text style={styles.address} numberOfLines={2}>
        {lead.address ?? "No address"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  score: {
    minWidth: 36,
    textAlign: "center",
    borderRadius: 18,
    overflow: "hidden",
    paddingVertical: 4,
    color: colors.success,
    backgroundColor: "#ECFDF3",
    fontWeight: "700",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  address: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
  },
});

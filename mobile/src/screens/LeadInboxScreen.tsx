import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { listLeads } from "../api/client";
import { LeadCard } from "../components/LeadCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { clearToken } from "../storage/session";
import { colors } from "../theme/colors";
import type { Lead, User } from "../types/lead";

type Props = {
  user: User | null;
  onOpenLead: (lead: Lead) => void;
  onLogout: () => void;
};

export function LeadInboxScreen({ user, onOpenLead, onLogout }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await listLeads(search);
      setLeads(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load leads");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    await clearToken();
    onLogout();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Lead Inbox</Text>
          <Text style={styles.title}>{user?.name ?? "Sales"}</Text>
        </View>
        <PrimaryButton tone="secondary" onPress={logout}>
          Logout
        </PrimaryButton>
      </View>

      <TextInput
        autoCapitalize="none"
        onSubmitEditing={load}
        onChangeText={setSearch}
        placeholder="Search leads"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        style={styles.search}
        value={search}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={leads}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => <LeadCard lead={item} onPress={() => onOpenLead(item)} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No leads found.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  search: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
  list: {
    gap: 10,
    paddingBottom: 32,
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 40,
  },
});

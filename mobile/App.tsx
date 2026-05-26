import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";
import { me } from "./src/api/client";
import { LeadDetailScreen } from "./src/screens/LeadDetailScreen";
import { LeadInboxScreen } from "./src/screens/LeadInboxScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { VisitScreen } from "./src/screens/VisitScreen";
import { colors } from "./src/theme/colors";
import type { Lead, User } from "./src/types/lead";

type Screen =
  | { name: "login" }
  | { name: "inbox" }
  | { name: "lead"; lead: Lead }
  | { name: "visit"; lead: Lead };

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "login" });

  useEffect(() => {
    me()
      .then((payload) => {
        setUser(payload.data);
        setScreen({ name: "inbox" });
      })
      .catch(() => setScreen({ name: "login" }))
      .finally(() => setBooting(false));
  }, []);

  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {screen.name === "login" ? (
        <LoginScreen
          onAuthenticated={(nextUser) => {
            setUser(nextUser);
            setScreen({ name: "inbox" });
          }}
        />
      ) : null}

      {screen.name === "inbox" ? (
        <LeadInboxScreen user={user} onOpenLead={(lead) => setScreen({ name: "lead", lead })} onLogout={() => setScreen({ name: "login" })} />
      ) : null}

      {screen.name === "lead" ? (
        <LeadDetailScreen
          initialLead={screen.lead}
          onBack={() => setScreen({ name: "inbox" })}
          onStartVisit={(lead) => setScreen({ name: "visit", lead })}
        />
      ) : null}

      {screen.name === "visit" ? (
        <VisitScreen
          lead={screen.lead}
          onBack={() => setScreen({ name: "lead", lead: screen.lead })}
          onCompleted={() => setScreen({ name: "lead", lead: screen.lead })}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});

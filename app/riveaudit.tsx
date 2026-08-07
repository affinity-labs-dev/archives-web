import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Rive, { Alignment, Fit } from "rive-react-native";

// Development-only audit of every Rive animation the app ships.
//
// The web renderer is a shim over @rive-app/react-canvas
// (web-stubs/rive-react-native.js), and its failure mode is silent: if the
// source does not resolve to a URL the component renders an empty canvas, which
// looks exactly like the placeholder it replaced. Nothing throws, nothing logs.
//
// So this renders each one and a browser test samples the canvas pixels. A
// canvas that drew nothing is the bug; a canvas with content is proof.
//
// Delete once the celebration and onboarding screens are all reachable through
// the real route tree and can be checked in situ.

const ANIMATIONS: { name: string; source: any; stateMachine?: string }[] = [
  // Quiz results mascot (components/quiz/results/Mascot.tsx) - no state
  // machine, relies on the default animation autoplaying.
  { name: "open-mouth", source: require("@/assets/rive/open-mouth.riv") },
  { name: "ibu-skating", source: require("@/assets/rive/ibu-skating.riv") },
  // Celebrations. DailyStoryEndScreen names its state machine explicitly.
  {
    name: "ibu_flying_landing_without_bg",
    source: require("@/assets/rive/ibu_flying_landing_without_bg.riv"),
    stateMachine: "State Machine 1",
  },
  { name: "ibu-celebrating", source: require("@/assets/rive/ibu-celebrating.riv") },
  { name: "ibu-jumping", source: require("@/assets/rive/ibu-jumping.riv") },
  { name: "ibu_teacher", source: require("@/assets/rive/ibu_teacher.riv") },
  { name: "hero_ibu", source: require("@/assets/rive/hero_ibu.riv") },
  { name: "reruled-loading", source: require("@/assets/rive/reruled-loading.riv") },
  { name: "flamefinal", source: require("@/assets/rive/flamefinal.riv") },
];

export default function RiveAudit() {
  // One at a time, selected by ?only=<name>.
  //
  // Rendering all nine at once gave different answers on consecutive runs -
  // ibu-jumping and hero_ibu passed, then failed. Rive draws on WebGL and
  // browsers cap concurrent contexts, so the later canvases lose. That is a
  // property of this audit page, not of the files, and mistaking it for one
  // would have sent someone chasing a broken asset that renders perfectly.
  const only =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("only")
      : null;
  const shown = only ? ANIMATIONS.filter((a) => a.name === only) : ANIMATIONS;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 12 }}>
      <Text style={styles.h}>rive audit</Text>
      {shown.map((a) => (
        <View key={a.name} style={styles.row} testID={`rive-${a.name}`}>
          <Text style={styles.label}>{a.name}</Text>
          <View style={styles.box}>
            <Rive
              source={a.source}
              autoplay
              stateMachineName={a.stateMachine}
              fit={Fit.Contain}
              alignment={Alignment.Center}
              style={{ width: 160, height: 160 }}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAFAFA" },
  h: { fontSize: 18, marginBottom: 12, color: "#1b1b1b" },
  row: { marginBottom: 14 },
  label: { fontSize: 12, color: "#555", marginBottom: 4 },
  box: { width: 160, height: 160, backgroundColor: "#ffffff" },
});

import { useAuth, useSignIn, useSignUp, useUser } from "@clerk/clerk-expo";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { supabase } from "@/hooks/lib/supabase.web";

// Development-only screen that proves the data layer end to end.
//
// It answers the one question unit tests cannot: does a real Clerk session
// token, minted in a real browser, let a real user read their own row through
// /api/db and nobody else's? Everything up to here was verified with mocks or
// with the policy called directly.
//
// It drives Clerk's programmatic sign-up rather than rendering a form because
// the app's real auth screens live in app_full/ and are not wired yet. Clerk
// development instances accept any address containing `+clerk_test` and the
// fixed verification code 424242, so no mailbox is involved.
//
// Delete this once app_full/ is the route tree and sign-in can be driven
// through the real UI.

const TEST_EMAIL = "archives+clerk_test@example.com";
const TEST_PASSWORD = "dev-only-Passw0rd!42";
const TEST_CODE = "424242";

export default function DevAuth() {
  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const say = (line: string) => setLog((l) => [...l, line]);

  // Step 1: get a session, by whichever route works.
  useEffect(() => {
    if (!signInLoaded || !signUpLoaded || isSignedIn) return;
    (async () => {
      try {
        const attempt = await signIn!.create({
          identifier: TEST_EMAIL,
          password: TEST_PASSWORD,
        });
        if (attempt.status === "complete") {
          await setActiveSignIn!({ session: attempt.createdSessionId });
          say("signed in (existing user)");
          return;
        }
        say(`sign-in incomplete: ${attempt.status}`);
      } catch {
        // Expected the first time this runs against a fresh instance.
        try {
          await signUp!.create({ emailAddress: TEST_EMAIL, password: TEST_PASSWORD });
          await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
          const done = await signUp!.attemptEmailAddressVerification({ code: TEST_CODE });
          if (done.status === "complete") {
            await setActiveSignUp!({ session: done.createdSessionId });
            say("signed up and signed in (new user)");
          } else {
            say(`sign-up incomplete: ${done.status}`);
          }
        } catch (e: any) {
          say(`AUTH FAILED: ${e?.errors?.[0]?.message || e?.message || String(e)}`);
        }
      }
    })();
  }, [signInLoaded, signUpLoaded, isSignedIn]);

  // Step 2: with a session, exercise the proxy.
  useEffect(() => {
    if (!isSignedIn || done) return;
    setDone(true);
    (async () => {
      const token = await getToken();
      say(`clerk user: ${user?.id}`);
      say(`token: ${token ? `${token.slice(0, 12)}… (${token.length} chars)` : "NONE"}`);

      // Public content, through the proxy.
      const eras = await supabase.from("eras").select("*").order("order_by", { ascending: true });
      say(`eras: ${eras.error ? `ERROR ${eras.error.message}` : `${eras.data?.length} rows`}`);

      // The caller's own scoped row. PGRST116 (no row yet) is a pass: it proves
      // the request was authenticated and scoped, not that it failed.
      const mine = await supabase
        .from("gamification_data")
        .select("data")
        .eq("user_id", user!.id)
        .single();
      say(
        `own row: ${
          mine.error ? `${mine.error.code} ${mine.error.message}` : "found"
        }`
      );

      // The one that matters: ask for somebody else's row explicitly.
      const theirs = await supabase
        .from("gamification_data")
        .select("user_id")
        .eq("user_id", "user_33FxyRgyjol1YXQctLie3kC3ikn");
      say(
        `forged read returned ${theirs.data?.length ?? "?"} rows ${
          (theirs.data?.length ?? 0) === 0 ? "(SCOPED OK)" : "(LEAK!)"
        }`
      );

      // A write, round-tripped back out.
      const stamp = new Date().toISOString();
      const write = await supabase
        .from("gamification_data")
        .upsert({ user_id: "forged-should-be-overwritten", data: { devauth: stamp } });
      say(`write: ${write.error ? `ERROR ${write.error.message}` : "ok"}`);

      const readback = await supabase
        .from("gamification_data")
        .select("user_id,data")
        .eq("user_id", user!.id)
        .single();
      const stored = (readback.data as any)?.data?.devauth;
      say(
        `readback user_id: ${(readback.data as any)?.user_id ?? "none"} ${
          (readback.data as any)?.user_id === user!.id ? "(FORCED OK)" : "(WRONG)"
        }`
      );
      say(`readback value matches: ${stored === stamp}`);

      say("DEVAUTH_COMPLETE");
    })();
  }, [isSignedIn, done]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.h}>dev auth + proxy check</Text>
      {log.map((l, i) => (
        <Text key={i} style={styles.line} testID={`devauth-line-${i}`}>
          {l}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0C0B09" },
  h: { color: "#D4A04A", fontSize: 18, marginBottom: 16 },
  line: { color: "#F0EAE0", fontSize: 13, marginBottom: 6, fontFamily: "monospace" },
});

import { useEffect, useMemo, useRef } from "react";

import { useAuth } from "./hooks/useAuth";
import { useChats } from "./hooks/useChats";
import { useMessages } from "./hooks/useMessages";
import { useI18n } from "./hooks/useI18n";
import { useUiTranslator } from "./i18n/useUiTranslator";
import { registerPushSubscription } from "./push";
import AuthScreen from "./components/AuthScreen";
import SetupProfile from "./components/SetupProfile";
import MessengerShell from "./screens/MessengerShell";

export default function ChaosMessenger() {
  const auth = useAuth();
  const { lang, t, loadTranslations, switchLang } = useI18n();
  useUiTranslator(lang);
  const l = useMemo(() => {
    const effectiveLang = String(lang || "ru").toLowerCase().startsWith("en") ? "en" : "ru";
    return (ru, en) => (effectiveLang === "ru" ? ru : en);
  }, [lang]);
  const chatStore = useChats(auth.me?.id, lang);
  const msgStore = useMessages(auth.me?.id);

  const loadChatsForI18n = chatStore.loadChats;
  const loadRequestsForI18n = chatStore.loadRequests;
  const langReloadSkipRef = useRef(false);
  useEffect(() => {
    if (!langReloadSkipRef.current) {
      langReloadSkipRef.current = true;
      return;
    }
    if (auth.screen !== "app" || auth.me?.id == null) return;
    void loadChatsForI18n(auth.me.id);
    void loadRequestsForI18n(auth.me.id);
  }, [lang, auth.screen, auth.me?.id, loadChatsForI18n, loadRequestsForI18n]);

  useEffect(() => {
    loadTranslations(lang);
    auth.restoreSession(async (meData) => {
      await chatStore.loadChats(meData.id);
      await chatStore.loadRequests(meData.id);
      auth.setScreen("app");
      registerPushSubscription();
    });
  }, []); // eslint-disable-line

  const onVerifyOtpSuccess = async (meData, isNew) => {
    auth.setMe(meData);
    if (isNew) {
      auth.setScreen("setup");
    } else {
      await chatStore.loadChats(meData.id);
      auth.setScreen("app");
      registerPushSubscription();
    }
  };

  const onSetupDone = async (updatedMe) => {
    auth.setMe(updatedMe);
    await chatStore.loadChats(updatedMe.id);
    auth.setScreen("app");
  };

  if (auth.screen === "loading") {
    return (
      <div className="boot-screen">
        <div className="boot-mark">C</div>
        <div className="spinner" />
      </div>
    );
  }

  if (auth.screen === "auth" || auth.screen === "otp") {
    return (
      <AuthScreen
        screen={auth.screen}
        phone={auth.phone}       setPhone={auth.setPhone}
        dialCode={auth.dialCode} setDialCode={auth.setDialCode}
        otp={auth.otp}           setOtp={auth.setOtp}
        otpRefs={auth.otpRefs}
        email={auth.email}       setEmail={auth.setEmail}
        password={auth.password} setPassword={auth.setPassword}
        onSubmitPhone={() => auth.submitPhone(auth.dialCode, auth.phone)}
        onVerifyOtp={(digits) => auth.verifyOtp(digits, onVerifyOtpSuccess, auth.dialCode, auth.phone)}
        onSubmitEmail={(mode) => auth.submitEmail(mode, onVerifyOtpSuccess, auth.email, auth.password)}
        loading={auth.authLoading}
        error={auth.authError}
        onBack={() => { auth.setScreen("auth"); auth.setOtp(["","","","","",""]); }}
      />
    );
  }

  if (auth.screen === "setup") {
    return (
      <SetupProfile
        me={auth.me}
        setupToken={auth.setupToken}
        onFinishSetup={(data) => auth.finishSetup(data, onVerifyOtpSuccess)}
        onDone={onSetupDone}
      />
    );
  }

  return (
    <MessengerShell
      auth={auth}
      lang={lang}
      t={t}
      l={l}
      switchLang={switchLang}
      chatStore={chatStore}
      msgStore={msgStore}
    />
  );
}

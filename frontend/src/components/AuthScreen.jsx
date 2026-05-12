import { useEffect, useRef, useState } from "react";
import useLocalText from "../i18n/useLocalText";

const COUNTRIES = [
  { code: "+7",   flag: "🇷🇺", name: "Russia",        mask: "999 000 00 00", len: 10 },
  { code: "+375", flag: "🇧🇾", name: "Belarus",       mask: "00 000 00 00",  len: 9  },
  { code: "+380", flag: "🇺🇦", name: "Ukraine",       mask: "00 000 00 00",  len: 9  },
  { code: "+7",   flag: "🇰🇿", name: "Kazakhstan",    mask: "000 000 00 00", len: 10 },
  { code: "+374", flag: "🇦🇲", name: "Armenia",       mask: "00 000 000",    len: 8  },
  { code: "+994", flag: "🇦🇿", name: "Azerbaijan",    mask: "00 000 00 00",  len: 9  },
  { code: "+995", flag: "🇬🇪", name: "Georgia",       mask: "000 000 000",   len: 9  },
  { code: "+992", flag: "🇹🇯", name: "Tajikistan",    mask: "00 000 0000",   len: 9  },
  { code: "+998", flag: "🇺🇿", name: "Uzbekistan",    mask: "00 000 00 00",  len: 9  },
  { code: "+996", flag: "🇰🇬", name: "Kyrgyzstan",    mask: "000 000 000",   len: 9  },
  { code: "+993", flag: "🇹🇲", name: "Turkmenistan",  mask: "0 000 000",     len: 8  },
  { code: "+1",   flag: "🇺🇸", name: "USA / Canada",  mask: "000 000 0000",  len: 10 },
  { code: "+44",  flag: "🇬🇧", name: "United Kingdom", mask: "0000 000000",  len: 10 },
  { code: "+49",  flag: "🇩🇪", name: "Germany",       mask: "000 00000000",  len: 11 },
  { code: "+33",  flag: "🇫🇷", name: "France",        mask: "0 00 00 00 00", len: 9  },
  { code: "+39",  flag: "🇮🇹", name: "Italy",         mask: "000 000 0000",  len: 10 },
  { code: "+34",  flag: "🇪🇸", name: "Spain",         mask: "000 000 000",   len: 9  },
  { code: "+90",  flag: "🇹🇷", name: "Turkey",        mask: "000 000 00 00", len: 10 },
  { code: "+86",  flag: "🇨🇳", name: "China",         mask: "000 0000 0000", len: 11 },
  { code: "+81",  flag: "🇯🇵", name: "Japan",         mask: "00 0000 0000",  len: 10 },
  { code: "+82",  flag: "🇰🇷", name: "Korea",         mask: "00 0000 0000",  len: 10 },
  { code: "+91",  flag: "🇮🇳", name: "India",         mask: "00000 00000",   len: 10 },
  { code: "+55",  flag: "🇧🇷", name: "Brazil",        mask: "00 00000 0000", len: 11 },
  { code: "+971", flag: "🇦🇪", name: "UAE",           mask: "00 000 0000",   len: 9  },
  { code: "+972", flag: "🇮🇱", name: "Israel",        mask: "00 000 0000",   len: 9  },
];

function CountrySelector({ selected, onChange }) {
  const { t } = useLocalText();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  const isDark =
    typeof document !== "undefined" &&
    !!document.querySelector("[data-theme='dark']");

  const menu = isDark
    ? {
        bg: "#181d2c",
        fg: "#ffffff",
        muted: "rgba(255,255,255,.58)",
        border: "rgba(255,255,255,.13)",
        searchBg: "rgba(255,255,255,.07)",
        rowHover: "rgba(255,255,255,.08)",
        shadow: "0 26px 70px rgba(0,0,0,.38)",
      }
    : {
        bg: "#ffffff",
        fg: "var(--t1)",
        muted: "rgba(0,0,0,.48)",
        border: "rgba(0,0,0,.075)",
        searchBg: "rgba(0,0,0,.035)",
        rowHover: "rgba(0,0,0,.055)",
        shadow: "0 26px 70px rgba(0,0,0,.16)",
      };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.includes(search)
  );

  const current =
    COUNTRIES.find(c => c.code === selected && c.name === "Russia") ||
    COUNTRIES.find(c => c.code === selected) ||
    COUNTRIES[0];

  const shortCode = (name) => {
    if (name === "Russia") return "RU";
    if (name === "Belarus") return "BY";
    if (name === "Ukraine") return "UA";
    if (name === "Kazakhstan") return "KZ";
    if (name === "Armenia") return "AM";
    if (name === "Azerbaijan") return "AZ";
    if (name === "Georgia") return "GE";
    if (name === "USA / Canada") return "US";
    if (name === "United Kingdom") return "UK";
    return String(name || "").slice(0, 2).toUpperCase();
  };

  const select = (country) => {
    onChange(country);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={rootRef} style={{ position: "relative", width: 108, flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => {
          setOpen(v => !v);
          setTimeout(() => inputRef.current?.focus(), 40);
        }}
        aria-expanded={open}
        style={{
          width: "100%",
          height: 56,
          border: 0,
          borderRadius: 24,
          background: isDark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.72)",
          color: "var(--t1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          cursor: "pointer",
          fontWeight: 900,
          fontSize: 15,
          boxShadow: isDark
            ? "inset 0 0 0 1px rgba(255,255,255,.08)"
            : "inset 0 0 0 1px rgba(0,0,0,.045), 0 10px 24px rgba(0,0,0,.045)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ opacity: .72, fontSize: 13, letterSpacing: ".03em" }}>
          {shortCode(current.name)}
        </span>
        <span>{current.code}</span>
        <span style={{ opacity: .42, fontSize: 11, transform: "translateY(1px)", marginLeft: -2 }}>
          ▾
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: 0,
            zIndex: 3000,
            width: 292,
            maxHeight: 360,
            overflow: "hidden",
            borderRadius: 22,
            background: menu.bg,
            border: "1px solid " + menu.border,
            boxShadow: menu.shadow,
            color: menu.fg,
          }}
        >
          <div style={{ padding: 10, borderBottom: "1px solid " + menu.border }}>
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("Поиск страны...", "Search country...")}
              style={{
                width: "100%",
                height: 38,
                borderRadius: 12,
                border: "1px solid " + menu.border,
                background: menu.searchBg,
                color: menu.fg,
                outline: "none",
                padding: "0 12px",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ maxHeight: 300, overflowY: "auto", padding: 4 }}>
            {filtered.map((country, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => select(country)}
                style={{
                  width: "100%",
                  height: 48,
                  border: 0,
                  borderRadius: 14,
                  background: "transparent",
                  color: menu.fg,
                  display: "grid",
                  gridTemplateColumns: "42px 1fr auto",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = menu.rowHover; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <b style={{ fontSize: 15, opacity: .9 }}>{shortCode(country.name)}</b>
                <span style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {country.name}
                </span>
                <em style={{ fontStyle: "normal", opacity: .62 }}>{country.code}</em>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuthScreen({
  screen, phone, setPhone,
  dialCode, setDialCode,
  otp, setOtp, otpRefs,
  email = "", setEmail = () => {},
  password = "", setPassword = () => {},
  onSubmitPhone, onVerifyOtp, onSubmitEmail,
  loading, error, onBack,
}) {
  const { t, lang } = useLocalText();
  const [method, setMethod] = useState("email");
  const [emailMode, setEmailMode] = useState("login");
  const currentCountry = COUNTRIES.find(c => c.code === dialCode) || COUNTRIES[0];
  const validEmail = /.+@.+\..+/.test(email.trim());
  const validPassword = password.length >= 6;

  if (screen === "otp") return (
    <div className="auth">
      <div className="auth-glow" />
      <div className="auth-card">
        {error && <div className="err-bar">{error}</div>}
        <button className="back-btn" onClick={onBack}>Back</button>
        <div className="auth-logo">📱</div>
        <h1 className="auth-title">Enter the code</h1>
        <p className="auth-sub">
          The code will appear in backend logs:<br />
          <code style={{ fontSize: 11, color: "var(--acc)" }}>OTP for {dialCode}...: XXXXXX</code>
        </p>
        <div className="otp-row">
          {otp.map((d, i) => (
            <input
              key={i}
              ref={otpRefs[i]}
              className="otp-box"
              type="tel"
              maxLength={1}
              value={d}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "").slice(-1);
                const next = [...otp]; next[i] = v;
                setOtp(next);
                if (v && i < 5) otpRefs[i + 1].current?.focus();
                if (next.every(x => x)) onVerifyOtp(next);
              }}
              onKeyDown={e => e.key === "Backspace" && !otp[i] && i > 0 && otpRefs[i - 1].current?.focus()}
              disabled={loading}
            />
          ))}
        </div>
        {loading && <div style={{ textAlign: "center", marginBottom: 12 }}><div className="spinner" /></div>}
      </div>
    </div>
  );

  return (
    <div className="auth">
      <div className="auth-glow" />
      <div className="auth-card">
        {error && <div className="err-bar">{error}</div>}
        <div className="auth-logo">🔐</div>
        <h1 className="auth-title">Chaos Messenger</h1>
        <p className="auth-sub">{t("E2E-шифрование — сервер не может читать сообщения", "E2E encryption — the server cannot read messages")}</p>

        <div style={{ display: "flex", gap: 4, marginBottom: 18, background: "var(--bg3)", borderRadius: 10, padding: 4 }}>
          <button type="button" onClick={() => setMethod("email")}
            style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 700,
              background: method === "email" ? "var(--bg1)" : "transparent", color: method === "email" ? "var(--t1)" : "var(--t3)" }}>
            Email
          </button>
          <button type="button" onClick={() => setMethod("phone")}
            style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 700,
              background: method === "phone" ? "var(--bg1)" : "transparent", color: method === "phone" ? "var(--t1)" : "var(--t3)" }}>
            Phone
          </button>
        </div>

        {method === "email" ? (
          <>
            <div className="auth-label">{t("Email", "Email")}</div>
            <input
              className="inp"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <div className="auth-label" style={{ marginTop: 12 }}>{t("Пароль", "Password")}</div>
            <input
              className="inp"
              type="password"
              placeholder={t("Минимум 6 символов", "Minimum 6 characters")}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && validEmail && validPassword && onSubmitEmail(emailMode)}
              disabled={loading}
            />
            <button
              className="btn-primary"
              onClick={() => onSubmitEmail(emailMode)}
              disabled={!validEmail || !validPassword || loading}
            >
              {loading ? "Please wait..." : emailMode === "register" ? "Create account" : "Sign in"}
            </button>
            <button
              type="button"
              className="back-btn"
              style={{ justifyContent: "center", margin: "10px auto 0" }}
              onClick={() => setEmailMode(emailMode === "register" ? "login" : "register")}
            >
              {emailMode === "register" ? "I already have an account" : "Create account by email"}
            </button>
          </>
        ) : (
          <>
            <div className="auth-label">{t("Номер телефона", "Phone number")}</div>
            <div className="phone-row" style={{ gap: 8, alignItems: "stretch" }}>
              <CountrySelector
                selected={dialCode}
                onChange={(c) => { setDialCode(c.code); setPhone(""); }}
              />
              <input
                className="inp"
                type="tel"
                placeholder={currentCountry.mask}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, currentCountry.len))}
                onKeyDown={e => e.key === "Enter" && onSubmitPhone()}
                maxLength={currentCountry.len}
                disabled={loading}
                autoFocus
              />
            </div>
            <button
              className="btn-primary"
              onClick={onSubmitPhone}
              disabled={phone.replace(/\D/g, "").length < 4 || loading}
            >
              {loading ? "Sending..." : "Get code"}
            </button>
          </>
        )}

        <p className="auth-hint">X3DH · Double Ratchet · AES-GCM</p>
      </div>
    </div>
  );
}

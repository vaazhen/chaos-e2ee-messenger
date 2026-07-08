export const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg0:#f4f4f6;
  --bg1:#ffffff;
  --bg2:#f0f0f2;
  --bg3:#e4e4e8;
  --bg4:#d6d6dc;
  --out:#0f6ea8;
  --in:#ffffff;
  --acc:#111111;
  --acc2:rgba(0,0,0,.04);
  --acc3:rgba(0,0,0,.03);
  --t1:#0b0b0f;
  --t2:rgba(0,0,0,.55);
  --t3:rgba(0,0,0,.38);
  --bdr:rgba(0,0,0,.06);
  --bdr2:rgba(0,0,0,.10);
  --green:#1aa05d;
  --red:#e5484d;
  --yellow:#d99c1a;
  --font:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,Arial,sans-serif;
  --shadow:0 22px 60px rgba(0,0,0,.1);
  --soft-shadow:0 16px 38px rgba(0,0,0,.06);
  --glass:rgba(255,255,255,.72);
  --glass-strong:rgba(255,255,255,.88);
  --glass-border:rgba(255,255,255,.8);
  --glass-highlight:rgba(255,255,255,.5);
  --text:#0b0b0f;
  --text-muted:rgba(0,0,0,.55);
  --text-soft:rgba(0,0,0,.38);
  --accent:#0f6ea8;
  --accent-2:rgba(15,110,168,.10);
  --accent-glow:rgba(15,110,168,.2);
  --success:#1aa05d;
  --danger:#e5484d;
  --warning:#d99c1a;
  --notify:#FF3B5C;
  --notify-glow:rgba(255,59,92,.25);
  --radius-sm:12px;
  --radius-md:18px;
  --radius-lg:24px;
  --radius-xl:32px;
  --shadow-soft:0 10px 30px rgba(0,0,0,.06);
  --shadow-panel:0 24px 80px rgba(0,0,0,.10);
  --shadow-glow:0 0 40px rgba(15,110,168,.12);
  --ease-out:cubic-bezier(.16,1,.3,1);
  --ease-spring:cubic-bezier(.4,0,.2,1);
  --fast:140ms;
  --normal:220ms;
  --slow:360ms;
}
[data-theme='dark']{
  --bg0:#05070D;
  --bg1:#070A12;
  --bg2:#0C1020;
  --bg3:#131827;
  --bg4:#1A2035;
  --out:#1f6da2;
  --in:#10141f;
  --acc:#f2f4f7;
  --acc2:rgba(255,255,255,.06);
  --acc3:rgba(255,255,255,.04);
  --t1:#f6f8ff;
  --t2:rgba(246,248,255,.62);
  --t3:rgba(246,248,255,.42);
  --bdr:rgba(255,255,255,.08);
  --bdr2:rgba(255,255,255,.12);
  --shadow:0 22px 70px rgba(0,0,0,.4);
  --soft-shadow:0 16px 44px rgba(0,0,0,.32);
  --glass:rgba(255,255,255,.06);
  --glass-strong:rgba(255,255,255,.10);
  --glass-border:rgba(255,255,255,.12);
  --glass-highlight:rgba(255,255,255,.18);
  --text:#f6f8ff;
  --text-muted:rgba(246,248,255,.62);
  --text-soft:rgba(246,248,255,.42);
  --accent:#6EA8FF;
  --accent-2:rgba(110,168,255,.14);
  --accent-glow:rgba(110,168,255,.35);
  --success:#35D07F;
  --danger:#FF4D6D;
  --warning:#F6C85F;
  --notify:#FF3B5C;
  --notify-glow:rgba(255,59,92,.35);
  --radius-sm:12px;
  --radius-md:18px;
  --radius-lg:24px;
  --radius-xl:32px;
  --shadow-soft:0 10px 30px rgba(0,0,0,.28);
  --shadow-panel:0 24px 80px rgba(0,0,0,.42);
  --shadow-glow:0 0 40px rgba(110,168,255,.18);
  --ease-out:cubic-bezier(.16,1,.3,1);
  --ease-spring:cubic-bezier(.4,0,.2,1);
  --fast:140ms;
  --normal:220ms;
  --slow:360ms;
  --red:#FF4D6D;
  --green:#35D07F;
}
html,body,#root{height:100%}
body{
  background:var(--bg0);
  font-family:var(--font);
  color:var(--t1);
  transition:background .2s,color .2s;
}
button,input,textarea{font:inherit}
button{color:inherit}
.scroll{overflow-y:auto}
.scroll::-webkit-scrollbar{width:4px}
.scroll::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:999px}
.trim{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
@keyframes fadeOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.85)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pop{0%{transform:scale(.92);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}

/* DESIGN SYSTEM BASE */
.glass-panel{
  background:var(--glass);
  backdrop-filter:blur(20px) saturate(150%);
  -webkit-backdrop-filter:blur(20px) saturate(150%);
  border:1px solid var(--glass-border);
  box-shadow:0 8px 28px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.04);
}
[data-theme='dark'] .glass-panel{
  box-shadow:0 8px 28px rgba(0,0,0,.28), 0 0 0 0.5px rgba(0,0,0,.1);
}
.glass-panel-strong{
  background:var(--glass-strong);
  backdrop-filter:blur(32px) saturate(140%);
  -webkit-backdrop-filter:blur(32px) saturate(140%);
  border:1px solid var(--glass-border);
  box-shadow:var(--shadow-panel);
}
.icon-btn{
  border:none;
  background:transparent;
  color:var(--t2);
  cursor:pointer;
  width:36px;
  height:36px;
  border-radius:var(--radius-sm);
  display:inline-flex;
  align-items:center;
  justify-content:center;
  transition:background var(--fast) var(--ease-out),color var(--fast) var(--ease-out),transform var(--fast) var(--ease-out);
}
.icon-btn:hover{background:var(--acc2);color:var(--t1)}
.icon-btn:active{transform:scale(.92)}
.icon-btn:disabled{opacity:.35;pointer-events:none}
.primary-action{
  border:none;
  background:var(--acc);
  color:#fff;
  border-radius:var(--radius-lg);
  height:48px;
  padding:0 22px;
  font-weight:800;
  cursor:pointer;
  transition:opacity var(--fast),transform var(--fast);
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
}
.primary-action:active{transform:scale(.97)}
.primary-action:disabled{opacity:.45;cursor:default}
[data-theme='dark'] .primary-action{color:#08090b}
.secondary-action{
  border:none;
  background:var(--acc2);
  color:var(--t1);
  border-radius:var(--radius-lg);
  height:48px;
  padding:0 22px;
  font-weight:800;
  cursor:pointer;
  transition:background var(--fast),transform var(--fast);
}
.secondary-action:active{transform:scale(.97)}
.secondary-action:disabled{opacity:.45;cursor:default}
.input-shell{
  width:100%;
  height:50px;
  border:none;
  outline:none;
  border-radius:var(--radius-lg);
  background:var(--bg2);
  color:var(--t1);
  padding:0 16px;
  font-size:16px;
  transition:box-shadow var(--fast);
}
.input-shell:focus{box-shadow:0 0 0 3px var(--acc2)}
.section-title{
  font-size:12px;
  font-weight:850;
  letter-spacing:.04em;
  text-transform:uppercase;
  color:var(--t2);
  margin-bottom:6px;
}
.status-dot{
  display:inline-block;
  width:8px;
  height:8px;
  border-radius:50%;
  flex-shrink:0;
}
.status-dot.online{background:var(--success)}
.status-dot.offline{background:var(--t3)}
.status-dot.busy{background:var(--danger)}

.boot-screen{
  min-height:100vh;
  display:flex;
  flex-direction:column;
  gap:22px;
  align-items:center;
  justify-content:center;
  background:var(--bg0);
}
.boot-mark{
  width:74px;height:74px;border-radius:28px;
  background:var(--bg1);
  box-shadow:var(--soft-shadow);
  display:flex;align-items:center;justify-content:center;
  font-size:34px;font-weight:800;
}
.spinner{
  width:26px;height:26px;
  border:2px solid var(--bdr2);
  border-top-color:var(--acc);
  border-radius:50%;
  animation:spin .7s linear infinite;
}

/* AUTH */
.auth{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:22px;
  background:
    radial-gradient(circle at 20% 0%,rgba(255,255,255,.85),transparent 32%),
    linear-gradient(180deg,#f8f8f7,var(--bg0));
}
.auth-glow{display:none}
.auth-card{
  width:min(420px,100%);
  background:rgba(255,255,255,.78);
  border:1px solid rgba(255,255,255,.8);
  border-radius:36px;
  padding:34px 28px 30px;
  box-shadow:var(--shadow);
  backdrop-filter:blur(22px);
  animation:fadeUp .25s ease;
}
[data-theme='dark'] .auth-card{
  background:rgba(21,25,34,.72);
  border-color:var(--bdr2);
}
.auth-logo{
  width:74px;height:74px;
  border-radius:28px;
  background:#111;
  color:#fff;
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 24px;
  font-size:28px;
  box-shadow:0 18px 44px rgba(0,0,0,.16);
}
.auth-title{
  font-size:28px;
  letter-spacing:-.04em;
  text-align:center;
  margin-bottom:8px;
}
.auth-sub{
  font-size:14px;
  color:var(--t2);
  text-align:center;
  line-height:1.5;
  margin-bottom:24px;
}
.auth-label,.field-label{
  display:block;
  font-size:12px;
  color:var(--t2);
  font-weight:700;
  margin:0 0 8px;
}
.inp,.field-inp,.search-inp{
  width:100%;
  height:50px;
  border:none;
  outline:none;
  border-radius:18px;
  background:var(--bg2);
  color:var(--t1);
  padding:0 16px;
  font-size:16px;
}
.inp:focus,.field-inp:focus{
  box-shadow:0 0 0 3px var(--acc2);
}
.phone-row{display:flex;gap:10px;margin-bottom:14px}
.prefix{
  height:50px;
  padding:0 14px;
  display:flex;align-items:center;
  background:var(--bg2);
  border-radius:18px;
  color:var(--t1);
}
.btn-primary,.btn-pri{
  border:none;
  background:#111;
  color:#fff;
  border-radius:18px;
  height:48px;
  padding:0 18px;
  font-weight:800;
  cursor:pointer;
  transition:opacity .15s,transform .12s;
}
[data-theme='dark'] .btn-primary,[data-theme='dark'] .btn-pri{
  background:#f3f5f8;
  color:#08090b;
}
.btn-primary{width:100%;margin-top:16px}
.btn-primary:active,.btn-pri:active{transform:scale(.98)}
.btn-primary:disabled,.btn-pri:disabled,.btn-sec:disabled{opacity:.45;cursor:default}
.btn-sec{
  border:none;
  background:var(--bg2);
  color:var(--t1);
  border-radius:18px;
  height:48px;
  padding:0 18px;
  font-weight:800;
  cursor:pointer;
}
.btn-row{display:flex;gap:10px;margin-top:18px}
.btn-row>*{flex:1}

.setup-card{width:min(460px,100%)}
.setup-avatar-wrap{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:8px;
  margin:2px 0 22px;
}
.setup-avatar-upload{
  position:relative;
  width:82px;
  height:82px;
  border-radius:50%;
  background:linear-gradient(135deg,#4fa3e0,#2d6fa8);
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  color:#111;
  font-size:24px;
  font-weight:900;
  overflow:visible;
  box-shadow:0 14px 30px rgba(0,0,0,.12);
  transition:transform .12s,box-shadow .15s;
}
.setup-avatar-upload:hover{
  transform:translateY(-1px);
  box-shadow:0 18px 38px rgba(0,0,0,.16);
}
.setup-avatar-upload img{
  width:100%;
  height:100%;
  border-radius:50%;
  object-fit:cover;
  display:block;
}
.setup-avatar-upload em{
  position:absolute;
  right:0;
  bottom:0;
  width:27px;
  height:27px;
  border-radius:50%;
  background:#111;
  color:#fff;
  border:3px solid var(--bg1);
  display:flex;
  align-items:center;
  justify-content:center;
  font-style:normal;
  font-size:19px;
  line-height:1;
}
[data-theme='dark'] .setup-avatar-upload em{
  background:#f3f5f8;
  color:#08090b;
}
.setup-avatar-caption{
  font-size:12px;
  color:var(--t2);
  font-weight:700;
}
.btn-pri.full{width:100%;margin-top:12px}
.err-bar,.ok-bar{
  border-radius:18px;
  padding:12px 14px;
  margin:0 0 14px;
  font-size:13px;
}
.err-bar{background:rgba(229,72,77,.12);color:var(--red)}
.ok-bar{background:rgba(26,160,93,.13);color:var(--green)}
.auth-hint{
  margin-top:14px;
  color:var(--t2);
  font-size:13px;
  text-align:center;
}
.back-btn{
  border:none;background:transparent;
  color:var(--t1);
  font-weight:800;
  cursor:pointer;
  margin-bottom:16px;
}
.otp-row{display:flex;gap:8px;justify-content:center;margin:18px 0}
.otp-box{
  width:48px;height:56px;
  border:none;border-radius:18px;
  background:var(--bg2);
  color:var(--t1);
  text-align:center;
  font-size:24px;
  font-weight:900;
}
.country-selector{position:relative;width:108px;flex-shrink:0}
.country-selector-btn{
  width:100%;height:56px;border:0;border-radius:24px;
  color:var(--t1);display:flex;align-items:center;justify-content:center;
  gap:7px;cursor:pointer;font-weight:900;font-size:15px;white-space:nowrap;
}
.country-selector-abbr{opacity:.72;font-size:13px;letter-spacing:.03em}
.country-selector-arrow{opacity:.42;font-size:11px;transform:translateY(1px);margin-left:-2px}
.otp-code-hint{font-size:11px;color:var(--acc)}

/* APP SHELL */
.app{
  height:100vh;
  background:var(--bg0);
  position:relative;
}
.app::before{
  content:'';
  position:fixed;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 10%,rgba(100,140,220,.06),transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 90%,rgba(220,130,140,.04),transparent 60%),
    radial-gradient(ellipse 50% 35% at 50% 50%,rgba(180,160,220,.03),transparent 70%),
    radial-gradient(circle at 50% -20%,rgba(255,255,255,.03),transparent 40%);
}
[data-theme='dark'] .app::before{
  background:
    radial-gradient(ellipse 80% 50% at 20% 10%,rgba(110,168,255,.07),transparent 60%),
    radial-gradient(ellipse 60% 40% at 75% 88%,rgba(255,59,92,.05),transparent 60%),
    radial-gradient(ellipse 50% 35% at 55% 50%,rgba(167,139,250,.04),transparent 70%),
    radial-gradient(circle at 50% -20%,rgba(255,255,255,.03),transparent 40%);
}
.app::after{
  content:'';
  position:fixed;inset:0;pointer-events:none;z-index:0;
  opacity:.035;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:120px 120px;
}
/* lock app to device viewport */
.app{
  position:fixed;
  inset:0;
  overflow:hidden;
}
.app-frame{
  height:100%;
  display:grid;
  grid-template-columns:minmax(360px,430px) minmax(0,1fr);
  transition:grid-template-columns .22s cubic-bezier(.25,.1,.25,1);
}
.app-frame.app-frame--sidebar-dragging{
  transition:none!important;
  will-change:grid-template-columns;
}
.app-frame--sidebar-dragging .home-screen--compact .conversation-item,
.app-frame--sidebar-dragging .home-screen--compact .conversation-main{
  transition:none!important;
}
.home-screen,.chat-view{
  height:100vh;
  min-width:0;
  position:relative;
}
.home-screen{overflow:hidden}
.chat-view{overflow:hidden}
.home-screen{
  background:transparent;
  border-right:1px solid var(--bdr);
  display:flex;
  flex-direction:column;
  min-width:0;
  position:relative;
  overflow:hidden;
}
.home-screen .home-topbar{
  position:absolute;
  top:0;left:0;right:0;
  z-index:10;
  background:transparent;
  border:none;
  padding-top:max(12px, env(safe-area-inset-top, 0));
  min-height:78px;
  padding:12px 22px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  pointer-events:auto;
}
.home-screen .home-topbar .avatar-button{
  background:rgba(255,255,255,.78);
  backdrop-filter:blur(20px) saturate(150%);
  -webkit-backdrop-filter:blur(20px) saturate(150%);
  border:1px solid rgba(255,255,255,.92);
  box-shadow:0 8px 28px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.04);
  width:50px;height:50px;
}
[data-theme='dark'] .home-screen .home-topbar .avatar-button{
  background:rgba(30,36,50,.78);
  border-color:rgba(255,255,255,.08);
  box-shadow:0 8px 28px rgba(0,0,0,.28), 0 0 0 0.5px rgba(0,0,0,.1);
}
.home-screen .home-topbar .round-action{
  background:rgba(255,255,255,.78);
  backdrop-filter:blur(20px) saturate(150%);
  -webkit-backdrop-filter:blur(20px) saturate(150%);
  border:1px solid rgba(255,255,255,.92);
  box-shadow:0 8px 28px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.04);
  width:50px;height:50px;
}
[data-theme='dark'] .home-screen .home-topbar .round-action{
  background:rgba(30,36,50,.78);
  border-color:rgba(255,255,255,.08);
  box-shadow:0 8px 28px rgba(0,0,0,.28), 0 0 0 0.5px rgba(0,0,0,.1);
}
.home-screen .screen-title{
  background:rgba(255,255,255,.78);
  backdrop-filter:blur(20px) saturate(150%);
  -webkit-backdrop-filter:blur(20px) saturate(150%);
  border:1px solid rgba(255,255,255,.92);
  border-radius:999px;
  padding:8px 24px;
  font-size:18px;
  box-shadow:0 8px 28px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.04);
  white-space:nowrap;
  position:absolute;
  left:50%;
  transform:translateX(-50%);
}
[data-theme='dark'] .home-screen .screen-title{
  background:rgba(30,36,50,.78);
  border-color:rgba(255,255,255,.08);
  box-shadow:0 8px 28px rgba(0,0,0,.28), 0 0 0 0.5px rgba(0,0,0,.1);
}
.sidebar-resize-handle{
  display:none;
}
@media (min-width:861px){
  .sidebar-resize-handle{
    display:block;
    position:absolute;
    top:0;
    right:-8px;
    bottom:0;
    width:10px;
    z-index:15;
    cursor:col-resize;
    touch-action:none;
    user-select:none;
    background:var(--bg0);
    border-right:1px solid var(--bdr);
  }
  .sidebar-resize-handle::after{
    content:"";
    position:absolute;
    top:0;
    bottom:0;
    left:50%;
    width:2px;
    transform:translateX(-50%);
    border-radius:1px;
    background:transparent;
    transition:background .15s ease, box-shadow .15s ease;
  }
  .sidebar-resize-handle:hover::after{
    background:var(--acc2);
    opacity:.45;
  }
}
/* ── SIDEBAR HEADER ── */
.sidebar-header{
  padding:24px 22px 10px;
  display:flex;align-items:center;gap:12px;
  flex-shrink:0;
}
.sidebar-title{
  font-size:28px;font-weight:850;letter-spacing:-.02em;
  color:var(--text);line-height:1.1;
}
.sidebar-title--center{flex:1;text-align:center;font-size:20px}
.sidebar-actions{display:flex;align-items:center;gap:6px}
/* ── SELECT MODE ── */
.select-mode-done{font-size:11px;font-weight:800;color:var(--text)}
.select-mode-bar{
  display:flex;align-items:center;gap:8px;
  padding:4px 16px 12px;flex-shrink:0;
}
.select-mode-action{
  border:none;background:var(--glass);
  color:var(--text);
  font-size:12px;font-weight:700;
  padding:8px 14px;border-radius:999px;
  cursor:pointer;
  border:1px solid var(--glass-border);
  transition:background var(--fast);
}
.select-mode-action:hover{background:var(--glass-strong)}
.select-mode-action.danger{color:var(--danger)}
.select-mode-action:disabled{opacity:.4;cursor:default}
.conv-check{
  width:22px;height:22px;border-radius:50%;flex-shrink:0;
  border:2px solid var(--text-soft);
  display:flex;align-items:center;justify-content:center;
  transition:border-color var(--fast),background var(--fast);
}
.conv-check.checked{
  border-color:var(--accent);
  background:var(--accent);
  color:#fff;
}
.conv-check svg{width:14px;height:14px}
  font-size:28px;font-weight:850;letter-spacing:-.02em;
  color:var(--text);line-height:1.1;
}
.sidebar-subtitle{
  font-size:13px;color:var(--text-muted);
  font-weight:500;
}
.sidebar-actions{display:flex;align-items:center;gap:6px;padding-top:2px}
.sidebar-action-btn{
  min-width:40px;height:40px;border-radius:var(--radius-sm);
  background:var(--glass);
  border:1px solid var(--glass-border);
  color:var(--text);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  transition:background var(--fast),color var(--fast),box-shadow var(--fast),transform var(--fast);
  padding:0 10px;white-space:nowrap;
}
.sidebar-action-btn svg{width:20px;height:20px}
.sidebar-action-btn:hover{background:var(--glass-strong);color:var(--text)}
.sidebar-action-btn:active{transform:scale(.93)}
/* ── SEARCH SHELL ── */
.search-shell{
  margin:0 16px 16px;
  height:46px;border-radius:var(--radius-lg);
  background:var(--glass);
  backdrop-filter:blur(24px);
  -webkit-backdrop-filter:blur(24px);
  border:1px solid var(--glass-border);
  display:flex;align-items:center;
  padding:0 6px 0 16px;
  flex-shrink:0;
  transition:border-color var(--fast),box-shadow var(--fast);
}
.search-shell:focus-within{
  border-color:var(--accent-glow);
  box-shadow:0 0 0 3px rgba(110,168,255,.12);
}
[data-theme='dark'] .search-shell{background:var(--glass);border-color:var(--glass-border)}
.search-shell .shell-icon{color:var(--text-soft);flex-shrink:0;display:flex}
.search-shell .shell-icon svg{width:18px;height:18px}
.search-shell input{
  flex:1;border:none;outline:none;background:transparent;
  color:var(--text);font-size:15px;padding:0 12px;
}
.search-shell input::placeholder{color:var(--text-soft)}
.search-shell .shell-clear{
  width:32px;height:32px;border:none;background:transparent;border-radius:50%;
  color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:background var(--fast);
}
.search-shell .shell-clear:hover{background:var(--glass-strong)}
.search-shell .shell-clear svg{width:16px;height:16px}
/* ── CHAT FILTERS ── */
.chat-filters{
  display:flex;gap:8px;
  padding:0 16px 14px;
  overflow-x:auto;
  flex-shrink:0;
}
.chat-filters::-webkit-scrollbar{display:none}
.filter-pill{
  border:none;background:transparent;
  color:var(--text-soft);
  font-size:13px;font-weight:700;
  padding:8px 18px;
  border-radius:999px;
  cursor:pointer;
  white-space:nowrap;
  transition:background var(--fast),color var(--fast),box-shadow var(--fast);
}
.filter-pill:hover{background:var(--glass);color:var(--text-muted)}
.filter-pill.active{
  background:var(--glass-strong);
  color:var(--text);
  box-shadow:0 0 0 1px var(--glass-border),0 0 20px rgba(110,168,255,.12);
}
.filter-pill .filter-badge{
  display:inline-flex;min-width:18px;height:18px;border-radius:999px;
  background:var(--notify);color:#fff;font-size:10px;font-weight:800;
  align-items:center;justify-content:center;
  padding:0 5px;margin-left:6px;
  vertical-align:middle;
}
/* ── CONVERSATION ITEM ── */
.conversation-list{padding:0 6px 100px}
.conversation-item{
  display:flex;align-items:center;gap:14px;
  padding:12px 14px;
  margin:1px 4px;
  border-radius:var(--radius-md);
  cursor:pointer;
  border:1px solid transparent;
  transition:background var(--fast),border-color var(--fast),box-shadow var(--fast);
  text-align:left;background:transparent;width:100%;
}
.conversation-item:hover{background:var(--glass)}
.conversation-item.active{
  background:var(--glass-strong);
  border-color:var(--glass-border);
  box-shadow:0 0 0 1px var(--glass-border),0 0 24px rgba(110,168,255,.08);
}
.conversation-item:active{transform:scale(.995)}
.conversation-ava-wrap{
  position:relative;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
}
.conversation-ava-wrap .av.md{
  width:50px;height:50px;font-size:16px;
  border:1px solid var(--glass-border);
  box-shadow:0 4px 12px rgba(0,0,0,.15);
  background:linear-gradient(135deg,var(--bg3),var(--bg2));
}
.conversation-main{flex:1;min-width:0}
.conversation-line{
  display:flex;align-items:center;
  gap:6px;line-height:1.3;
}
.conversation-line+.conversation-line{margin-top:3px}
.conversation-name{
  font-size:15px;font-weight:800;color:var(--text);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  display:flex;align-items:center;gap:5px;
}
.conversation-name .mute-dot{
  width:6px;height:6px;border-radius:50%;background:var(--text-muted);
  flex-shrink:0;opacity:.5;
}
.conversation-preview{
  font-size:13px;color:var(--text-muted);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  flex:1;min-width:0;
}
.conversation-item.unread .conversation-name{color:var(--text)}
.conversation-item.unread .conversation-preview{color:var(--text);opacity:.8}
.conversation-meta{
  display:flex;flex-direction:column;align-items:flex-end;
  gap:8px;flex-shrink:0;padding-top:2px;
}
.conversation-time{
  font-size:12px;color:var(--text-soft);
  white-space:nowrap;font-weight:500;
  margin-right:1px;
}
/* ── UNREAD BADGE ── */
.unread-badge{
  min-width:16px;height:16px;
  border-radius:999px;
  background:linear-gradient(135deg,var(--notify),var(--danger));
  box-shadow:0 1px 6px var(--notify-glow);
  color:#fff;
  font-size:9px;font-weight:800;
  display:flex;align-items:center;justify-content:center;
  padding:0 5px;
  line-height:1;
  margin-right:2px;
}
.conversation-unread-floating{
  position:absolute;
  right:-4px;bottom:-4px;
  min-width:18px;height:18px;
  padding:0 5px;
  border-radius:999px;
  background:linear-gradient(135deg,var(--notify),var(--danger));
  box-shadow:0 2px 8px var(--notify-glow);
  color:#fff;
  font-size:10px;font-weight:900;
  display:none;
  align-items:center;justify-content:center;
  border:2px solid var(--bg0);
  line-height:1;
  z-index:2;
}
.home-screen--compact .conversation-unread-floating{display:flex}
/* ── BOTTOM NAV DOCK ── */
.bottom-nav{
  position:absolute;
  bottom:16px;left:50%;
  transform:translateX(-50%);
  display:flex;gap:4px;
  padding:6px;
  border-radius:var(--radius-xl);
  background:var(--glass);
  backdrop-filter:blur(32px) saturate(140%);
  -webkit-backdrop-filter:blur(32px) saturate(140%);
  border:1px solid var(--glass-border);
  box-shadow:var(--shadow-panel),0 0 0 1px rgba(255,255,255,.04) inset;
  z-index:50;
  width:max-content;
}
.app>.bottom-nav{display:none;position:fixed;z-index:60}
@media (max-width:860px){
  .app>.bottom-nav{display:flex}
  .home-screen .bottom-nav{display:none}
}
.bottom-nav-item{
  display:flex;flex-direction:column;align-items:center;gap:3px;
  padding:10px 16px;min-width:68px;
  border:none;background:transparent;
  border-radius:var(--radius-md);
  color:var(--text-soft);
  cursor:pointer;
  font-size:10px;font-weight:700;
  letter-spacing:.02em;
  transition:background var(--fast),color var(--fast),box-shadow var(--fast);
  position:relative;
}
.bottom-nav-item svg{width:20px;height:20px}
.bottom-nav-item .av.xs{width:22px;height:22px;font-size:9px}
.bottom-nav-item:hover{color:var(--text-muted);background:var(--glass)}
.bottom-nav-item.active{
  background:var(--glass-strong);
  color:var(--text);
  box-shadow:0 0 0 1px var(--glass-highlight) inset,0 0 24px rgba(110,168,255,.1);
}
.bottom-nav-item:active{transform:scale(.95)}
.bottom-nav-badge{
  position:absolute;top:2px;right:50%;
  transform:translateX(calc(50% + 8px));
  min-width:16px;height:16px;
  border-radius:999px;
  background:linear-gradient(135deg,var(--notify),var(--danger));
  box-shadow:0 2px 8px var(--notify-glow);
  color:#fff;
  font-size:9px;font-weight:800;
  display:flex;align-items:center;justify-content:center;
  padding:0 4px;
  line-height:1;
}
/* ── EMPTY STATE ── */
.product-empty-icon svg{width:48px;height:48px;color:var(--text-soft);opacity:.5}
.home-topbar-end{
  display:flex;
  align-items:center;
  gap:10px;
  margin-left:auto;
}
.home-screen--compact .screen-title{
  display:none;
}
.home-screen--compact .home-topbar{
  padding-left:12px;
  padding-right:12px;
}
.home-screen--compact .home-content{
  padding-left:8px;
  padding-right:8px;
  padding-bottom:120px;
}
.home-screen--compact .home-content--compact{
  padding-top:4px;
}
.conversation-list--compact{
  align-items:center;
  gap:10px;
}
.conversation-ava-wrap{
  position:relative;
  flex-shrink:0;
  display:flex;
  align-items:center;
  justify-content:center;
}
.conversation-unread-floating{
  position:absolute;
  right:-4px;
  bottom:-4px;
  min-width:18px;
  height:18px;
  padding:0 5px;
  border-radius:999px;
  background:var(--acc2);
  color:#fff;
  font-size:10px;
  font-weight:900;
  display:none;
  align-items:center;
  justify-content:center;
  border:2px solid var(--bg0);
  line-height:1;
  z-index:2;
  box-shadow:0 1px 4px rgba(0,0,0,.2);
}
.home-screen--compact .conversation-unread-floating{
  display:flex;
}
.home-screen--compact .conversation-main .badge{
  display:none;
}
.home-screen--compact .conversation-item{
  width:52px;
  height:52px;
  min-height:52px;
  padding:0;
  margin:0;
  border-radius:50%;
  justify-content:center;
  align-items:center;
  gap:0;
  overflow:visible;
  transition:
    width .28s cubic-bezier(.4,0,.2,1),
    height .28s cubic-bezier(.4,0,.2,1),
    padding .28s cubic-bezier(.4,0,.2,1),
    border-radius .28s cubic-bezier(.4,0,.2,1),
    background .15s ease,
    box-shadow .15s ease,
    transform .12s ease;
}
.home-screen--compact .conversation-item .av.md{
  width:40px;
  height:40px;
  font-size:14px;
}
.home-screen--compact .conversation-item.active{
  box-shadow:0 0 0 3px var(--acc2), var(--shadow);
}
.home-screen--compact .conversation-main{
  opacity:0;
  max-width:0;
  flex:0 0 0;
  overflow:hidden;
  margin:0;
  padding:0;
  pointer-events:none;
  white-space:nowrap;
  transition:opacity .2s ease,max-width .28s cubic-bezier(.4,0,.2,1);
}
.floating-searchbar--compact{
  grid-template-columns:1fr!important;
  justify-items:center;
  left:10px;
  right:10px;
}
.floating-searchbar--compact .restored-search{
  display:none;
}
.floating-searchbar--compact .new-chat-action-btn{
  width:52px;
  height:52px;
  min-width:52px;
}
.chat-view{
  display:flex;
  flex-direction:column;
  background:var(--bg0);
  position:relative;
  overflow:hidden!important;
}
.chat-view::before{
  content:'';position:absolute;top:0;left:0;right:0;height:130px;
  z-index:5;pointer-events:none;
  background:linear-gradient(to top,transparent,var(--bg0) 70%);
}
.chat-view::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:90px;
  z-index:5;pointer-events:none;
  background:linear-gradient(to top,var(--bg0),transparent 100%);
}
.ios-status-spacer{height:28px}
.home-topbar,.product-chat-head,.sheet-head{
  min-height:78px;
  padding:12px 22px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  position:relative;
  z-index:5;
}
.sheet-head .sheet-title{
  font-size:22px;
  font-weight:800;
  letter-spacing:-.035em;
  flex:1;
  min-width:0;
}
.sheet-head.sheet-head--center-title{
  justify-content:center;
}
.sheet-head.sheet-head--center-title .sheet-title{
  flex:1 1 auto;
  text-align:center;
  max-width:100%;
}
.screen-title{
  position:absolute;
  left:50%;
  transform:translateX(-50%);
  font-size:22px;
  font-weight:800;
  letter-spacing:-.035em;
}
.avatar-button,.round-action,.bottom-round{
  border:none;
  background:var(--bg1);
  border-radius:999px;
  box-shadow:var(--soft-shadow);
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
}
.avatar-button{width:54px;height:54px;background:transparent;box-shadow:none}
.avatar-face{
  width:46px;height:46px;
  border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:#111;color:#fff;font-weight:900;
  overflow:hidden;
}
.round-action{
  width:54px;height:54px;
  font-size:28px;
  font-weight:600;
}
.desktop-hidden{display:none}
.home-content{
  flex:1;
  padding:8px 8px 90px;
  background:transparent;
  position:relative;
  z-index:1;
}
.home-screen--compact .home-content{
  padding:68px 8px 120px;
}
.home-screen--compact .home-content--compact{
  padding-top:4px;
}
.home-screen .home-content.scroll{
  overflow-y:auto;
}
@media (min-width:861px){
  .home-screen .home-content.scroll::-webkit-scrollbar{
    width:0;
  }
}
.conversation-list{
  display:flex;
  flex-direction:column;
  gap:12px;
}

.conversation-item{
  width:100%;
  border:none;
  background:rgba(255,255,255,.78);
  box-shadow:0 4px 16px rgba(0,0,0,.06), 0 0 0 0.5px rgba(0,0,0,.03);
  backdrop-filter:blur(8px) saturate(120%);
  -webkit-backdrop-filter:blur(8px) saturate(120%);
  display:flex;
  align-items:center;
  gap:14px;
  padding:14px;
  border-radius:24px;
  text-align:left;
  cursor:pointer;
  overflow:hidden;
  transition:
    background .15s ease,
    box-shadow .15s ease,
    transform .12s ease,
    width .28s cubic-bezier(.4,0,.2,1),
    height .28s cubic-bezier(.4,0,.2,1),
    padding .28s cubic-bezier(.4,0,.2,1),
    border-radius .28s cubic-bezier(.4,0,.2,1),
    gap .28s cubic-bezier(.4,0,.2,1);
}
.conversation-main{
  flex:1;
  min-width:0;
  transition:opacity .2s ease,max-width .28s cubic-bezier(.4,0,.2,1),flex .28s cubic-bezier(.4,0,.2,1);
}

.conversation-item:hover,
.conversation-item.active{
  background:rgba(255,255,255,.9);
  box-shadow:0 8px 24px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.04);
}

.conversation-item:active{
  transform:scale(.99);
}

[data-theme='dark'] .conversation-item{
  background:rgba(30,36,50,.75);
  border:1px solid rgba(255,255,255,.06);
  box-shadow:0 4px 16px rgba(0,0,0,.18), 0 0 0 0.5px rgba(0,0,0,.08);
}
[data-theme='dark'] .conversation-item:hover,
[data-theme='dark'] .conversation-item.active{
  background:rgba(30,36,50,.88);
  box-shadow:0 8px 24px rgba(0,0,0,.28), 0 0 0 0.5px rgba(0,0,0,.1);
}
.conversation-name{
  flex:1;
  font-size:16px;
  font-weight:800;
  letter-spacing:-.02em;
  display:flex;
  align-items:center;
  gap:6px;
}
.conversation-time{
  color:var(--t3);
  font-size:12px;
}
.conversation-tools{
  margin-left:auto;
  display:flex;
  align-items:center;
  gap:6px;
}
.conversation-preview{
  flex:1;
  color:var(--t2);
  font-size:14px;
}
.conversation-req-actions{
  margin-left:auto;
  flex-shrink:0;
  align-self:center;
  gap:8px;
  display:flex;
}
.req-btn{
  height:36px;
  min-width:96px;
  padding:0 14px;
  border-radius:12px;
  border:none;
  font-weight:800;
  font-size:13px;
  line-height:1;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
}
.req-btn.accept{
  background:#111;
  color:#fff;
}
.req-btn.accept:hover{
  background:#1f1f1f;
}
.req-btn.accept:active{
  background:#000;
  transform:translateY(1px);
}
[data-theme='dark'] .req-btn.accept{
  background:#f3f5f8;
  color:#08090b;
}
[data-theme='dark'] .req-btn.accept:hover{
  background:#ffffff;
}
[data-theme='dark'] .req-btn.accept:active{
  background:#dfe5ef;
}
.req-btn.decline{
  background:var(--bg2);
  color:var(--t1);
}
.requests-head-actions{
  display:flex;
  gap:8px;
  margin:0 0 8px;
}
.mini-btn{
  height:30px;
  border:none;
  border-radius:10px;
  background:var(--bg2);
  color:var(--t1);
  padding:0 10px;
  font-weight:800;
  cursor:pointer;
}
.mini-btn.danger{
  color:var(--red);
}
.mini-btn:disabled{
  opacity:.5;
  cursor:default;
}
.req-select{
  display:flex;
  align-items:center;
  gap:6px;
  margin-right:auto;
  color:var(--t2);
  font-size:12px;
}
.chat-item-menu{
  position:fixed;
  width:210px;
  background:var(--bg1);
  border:1px solid var(--bdr);
  border-radius:16px;
  box-shadow:var(--shadow);
  padding:8px;
  z-index:40;
}
.archive-toggle-btn{
  margin-left:auto;
  height:28px;
  padding:0 10px;
  border-radius:999px;
  border:1px solid var(--bdr);
  background:var(--bg1);
  color:var(--t2);
  font-size:12px;
  font-weight:800;
  cursor:pointer;
}
.request-top-btn{
  position:relative;
}
.request-badge{
  position:absolute;
  top:-3px;
  right:-3px;
  min-width:16px;
  height:16px;
  padding:0 4px;
  border-radius:999px;
  background:var(--red);
  color:#fff;
  font-size:10px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
}
.archive-toggle-btn.active{
  background:var(--bg2);
  color:var(--t1);
}
.mute-icon-inline{
  width:14px;
  height:14px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  color:#111;
  opacity:.8;
}
[data-theme='dark'] .mute-icon-inline{
  color:#cfd6e6;
}
.mute-icon-inline svg{
  width:14px;
  height:14px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.8;
  stroke-linecap:round;
  stroke-linejoin:round;
}
.badge{
  min-width:22px;
  height:22px;
  padding:0 7px;
  border-radius:999px;
  background:#111;
  color:#fff;
  font-size:12px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:800;
}
.soft-chip,.e2ee-tag,.group-tag{
  border-radius:999px;
  background:var(--bg2);
  color:var(--t2);
  padding:2px 7px;
  font-size:11px;
  font-weight:800;
}
.floating-searchbar{
  position:absolute;
  left:18px;
  right:18px;
  bottom:22px;
  display:grid;
  grid-template-columns:58px 1fr 58px;
  gap:12px;
  align-items:center;
  z-index:8;
}
.bottom-round{
  width:58px;height:58px;
  font-size:28px;
  background:rgba(255,255,255,.78);
  backdrop-filter:blur(20px) saturate(150%);
  -webkit-backdrop-filter:blur(20px) saturate(150%);
  border:1px solid rgba(255,255,255,.92);
  box-shadow:0 8px 28px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.04);
}
[data-theme='dark'] .bottom-round{
  background:rgba(30,36,50,.78);
  border-color:rgba(255,255,255,.08);
  box-shadow:0 8px 28px rgba(0,0,0,.28), 0 0 0 0.5px rgba(0,0,0,.1);
}
.bottom-search{
  height:58px;
  border-radius:999px;
  background:rgba(255,255,255,.78);
  backdrop-filter:blur(20px) saturate(150%);
  -webkit-backdrop-filter:blur(20px) saturate(150%);
  border:1px solid rgba(255,255,255,.92);
  box-shadow:0 8px 28px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.04);
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 18px;
  color:var(--t2);
}
[data-theme='dark'] .bottom-search{
  background:rgba(30,36,50,.78);
  border-color:rgba(255,255,255,.08);
  box-shadow:0 8px 28px rgba(0,0,0,.28), 0 0 0 0.5px rgba(0,0,0,.1);
}
.bottom-search input{
  width:100%;
  border:none;
  outline:none;
  background:transparent;
  font-size:20px;
  color:var(--t1);
}
.bottom-search input::placeholder{color:var(--t2)}
.filter-popover{
  position:absolute;
  top:74px;
  right:18px;
  width:260px;
  padding:18px;
  background:rgba(255,255,255,.8);
  border:1px solid rgba(255,255,255,.9);
  border-radius:32px;
  box-shadow:var(--shadow);
  backdrop-filter:blur(26px);
  animation:pop .16s ease;
  z-index:20;
}
[data-theme='dark'] .filter-popover{
  background:rgba(24,28,37,.86);
  border-color:var(--bdr2);
}
.filter-title{
  color:var(--t2);
  font-size:14px;
  margin:0 0 12px 16px;
}
.filter-item{
  width:100%;
  height:48px;
  border:none;
  background:transparent;
  border-radius:16px;
  display:grid;
  grid-template-columns:34px 1fr;
  align-items:center;
  text-align:left;
  font-size:20px;
  cursor:pointer;
}
.filter-item:hover{background:var(--acc3)}
.filter-check{text-align:center;font-size:22px}
.filter-sep{height:1px;background:var(--bdr);margin:10px 0}

/* EMPTY */
.product-empty{
  min-height:100%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
  padding:42px 22px;
}
.product-empty.mini{min-height:auto;padding:32px 16px}
.product-empty-icon{
  width:84px;height:84px;
  border:7px solid var(--t1);
  border-radius:50%;
  border-bottom-left-radius:18px;
  margin-bottom:22px;
}
.product-empty-title{
  font-size:28px;
  font-weight:900;
  letter-spacing:-.04em;
}
.product-empty-sub{
  color:var(--t2);
  font-size:17px;
  line-height:1.35;
  margin-top:8px;
}

/* AVATARS */
.av-wrap{
  position:relative;
  display:inline-flex;
  flex-shrink:0;
}
.av{
  width:48px;height:48px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:17px;font-weight:900;
  flex-shrink:0;position:relative;overflow:hidden;
}
.av-img{width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit}
.av.saved-avatar{
  background:var(--bg2);
  color:#343a42;
  border:1px solid var(--bdr2);
}
[data-theme='dark'] .av.saved-avatar{
  background:#e9edf3;
  color:#4a5260;
  border-color:rgba(255,255,255,.22);
}
.saved-avatar-star{
  width:50%;
  height:50%;
  display:block;
}
.saved-avatar-star path{
  fill:none;
  stroke:currentColor;
  stroke-width:1.7;
  stroke-linecap:round;
  stroke-linejoin:round;
}
.home-screen--compact .saved-avatar-star{
  width:46%;
  height:46%;
}
.av.xs{width:32px;height:32px;font-size:12px}
.av.sm{width:28px;height:28px;font-size:11px}
.av.md{width:44px;height:44px;font-size:15px}
.av.lg{width:64px;height:64px;font-size:24px;box-shadow:0 8px 16px rgba(0,0,0,.12)}
.av.xl{width:80px;height:80px;font-size:28px}
.online-dot{
  position:absolute;
  right:-3px;
  bottom:-3px;
  width:13px;
  height:13px;
  border-radius:50%;
  background:var(--green);
  border:2px solid var(--bg0);
  box-shadow:0 2px 6px rgba(0,0,0,.18);
  z-index:2;
}

/* CHAT — floating transparent header, messages scroll beneath */
.product-chat-head{
  position:absolute;
  top:0;left:0;right:0;
  z-index:10;
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px 14px 0;
  height:78px;
  flex-shrink:0;
  background:transparent;
  border:none;
  pointer-events:auto;
}
.product-chat-head .round-action{
  width:42px;height:42px;border-radius:50%;
  background:rgba(255,255,255,.14);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
  box-shadow:0 8px 28px rgba(0,0,0,.06);
  display:flex;align-items:center;justify-content:center;
  color:var(--text);cursor:pointer;flex-shrink:0;border:none;
}
[data-theme='dark'] .product-chat-head .round-action{
  background:rgba(255,255,255,.06);
  border-color:rgba(255,255,255,.08);
}
.product-chat-head .round-action svg{width:22px;height:22px}
[data-theme='dark'] .product-chat-head{
  background:rgba(8,10,18,.3);
}

/* Name pill — glass island centered */
.chat-head-name-pill{
  flex:1;min-width:0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  border:none;background:rgba(255,255,255,.18);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
  border:none;
  border-radius:999px;
  padding:6px 18px;
  cursor:pointer;
  color:var(--t1);
  box-shadow:0 8px 28px rgba(0,0,0,.06);
  transition:transform .12s ease;
}
[data-theme='dark'] .chat-head-name-pill{
  background:rgba(255,255,255,.06);
  box-shadow:0 8px 28px rgba(0,0,0,.28);
}
.chat-head-name-pill:active{transform:scale(.97)}
.chat-head-name-pill b{
  font-size:16px;font-weight:900;letter-spacing:-.025em;
  max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  color:rgba(0,0,0,.85);
}
[data-theme='dark'] .chat-head-name-pill b{color:rgba(255,255,255,.9)}
.chat-head-name-pill small{
  font-size:11px;color:var(--green);margin-top:-1px;
}
.chat-head-name-pill small.off{color:var(--t2)}

/* Avatar button — right side */
.chat-head-right{display:flex;align-items:center;gap:4px}
.chat-head-mini-btn{
  width:38px;height:38px;border:none;border-radius:50%;
  background:rgba(255,255,255,.14);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
  box-shadow:0 8px 28px rgba(0,0,0,.06);
  color:var(--t1);cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:transform .1s;
}
.chat-head-mini-btn svg{width:18px;height:18px}
.chat-head-mini-btn:active{transform:scale(.92)}
[data-theme='dark'] .chat-head-mini-btn{background:rgba(255,255,255,.06)}
.chat-head-avatar{
  flex-shrink:0;
  border:none;background:rgba(255,255,255,.14);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
  box-shadow:0 8px 28px rgba(0,0,0,.06);
  border-radius:50%;padding:3px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:transform .12s ease;
}
[data-theme='dark'] .chat-head-avatar{
  background:rgba(255,255,255,.06);
  border-color:rgba(255,255,255,.08);
}
.chat-head-avatar:active{transform:scale(.95)}
.chat-head-avatar .av{width:40px;height:40px;font-size:17px;box-shadow:0 0 0 2px rgba(0,0,0,.04);}
.msgs{
  flex:1;
  min-height:0;
  overflow-y:scroll!important;
  padding:82px 20px 100px;
  position:relative;
  z-index:1;
}
.msg-wrap{display:flex;margin-top:3px}
.msg-wrap:first-child{margin-top:0}
.scroll-bottom-btn{
  position:absolute;bottom:80px;right:14px;
  width:34px;height:34px;border-radius:50%;
  background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.12);
  color:var(--text);cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  box-shadow:0 4px 14px rgba(0,0,0,.12);
  z-index:8;
  transition:transform var(--fast),background var(--fast);
}
.scroll-bottom-btn:hover{transform:scale(1.06);background:rgba(255,255,255,.16)}
.scroll-bottom-btn:active{transform:scale(.94)}
.scroll-bottom-btn svg{width:16px;height:16px}
.date-div{
  align-self:center;
  color:var(--t2);
  font-size:12px;
  margin:8px 0 18px;
}
.msg-wrap{
  display:flex;
  align-items:flex-end;
  gap:8px;
  margin-bottom:2px;
  animation:fadeUp .2s ease both;
}
.msg-wrap.out{flex-direction:row-reverse}
.msg-wrap.msg-expiring{animation:fadeOut .4s ease both}
.bubble{
  max-width:min(68%,560px);
  padding:8px 13px;
  border-radius:18px;
  position:relative;
  font-size:15px;
  line-height:1.45;
  word-break:break-word;
  cursor:pointer;
  box-shadow:0 1px 1px rgba(0,0,0,.04);
  transition:box-shadow .15s,transform .1s;
}
.bubble:active{transform:scale(.97)}
.bubble.in{
  background:rgba(255,255,255,.88);
  color:var(--t1);
  border-bottom-left-radius:4px;
  box-shadow:0 2px 8px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
}
[data-theme='dark'] .bubble.in{
  background:rgba(27,34,45,.88);
}
.bubble.out{
  background:rgba(15,110,168,.9);
  color:#fff;
  border-bottom-right-radius:4px;
  backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
}
[data-theme='dark'] .bubble.out{
  background:rgba(31,109,162,.88);
}
.msg-meta{
  display:flex;
  align-items:center;
  gap:4px;
  justify-content:flex-end;
  font-size:11px;
  opacity:.64;
  margin-top:3px;
  float:right;
  margin-left:10px;
}
.check.read{color:#91d7ff}
.edited-mark{font-style:italic}
.msg-img{
  display:block;
  max-width:min(320px,58vw);
  max-height:360px;
  object-fit:cover;
  border-radius:16px;
  margin-bottom:6px;
}
.voice-msg{
  display:flex;
  align-items:center;
  gap:10px;
  min-width:200px;
  max-width:min(320px,58vw);
  padding:8px 10px 8px 8px;
  margin-bottom:4px;
  border-radius:20px;
  color:inherit;
}
.voice-msg-btn{
  width:36px;
  height:36px;
  flex-shrink:0;
  border:none;
  border-radius:50%;
  background:rgba(255,255,255,.18);
  color:inherit;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:0;
}
.voice-msg-in .voice-msg-btn{
  background:var(--bg2);
  color:var(--t1);
}
.voice-msg-preview .voice-msg-btn{
  background:var(--bg2);
  color:var(--t1);
}
.voice-msg-btn:hover{filter:brightness(1.05)}
.voice-msg-btn .btn-icon{
  width:18px;
  height:18px;
  fill:currentColor;
  stroke:currentColor;
  stroke-width:2;
  stroke-linecap:round;
  stroke-linejoin:round;
}
.voice-msg-body{
  flex:1;
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:2px;
}
.voice-msg-wave{
  height:30px;
  display:flex;
  align-items:center;
  gap:2px;
  cursor:pointer;
  user-select:none;
}
.voice-msg-wave i{
  flex:1;
  width:3px;
  min-width:3px;
  border-radius:999px;
  background:currentColor;
  opacity:.32;
  transition:opacity .12s ease;
}
.voice-msg-wave i.active{opacity:.95}
.voice-msg-meta{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  font-size:11px;
}
.voice-msg-time{
  font-weight:800;
  opacity:.8;
  letter-spacing:-.01em;
}
.voice-msg-rate{
  border:none;
  background:transparent;
  color:inherit;
  cursor:pointer;
  font-size:11px;
  font-weight:900;
  opacity:.78;
  padding:0 2px;
}
.voice-msg-rate:hover{opacity:1}
.voice-msg-cancel{
  width:28px;
  height:28px;
  flex-shrink:0;
  border:none;
  border-radius:50%;
  background:var(--bg2);
  color:var(--t1);
  cursor:pointer;
  font-size:18px;
  line-height:1;
}
.reply-quote{
  background:rgba(0,0,0,.07);
  border-left:3px solid currentColor;
  border-radius:10px;
  padding:5px 8px;
  margin-bottom:7px;
  font-size:12px;
  opacity:.8;
}
.reply-q-name{font-weight:800;margin-bottom:2px}
.reply-q-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px}
.message-reactions,.reaction-row{
  display:flex;
  gap:4px;
  flex-wrap:wrap;
  margin-top:7px;
  clear:both;
}
.reaction-chip{
  display:inline-flex;
  align-items:center;
  gap:4px;
  padding:2px 7px;
  font-size:12px;
  border:1px solid rgba(255,255,255,.22);
  background:rgba(255,255,255,.18);
  color:inherit;
  border-radius:999px;
  cursor:pointer;
  user-select:none;
  transition:background .12s,transform .1s;
}
.reaction-chip:hover{background:rgba(255,255,255,.3);transform:scale(1.08)}
.reaction-chip.mine{background:rgba(255,255,255,.35);border-color:rgba(255,255,255,.5)}
.bubble.in .reaction-chip{border-color:var(--bdr2);background:var(--bg2)}
.request-wait-banner{
  display:block;
  max-width:360px;
  margin:8px auto 0;
  padding:8px 14px;
  border-radius:999px;
  background:var(--bg2);
  color:var(--t2);
  font-size:12px;
  font-weight:600;
  text-align:center;
  box-shadow:none;
}
.group-mute-banner{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  flex-wrap:wrap;
  margin:8px 14px 0;
  padding:10px 14px;
  border-radius:18px;
  background:var(--bg2);
  border:1px solid var(--bdr);
  color:var(--t2);
  font-size:13px;
  font-weight:700;
  line-height:1.35;
  text-align:center;
}
.group-mute-banner__icon{
  font-size:16px;
  line-height:1;
}
.new-chat-drawer-user-main{
  flex:1;
  min-width:0;
}
.new-chat-drawer-user-main small{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.typing{
  display:flex;
  align-items:center;
  gap:4px;
  padding:13px 16px;
  border-radius:20px;
  background:var(--in);
}
.td{
  width:6px;height:6px;
  border-radius:50%;
  background:var(--t2);
  animation:bounce 1.2s infinite;
}
.td:nth-child(2){animation-delay:.15s}
.td:nth-child(3){animation-delay:.3s}

/* INPUT */
.reply-prev{
  margin:8px 14px 0;
  padding:10px 12px;
  border-radius:18px;
  background:var(--bg1);
  display:flex;
  align-items:center;
  gap:10px;
  box-shadow:var(--soft-shadow);
}
.reply-prev-inner{flex:1;min-width:0}
.reply-prev-name{font-size:12px;font-weight:900}
.reply-prev-txt{font-size:13px;color:var(--t2)}
.reply-prev-icon{display:flex;color:var(--acc);flex-shrink:0}
.attachment-preview-wrap{
  padding:8px 14px 0;
  background:var(--bg1);
  display:flex;
  align-items:flex-start;
  gap:8px;
}
.attachment-preview-img{
  position:relative;
  width:80px;
  height:80px;
  border-radius:10px;
  overflow:hidden;
  border:1px solid var(--bdr2);
  flex-shrink:0;
}
.attachment-preview-img img{
  width:100%;height:100%;object-fit:cover;display:block;
}
.attachment-preview-file{
  padding:8px 14px 0;
  background:var(--bg1);
  display:flex;
  align-items:center;
  gap:8px;
}
.attachment-remove-btn{
  width:22px;height:22px;border-radius:50%;
  background:var(--danger);
  border:none;
  color:#fff;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
  transition:transform .1s;
}
.attachment-remove-btn:active{transform:scale(.88)}
.attachment-remove-btn svg{width:12px;height:12px}
.input-bar{
  position:absolute;
  bottom:0;left:0;right:0;
  padding:10px 14px 16px;
  display:flex;
  align-items:flex-end;
  gap:10px;
  background:transparent;
  border:none;
  z-index:10;
  pointer-events:auto;
}
.inp-area{
  flex:1;
  min-height:52px;
  border-radius:999px;
  background:rgba(255,255,255,.78);
  backdrop-filter:blur(20px) saturate(150%);
  -webkit-backdrop-filter:blur(20px) saturate(150%);
  border:1px solid rgba(255,255,255,.92);
  box-shadow:0 8px 28px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.04);
  display:flex;
  align-items:flex-end;
  gap:2px;
  padding:0 8px;
  padding:8px 8px 8px 12px;
  cursor:text;
}
[data-theme='dark'] .inp-area{
  background:rgba(30,36,50,.78);
  border-color:rgba(255,255,255,.08);
  box-shadow:0 8px 28px rgba(0,0,0,.28), 0 0 0 0.5px rgba(0,0,0,.1);
}
.inp-area--group-muted{
  justify-content:center;
  padding:10px 16px;
  cursor:default;
}
.inp-area.recording-inline{
  align-items:center;
  padding:8px 14px;
  cursor:default;
  gap:10px;
}
.inp-area.recording-inline .msg-inp-wrap,
.inp-area.recording-inline .inp-icon-btn,
.inp-area.recording-inline>.emoji-trigger,
.inp-area.recording-inline>input{
  display:none;
}
.inp-btn-wrap{position:relative}
.hidden-inp{display:none}
.recording-inline-cancel,
.recording-pause{
  border:none;
  background:transparent;
  color:var(--t2);
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
}
.recording-inline-cancel{
  width:34px;height:34px;border-radius:50%;
  background:rgba(255,255,255,.25);
  color:var(--t1);
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;font-size:18px;
  transition:background .12s;
}
.recording-inline-cancel:hover{background:rgba(255,59,92,.15)}
.recording-inline-cancel:active{background:rgba(255,59,92,.25)}
.recording-inline-cancel svg{width:16px;height:16px}
.recording-lock-icon{
  flex-shrink:0;
  color:var(--red);
  opacity:.7;
}
.recording-time{
  color:var(--t1);
  font-size:14px;
  font-weight:900;
  min-width:42px;
  flex-shrink:0;
}
.voice-live-wave{
  flex:1;
  min-width:0;
  height:32px;
  display:flex;
  align-items:center;
  gap:2px;
  overflow:hidden;
  justify-content:flex-start;
}
.voice-live-wave i{
  flex:1;
  max-width:6px;
  min-width:2px;
  min-height:4px;
  border-radius:999px;
  background:var(--t2);
  opacity:.72;
  transition:height .08s linear, opacity .12s;
}
.voice-live-wave.paused i{
  opacity:.32;
}
.recording-pause{
  width:34px;
  height:34px;
  border-radius:50%;
  background:var(--bg2);
  color:var(--t1);
  flex-shrink:0;
}
.recording-pause .btn-icon{
  width:19px;
  height:19px;
}
.msg-inp-wrap{
  flex:1;
  min-width:0;
  position:relative;
  align-self:stretch;
  display:flex;
  align-items:flex-end;
}
.msg-inp-wrap--mute .msg-inp{
  color:transparent;
  caret-color:transparent;
  -webkit-text-fill-color:transparent;
}
.msg-inp-wrap--mute .msg-inp::placeholder{
  color:transparent;
}
.group-mute-in-inp{
  position:absolute;
  left:0;
  right:0;
  top:50%;
  transform:translateY(-50%);
  display:flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  flex-wrap:wrap;
  padding:2px 4px;
  pointer-events:none;
  z-index:1;
  text-align:center;
  color:var(--t2);
  font-size:13px;
  font-weight:700;
  line-height:1.35;
}
.group-mute-in-inp__text{
  min-width:0;
}
.msg-inp{
  flex:1;
  min-width:0;
  min-height:30px;
  max-height:120px;
  border:none;
  outline:none;
  background:transparent;
  color:var(--t1);
  resize:none;
  font-size:16px;
  line-height:1.55;
  padding:3px 0;
}
.msg-inp::placeholder{color:var(--t2)}
/* ── Unified icon button inside the input pill ──────────────────────────── */
.inp-icon-btn{
  border:none;background:transparent;
  cursor:pointer;
  height:34px;
  width:34px;
  display:flex;
  align-items:center;
  justify-content:center;
  color:var(--t2);
  transition:color .15s ease;
  padding:0;
  flex-shrink:0;
  border-radius:50%;
}
.inp-icon-btn .btn-icon{width:21px;height:21px}
.inp-icon-btn:hover{color:var(--t1)}
.inp-icon-btn.active{color:var(--acc)}
.inp-icon-btn:disabled{opacity:.45;cursor:default}

/* legacy alias kept for recording state */
.emoji-trigger{
  border:none;background:transparent;
  cursor:pointer;height:34px;width:34px;
  display:flex;align-items:center;justify-content:center;
  color:var(--t2);padding:0;flex-shrink:0;
}
.emoji-trigger.recording{
  color:var(--red);
  animation:pulseVoice 1s ease-in-out infinite;
}

/* ── Attach popup menu (Telegram-style) ─────────────────────────────────── */
.attach-menu{
  position:absolute;
  bottom:calc(100% + 12px);
  left:-4px;
  background:var(--bg1);
  border:1px solid var(--bdr);
  border-radius:12px;
  padding:6px;
  box-shadow:var(--shadow);
  min-width:185px;
  animation:pop .15s ease;
  z-index:20;
}
.attach-menu-item{
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px 14px;
  border-radius:8px;
  cursor:pointer;
  font-size:14px;
  color:var(--t1);
  transition:background .12s ease;
  white-space:nowrap;
}
.attach-menu-item:hover{background:var(--bg2)}
.attach-menu-icon{
  width:20px;height:20px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.8;
  stroke-linecap:round;
  stroke-linejoin:round;
  color:var(--t2);
  flex-shrink:0;
}

.old-voice-trigger{
  display:none;
}
.voice-error{
  margin:8px 14px 0;
  color:var(--red);
  font-size:13px;
}
.recording-pulse{
  width:10px;
  height:10px;
  border-radius:50%;
  background:var(--red);
  animation:pulseVoice 1s ease-in-out infinite;
  flex-shrink:0;
}
.voice-preview-wrap{
  margin:8px 14px 0;
  padding:6px 8px;
  border-radius:20px;
  background:var(--bg1);
  box-shadow:var(--soft-shadow);
  color:var(--t1);
}
.voice-preview-wrap .voice-msg{
  margin:0;
  padding:0;
  max-width:none;
}
@keyframes pulseVoice{
  0%,100%{transform:scale(1);opacity:1}
  50%{transform:scale(1.08);opacity:.72}
}
.send-btn{
  width:52px;height:52px;
  border:none;
  border-radius:50%;
  background:#111;
  color:#fff;
  font-size:20px;
  cursor:pointer;
  box-shadow:var(--soft-shadow);
  touch-action:none;
  user-select:none;
  display:flex;
  align-items:center;
  justify-content:center;
}
[data-theme='dark'] .send-btn{background:#f3f5f8;color:#08090b}
.send-btn:disabled{opacity:.35;cursor:default}
.btn-icon{
  width:23px;
  height:23px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.8;
  stroke-linecap:round;
  stroke-linejoin:round;
}
.mic-icon{
  width:22px;
  height:22px;
  stroke-width:1.7;
}
.send-btn.voice-ready{
  background:var(--bg1);
  color:#111;
  box-shadow:var(--soft-shadow);
  font-size:18px;
}
[data-theme='dark'] .send-btn.voice-ready{
  background:var(--bg1);
  color:var(--acc);
}
.send-btn.recording{
  background:var(--red);
  color:#fff;
  transform:scale(1.08);
  box-shadow:0 14px 34px rgba(229,72,77,.3);
}
.send-btn.locked{
  opacity:1;
}
.emoji-picker{
  position:absolute;
  bottom:calc(100% + 8px);
  right:60px;
  width:310px;
  padding:12px;
  background:rgba(255,255,255,.86);
  border:1px solid rgba(255,255,255,.95);
  border-radius:28px;
  box-shadow:var(--shadow);
  backdrop-filter:blur(24px);
  z-index:40;
}
[data-theme='dark'] .emoji-picker{
  background:rgba(24,28,37,.9);
  border-color:var(--bdr2);
}
.emoji-cats,.emoji-grid{display:grid;gap:6px}
.emoji-cats{
  grid-template-columns:repeat(5,1fr);
  margin-bottom:10px;
}
.emoji-grid{grid-template-columns:repeat(8,1fr)}
.emoji-cat-btn,.emoji-btn{
  border:none;
  background:transparent;
  border-radius:12px;
  cursor:pointer;
  height:34px;
  font-size:18px;
}
.emoji-cat-btn:hover,.emoji-btn:hover,.emoji-cat-btn.active{background:var(--bg2)}
.emoji-section-head{
  display:flex;
  justify-content:space-between;
  color:var(--t2);
  font-size:13px;
  margin:7px 2px 10px;
}
.emoji-clear-btn{border:none;background:transparent;color:var(--t1);cursor:pointer}
.emoji-empty{
  grid-column:1/-1;
  color:var(--t2);
  text-align:center;
  padding:20px 8px;
}

/* CONTEXT MENU */
.ctx-menu{
  position:fixed;
  min-width:186px;
  padding:8px;
  background:rgba(255,255,255,.84);
  border:1px solid rgba(255,255,255,.9);
  border-radius:22px;
  box-shadow:var(--shadow);
  backdrop-filter:blur(24px);
  z-index:200;
  animation:pop .14s ease;
}
[data-theme='dark'] .ctx-menu{
  background:rgba(24,28,37,.92);
  border-color:var(--bdr2);
}
.ctx-reactions{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:3px;
  padding:3px;
}
.ctx-react{
  height:30px;
  border:none;
  border-radius:11px;
  background:transparent;
  cursor:pointer;
  font-size:17px;
}
.ctx-react:hover{background:var(--bg2)}
.ctx-item{
  width:100%;
  height:42px;
  border:none;
  background:transparent;
  border-radius:13px;
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 12px;
  font-size:15px;
  font-weight:700;
  cursor:pointer;
}
.ctx-item:hover{background:var(--bg2)}
.ctx-item.danger{color:var(--red)}
.ci{width:20px;text-align:center}
.menu-line{height:1px;background:var(--bdr);margin:6px}
.group-admin-ctx-menu{
  z-index:280;
  max-height:min(70vh,420px);
  overflow-y:auto;
}

/* SHEETS / SETTINGS / NEW CHAT — Apple-style unified glass modals */
.sheet-bg,.modal-bg{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.3);
  backdrop-filter:blur(2px);
  -webkit-backdrop-filter:blur(2px);
  display:flex;
  align-items:stretch;
  justify-content:center;
  z-index:250;
  animation:fadeIn .2s ease;
  transition:opacity .2s,backdrop-filter .2s;
}
.sheet-bg.closing,.modal-bg.closing{
  opacity:0;
  backdrop-filter:blur(0);
  -webkit-backdrop-filter:blur(0);
  pointer-events:none;
}
.sheet-bg.closing > .modal,
.modal-bg.closing > .modal{
  transform:translateY(12px) scale(.97);
  opacity:0;
  transition:transform .2s ease,opacity .2s ease;
}
[data-theme='dark'] .sheet-bg,[data-theme='dark'] .modal-bg{
  background:rgba(0,0,0,.55);
}
/* Unified glass card for all modals */
.glass-modal,.modal{
  background:rgba(255,255,255,.88);
  backdrop-filter:blur(32px) saturate(140%);
  -webkit-backdrop-filter:blur(32px) saturate(140%);
  border:1px solid rgba(255,255,255,.95);
  box-shadow:
    0 22px 70px rgba(0,0,0,.13),
    0 0 0 0.5px rgba(0,0,0,.04),
    inset 0 0.5px 0 rgba(255,255,255,.6);
  transition:transform .2s ease,opacity .2s ease;
}
[data-theme='dark'] .glass-modal,[data-theme='dark'] .modal{
  background:rgba(30,36,50,.88);
  border:1px solid rgba(255,255,255,.06);
  box-shadow:
    0 22px 70px rgba(0,0,0,.35),
    0 0 0 0.5px rgba(0,0,0,.12),
    inset 0 0.5px 0 rgba(255,255,255,.08);
}
.settings-screen,.new-chat-screen{
  width:min(100%,520px);
  height:100%;
  background:var(--bg0);
  border-radius:0;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  animation:fadeUp .18s ease;
}
.user-profile-screen{
  width:min(92vw,520px);
  max-height:min(88vh,820px);
  background:var(--bg0);
  border-radius:28px;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  animation:fadeUp .18s ease;
  box-shadow:0 24px 56px rgba(16,22,44,.22);
}
.user-profile-screen.glass-modal{
  background:rgba(255,255,255,.88);
}
[data-theme='dark'] .user-profile-screen.glass-modal{
  background:rgba(30,36,50,.88);
}
.user-profile-modal-bg{
  align-items:center;
  padding:max(12px, env(safe-area-inset-top, 0)) 12px max(12px, env(safe-area-inset-bottom, 0));
}
.settings-content,.new-chat-list{
  flex:1;
  padding:18px 22px 32px;
}
.user-profile-content{
  flex:1;
  padding:18px 22px 32px;
  overflow-y:auto;
}
.user-profile-hero{
  position:relative;
  background:
    linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.38)),
    var(--bg1);
  border:1px solid color-mix(in srgb, var(--bdr) 75%, transparent);
  border-radius:30px;
  padding:18px 18px 14px;
  display:flex;
  flex-direction:column;
  gap:14px;
  box-shadow:
    0 12px 26px rgba(16,22,44,.08),
    inset 0 1px 0 rgba(255,255,255,.45);
}
.user-profile-hero-top{
  display:flex;
  align-items:center;
  gap:14px;
  min-width:0;
}
.user-profile-hero-main{
  display:flex;
  flex-direction:column;
  min-width:0;
  gap:4px;
}
.user-profile-hero .av.xl{
  width:64px;
  height:64px;
  font-size:24px;
  box-shadow:0 8px 16px rgba(0,0,0,.12);
}
.user-profile-name{
  font-size:30px;
  line-height:1.02;
  letter-spacing:-.03em;
}
.user-profile-sub{
  color:var(--t2);
  font-size:14px;
}
.user-profile-sub.off{opacity:.8}
.user-profile-status{
  font-size:13px;
}
.user-profile-meta-row{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.user-profile-pill{
  display:inline-flex;
  align-items:center;
  padding:6px 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:700;
  background:rgba(12,16,28,.08);
  color:var(--t1);
}
.user-profile-pill--muted{
  background:rgba(12,16,28,.05);
  color:var(--t2);
}
.user-profile-bio{
  margin-top:2px;
  color:var(--t2);
  font-size:13px;
  line-height:1.4;
  max-width:100%;
}

/* Profile inline modal (user info in centered modal card) */
.profile-modal{
  width:min(420px,92vw);
  max-height:min(88vh,780px);
  overflow-y:auto;
}
.profile-modal .modal-title{margin-bottom:16px}
/* Hero section: avatar + name + status */
.up-hero{
  display:flex;flex-direction:column;align-items:center;
  padding:8px 0 16px;gap:6px;
}
.up-hero .av.xl{width:80px;height:80px;font-size:28px;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.up-name{font-size:22px;font-weight:900;letter-spacing:-.035em;color:rgba(0,0,0,.88)}
[data-theme='dark'] .up-name{color:rgba(255,255,255,.92)}
.up-username{font-size:14px;color:var(--t2);margin-top:-2px}
.up-status{font-size:13px;color:var(--green);font-weight:600}
.up-status.off{color:var(--t2)}

/* Action buttons row */
.up-actions{
  display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;
}
.up-action-btn{
  display:flex;flex-direction:column;align-items:center;gap:6px;
  border:1px solid rgba(255,255,255,.1);
  border-radius:22px;padding:16px 8px 14px;
  background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));
  box-shadow:0 8px 20px rgba(0,0,0,.1),inset 0 1px 0 rgba(255,255,255,.06);
  color:var(--t1);cursor:pointer;
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  transition:transform .12s,box-shadow .12s;
}
.up-action-btn:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,255,.08)}
[data-theme='dark'] .up-action-btn{background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));box-shadow:0 8px 20px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.04)}
.up-action-btn:active{transform:scale(.96);background:rgba(0,0,0,.07)}
[data-theme='dark'] .up-action-btn:active{background:rgba(255,255,255,.1)}
.up-action-btn.muted .up-action-icon{background:var(--red);color:#fff;animation:mutePop .3s ease}
.up-action-btn.muted:active{background:rgba(229,72,77,.15)}
[data-theme='dark'] .up-action-btn.muted:active{background:rgba(229,72,77,.2)}
@keyframes mutePop{0%{transform:scale(1)}40%{transform:scale(1.15)}100%{transform:scale(1)}}
.up-action-icon{width:28px;height:28px;display:flex;align-items:center;justify-content:center}
.up-action-icon svg{width:24px;height:24px;display:block}
.up-action-label{font-size:12px;font-weight:750;color:var(--t2)}

/* Rows (search, more) */
.up-row{
  width:100%;display:flex;align-items:center;gap:12px;
  border:none;border-radius:16px;padding:12px 14px;margin-bottom:6px;
  background:rgba(0,0,0,.04);color:var(--t1);cursor:pointer;text-align:left;
  transition:background .1s;box-shadow:0 1px 3px rgba(0,0,0,.04);
}
[data-theme='dark'] .up-row{background:rgba(255,255,255,.06);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.up-row:active{background:rgba(0,0,0,.07)}
[data-theme='dark'] .up-row:active{background:rgba(255,255,255,.1)}
.up-row-icon{width:32px;height:32px;border-radius:12px;background:rgba(0,0,0,.04);display:flex;align-items:center;justify-content:center;flex-shrink:0}
[data-theme='dark'] .up-row-icon{background:rgba(255,255,255,.06)}
.up-row-icon svg{width:18px;height:18px;display:block}
.up-row b{flex:1;font-size:15px;font-weight:800;color:rgba(0,0,0,.82)}
[data-theme='dark'] .up-row b{color:rgba(255,255,255,.88)}
.up-row i{font-style:normal;color:var(--t3);font-size:20px}

/* Profile modal — media/files/voice/links section */
.profile-media-section{margin-top:16px;padding-top:12px;border-top:1px solid var(--bdr)}
.profile-media-tabs{
  display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;
}
.profile-media-tab{
  display:flex;flex-direction:column;align-items:center;gap:4px;
  border:none;border-radius:16px;background:rgba(0,0,0,.03);padding:10px 4px;
  cursor:pointer;color:var(--t2);transition:background .1s;
}
[data-theme='dark'] .profile-media-tab{background:rgba(255,255,255,.04)}
.profile-media-tab .pmt-icon{width:24px;height:24px;display:flex;align-items:center;justify-content:center}
.profile-media-tab .pmt-icon svg{width:20px;height:20px;display:block}
.profile-media-tab .pmt-label{font-size:11px;font-weight:700;white-space:nowrap}
.profile-media-tab.disabled{opacity:.5;cursor:default}
.profile-media-empty{
  text-align:center;padding:18px 0 6px;font-size:13px;color:var(--t2);font-weight:600;
}
.user-alias-card{padding:16px}
.user-alias-row{
  display:flex;
  gap:10px;
  align-items:center;
}
.user-alias-row input{
  flex:1;
  min-width:0;
  height:42px;
  padding:0 14px;
  border-radius:14px;
  border:1px solid var(--bdr);
  background:var(--bg0);
  color:var(--t1);
  outline:none;
  font-weight:700;
}
.user-alias-row input:focus{border-color:rgba(100,140,255,.55)}
.soft-btn{
  height:42px;
  padding:0 14px;
  border-radius:14px;
  border:none;
  background:var(--bg2);
  color:var(--t1);
  cursor:pointer;
  font-weight:800;
}
.soft-btn:disabled{opacity:.6;cursor:default}
.user-alias-hint{
  margin-top:10px;
  color:var(--t2);
  font-size:12px;
  line-height:1.35;
}

/* New Chat Modal — centered glass card */
.new-chat-bg{align-items:flex-start;padding-top:max(20px, env(safe-area-inset-top, 0))}
.new-chat-modal{width:min(500px,92vw);max-height:90dvh;display:flex;flex-direction:column}
.new-chat-modal .modal-title{margin-bottom:10px}
.new-chat-search{
  display:flex;align-items:center;gap:10px;
  margin:0 0 12px;
  border-radius:16px;background:rgba(0,0,0,.04);padding:0 14px;height:44px;
  color:var(--t2);
}
[data-theme='dark'] .new-chat-search{background:rgba(255,255,255,.06)}
.new-chat-search input{flex:1;min-width:0;border:none;outline:none;background:transparent;color:var(--t1);font-size:15px}
.new-chat-tabs{
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;
  margin:0 0 12px;border-radius:14px;padding:3px;background:rgba(0,0,0,.04);
}
[data-theme='dark'] .new-chat-tabs{background:rgba(255,255,255,.06)}
.new-chat-tabs button{
  border:none;border-radius:11px;background:transparent;cursor:pointer;
  font-weight:750;font-size:13px;padding:8px 0;color:var(--t2);
  transition:background .1s,color .1s;
}
.new-chat-tabs button.active{background:var(--bg0);color:var(--t1);box-shadow:0 1px 4px rgba(0,0,0,.06)}
.new-chat-error{margin-bottom:10px}
.new-chat-content{flex:1;overflow-y:auto;min-height:0;margin:0 -4px 0 0;padding-right:4px}
.new-chat-bottom{display:flex;gap:10px;padding-top:12px;flex-shrink:0}
/* NewChat inner items */
.new-chat-action,.new-chat-user{
  width:100%;border:none;background:var(--bg1);border-radius:28px;padding:18px;
  display:flex;align-items:center;gap:16px;text-align:left;cursor:pointer;margin-bottom:10px;
}
.new-chat-action:active,.new-chat-user:active{transform:scale(.99)}
.new-chat-action i,.new-chat-user i{margin-left:auto;color:var(--t3);font-style:normal;font-size:28px}
.new-chat-action-icon{
  width:56px;height:56px;border-radius:50%;background:var(--bg3);
  display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;
}
.new-chat-action-text,.new-chat-user-main{
  display:flex;flex-direction:column;flex:1;min-width:0;
}
.new-chat-action-text b,.new-chat-user-main b{font-size:20px;letter-spacing:-.03em}
.new-chat-action-text small,.new-chat-user-main small{
  color:var(--t2);font-size:15px;margin-top:3px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.new-chat-group-card{background:var(--bg1);border-radius:28px;padding:18px;margin-bottom:12px}
.new-chat-user{background:transparent;box-shadow:none}
.new-chat-user:hover,.new-chat-user.selected{background:var(--bg1)}
.new-chat-loading{display:flex;align-items:center;justify-content:center;padding:28px}

/* Profile Settings Modal — centered glass card with tabs */
/* Profile Settings Modal — single-page glass layout */
.profile-settings-modal{
  width:min(440px,92vw);
  max-height:88dvh;
  display:flex;
  flex-direction:column;
  padding:0;
  overflow:hidden;
  position:relative;
}
.ps-header{
  display:flex;
  align-items:center;
  justify-content:center;
  padding:14px 22px 4px;
  flex-shrink:0;
  position:relative;
}
.ps-header b{font-size:18px;font-weight:900;letter-spacing:-.025em}
.ps-header .modal-close{position:absolute;right:16px;top:50%;transform:translateY(-50%)}
.ps-scroll{flex:1;overflow-y:auto;padding:6px 20px 18px;min-height:0}

/* Hero block */
.ps-hero{
  display:flex;flex-direction:column;align-items:center;
  padding:12px 0 18px;gap:8px;
}
.ps-hero-avatar{
  position:relative;cursor:pointer;flex-shrink:0;
}
.ps-hero-avatar-inner{
  width:80px;height:80px;border-radius:50%;overflow:hidden;
  background:linear-gradient(135deg,#8a8a8a,#555);
  display:flex;align-items:center;justify-content:center;
  font-size:26px;font-weight:900;color:#fff;
  box-shadow:0 8px 24px rgba(0,0,0,.12);
}
.ps-hero-avatar-overlay{
  position:absolute;inset:0;border-radius:50%;
  background:rgba(0,0,0,.35);
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:28px;font-weight:300;
}
.ps-hero-edit-btn{
  position:absolute;top:6px;left:calc(100% + 8px);
  border:2px solid var(--bg0);border-radius:999px;
  background:rgba(0,0,0,.06);color:var(--t1);
  font-size:11px;font-weight:800;padding:3px 8px;line-height:1.3;
  cursor:pointer;transition:background .12s,transform .1s;z-index:2;
}
.ps-hero-edit-btn:active{transform:scale(.92);background:rgba(0,0,0,.1)}
.ps-hero-edit-btn:disabled{opacity:.4;cursor:default}
[data-theme='dark'] .ps-hero-edit-btn{background:rgba(255,255,255,.12)}
[data-theme='dark'] .ps-hero-edit-btn:active{background:rgba(255,255,255,.18)}
.ps-hero-info{display:flex;flex-direction:column;align-items:center;gap:2px}
.ps-hero-name{font-size:20px;font-weight:900;letter-spacing:-.025em}
.ps-hero-username{font-size:14px;color:var(--t2);font-weight:600}

/* Section labels */
.ps-section-label{
  font-size:13px;font-weight:850;color:var(--t2);
  text-transform:uppercase;letter-spacing:.04em;
  margin:16px 4px 6px;
}

/* Row buttons */
.ps-row{
  width:100%;display:flex;align-items:center;gap:14px;
  border:none;border-radius:16px;padding:10px 14px;margin-bottom:4px;
  background:rgba(0,0,0,.035);color:var(--t1);cursor:pointer;
  text-align:left;transition:background .12s,transform .1s;
}
.ps-row:active{transform:scale(.985);background:rgba(0,0,0,.06)}
.ps-row.disabled{opacity:.55;cursor:default}
.ps-row.disabled:active{transform:none;background:rgba(0,0,0,.035)}
.ps-row--danger{color:var(--red)}
.ps-row--danger:active{background:rgba(229,72,77,.1)}
[data-theme='dark'] .ps-row{background:rgba(255,255,255,.05)}
[data-theme='dark'] .ps-row:active{background:rgba(255,255,255,.09)}
[data-theme='dark'] .ps-row--danger:active{background:rgba(229,72,77,.15)}
.ps-row-icon{
  width:36px;height:36px;border-radius:12px;
  background:rgba(0,0,0,.035);display:flex;align-items:center;justify-content:center;
  flex-shrink:0;
}
[data-theme='dark'] .ps-row-icon{background:rgba(255,255,255,.06)}
.ps-row-icon svg{width:18px;height:18px;display:block}
.ps-row-main{flex:1;min-width:0}
.ps-row-main b{display:block;font-size:15px;font-weight:800}
.ps-row-main small{display:block;font-size:12px;color:var(--t2);margin-top:1px}
.ps-row i{font-style:normal;color:var(--t3);font-size:18px}

/* Toggle switch */
.ps-toggle{
  width:44px;height:26px;border-radius:999px;
  background:rgba(0,0,0,.12);position:relative;
  flex-shrink:0;transition:background .2s;
}
.ps-toggle.active{background:var(--acc)}
.ps-toggle span{
  position:absolute;top:3px;left:3px;
  width:20px;height:20px;border-radius:50%;
  background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.15);
  transition:transform .2s cubic-bezier(.34,1.56,.64,1);
}
.ps-toggle.active span{transform:translateX(18px)}
[data-theme='dark'] .ps-toggle{background:rgba(255,255,255,.18)}
[data-theme='dark'] .ps-toggle.active{background:var(--acc)}
[data-theme='dark'] .ps-toggle span{background:#f0f2f5}
[data-theme='dark'] .ps-toggle.active span{background:#fff}

/* Card for edit fields */
.ps-card{
  background:rgba(12,16,28,.04);
  border:1px solid color-mix(in srgb, var(--bdr) 70%, transparent);
  border-radius:20px;margin-bottom:16px;overflow:hidden;
}
[data-theme='dark'] .ps-card{background:rgba(255,255,255,.04)}
.ps-field{
  display:flex;flex-direction:column;gap:4px;
  padding:14px;border-bottom:1px solid color-mix(in srgb, var(--bdr) 50%, transparent);
}
.ps-field:last-child{border-bottom:none}
.ps-field > span{font-size:12px;font-weight:700;color:var(--t2)}
.ps-field input,.ps-field textarea{
  border:1px solid var(--bdr);border-radius:12px;padding:10px 14px;
  font-size:14px;color:var(--t1);background:var(--bg0);outline:none;
}
.ps-field input:focus,.ps-field textarea:focus{border-color:var(--acc)}
.ps-field textarea{resize:none;min-height:60px}
.ps-field-note{font-size:11px;color:var(--t2);line-height:1.35}
.ps-error{color:var(--red);margin-top:4px}
.ps-error-banner{
  background:rgba(255,60,60,.1);border:1px solid rgba(255,60,60,.2);
  border-radius:12px;padding:10px 14px;font-size:13px;color:var(--red);margin-bottom:12px;
}

/* Emoji status grid */
.ps-status-grid{
  display:grid;grid-template-columns:1fr 1fr;gap:6px;
  background:rgba(12,16,28,.04);border:1px solid color-mix(in srgb, var(--bdr) 70%, transparent);
  border-radius:20px;padding:10px;margin-bottom:12px;
}
[data-theme='dark'] .ps-status-grid{background:rgba(255,255,255,.04)}
.ps-status-item{
  display:flex;align-items:center;gap:8px;
  border:none;border-radius:14px;padding:10px 8px;
  background:transparent;color:var(--t1);cursor:pointer;
  text-align:left;transition:background .12s,transform .1s;
}
.ps-status-item:active{transform:scale(.97);background:rgba(0,0,0,.06)}
[data-theme='dark'] .ps-status-item:active{background:rgba(255,255,255,.08)}
.ps-status-emoji{font-size:24px;line-height:1;flex-shrink:0}
.ps-status-label{font-size:13px;font-weight:700;line-height:1.2}
.ps-status-custom{border:1px dashed var(--bdr2);background:rgba(0,0,0,.02)}
[data-theme='dark'] .ps-status-custom{background:rgba(255,255,255,.03)}

/* Device list inline */
.ps-device-desc{
  font-size:13px;line-height:1.5;color:var(--t2);
  margin:0 0 14px;padding:12px 14px;
  background:rgba(12,16,28,.035);border-radius:14px;
}
[data-theme='dark'] .ps-device-desc{background:rgba(255,255,255,.04)}
.ps-device-status{padding:20px;text-align:center;color:var(--t2);font-size:14px}
.ps-device-row{
  display:flex;align-items:center;gap:12px;padding:12px 14px;
  border-bottom:1px solid color-mix(in srgb, var(--bdr) 50%, transparent);
}
.ps-device-row:last-child{border-bottom:none}
.ps-device-icon{
  width:36px;height:36px;border-radius:12px;
  background:rgba(0,0,0,.035);display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
[data-theme='dark'] .ps-device-icon{background:rgba(255,255,255,.06)}
.ps-device-info{flex:1;min-width:0}
.ps-device-info b{display:block;font-size:14px;font-weight:800}
.ps-device-info small{display:block;font-size:11px;color:var(--t2);margin-top:1px}
.ps-device-badge{
  font-size:11px;font-weight:800;color:var(--green);
  background:rgba(26,160,93,.1);padding:4px 10px;border-radius:999px;flex-shrink:0;
}
.ps-device-kick{
  border:none;border-radius:999px;
  background:rgba(229,72,77,.12);color:var(--red);
  font-size:11px;font-weight:800;padding:5px 12px;cursor:pointer;flex-shrink:0;
}
.ps-device-kick:active{transform:scale(.95)}

/* FAQ items */
.ps-faq-item{padding:14px;border-bottom:1px solid color-mix(in srgb, var(--bdr) 50%, transparent)}
.ps-faq-item:last-child{border-bottom:none}
.ps-faq-q{display:block;font-size:14px;font-weight:800;margin-bottom:6px}
.ps-faq-a{margin:0;font-size:13px;line-height:1.5;color:var(--t2)}

/* About section */
.ps-about-hero{
  display:flex;flex-direction:column;align-items:center;
  padding:18px 14px 10px;gap:6px;
}
.ps-about-logo{
  width:56px;height:56px;border-radius:50%;
  background:linear-gradient(135deg,#333,#111);
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-size:28px;font-weight:900;margin-bottom:4px;
}
[data-theme='dark'] .ps-about-logo{background:linear-gradient(135deg,#555,#222)}
.ps-about-name{font-size:18px;font-weight:900;letter-spacing:-.025em}
.ps-about-version{font-size:12px;color:var(--t2)}
.ps-about-features{margin:6px 0 0 18px;padding:0}
.ps-about-features li{font-size:13px;color:var(--t2);line-height:1.6}

/* Sub-modals inside settings */
.ps-submodal-bg{
  position:fixed;inset:0;
  background:rgba(12,16,28,.45);
  z-index:300;display:flex;align-items:center;justify-content:center;
  animation:psFadeIn .15s ease;
}
[data-theme='dark'] .ps-submodal-bg{background:rgba(0,0,0,.65)}
@keyframes psFadeIn{from{opacity:0}to{opacity:1}}
@keyframes psSlideUp{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.ps-submodal{
  width:min(420px,92vw);max-height:88dvh;
  background:rgba(255,255,255,.88);
  backdrop-filter:blur(32px) saturate(140%);
  -webkit-backdrop-filter:blur(32px) saturate(140%);
  border:1px solid rgba(255,255,255,.95);
  border-radius:28px;
  display:flex;flex-direction:column;
  overflow:hidden;
  animation:psSlideUp .2s ease;
  box-shadow:0 22px 70px rgba(0,0,0,.13),0 0 0 0.5px rgba(0,0,0,.04),inset 0 0.5px 0 rgba(255,255,255,.6);
}
[data-theme='dark'] .ps-submodal{
  background:rgba(30,36,50,.88);
  border:1px solid rgba(255,255,255,.06);
  box-shadow:0 22px 70px rgba(0,0,0,.35),0 0 0 0.5px rgba(0,0,0,.12);
}
.ps-submodal-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;
  border-bottom:1px solid var(--bdr);
  flex-shrink:0;
  background:rgba(255,255,255,.4);
  backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
}
[data-theme='dark'] .ps-submodal-header{
  background:rgba(30,36,50,.4);
}
.ps-submodal-header b{font-size:16px}
.ps-submodal-scroll{flex:1;overflow-y:auto;padding:8px 0 20px}

/* Chat tools inside sub-modal — app design identity (.ps-row) */
.ps-submodal-tools{
  padding:0 4px;
}
.ps-submodal-tools .tool-card{
  margin-bottom:0;
}
.ps-submodal-tools .tool-title{
  font-size:13px;font-weight:850;color:var(--t2);
  text-transform:uppercase;letter-spacing:.04em;
  margin:6px 10px 8px;
}
.ps-submodal-tools .tool-row{
  width:100%;display:flex;align-items:center;gap:14px;
  border:none;border-radius:16px;padding:10px 14px;margin-bottom:4px;
  background:rgba(0,0,0,.035);color:var(--t1);cursor:pointer;
  text-align:left;transition:background .12s,transform .1s;
}
.ps-submodal-tools .tool-row:active{transform:scale(.985);background:rgba(0,0,0,.06)}
[data-theme='dark'] .ps-submodal-tools .tool-row{background:rgba(255,255,255,.05)}
[data-theme='dark'] .ps-submodal-tools .tool-row:active{background:rgba(255,255,255,.09)}
.ps-submodal-tools .tool-row.disabled{opacity:.55;cursor:default}
.ps-submodal-tools .tool-row.disabled:active{transform:none;background:rgba(0,0,0,.035)}
[data-theme='dark'] .ps-submodal-tools .tool-row.disabled:active{background:rgba(255,255,255,.05)}
.ps-submodal-tools .tool-row b{font-size:15px;font-weight:800;flex:1;min-width:0}
.ps-submodal-tools .tool-row em{
  font-style:normal;padding:3px 10px;border-radius:999px;
  background:rgba(0,0,0,.035);color:var(--t3);font-size:11px;font-weight:850;
}
[data-theme='dark'] .ps-submodal-tools .tool-row em{background:rgba(255,255,255,.06)}
.ps-submodal-tools .tool-row i{font-style:normal;color:var(--t3);font-size:18px}
.ps-submodal-tools .tool-row.danger b{color:var(--red)}
.ps-submodal-tools .tool-row.danger:active{background:rgba(229,72,77,.1)}
[data-theme='dark'] .ps-submodal-tools .tool-row.danger:active{background:rgba(229,72,77,.15)}
.ps-submodal-tools .tool-row.danger .tool-icon svg{stroke:var(--red)}
.ps-submodal-tools .tool-icon{
  width:36px;height:36px;border-radius:12px;
  background:rgba(0,0,0,.035);display:flex;align-items:center;justify-content:center;
  flex-shrink:0;
}
[data-theme='dark'] .ps-submodal-tools .tool-icon{background:rgba(255,255,255,.06)}
.ps-submodal-tools .tool-icon svg{width:18px;height:18px;display:block}
.ps-submodal-tools .bg-picker{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:8px;
  margin:0 10px 4px;
}
.ps-submodal-tools .bg-option{
  border:none;border-radius:14px;
  background:transparent;cursor:pointer;color:var(--t1);
  padding:6px 4px;
  transition:background .12s ease;
}
.ps-submodal-tools .bg-option:hover{background:rgba(0,0,0,.035)}
[data-theme='dark'] .ps-submodal-tools .bg-option:hover{background:rgba(255,255,255,.05)}
.ps-submodal-tools .bg-option span{
  display:block;height:44px;
  border-radius:12px;
  border:2px solid transparent;
  margin-bottom:5px;
  transition:border-color .12s ease,box-shadow .12s ease;
}
.ps-submodal-tools .bg-option b{font-size:11px;font-weight:800;display:block;text-align:center;}
.ps-submodal-tools .bg-option.active span{
  border-color:var(--acc);
  box-shadow:0 0 0 3px var(--acc2);
}
@media (max-width:520px){
  .ps-submodal-tools .bg-picker{grid-template-columns:repeat(2,1fr);}
}

/* Backup modal */
.backup-loading{padding:28px;text-align:center;color:var(--t2)}
.backup-info-card{
  background:rgba(12,16,28,.04);border-radius:16px;padding:14px;margin-bottom:16px;
}
[data-theme='dark'] .backup-info-card{background:rgba(255,255,255,.05)}
.backup-info-row{
  display:flex;justify-content:space-between;align-items:center;padding:6px 0;
}
.backup-info-label{font-size:13px;color:var(--t2);font-weight:700}
.backup-info-value{font-size:13px;font-weight:800}
.backup-error{
  background:rgba(255,60,60,.1);border:1px solid rgba(255,60,60,.2);
  border-radius:12px;padding:10px 14px;font-size:13px;color:var(--red);margin-bottom:12px;
}
.backup-actions{display:flex;flex-direction:column;gap:10px}
.backup-btn{
  display:block;width:100%;border:none;border-radius:14px;
  padding:12px;font-size:14px;font-weight:800;cursor:pointer;
  transition:opacity .12s,transform .1s,background .12s;
  text-align:center;
}
.backup-btn:active{transform:scale(.97)}
.backup-btn--pri{background:var(--acc);color:#fff}
.backup-btn--pri:disabled{opacity:.5;cursor:default}
[data-theme='dark'] .backup-btn--pri{color:#08090b}
.backup-btn--sec{background:rgba(0,0,0,.05);color:var(--t1)}
[data-theme='dark'] .backup-btn--sec{background:rgba(255,255,255,.07)}
.backup-btn.disabled{opacity:.5;cursor:default}
.backup-passphrase-box{display:flex;flex-direction:column;gap:8px}
.backup-input{
  width:100%;border:1px solid var(--bdr);border-radius:12px;
  padding:12px 14px;font-size:14px;color:var(--t1);background:var(--bg0);outline:none;
}
.backup-input:focus{border-color:var(--acc)}
.backup-passphrase-actions{display:flex;gap:8px}
.backup-passphrase-actions .backup-btn{flex:1}
.backup-note{font-size:12px;color:var(--t3);line-height:1.4;text-align:center;margin:0}

.settings-profile-card,.new-chat-action,.user-row{
  width:100%;
  border:none;
  background:var(--bg1);
  border-radius:28px;
  padding:18px;
  display:flex;
  align-items:center;
  gap:16px;
  text-align:left;
  cursor:pointer;
  box-shadow:none;
}
.settings-profile-card i,.new-chat-action i,.user-row i{
  margin-left:auto;
  color:var(--t3);
  font-style:normal;
  font-size:28px;
}
.settings-avatar{
  width:64px;height:64px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  color:#fff;font-weight:900;font-size:20px;
  flex-shrink:0;
}
.settings-profile-main,.user-row-main,.new-chat-action span:not(.new-chat-action-icon){
  display:flex;
  flex-direction:column;
  min-width:0;
}
.settings-profile-main b,.user-row-main b,.new-chat-action b{
  font-size:20px;
  letter-spacing:-.03em;
}
.settings-profile-main small,.user-row-main small,.new-chat-action small{
  color:var(--t2);
  font-size:15px;
  margin-top:3px;
}
.settings-section{margin-top:28px}
.section-title{
  color:var(--t2);
  font-weight:800;
  font-size:17px;
  margin:0 0 10px 24px;
}
.settings-card{
  background:var(--bg1);
  border-radius:28px;
  overflow:hidden;
}
.settings-row{
  width:100%;
  min-height:58px;
  border:none;
  background:transparent;
  display:grid;
  grid-template-columns:36px 1fr auto 20px;
  gap:12px;
  align-items:center;
  padding:0 18px;
  text-align:left;
  cursor:pointer;
  border-bottom:1px solid var(--bdr);
}
.settings-row:last-child{border-bottom:none}
.settings-row.disabled{cursor:default;opacity:.72}
.settings-row-icon{
  color:var(--t2);
  font-size:24px;
  text-align:center;
}
.settings-row-title{
  font-size:18px;
  font-weight:650;
}
.settings-row-value{
  color:var(--t2);
  font-size:13px;
}
.settings-row i{font-style:normal;color:var(--t3)}
.logout-row{
  width:100%;
  margin-top:28px;
  height:58px;
  border:none;
  border-radius:28px;
  background:rgba(229,72,77,.12);
  color:var(--red);
  font-size:18px;
  font-weight:900;
  cursor:pointer;
}
.field{display:block;margin-bottom:14px}
.field-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}
.username-check{
  display:block;
  min-height:18px;
  font-size:12px;
  margin-top:5px;
}
.username-ok{color:var(--green)}
.username-err{color:var(--red)}
.avatar-grid{
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:8px;
}
.avatar-grid.compact{margin:8px 0 14px}
.avatar-opt{
  aspect-ratio:1;
  border:2px solid transparent;
  border-radius:18px;
  cursor:pointer;
  font-size:22px;
}
.avatar-opt.sel{
  border-color:#111;
  box-shadow:0 0 0 3px var(--acc2);
}
.sheet-search{
  height:58px;
  margin:0 22px 16px;
  border-radius:999px;
  background:var(--bg1);
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 18px;
  color:var(--t2);
}
.sheet-search input{
  flex:1;
  border:none;
  outline:none;
  background:transparent;
  color:var(--t1);
  font-size:20px;
}
.mode-switch{
  margin:0 22px 16px;
  height:42px;
  border-radius:999px;
  padding:3px;
  background:var(--bg3);
  display:grid;
  grid-template-columns:1fr 1fr;
}
.mode-switch button{
  border:none;
  border-radius:999px;
  background:transparent;
  cursor:pointer;
  font-weight:850;
  font-size:15px;
}
.mode-switch button.active{
  background:var(--bg1);
  box-shadow:0 1px 6px rgba(0,0,0,.06);
}
.new-chat-action{margin-bottom:10px}
.new-chat-action.disabled{opacity:.65}
.new-chat-action-icon{
  width:56px;height:56px;
  border-radius:50%;
  background:var(--bg3);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:24px;
}
.group-create-card{
  background:var(--bg1);
  border-radius:28px;
  padding:18px;
  margin-bottom:12px;
}
.selected-users{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:12px;
}
.selected-users button{
  border:none;
  background:var(--bg2);
  border-radius:999px;
  padding:7px 10px;
  cursor:pointer;
}
.user-row{
  margin-bottom:8px;
  background:transparent;
  box-shadow:none;
}
.user-row:hover,.user-row.selected{background:var(--bg1)}
.sheet-bottom{
  padding:12px 22px 24px;
  display:flex;
  gap:10px;
}

/* Centered modal card (edit, delete, etc.) */
.modal{
  width:min(420px,92vw);
  align-self:center;
  border-radius:28px;
  padding:24px;
}
.small-modal{width:min(380px,92vw)}
.modal-title{
  display:flex;
  justify-content:space-between;
  align-items:center;
  font-size:20px;
  font-weight:900;
  margin-bottom:18px;
}
.modal-close{
  border:none;
  background:var(--bg2);
  width:36px;height:36px;
  border-radius:50%;
  cursor:pointer;
  font-size:20px;
}
/* Back button for mobile drawer headers */
.drawer-back{
  width:36px;height:36px;
  border:none;border-radius:50%;
  background:var(--bg2);
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;
  color:var(--t1);
  flex-shrink:0;
}
.edit-textarea{
  height:auto;
  min-height:110px;
  padding:14px;
  resize:vertical;
}
.confirm-text{color:var(--t2);line-height:1.45;margin-bottom:14px}
.delete-actions{display:flex;flex-direction:column;gap:10px}
.danger-pri{background:var(--red)!important;color:#fff!important}

/* LIGHTBOX */
.lightbox{
  position:fixed;
  inset:0;
  z-index:300;
  background:rgba(0,0,0,.9);
  display:flex;
  align-items:center;
  justify-content:center;
}
.lightbox img{
  max-width:92vw;
  max-height:92vh;
  border-radius:18px;
}

/* RESPONSIVE */
@media (max-width: 860px){
  .user-profile-modal-bg{
    align-items:stretch;
  }
  .user-profile-screen{
    width:min(100%,520px);
    max-height:none;
    height:100%;
    border-radius:0;
    box-shadow:none;
  }
  .app-frame{
    display:block;
  }
  .home-screen,.chat-view{
    position:absolute;
    inset:0;
    border-right:none;
    transition:transform .22s ease,opacity .22s ease;
  }
  .chat-view{
    transform:translateX(100%);
    opacity:0;
    pointer-events:none;
  }
  .has-active-chat .home-screen{
    transform:translateX(-18%);
    opacity:0;
    pointer-events:none;
  }
  .has-active-chat .chat-view{
    transform:translateX(0);
    opacity:1;
    pointer-events:auto;
  }
}
  .desktop-hidden{display:flex}
  .bubble{max-width:78%}
}
@media (min-width: 861px){
  .mobile-product-shell{
    background:linear-gradient(180deg,#f7f7f6,var(--bg0));
  }
  .app-frame{
    max-width:1280px;
    margin:0 auto;
  }
}
@media (max-width: 520px){
  .home-topbar,.product-chat-head,.sheet-head{padding-left:20px;padding-right:20px}
  .home-content{padding-left:14px;padding-right:14px}
  .floating-searchbar{left:16px;right:16px;grid-template-columns:56px 1fr 56px}
  .bottom-round{width:56px;height:56px}
  .bubble{max-width:82%}
  .field-grid{grid-template-columns:1fr}
}

/* prevent elastic scroll on mobile */
html,body{
  overflow:hidden;
  height:100%;
  width:100%;
  position:fixed;
}

/* Mobile-first: modals stay centered cards, bottom sheets only for panels */
@media (max-width: 860px){
  .modal-bg{
    align-items:center;
    padding:20px;
  }
  .modal-bg>.modal,
  .modal-bg>.small-modal{
    width:min(100%,420px);
    max-width:100%;
    border-radius:28px;
    max-height:90dvh;
    margin:0;
    align-self:center;
    animation:fadeUp .22s ease;
    padding:20px;
    background:rgba(255,255,255,.88);
    backdrop-filter:blur(32px) saturate(140%);
    border:1px solid rgba(255,255,255,.95);
    box-shadow:
      0 22px 70px rgba(0,0,0,.13),
      0 0 0 0.5px rgba(0,0,0,.04);
  }
  [data-theme='dark'] .modal-bg>.modal,[data-theme='dark'] .modal-bg>.small-modal{
    background:rgba(30,36,50,.88);
    border:1px solid rgba(255,255,255,.06);
    box-shadow:
      0 22px 70px rgba(0,0,0,.35),
      0 0 0 0.5px rgba(0,0,0,.12);
  }
  .user-profile-modal-bg{
    align-items:stretch;
    padding:0;
  }
  .user-profile-screen{
    width:100%;
    max-height:none;
    height:100dvh;
    border-radius:0;
    box-shadow:none;
  }
  .group-admin-modal-screen{
    height:100dvh;
  }
  .safety-modal-overlay{
    align-items:center;
    padding:20px;
  }
  .safety-modal{
    width:min(100%,420px);
    max-width:100%;
    border-radius:28px;
    max-height:90dvh;
    align-self:center;
    animation:fadeUp .22s ease;
    background:rgba(255,255,255,.88);
    backdrop-filter:blur(32px) saturate(140%);
    border:1px solid rgba(255,255,255,.95);
    box-shadow:
      0 22px 70px rgba(0,0,0,.13),
      0 0 0 0.5px rgba(0,0,0,.04);
  }
  [data-theme='dark'] .safety-modal{
    background:rgba(30,36,50,.88);
    border:1px solid rgba(255,255,255,.06);
    box-shadow:
      0 22px 70px rgba(0,0,0,.35),
      0 0 0 0.5px rgba(0,0,0,.12);
  }
  .chat-tools-panel{
    position:fixed;
    bottom:0;left:0;right:0;
    top:auto;
    width:100%;
    border-radius:28px 28px 0 0;
    max-height:88dvh;
    background:rgba(255,255,255,.88);
    border:1px solid rgba(255,255,255,.95);
    backdrop-filter:blur(32px) saturate(140%);
    -webkit-backdrop-filter:blur(32px) saturate(140%);
    animation:sheetUp .28s cubic-bezier(.22,.68,0,1);
    box-shadow:0 -12px 60px rgba(0,0,0,.13), 0 0 0 0.5px rgba(0,0,0,.04);
    overflow-y:auto;
    z-index:260;
  }
  [data-theme='dark'] .chat-tools-panel{
    background:rgba(30,36,50,.88);
    border:1px solid rgba(255,255,255,.06);
    box-shadow:0 -12px 60px rgba(0,0,0,.35), 0 0 0 0.5px rgba(0,0,0,.12);
  }
  .product-chat-head .chat-tools-panel{
    top:auto;
  }
}
    content:'';
    display:block;
    width:36px;
    height:4px;
    border-radius:999px;
    background:var(--bg3);
    margin:-4px auto 12px;
    flex-shrink:0;
  }
}

/* Desktop modals: centered cards */
@media (min-width: 861px){
  .modal-bg>.modal{
    animation:fadeUp .18s ease;
  }
}

/* bottom sheet animation */
@keyframes sheetUp{
  from{transform:translateY(100%);opacity:0}
  to{transform:translateY(0);opacity:1}
}

/* PART_3_CHAT_SEARCH_UI START */
.chat-head-actions{
  display:flex;
  align-items:center;
  gap:8px;
}

.chat-head-user{
  border:none;
  background:transparent;
  padding:0;
  cursor:pointer;
  text-align:left;
  display:flex;
  align-items:center;
  gap:12px;
  color:inherit;
}
.chat-head-user:active{transform:translateY(1px)}

.chat-head-btn{
  width:44px;
  height:44px;
  border:none;
  border-radius:50%;
  background:var(--bg1);
  color:var(--t1);
  box-shadow:var(--soft-shadow);
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:19px;
  font-weight:900;
  transition:transform .12s ease, box-shadow .15s ease, background .15s ease;
}

.chat-head-btn:hover{
  transform:translateY(-1px);
}

.chat-head-btn:active{
  transform:translateY(0);
}

.chat-head-btn .btn-icon{
  width:18px;
  height:18px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.9;
  stroke-linecap:round;
  stroke-linejoin:round;
}

.chat-head-btn--info .btn-icon{
  width:19px;
  height:19px;
  stroke-width:2;
}

.chat-head-btn--admin .btn-icon{
  width:18px;
  height:18px;
  stroke-width:1.85;
}

/* Like UserProfileModal: header is a flex row inside the card. Avoid position:sticky — it can attach to the wrong scroll ancestor and look like a label outside the sheet. */
.user-profile-screen.group-admin-modal-screen > .sheet-head{
  flex-shrink:0;
  background:var(--bg0);
  box-shadow:0 1px 0 color-mix(in srgb, var(--bdr) 55%, transparent);
  border-radius:28px 28px 0 0;
}
.user-profile-screen .group-admin-modal-body.chat-tools-panel{
  position:static;
  right:auto;
  top:auto;
  width:auto;
  max-width:none;
  z-index:auto;
  padding:8px 0 0;
  margin:0;
  background:transparent;
  border:none;
  border-radius:0;
  box-shadow:none;
  backdrop-filter:none;
  animation:none;
  flex:1;
  min-height:0;
  align-self:stretch;
}
/* One visual card: inner unified block only (avoid tool-card + unified double frame). */
.user-profile-screen .group-admin-modal-body .group-admin-card.tool-card{
  margin-top:0;
  padding:0;
  background:transparent;
  box-shadow:none;
  border-radius:0;
}

.chat-head-btn.active{
  box-shadow:0 0 0 3px var(--acc2), var(--soft-shadow);
}

.chat-search-bar{
  margin:82px 16px 0;
  height:50px;
  border-radius:999px;
  background:rgba(255,255,255,.55);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  box-shadow:0 8px 30px rgba(0,0,0,.08);
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 14px 0 18px;
  color:var(--t2);
  z-index:6;
}
[data-theme='dark'] .chat-search-bar{
  background:rgba(20,25,36,.65);
  box-shadow:0 8px 30px rgba(0,0,0,.25);
}
.chat-search-nav{
  width:32px;
  height:32px;
  border:none;
  border-radius:50%;
  background:var(--bg2);
  color:var(--t1);
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
}
.chat-search-nav:disabled{opacity:.4;cursor:default}
.chat-search-nav svg{width:16px;height:16px}
.chat-search-bar .icon-btn svg{width:16px;height:16px}
.msg-wrap.search-hit-active .bubble{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.96),
    0 0 0 5px rgba(74,126,255,.58),
    0 12px 28px rgba(28,52,110,.22);
}
[data-theme='dark'] .msg-wrap.search-hit-active .bubble{
  box-shadow:
    0 0 0 2px rgba(18,22,31,.96),
    0 0 0 5px rgba(127,170,255,.58),
    0 14px 30px rgba(0,0,0,.42);
}

.chat-search-bar input{
  flex:1;
  min-width:0;
  border:none;
  outline:none;
  background:transparent;
  color:var(--t1);
  font-size:16px;
}

.chat-search-bar .search-bar-icon{display:flex;color:var(--t2);flex-shrink:0}
.chat-search-bar .search-bar-icon svg{width:18px;height:18px}
.search-icon{display:flex;color:var(--t2)}
.search-icon svg{width:18px;height:18px}
.chat-search-bar .search-bar-count{min-width:26px;text-align:center;color:var(--t2);font-size:13px}
  min-width:26px;
  text-align:center;
  color:var(--t2);
  font-size:13px;
}

.chat-search-bar button{
  width:32px;
  height:32px;
  border:none;
  border-radius:50%;
  background:var(--bg2);
  color:var(--t1);
  cursor:pointer;
  font-size:18px;
}

.chat-tools-panel{
  position:absolute;
  right:16px;
  top:96px;
  width:min(360px,calc(100% - 32px));
  background:rgba(255,255,255,.88);
  border:1px solid rgba(255,255,255,.95);
  border-radius:28px;
  box-shadow:0 22px 70px rgba(0,0,0,.13), 0 0 0 0.5px rgba(0,0,0,.04);
  backdrop-filter:blur(32px) saturate(140%);
  -webkit-backdrop-filter:blur(32px) saturate(140%);
  z-index:30;
  padding:16px;
  animation:pop .16s ease;
}

[data-theme='dark'] .chat-tools-panel{
  background:rgba(30,36,50,.88);
  border-color:rgba(255,255,255,.06);
  box-shadow:0 22px 70px rgba(0,0,0,.35), 0 0 0 0.5px rgba(0,0,0,.12);
}

.chat-tools-head{
  display:flex;
  align-items:center;
  gap:10px;
  margin-bottom:12px;
}

.chat-tools-head b{
  display:block;
  font-size:18px;
  letter-spacing:-.03em;
}

.chat-tools-head span{
  display:block;
  margin-top:3px;
  color:var(--t2);
  font-size:13px;
}

.chat-tools-head button{
  width:34px;
  height:34px;
  border:none;
  border-radius:50%;
  background:var(--bg2);
  color:var(--t1);
  cursor:pointer;
  font-size:18px;
}

.tool-row{
  width:100%;
  min-height:52px;
  border:none;
  background:var(--bg1);
  border-radius:18px;
  display:grid;
  grid-template-columns:30px 1fr auto;
  align-items:center;
  gap:10px;
  padding:0 14px;
  margin-bottom:10px;
  text-align:left;
  cursor:pointer;
}

.tool-row span{
  font-size:20px;
  color:var(--t2);
  text-align:center;
}

.tool-row b{
  font-size:15px;
}

.tool-row i,
.tool-row em{
  font-style:normal;
  color:var(--t3);
}

.tool-row.disabled{
  opacity:.65;
  cursor:default;
}

.tool-card{
  background:var(--bg1);
  border-radius:22px;
  padding:14px;
  margin-bottom:10px;
}

.tool-title{
  font-size:13px;
  color:var(--t2);
  font-weight:900;
  margin-bottom:10px;
}

.tool-note{
  font-size:13px;
  line-height:1.45;
  color:var(--t2);
}

.bg-picker{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:8px;
}

.bg-option{
  border:none;
  background:transparent;
  cursor:pointer;
  color:var(--t1);
}

.bg-option span{
  display:block;
  height:48px;
  border-radius:16px;
  border:2px solid transparent;
  margin-bottom:5px;
}

.bg-option b{
  font-size:11px;
  font-weight:800;
}

.bg-option.active span{
  border-color:var(--acc);
  box-shadow:0 0 0 3px var(--acc2);
}

.bg-clean span{
  background:linear-gradient(135deg,#f6f6f4,#ffffff);
}

.bg-soft span{
  background:radial-gradient(circle at 30% 30%,#ffffff,transparent 40%),linear-gradient(135deg,#eef3f8,#f8f2ef);
}

.bg-grid span{
  background:
    linear-gradient(rgba(0,0,0,.055) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,0,0,.055) 1px,transparent 1px),
    #f8f8f7;
  background-size:12px 12px;
}

.bg-paper span{
  background:
    radial-gradient(circle at 10% 20%,rgba(0,0,0,.05),transparent 16%),
    radial-gradient(circle at 80% 10%,rgba(0,0,0,.05),transparent 18%),
    #f3efe7;
}

.bg-noise span{
  background:
    repeating-conic-gradient(rgba(0,0,0,.03) 0 25%,transparent 0 50%),
    #f5f5f4;
  background-size:3px 3px;
}

.bg-gradient span{
  background:linear-gradient(135deg,#e8edff,#fce8f0,#e8fce8);
}

.bg-dots span{
  background:
    radial-gradient(rgba(0,0,0,.08) 1.2px,transparent 1.2px),
    #f8f8f8;
  background-size:10px 10px;
}

.bg-waves span{
  background:
    radial-gradient(ellipse at 20% 50%,rgba(15,110,168,.06),transparent 60%),
    radial-gradient(ellipse at 80% 50%,rgba(168,15,110,.04),transparent 60%),
    #f4f6fb;
}

.chat-bg-clean{
  background:var(--bg0);
}

.chat-bg-soft{
  background:
    radial-gradient(circle at 20% 0%,rgba(255,255,255,.9),transparent 34%),
    radial-gradient(circle at 80% 18%,rgba(15,110,168,.07),transparent 28%),
    linear-gradient(180deg,var(--bg0),#f2f0ed);
}

.chat-bg-grid{
  background:
    linear-gradient(rgba(0,0,0,.035) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,0,0,.035) 1px,transparent 1px),
    var(--bg0);
  background-size:18px 18px;
}

.chat-bg-paper{
  background:
    radial-gradient(circle at 12% 22%,rgba(0,0,0,.035),transparent 14%),
    radial-gradient(circle at 76% 6%,rgba(0,0,0,.035),transparent 20%),
    radial-gradient(circle at 92% 70%,rgba(0,0,0,.025),transparent 18%),
    #f3efe7;
}

.chat-bg-noise{
  background:
    repeating-conic-gradient(rgba(0,0,0,.04) 0 25%,transparent 0 50%),
    var(--bg0);
  background-size:5px 5px;
}

.chat-bg-gradient{
  background:
    radial-gradient(circle at 20% 30%,rgba(100,140,255,.12),transparent 40%),
    radial-gradient(circle at 80% 20%,rgba(255,100,180,.08),transparent 35%),
    radial-gradient(circle at 50% 80%,rgba(80,220,140,.08),transparent 35%),
    var(--bg0);
}

.chat-bg-dots{
  background:
    radial-gradient(rgba(0,0,0,.07) 1.5px,transparent 1.5px),
    var(--bg0);
  background-size:18px 18px;
}

.chat-bg-waves{
  background:
    radial-gradient(ellipse at 15% 40%,rgba(40,120,200,.07) 0%,transparent 50%),
    radial-gradient(ellipse at 85% 60%,rgba(180,60,140,.05) 0%,transparent 50%),
    radial-gradient(ellipse at 50% 90%,rgba(60,180,120,.04) 0%,transparent 40%),
    var(--bg0);
}

[data-theme='dark'] .chat-bg-paper,
[data-theme='dark'] .chat-bg-soft,
[data-theme='dark'] .chat-bg-grid,
[data-theme='dark'] .chat-bg-noise,
[data-theme='dark'] .chat-bg-gradient,
[data-theme='dark'] .chat-bg-dots,
[data-theme='dark'] .chat-bg-waves{
  background:
    radial-gradient(circle at 20% 0%,rgba(255,255,255,.05),transparent 32%),
    var(--bg0);
}

.msg-search-mark{
  background:rgba(83,137,255,.32);
  color:inherit;
  border-radius:6px;
  padding:0 3px;
  font-weight:800;
}
[data-theme='dark'] .msg-search-mark{
  background:rgba(133,173,255,.44);
}
/* PART_3_CHAT_SEARCH_UI END */

/* HOTFIX_RESTORE_CHAT_UI START */
.floating-searchbar.restored{
  grid-template-columns:1fr 58px;
}

.restored-search{
  width:100%;
}

.filter-top-btn.active,
.bottom-round.active{
  box-shadow:0 0 0 3px var(--acc2), var(--soft-shadow);
}

.list-hint{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  color:var(--t2);
  font-size:13px;
  font-weight:800;
  padding:0 12px 12px;
}

.list-hint b{
  font-weight:700;
  color:var(--t3);
  max-width:190px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
/* HOTFIX_RESTORE_CHAT_UI END */

/* repaired orphan css tail */
/* chat-info-panel-polish */
.chat-tools-panel{
  width:min(100%,420px);
  margin:0 auto;
  border-radius:32px;
  padding:14px;
  background:rgba(255,255,255,.88);
  border:1px solid rgba(255,255,255,.88);
  box-shadow:0 28px 80px rgba(15,23,42,.18), 0 0 0 0.5px rgba(0,0,0,.04);
  backdrop-filter:blur(32px) saturate(140%);
  -webkit-backdrop-filter:blur(32px) saturate(140%);
  color:var(--t1);
}

[data-theme='dark'] .chat-tools-panel{
  background:rgba(30,36,50,.88);
  border-color:rgba(255,255,255,.06);
  box-shadow:0 28px 80px rgba(0,0,0,.42), 0 0 0 0.5px rgba(0,0,0,.12);
}

.chat-tools-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:8px 8px 16px;
}

.chat-tools-head b{
  display:block;
  font-size:22px;
  font-weight:950;
  letter-spacing:-.035em;
}

.chat-tools-head span{
  display:block;
  margin-top:3px;
  max-width:260px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  color:var(--t2);
  font-size:14px;
}

.chat-tools-close{
  width:42px;
  height:42px;
  border:none;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:rgba(0,0,0,.045);
  color:var(--t1);
  cursor:pointer;
  font-size:24px;
  line-height:1;
  transition:transform .14s ease, background .14s ease;
}

.chat-tools-close:hover{
  transform:scale(1.04);
  background:rgba(0,0,0,.075);
}

[data-theme='dark'] .chat-tools-close{
  background:rgba(255,255,255,.075);
}

[data-theme='dark'] .chat-tools-close:hover{
  background:rgba(255,255,255,.11);
}

.chat-tools-panel .tool-row{
  width:100%;
  min-height:64px;
  border:none;
  border-radius:24px;
  padding:10px 12px;
  display:grid;
  grid-template-columns:46px 1fr auto;
  align-items:center;
  gap:12px;
  background:rgba(255,255,255,.64);
  color:var(--t1);
  cursor:pointer;
  text-align:left;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.035);
  transition:transform .14s ease, background .14s ease, box-shadow .14s ease;
}

.chat-tools-panel .tool-row:not(.disabled):hover{
  transform:translateY(-1px);
  background:rgba(255,255,255,.86);
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.045), 0 14px 30px rgba(15,23,42,.08);
}

[data-theme='dark'] .chat-tools-panel .tool-row{
  background:rgba(255,255,255,.055);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);
}

[data-theme='dark'] .chat-tools-panel .tool-row:not(.disabled):hover{
  background:rgba(255,255,255,.085);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.075);
}

.chat-tools-panel .tool-row.disabled{
  opacity:.72;
  cursor:default;
}

.chat-tools-panel .tool-row b{
  font-size:17px;
  font-weight:850;
  letter-spacing:-.015em;
}

.chat-tools-panel .tool-row i{
  font-style:normal;
  color:var(--t3);
  font-size:25px;
}

.chat-tools-panel .tool-row em{
  font-style:normal;
  justify-self:end;
  padding:6px 10px;
  border-radius:999px;
  background:rgba(0,0,0,.045);
  color:var(--t2);
  font-size:12px;
  font-weight:850;
}
.chat-tools-panel .tool-row.danger b{color:var(--red)}
.chat-tools-panel .tool-row.danger .tool-icon svg{stroke:var(--red)}

[data-theme='dark'] .chat-tools-panel .tool-row em{
  background:rgba(255,255,255,.075);
}

.tool-icon{
  width:44px;
  height:44px;
  border-radius:18px;
  display:grid;
  place-items:center;
  background:rgba(0,0,0,.045);
  color:var(--t1);
}

[data-theme='dark'] .tool-icon{
  background:rgba(255,255,255,.075);
}

.tool-icon svg{
  width:23px;
  height:23px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.85;
  stroke-linecap:round;
  stroke-linejoin:round;
}

.tool-icon-search svg{
  width:25px;
  height:25px;
  stroke-width:1.7;
}

.chat-tools-panel .tool-card{
  margin-top:12px;
  padding:16px;
  border-radius:26px;
  background:rgba(255,255,255,.58);
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.035);
}

[data-theme='dark'] .chat-tools-panel .tool-card{
  background:rgba(255,255,255,.052);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);
}

.chat-tools-panel .tool-title{
  margin:0 0 12px;
  color:var(--t2);
  font-size:13px;
  font-weight:900;
  letter-spacing:.03em;
  text-transform:uppercase;
}

.chat-tools-panel .tool-note{
  color:var(--t2);
  line-height:1.45;
  font-size:14px;
}

.chat-tools-panel .group-admin-card .field-label{
  margin-top:12px;
}
.chat-tools-panel .group-admin-card .field-label:first-of-type{
  margin-top:0;
}
.chat-tools-panel .group-admin-section-label{
  margin-top:16px;
  margin-bottom:6px;
  font-weight:800;
  color:var(--t1);
}
.user-profile-screen .group-admin-unified-card{
  margin-top:4px;
  padding:16px 16px 18px;
  border-radius:26px;
  background:
    linear-gradient(180deg,color-mix(in srgb, var(--bg1) 88%, transparent),color-mix(in srgb, var(--bg1) 62%, transparent)),
    var(--bg1);
  border:1px solid color-mix(in srgb, var(--bdr) 70%, transparent);
  box-shadow:
    0 10px 22px rgba(16,22,44,.07),
    inset 0 1px 0 color-mix(in srgb, var(--bg0) 40%, transparent);
}
[data-theme='dark'] .user-profile-screen .group-admin-unified-card{
  background:
    linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.03)),
    var(--bg1);
  border-color:var(--bdr2);
  box-shadow:
    0 12px 26px rgba(0,0,0,.28),
    inset 0 1px 0 rgba(255,255,255,.06);
}
.user-profile-screen .group-admin-section__title{
  margin:0 0 12px;
  font-size:17px;
  font-weight:800;
  letter-spacing:-.02em;
  color:var(--t1);
}
.user-profile-screen .group-admin-section-divider{
  height:0;
  margin:18px 0 14px;
  border-top:1px solid color-mix(in srgb, var(--bdr) 55%, transparent);
}
.user-profile-screen .group-admin-section-divider--footer{
  margin-top:20px;
}
.user-profile-screen .group-admin-unified-card .profile-bottom-actions{
  width:100%;
  box-sizing:border-box;
  margin-top:16px;
}
.user-profile-screen .group-admin-unified-card .group-admin-footer-actions{
  margin-top:12px;
  padding-top:4px;
}
.user-profile-screen .group-admin-section__hint{
  margin:10px 0 12px;
}
.user-profile-screen .group-admin-filters{
  display:flex;
  flex-direction:column;
  gap:12px;
}
.user-profile-screen .group-admin-filters__row--split{
  display:flex;
  flex-wrap:wrap;
  align-items:flex-end;
  gap:12px 16px;
}
.user-profile-screen .group-admin-filters__field{
  flex:1;
  min-width:min(200px,100%);
}
.user-profile-screen .group-admin-filters__toggles{
  display:flex;
  flex-wrap:wrap;
  gap:10px 14px;
  padding-bottom:2px;
}
.user-profile-screen .group-admin-filter-chip{
  display:inline-flex;
  align-items:center;
  gap:8px;
  font-size:14px;
  color:var(--t1);
  cursor:pointer;
  user-select:none;
}
.user-profile-screen .group-admin-filter-chip input{
  width:16px;
  height:16px;
  accent-color:var(--acc);
}
.user-profile-screen .group-admin-unified-card .group-participant-picker{
  max-height:min(38vh,320px);
  margin-bottom:4px;
}
.chat-tools-panel .group-admin-role-line{
  margin-bottom:10px;
}
.chat-tools-panel .group-policy-hint,
.chat-tools-panel .group-role-desc,
.chat-tools-panel .group-admin-hint{
  margin:6px 0 10px;
  font-size:13px;
}
.chat-tools-panel .group-participant-picker{
  display:flex;
  flex-direction:column;
  gap:8px;
  margin-bottom:8px;
  max-height:min(42vh,320px);
  overflow:auto;
  padding:4px 2px;
  scrollbar-gutter:stable;
  overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch;
}
.chat-tools-panel .group-participant-row-wrap{
  border-radius:16px;
  position:relative;
  z-index:0;
  isolation:isolate;
}
.chat-tools-panel .group-participant-row-wrap--active{
  z-index:3;
  box-shadow:0 0 0 2px var(--acc);
}
.chat-tools-panel .group-participant-row{
  display:flex;
  flex-direction:row;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  width:100%;
  text-align:left;
  border:none;
  border-radius:16px;
  padding:10px 10px 10px 12px;
  background:rgba(0,0,0,.04);
  color:var(--t1);
  cursor:default;
  font:inherit;
  min-height:48px;
  box-sizing:border-box;
}
[data-theme='dark'] .chat-tools-panel .group-participant-row{
  background:rgba(255,255,255,.06);
}
.chat-tools-panel .group-participant-row--interactive{
  cursor:context-menu;
  transition:box-shadow .12s ease, background .12s ease;
}
@media (hover:hover) and (pointer:fine){
  .chat-tools-panel .group-participant-row-wrap:hover .group-participant-row--interactive{
    box-shadow:0 4px 14px rgba(0,0,0,.1);
  }
}
.chat-tools-panel .group-participant-row__main{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:2px;
  flex:1;
  min-width:0;
}
.chat-tools-panel .group-participant-row__name{
  font-weight:850;
  max-width:100%;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.chat-tools-panel .group-participant-row__meta{
  font-size:12px;
  color:var(--t2);
}
.chat-tools-panel .group-participant-overflow-btn{
  flex-shrink:0;
  width:40px;
  height:40px;
  border:none;
  border-radius:12px;
  background:var(--bg2);
  color:var(--t1);
  font-size:20px;
  font-weight:900;
  line-height:1;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:var(--soft-shadow);
  position:relative;
  z-index:1;
}
.chat-tools-panel .group-participant-overflow-btn:focus-visible{
  outline:2px solid var(--acc);
  outline-offset:2px;
}
.chat-tools-panel .group-participant-overflow-btn:disabled{
  opacity:.45;
  cursor:default;
}
.chat-tools-panel .group-admin-mod-strip-title{
  color:var(--t1);
}
.chat-tools-panel .group-admin-footer-actions{
  margin-top:14px;
  flex-direction:column;
  gap:10px;
}

.chat-tools-panel .bg-picker{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:8px;
}

.chat-tools-panel .bg-option{
  min-height:72px;
  border:none;
  border-radius:20px;
  padding:8px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:7px;
  background:rgba(0,0,0,.035);
  color:var(--t1);
  cursor:pointer;
  font-weight:850;
  transition:transform .14s ease, background .14s ease, box-shadow .14s ease;
}

.chat-tools-panel .bg-option:hover{
  transform:translateY(-1px);
}

.chat-tools-panel .bg-option.active{
  box-shadow:inset 0 0 0 2px var(--acc);
  background:var(--acc2);
}

[data-theme='dark'] .chat-tools-panel .bg-option{
  background:rgba(255,255,255,.06);
}

.chat-tools-panel .bg-option span{
  width:34px;
  height:24px;
  border-radius:10px;
  display:block;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.06);
}

.chat-tools-panel .bg-clean span{
  background:linear-gradient(135deg,#ffffff,#eceff4);
}

.chat-tools-panel .bg-soft span{
  background:linear-gradient(135deg,#f3f7ff,#e9f4ef);
}

.chat-tools-panel .bg-grid span{
  background:
    linear-gradient(rgba(0,0,0,.08) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,0,0,.08) 1px,transparent 1px),
    #f4f6fb;
  background-size:8px 8px;
}

.chat-tools-panel .bg-paper span{
  background:linear-gradient(135deg,#fff8e8,#f2ead8);
}

.chat-tools-panel .bg-noise span{
  background:
    repeating-conic-gradient(rgba(0,0,0,.06) 0 25%,transparent 0 50%),
    #f5f5f4;
  background-size:3px 3px;
}

.chat-tools-panel .bg-gradient span{
  background:linear-gradient(135deg,#e8edff,#fce8f0,#e8fce8);
}

.chat-tools-panel .bg-dots span{
  background:
    radial-gradient(rgba(0,0,0,.1) 1px,transparent 1px),
    #f8f8f8;
  background-size:8px 8px;
}

.chat-tools-panel .bg-waves span{
  background:linear-gradient(135deg,#e8edff,#fce8f0);
}

@media (max-width:520px){
  .chat-tools-panel{
    width:100%;
    border-radius:30px 30px 0 0;
  }

  .chat-tools-panel .bg-picker{
    grid-template-columns:repeat(2,1fr);
  }
}


/* emoji picker reverse close */
.emoji-picker.closing{
  animation:emojiPickerOut .15s ease forwards;
  pointer-events:none;
}

@keyframes emojiPickerOut{
  from{
    opacity:1;
    transform:translateY(0) scale(1);
  }
  to{
    opacity:0;
    transform:translateY(8px) scale(.985);
  }
}


/* context menu reverse close */
.ctx-menu.closing{
  animation:ctxMenuOut .14s ease forwards;
  pointer-events:none;
}

@keyframes ctxMenuOut{
  from{
    opacity:1;
    transform:translateY(0) scale(1);
  }
  to{
    opacity:0;
    transform:translateY(8px) scale(.985);
  }
}

/* chat list timestamp top-right corner */
.conversation-item{
  position:relative;
}

.conversation-main{
  flex:1;
  min-width:0;
  width:100%;
}

.conversation-line{
  width:100%;
}

.conversation-line:first-child{
  padding-right:64px;
}

.conversation-name{
  min-width:0;
}

.conversation-time{
  position:absolute;
  top:19px;
  right:18px;
  margin-left:0;
  flex-shrink:0;
  color:var(--t3);
  font-size:12px;
  line-height:1;
  white-space:nowrap;
  z-index:1;
}

.home-screen--compact .conversation-time{
  display:none;
}

/* chat list unread badge: move right + stronger contrast */
.conversation-line:last-child{
  width:100%;
  justify-content:space-between;
}

.conversation-preview{
  flex:1;
  min-width:0;
  padding-right:10px;
}

.badge{
  margin-left:auto;
  flex-shrink:0;
  min-width:22px;
  height:22px;
  padding:0 7px;
  border-radius:999px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#111;
  color:#fff;
  font-size:12px;
  font-weight:800;
  line-height:1;
  box-shadow:0 6px 14px rgba(0,0,0,.16);
}

[data-theme='dark'] .badge{
  background:#ffffff;
  color:#111111;
  box-shadow:0 6px 14px rgba(0,0,0,.28);
}

/* fix unread badge: small circle under chat time */
.conversation-item{
  position:relative;
}

.conversation-line:first-child{
  padding-right:64px;
}

.conversation-line:last-child{
  width:100%;
  justify-content:flex-start;
  padding-right:54px;
}

.conversation-preview{
  flex:1 1 auto;
  min-width:0;
  padding-right:0;
}

.conversation-item .badge{
  position:absolute;
  right:18px;
  top:34px;

  width:20px;
  min-width:20px;
  max-width:20px;
  height:20px;
  padding:0;

  border-radius:999px;
  background:#111;
  color:#fff;

  display:flex;
  align-items:center;
  justify-content:center;

  font-size:11px;
  font-weight:800;
  line-height:1;

  margin:0;
  flex:0 0 20px;

  box-shadow:0 4px 10px rgba(0,0,0,.14);
}

[data-theme='dark'] .conversation-item .badge{
  background:#fff;
  color:#111;
  box-shadow:0 4px 10px rgba(0,0,0,.24);
}

/* ── UI POLISH: Smooth scrollbar ────────────────────────────────────────── */
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--bdr);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--t3)}

/* ── UI POLISH: Message transitions ─────────────────────────────────────── */
.msg-wrap{
  transition:opacity 0.2s ease,transform 0.2s ease;
}

/* ── UI POLISH: Chat list hover effects ─────────────────────────────────── */
.conversation-item{
  transition:
    background .15s ease,
    transform .1s ease,
    box-shadow .15s ease,
    width .28s cubic-bezier(.4,0,.2,1),
    height .28s cubic-bezier(.4,0,.2,1),
    padding .28s cubic-bezier(.4,0,.2,1),
    border-radius .28s cubic-bezier(.4,0,.2,1),
    gap .28s cubic-bezier(.4,0,.2,1);
}
.conversation-item:hover{background:var(--bg2)}
.conversation-item:active{transform:scale(.98)}

/* ── UI POLISH: Send button press ───────────────────────────────────────── */
.send-btn{transition:transform .1s ease,box-shadow .15s ease}
.send-btn:active{transform:scale(.95)}

/* ── UI POLISH: Self-destruct countdown ─────────────────────────────────── */
.msg-ttl{
  font-size:11px;
  color:var(--t3);
  display:flex;
  align-items:center;
  gap:4px;
  margin-top:2px;
  opacity:.8;
}
.msg-ttl svg{width:12px;height:12px}

/* ── UI POLISH: Message fade-out animation ──────────────────────────────── */
@keyframes msgFadeOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.95)}}
.msg-expiring{animation:msgFadeOut .5s ease forwards}

/* ── UI POLISH: File attachment styles ──────────────────────────────────── */
.msg-file{
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px 12px;
  background:var(--bg2);
  border-radius:8px;
  cursor:pointer;
  transition:background .15s ease;
}
.msg-file:hover{background:var(--bg3)}
.msg-file-icon{width:32px;height:32px;font-size:24px;display:flex;align-items:center;justify-content:center;color:var(--acc)}
.msg-file-info{flex:1}
.msg-file-name{font-size:13px;font-weight:500;color:var(--t1)}
.msg-file-size{font-size:11px;color:var(--t3)}

/* ── UI POLISH: TTL selector ────────────────────────────────────────────── */
.ttl-btn{
  background:none;
  border:none;
  color:var(--t3);
  cursor:pointer;
  padding:6px;
  border-radius:50%;
  transition:color .15s,background .15s;
  display:flex;
  align-items:center;
}
.ttl-btn:hover{color:var(--acc);background:var(--bg2)}
.ttl-btn.active{color:var(--acc)}
.ttl-popup{
  position:absolute;
  bottom:calc(100% + 12px);
  right:-4px;
  background:var(--bg1);
  border:1px solid var(--bdr);
  border-radius:12px;
  padding:6px;
  box-shadow:var(--shadow);
  display:flex;
  flex-direction:column;
  gap:2px;
  min-width:120px;
  animation:pop .15s ease;
  z-index:50;
}
.ttl-option{
  padding:6px 12px;
  border-radius:8px;
  cursor:pointer;
  font-size:13px;
  color:var(--t1);
  transition:background .1s;
}
.ttl-option:hover{background:var(--bg2)}
.ttl-option.selected{color:var(--acc);font-weight:600}

.safety-modal-overlay{
  position:fixed;
  inset:0;
  z-index:300;
  background:rgba(0,0,0,.3);
  backdrop-filter:blur(2px);
  -webkit-backdrop-filter:blur(2px);
  display:flex;
  align-items:center;
  justify-content:center;
  animation:fadeIn .16s ease;
}
[data-theme='dark'] .safety-modal-overlay{
  background:rgba(0,0,0,.55);
}
.safety-modal{
  width:min(94%,440px);
  background:rgba(255,255,255,.88);
  backdrop-filter:blur(32px) saturate(140%);
  -webkit-backdrop-filter:blur(32px) saturate(140%);
  border:1px solid rgba(255,255,255,.95);
  border-radius:32px;
  box-shadow:
    0 22px 70px rgba(0,0,0,.13),
    0 0 0 0.5px rgba(0,0,0,.04),
    inset 0 0.5px 0 rgba(255,255,255,.6);
  overflow:hidden;
  animation:sheetIn .18s cubic-bezier(.2,.8,.2,1);
}
[data-theme='dark'] .safety-modal{
  background:rgba(30,36,50,.88);
  border:1px solid rgba(255,255,255,.06);
  box-shadow:
    0 22px 70px rgba(0,0,0,.35),
    0 0 0 0.5px rgba(0,0,0,.12),
    inset 0 0.5px 0 rgba(255,255,255,.08);
}
.safety-modal-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:16px 20px 8px;
}
.safety-modal-head b{font-size:20px;font-weight:900;letter-spacing:-.035em}
.safety-modal-close{
  width:40px;height:40px;
  border:none;border-radius:50%;
  background:var(--bg1);
  color:var(--t1);
  font-size:24px;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
}
.safety-modal-body{padding:8px 20px 16px}
.safety-section{margin:12px 0}
.safety-label{font-size:13px;font-weight:850;color:var(--t2);margin-bottom:6px}
.safety-value{
  background:var(--bg1);
  border-radius:16px;
  padding:10px 14px;
  font-family:monospace;
  font-size:14px;
  color:var(--t1);
  word-break:break-all;
  line-height:1.5;
}
.safety-numeric{font-size:18px;letter-spacing:.15em;font-weight:700}
.safety-hex{font-size:13px;letter-spacing:.05em}
.safety-words{white-space:pre-wrap;line-height:1.6}
.safety-note{
  margin-top:12px;
  font-size:13px;
  color:var(--t2);
  line-height:1.4;
  padding:12px;
  background:rgba(var(--acc-rgb),.08);
  border-radius:16px;
}
.safety-modal-actions{
  display:flex;
  gap:10px;
  padding:8px 20px 20px;
}
.safety-modal-actions .btn-sec{flex:1}
.safety-modal-actions .btn-pri{flex:1}
.safety-error-state{
  text-align:center;
  padding:24px 0;
  color:var(--t2);
}
.safety-error-state small{
  display:block;
  margin-top:8px;
  color:var(--red);
  font-size:13px;
}
/* ── SETTINGS PAGE ── */
.settings-shell{
  height:100vh;display:flex;flex-direction:column;
  overflow:hidden;
  background:var(--bg1);
}
.settings-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:18px 20px 10px;flex-shrink:0;
}
.settings-header-spacer{width:40px;flex-shrink:0}
.settings-title{font-size:21px;font-weight:850;letter-spacing:-.02em;color:var(--text)}
.settings-scroll{flex:1;overflow-y:auto;padding:0 8px 24px}
.settings-scroll::-webkit-scrollbar{width:3px}
.settings-scroll::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:999px}
.settings-bottom-spacer{height:100px}
/* Profile */
.settings-profile{
  display:flex;flex-direction:column;align-items:center;
  padding:8px 24px 24px;
}
.settings-avatar-btn{
  border:none;background:none;cursor:pointer;padding:0;margin-bottom:16px;
  border-radius:50%;transition:transform var(--fast);
}
.settings-avatar-btn:hover{transform:scale(1.03)}
.settings-avatar-btn:active{transform:scale(.98)}
.settings-avatar-wrap{position:relative;margin-bottom:16px}
.settings-name{font-size:22px;font-weight:850;color:var(--text);letter-spacing:-.02em}
.settings-username{font-size:14px;color:var(--text-muted);margin-top:4px}
/* Sections */
.settings-section{padding:0 4px 2px}
.settings-section+.settings-section{margin-top:22px}
.settings-section-title{
  font-size:13px;font-weight:850;text-transform:uppercase;
  letter-spacing:.04em;color:var(--text-soft);
  padding:0 20px;margin-bottom:8px;
}
.settings-list{display:flex;flex-direction:column;gap:6px}
/* Row — grid layout, title + subtitle stacked */
.settings-row{
  width:100%;min-height:72px;
  display:grid;grid-template-columns:46px minmax(0,1fr) auto;
  align-items:center;gap:14px;
  padding:12px 16px;
  border:0;border-radius:20px;
  background:linear-gradient(180deg,rgba(255,255,255,.34),rgba(255,255,255,.14)),rgba(20,20,24,.045);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 12px 26px rgba(0,0,0,.04);
  cursor:pointer;text-align:left;
  color:var(--text);
  transition:background var(--fast),transform var(--fast);
}
[data-theme='dark'] .settings-row{
  background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02)),rgba(255,255,255,.04);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 12px 26px rgba(0,0,0,.18);
}
.settings-row:hover{transform:translateY(-1px)}
[data-theme='dark'] .settings-row:hover{background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03)),rgba(255,255,255,.07)}
.settings-row:active{transform:scale(.99)}
.settings-row.disabled{opacity:.45;cursor:default}
.settings-row.disabled:active{transform:none}
.settings-row.danger .settings-row-title{color:var(--danger)}
.settings-row-icon{
  width:46px;height:46px;border-radius:var(--radius-sm);
  background:rgba(255,255,255,.5);
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;color:var(--text);
}
[data-theme='dark'] .settings-row-icon{background:rgba(255,255,255,.08)}
.settings-row-icon svg{width:22px;height:22px}
.settings-row-main{
  min-width:0;
  display:flex;flex-direction:column;align-items:flex-start;gap:4px;
}
.settings-row-title{
  display:block;width:100%;
  font-size:16px;line-height:1.2;font-weight:800;color:var(--text);
  white-space:normal;overflow-wrap:anywhere;
}
.settings-row-subtitle{
  display:block;width:100%;
  font-size:13px;line-height:1.3;font-weight:500;color:var(--text-muted);
  white-space:normal;overflow-wrap:anywhere;
}
.settings-row-action{display:flex;align-items:center;justify-content:center;color:var(--text-soft);flex-shrink:0}
.settings-row-action svg{width:18px;height:18px}
/* Toggle */
.settings-toggle{
  width:50px;height:30px;border-radius:999px;border:none;
  background:rgba(0,0,0,.14);cursor:pointer;
  position:relative;flex-shrink:0;
  transition:background var(--normal) var(--ease-out);
}
[data-theme='dark'] .settings-toggle{background:rgba(255,255,255,.15)}
.settings-toggle.on{background:var(--accent)}
.settings-toggle-thumb{
  position:absolute;top:3px;left:3px;
  width:24px;height:24px;border-radius:50%;
  background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.15);
  transition:transform var(--normal) var(--ease-out);
}
.settings-toggle.on .settings-toggle-thumb{transform:translateX(20px)}
/* Devices */
.devices-page{display:flex;flex-direction:column;height:100%}
.devices-info-card{
  padding:14px 16px;border-radius:18px;margin-bottom:14px;
  font-size:13px;line-height:1.6;color:var(--text-muted);
  background:rgba(0,0,0,.04);
}
[data-theme='dark'] .devices-info-card{background:rgba(255,255,255,.04)}
.devices-list-card{
  border-radius:18px;overflow:hidden;
  background:rgba(0,0,0,.04);
}
[data-theme='dark'] .devices-list-card{background:rgba(255,255,255,.04)}
.device-row{
  display:flex;align-items:flex-start;gap:12px;padding:14px 16px;
}
.device-row+.device-row{border-top:1px solid var(--bdr)}
.device-icon{flex-shrink:0;color:var(--text-muted);margin-top:1px}
.device-icon svg{width:22px;height:22px}
.device-main{flex:1;min-width:0}
.device-title{font-size:12px;color:var(--text);line-height:1.4;word-break:break-all;white-space:normal}
.device-subtitle{font-size:11px;color:var(--text-soft);margin-top:3px}
.device-badge{
  flex-shrink:0;font-size:10px;font-weight:800;
  padding:4px 10px;border-radius:999px;
}
.device-badge.current{background:rgba(53,208,127,.15);color:var(--success)}
.device-badge.disabled{background:rgba(255,77,109,.12);color:var(--danger)}
`;

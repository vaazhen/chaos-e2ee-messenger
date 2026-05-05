export const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg0:#f6f6f4;
  --bg1:#ffffff;
  --bg2:#f0f0ee;
  --bg3:#e8e8e6;
  --bg4:#dededc;
  --out:#0f6ea8;
  --in:#ffffff;
  --acc:#111111;
  --acc2:rgba(17,17,17,.08);
  --acc3:rgba(17,17,17,.05);
  --t1:#090909;
  --t2:#747474;
  --t3:#9a9a9a;
  --bdr:rgba(0,0,0,.07);
  --bdr2:rgba(0,0,0,.11);
  --green:#1aa05d;
  --red:#e5484d;
  --font:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Roboto,Arial,sans-serif;
  --shadow:0 22px 60px rgba(0,0,0,.13);
  --soft-shadow:0 16px 38px rgba(0,0,0,.08);
}
[data-theme='dark']{
  --bg0:#0b0e12;
  --bg1:#151922;
  --bg2:#1c222d;
  --bg3:#242b37;
  --bg4:#303846;
  --out:#1f6da2;
  --in:#1b222d;
  --acc:#f2f4f7;
  --acc2:rgba(255,255,255,.08);
  --acc3:rgba(255,255,255,.04);
  --t1:#f3f5f8;
  --t2:#a0a7b2;
  --t3:#737b88;
  --bdr:rgba(255,255,255,.08);
  --bdr2:rgba(255,255,255,.12);
  --shadow:0 22px 70px rgba(0,0,0,.35);
  --soft-shadow:0 16px 44px rgba(0,0,0,.28);
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
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pop{0%{transform:scale(.92);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}

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

/* APP SHELL */
.app{
  height:100vh;
  background:
    radial-gradient(circle at 50% -20%,rgba(255,255,255,.9),transparent 36%),
    var(--bg0);
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
  overflow:hidden;
}
.home-screen{
  background:var(--bg0);
  border-right:1px solid var(--bdr);
  display:flex;
  flex-direction:column;
  min-width:0;
  position:relative;
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
  padding:22px 20px 120px;
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
  background:var(--bg1);
  box-shadow:var(--soft-shadow);
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
  background:var(--bg1);
  box-shadow:var(--shadow);
}

.conversation-item:active{
  transform:scale(.99);
}

[data-theme='dark'] .conversation-item{
  background:rgba(24,28,37,.86);
  border:1px solid var(--bdr2);
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
}
.bottom-search{
  height:58px;
  border-radius:999px;
  background:var(--bg1);
  box-shadow:var(--soft-shadow);
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 18px;
  color:var(--t2);
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
.av.sm{width:28px;height:28px;font-size:11px}
.av.md{width:44px;height:44px;font-size:15px}
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

/* CHAT */
.product-chat-head{
  background:rgba(255,255,255,.55);
  backdrop-filter:blur(18px);
  border-bottom:1px solid var(--bdr);
}
[data-theme='dark'] .product-chat-head{background:rgba(15,18,24,.55)}
.product-chat-title{flex:1;min-width:0}
.head-name{
  font-size:18px;
  font-weight:900;
  letter-spacing:-.03em;
}
.head-status{
  display:flex;
  align-items:center;
  min-height:16px;
  font-size:13px;
  color:var(--green);
  margin-top:4px;
  line-height:1.15;
}
.head-status.off{color:var(--t2)}
.msgs{
  flex:1;
  padding:18px 20px 10px;
  display:flex;
  flex-direction:column;
  gap:3px;
  background:
    radial-gradient(circle at 15% 20%,rgba(0,0,0,.025),transparent 22%),
    radial-gradient(circle at 80% 0%,rgba(0,0,0,.03),transparent 30%),
    var(--bg0);
}
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
}
.msg-wrap.out{flex-direction:row-reverse}
.bubble{
  max-width:min(68%,560px);
  padding:8px 11px;
  border-radius:20px;
  position:relative;
  font-size:15px;
  line-height:1.45;
  word-break:break-word;
  cursor:pointer;
  box-shadow:0 1px 1px rgba(0,0,0,.04);
}
.bubble.in{
  background:var(--in);
  color:var(--t1);
  border-bottom-left-radius:7px;
}
.bubble.out{
  background:var(--out);
  color:#fff;
  border-bottom-right-radius:7px;
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
  min-width:220px;
  max-width:min(340px,62vw);
  padding:6px 8px 6px 6px;
  margin-bottom:6px;
  border-radius:18px;
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
  border:1px solid rgba(255,255,255,.22);
  background:rgba(255,255,255,.18);
  color:inherit;
  border-radius:999px;
  padding:2px 7px;
  font-size:12px;
  cursor:pointer;
}
.bubble.in .reaction-chip{
  border-color:var(--bdr2);
  background:var(--bg2);
}
.reaction-chip.mine{
  border-color:#111;
  background:rgba(0,0,0,.1);
}
.enc-notice{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:5px;
  padding:7px 12px;
  font-size:12px;
  color:var(--t2);
  background:var(--bg0);
}
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
.input-bar{
  padding:10px 14px 16px;
  display:flex;
  align-items:flex-end;
  gap:10px;
  background:var(--bg0);
  position:relative;
}
.inp-area{
  flex:1;
  min-height:52px;
  border-radius:999px;
  background:var(--bg1);
  box-shadow:var(--soft-shadow);
  display:flex;
  align-items:flex-end;
  gap:8px;
  padding:8px 8px 8px 12px;
  cursor:text;
}
.inp-area.recording-inline{
  align-items:center;
  padding:8px 10px;
  cursor:default;
}
.inp-area.recording-inline>.emoji-trigger,
.inp-area.recording-inline>.msg-inp,
.inp-area.recording-inline>input{
  display:none;
}
.recording-inline-cancel,
.recording-pause{
  border:none;
  background:transparent;
  color:var(--t2);
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
}
.recording-inline-cancel{
  width:30px;
  height:30px;
  border-radius:50%;
  background:var(--bg2);
  color:var(--t1);
  font-size:20px;
  line-height:1;
}
.recording-time{
  color:var(--t1);
  font-size:14px;
  font-weight:900;
  min-width:42px;
}
.voice-live-wave{
  flex:1;
  min-width:80px;
  height:32px;
  display:flex;
  align-items:center;
  gap:2px;
  overflow:hidden;
}
.voice-live-wave i{
  width:3px;
  min-height:5px;
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
.msg-inp{
  flex:1;
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
.emoji-trigger{
  border:none;background:transparent;
  cursor:pointer;
  font-size:20px;
  height:34px;
  width:34px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.emoji-trigger.recording{
  color:var(--red);
  animation:pulseVoice 1s ease-in-out infinite;
}
.emoji-trigger:disabled{
  opacity:.45;
  cursor:default;
}
.old-voice-trigger{
  display:none;
}
.voice-error{
  margin:8px 14px 0;
  color:var(--red);
  font-size:13px;
}
.recording-panel{
  margin:8px 14px 0;
  min-height:48px;
  border-radius:24px;
  background:var(--bg1);
  box-shadow:var(--soft-shadow);
  display:flex;
  align-items:center;
  gap:10px;
  padding:8px 10px 8px 14px;
  color:var(--t1);
}
.recording-panel.locked{
  box-shadow:0 0 0 2px rgba(229,72,77,.16), var(--soft-shadow);
}
.recording-pulse{
  width:10px;
  height:10px;
  border-radius:50%;
  background:var(--red);
  animation:pulseVoice 1s ease-in-out infinite;
}
.recording-panel span{
  font-weight:900;
  font-size:15px;
}
.recording-panel b{
  flex:1;
  min-width:0;
  color:var(--t2);
  font-size:13px;
  font-weight:800;
}
.recording-cancel{
  border:none;
  background:transparent;
  color:var(--red);
  cursor:pointer;
  font-size:13px;
  font-weight:900;
}
.recording-send{
  width:36px;
  height:36px;
  border:none;
  border-radius:50%;
  background:#111;
  color:#fff;
  cursor:pointer;
  font-size:16px;
}
[data-theme='dark'] .recording-send{
  background:#f3f5f8;
  color:#08090b;
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
  left:14px;
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

/* SHEETS / SETTINGS / NEW CHAT */
.sheet-bg,.modal-bg{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.22);
  display:flex;
  align-items:stretch;
  justify-content:center;
  z-index:250;
  animation:fadeIn .16s ease;
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
.user-profile-hero .av.lg{
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

/* OLD MODAL COMPAT */
.modal{
  width:min(420px,92vw);
  align-self:center;
  background:var(--bg1);
  border-radius:28px;
  padding:24px;
  box-shadow:var(--shadow);
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
  margin:10px 16px 0;
  height:50px;
  border-radius:999px;
  background:var(--bg1);
  box-shadow:var(--soft-shadow);
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 14px 0 18px;
  color:var(--t2);
  z-index:6;
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

.chat-search-bar b{
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
  box-shadow:var(--shadow);
  backdrop-filter:blur(26px);
  z-index:30;
  padding:16px;
  animation:pop .16s ease;
}

[data-theme='dark'] .chat-tools-panel{
  background:rgba(24,28,37,.92);
  border-color:var(--bdr2);
}

.chat-tools-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
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

.chat-bg-clean .msgs{
  background:var(--bg0);
}

.chat-bg-soft .msgs{
  background:
    radial-gradient(circle at 20% 0%,rgba(255,255,255,.9),transparent 34%),
    radial-gradient(circle at 80% 18%,rgba(15,110,168,.07),transparent 28%),
    linear-gradient(180deg,var(--bg0),#f2f0ed);
}

.chat-bg-grid .msgs{
  background:
    linear-gradient(rgba(0,0,0,.035) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,0,0,.035) 1px,transparent 1px),
    var(--bg0);
  background-size:18px 18px;
}

.chat-bg-paper .msgs{
  background:
    radial-gradient(circle at 12% 22%,rgba(0,0,0,.035),transparent 14%),
    radial-gradient(circle at 76% 6%,rgba(0,0,0,.035),transparent 20%),
    radial-gradient(circle at 92% 70%,rgba(0,0,0,.025),transparent 18%),
    #f3efe7;
}

[data-theme='dark'] .chat-bg-paper .msgs,
[data-theme='dark'] .chat-bg-soft .msgs,
[data-theme='dark'] .chat-bg-grid .msgs{
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
  background:rgba(255,255,255,.82);
  border:1px solid rgba(255,255,255,.88);
  box-shadow:0 28px 80px rgba(15,23,42,.18);
  backdrop-filter:blur(26px);
  color:var(--t1);
}

[data-theme='dark'] .chat-tools-panel{
  background:rgba(22,25,34,.88);
  border-color:rgba(255,255,255,.08);
  box-shadow:0 28px 80px rgba(0,0,0,.42);
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
.user-profile-screen .group-admin-pagination{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:10px 12px;
  margin-top:10px;
  padding-top:10px;
  border-top:1px solid color-mix(in srgb, var(--bdr) 55%, transparent);
}
.user-profile-screen .group-admin-pagination__status{
  font-size:13px;
  color:var(--t2);
  font-weight:650;
  flex:1;
  min-width:140px;
}
.user-profile-screen .group-admin-pagination__nav{
  min-width:88px;
}
.user-profile-screen .group-admin-pagination__pages{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  width:100%;
  justify-content:flex-start;
}
.user-profile-screen .group-admin-page-btn{
  min-width:36px;
  height:36px;
  padding:0 8px;
  border-radius:12px;
  border:none;
  background:var(--bg2);
  color:var(--t1);
  font-weight:800;
  font-size:13px;
  cursor:pointer;
  box-shadow:var(--soft-shadow);
}
.user-profile-screen .group-admin-page-btn--active{
  box-shadow:inset 0 0 0 2px var(--acc);
  background:var(--acc2);
}
.user-profile-screen .group-admin-page-btn:disabled{
  opacity:.45;
  cursor:default;
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
`;

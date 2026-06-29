export const PROFILE_DRAWER_CSS = `
.profile-drawer-root{
  position:fixed;
  inset:0;
  z-index:270;
  display:flex;
  align-items:flex-start;
  justify-content:center;
  pointer-events:auto;
  padding-top:70px;
}

.profile-drawer-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.28);
  backdrop-filter:blur(1px);
  animation:profileSheetFade .16s ease;
}

.profile-drawer-panel{
  position:relative;
  width:min(94%,560px);
  height:min(82dvh,760px);
  background:var(--bg0);
  border-radius:32px;
  box-shadow:0 24px 80px rgba(0,0,0,.22);
  display:flex;
  flex-direction:column;
  overflow:hidden;
  animation:profileSheetIn .18s cubic-bezier(.2,.8,.2,1);
}

.profile-drawer-grab-zone{
  height:16px;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
  cursor:default;
}

.profile-drawer-head{
  min-height:58px;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  padding:0 20px 12px;
  flex-shrink:0;
  gap:8px;
}

.profile-drawer-head-center{
  flex:1;
  min-width:0;
  text-align:center;
  padding-top:2px;
}

.profile-drawer-title{
  font-size:22px;
  font-weight:900;
  letter-spacing:-.035em;
}

.profile-drawer-subtitle{
  color:var(--t2);
  font-size:13px;
  margin-top:3px;
  line-height:1.35;
}

.profile-head-spacer{
  width:48px;
  height:48px;
  flex-shrink:0;
}

.profile-round-close{
  width:48px;
  height:48px;
  border:none;
  border-radius:50%;
  background:var(--bg1);
  color:var(--t1);
  box-shadow:var(--soft-shadow);
  font-size:28px;
  line-height:1;
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
}

.profile-tabs{
  margin:0 22px 14px;
  height:42px;
  border-radius:999px;
  padding:3px;
  background:var(--bg3);
  display:grid;
  grid-template-columns:1fr 1fr 1fr 1fr;
  flex-shrink:0;
  gap:2px;
}

.profile-tabs button{
  border:none;
  border-radius:999px;
  background:transparent;
  color:var(--t2);
  cursor:pointer;
  font-size:14px;
  font-weight:850;
  padding:0 4px;
  min-width:0;
}

.profile-tabs button.active{
  background:var(--bg1);
  color:var(--t1);
  box-shadow:0 1px 6px rgba(0,0,0,.06);
}

.profile-drawer-content{
  flex:1;
  padding:0 22px 28px;
  min-height:0;
}

.profile-section-title--first{
  margin-top:4px;
}

.profile-main-card,
.profile-card,
.profile-device-hero,
.profile-security-note,
.profile-empty-devices{
  background:var(--bg1);
  border-radius:28px;
}

.profile-main-card{
  position:relative;
  padding:20px 18px;
  display:flex;
  align-items:center;
  gap:16px;
  background:linear-gradient(135deg, rgba(255,255,255,.98), rgba(246,246,244,.98));
  border-radius:30px;
  box-shadow:0 18px 50px rgba(15,23,42,.18);
  border:1px solid rgba(255,255,255,.9);
}

[data-theme='dark'] .profile-main-card{
  background:linear-gradient(135deg, rgba(21,25,34,.96), rgba(12,16,24,.96));
  border-color:rgba(255,255,255,.06);
  box-shadow:0 22px 70px rgba(0,0,0,.55);
}

.profile-big-avatar{
  width:70px;
  height:70px;
  border-radius:50%;
  background:linear-gradient(135deg,#4fa3e0,#2d6fa8);
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:26px;
  font-weight:950;
  flex-shrink:0;
}

[data-theme='dark'] .profile-big-avatar{
  background:linear-gradient(135deg,#8ca6ff,#e5f0ff);
  color:#08090b;
}

.profile-main-text{
  display:flex;
  flex-direction:column;
  min-width:0;
}

.profile-main-text b{
  font-size:22px;
  letter-spacing:-.035em;
}

.profile-main-text small{
  color:var(--t2);
  font-size:15px;
  margin-top:3px;
}

.profile-main-handle{
  font-family:var(--font);
}

.profile-main-meta{
  color:var(--t3);
  font-size:13px;
  margin-top:6px;
}

.profile-section-title{
  color:var(--t2);
  font-weight:850;
  font-size:15px;
  margin:22px 0 10px 20px;
}

.profile-section-title.profile-section-title--connected{
  margin-top:18px;
}

.profile-card{
  overflow:hidden;
}

.profile-field{
  display:block;
  padding:14px 18px;
  border-bottom:1px solid var(--bdr);
}

.profile-field:last-child{
  border-bottom:none;
}

.profile-field span{
  display:block;
  color:var(--t2);
  font-size:12px;
  font-weight:850;
  margin-bottom:8px;
}

.profile-field input{
  width:100%;
  border:none;
  outline:none;
  background:transparent;
  color:var(--t1);
  font-size:18px;
}

.profile-field textarea{
  width:100%;
  border:none;
  outline:none;
  background:transparent;
  color:var(--t1);
  font-size:16px;
  resize:vertical;
  min-height:72px;
  font-family:inherit;
  line-height:1.4;
}

.profile-field-flat{
  border-top:1px solid var(--bdr);
  border-bottom:none;
}

.profile-row{
  width:100%;
  min-height:62px;
  border:none;
  background:transparent;
  display:grid;
  grid-template-columns:38px 1fr 20px;
  align-items:center;
  gap:12px;
  padding:0 18px;
  border-bottom:1px solid var(--bdr);
  cursor:pointer;
  text-align:left;
}

.profile-row:last-child{
  border-bottom:none;
}

.profile-row-icon{
  color:var(--t2);
  font-size:24px;
  text-align:center;
}

.profile-row-main{
  display:flex;
  flex-direction:column;
  min-width:0;
}

.profile-row-main b{
  font-size:17px;
}

.profile-row-main small{
  color:var(--t2);
  margin-top:2px;
}

.profile-row i{
  color:var(--t3);
  font-style:normal;
  font-size:22px;
}

.profile-error{
  margin-top:14px;
  border-radius:20px;
  padding:12px 14px;
  color:var(--red);
  background:rgba(229,72,77,.12);
  font-size:14px;
  line-height:1.4;
}

.profile-success{
  margin-top:14px;
  border-radius:20px;
  padding:12px 14px;
  color:var(--green);
  background:rgba(34,197,94,.12);
  font-size:14px;
  line-height:1.4;
}

.profile-bottom-actions{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
  margin-top:18px;
}

.profile-bottom-actions.single{
  grid-template-columns:1fr;
}

.profile-logout{
  width:100%;
  height:58px;
  margin-top:18px;
  border:none;
  border-radius:28px;
  background:rgba(229,72,77,.12);
  color:var(--red);
  font-size:18px;
  font-weight:900;
  cursor:pointer;
}

.profile-device-hero{
  padding:18px;
  display:flex;
  gap:15px;
  align-items:flex-start;
}

.profile-device-hero-icon{
  width:54px;
  height:54px;
  border-radius:20px;
  background:var(--bg3);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:24px;
  flex-shrink:0;
}

.profile-device-hero b{
  display:block;
  font-size:21px;
  letter-spacing:-.035em;
}

.profile-device-hero span{
  display:block;
  color:var(--t2);
  line-height:1.45;
  margin-top:4px;
}

.profile-security-note{
  color:var(--t2);
  padding:14px 16px;
  margin-top:10px;
  font-size:14px;
  line-height:1.45;
}

.profile-devices-loading{
  min-height:160px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:14px;
  color:var(--t2);
}

.profile-devices-list{
  display:flex;
  flex-direction:column;
  gap:10px;
}

.profile-device-card{
  background:var(--bg1);
  border-radius:24px;
  padding:14px;
  display:grid;
  grid-template-columns:42px 1fr auto;
  gap:12px;
  align-items:center;
  border:1px solid transparent;
}

.profile-device-card.current{
  border-color:var(--bdr2);
  box-shadow:0 0 0 3px var(--acc2);
}

.profile-device-card.inactive{
  opacity:.58;
}

.profile-device-icon{
  width:42px;
  height:42px;
  border-radius:16px;
  background:var(--bg3);
  display:flex;
  align-items:center;
  justify-content:center;
  color:var(--t1);
  font-size:18px;
}

.profile-device-main{
  min-width:0;
}

.profile-device-line{
  display:flex;
  align-items:center;
  flex-wrap:wrap;
  gap:6px;
}

.profile-device-line b{
  font-size:16px;
}

.profile-device-main small{
  display:block;
  color:var(--t3);
  margin-top:3px;
  word-break:break-all;
}

.profile-device-meta{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  color:var(--t2);
  font-size:12px;
  margin-top:7px;
}

.device-pill{
  border-radius:999px;
  padding:3px 8px;
  font-size:11px;
  font-weight:850;
}

.device-pill.current{
  background:var(--acc3);
  color:var(--t1);
}

.device-pill.off{
  background:rgba(229,72,77,.12);
  color:var(--red);
}

.profile-device-action{
  min-width:92px;
  height:38px;
  border:none;
  border-radius:999px;
  background:var(--bg2);
  color:var(--t1);
  cursor:pointer;
  font-weight:850;
}

.profile-device-action:not(:disabled):hover{
  background:rgba(229,72,77,.12);
  color:var(--red);
}

.profile-device-action:disabled{
  opacity:.45;
  cursor:default;
}

.profile-empty-devices{
  padding:22px;
  text-align:center;
  color:var(--t2);
}

.profile-empty-devices b{
  display:block;
  color:var(--t1);
  font-size:18px;
  margin-bottom:6px;
}

@keyframes profileSheetIn{
  from{
    transform:translateY(8px) scale(.99);
    opacity:0;
  }
  to{
    transform:translateY(0) scale(1);
    opacity:1;
  }
}
@keyframes profileSheetOut{
  from{transform:translateY(0) scale(1);opacity:1}
  to{transform:translateY(8px) scale(.99);opacity:0}
}
@keyframes profileSheetFade{
  from{opacity:0}
  to{opacity:1}
}
@keyframes profileSheetFadeOut{
  from{opacity:1}
  to{opacity:0}
}

.profile-avatar-upload-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
  padding:0 16px 16px;
}

.profile-avatar-upload-btn,
.profile-avatar-clear-btn{
  height:46px;
  border:none;
  border-radius:18px;
  background:var(--bg2);
  color:var(--t1);
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  font-size:15px;
  font-weight:850;
}

.profile-avatar-upload-btn:hover,
.profile-avatar-clear-btn:hover{
  background:var(--bg3);
}

.profile-avatar-error{
  margin:0 16px 16px;
  padding:10px 12px;
  border-radius:16px;
  background:rgba(229,72,77,.12);
  color:var(--red);
  font-size:13px;
  line-height:1.35;
}

.profile-field-note{
  display:block;
  color:var(--t3);
  font-size:12px;
  margin-top:7px;
  line-height:1.35;
}

.profile-field input[readonly]{
  color:var(--t2);
  cursor:default;
}
@media (min-width: 900px){
  .profile-drawer-panel{
    height:min(84dvh,780px);
    border-radius:34px;
  }
}

@media (max-width: 520px){
  .profile-drawer-panel{
    width:calc(100% - 24px);
    height:min(84dvh,760px);
    border-radius:28px;
  }

  .profile-drawer-head,
  .profile-drawer-content{
    padding-left:18px;
    padding-right:18px;
  }

  .profile-tabs{
    margin-left:18px;
    margin-right:18px;
  }

  .profile-device-card{
    grid-template-columns:38px 1fr;
  }

  .profile-device-action{
    grid-column:1 / -1;
    width:100%;
  }
}

.profile-drawer-root.closing .profile-drawer-backdrop{
  animation:profileSheetFadeOut .14s ease forwards;
}

.profile-drawer-root.closing .profile-drawer-panel{
  animation:profileSheetOut .14s ease forwards;
  pointer-events:none;
}
`;

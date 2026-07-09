import{e as s}from"./index-87d0a815.js";const f=async(o,a)=>{const{data:e,error:n}=await s.functions.invoke("livekit-token",{body:{appointmentId:o,displayName:a}});if(n)throw new Error(`Erro ao gerar token LiveKit: ${n.message}`);if(!(e!=null&&e.token))throw new Error("Token LiveKit não retornado pelo servidor");return{token:e.token,roomName:e.roomName,serverUrl:e.serverUrl,role:e.role,windowEnd:e.windowEnd,tokenExpiresAt:e.tokenExpiresAt}},c=async(o,a,e=!1)=>{const{data:n,error:r}=await s.functions.invoke("jaas-token",{body:{roomName:o,displayName:a,isModerator:e}});if(r)throw new Error(`Erro ao gerar token JaaS: ${r.message}`);if(!(n!=null&&n.token))throw new Error("Token JaaS não retornado pelo servidor");return n.token},l=(o,a,e,n)=>{if(!o||!a||!e)return console.error("generateJaaSURL: parâmetros insuficientes",{appId:o,roomName:a,hasJwt:!!e}),"";const r=encodeURIComponent(n||"Participante");return`https://8x8.vc/${o}/${a}?jwt=${e}#config.prejoinPageEnabled=false&config.requireDisplayName=false&userInfo.displayName="${r}"`},u=o=>o!=null&&o.access_token?{"Content-Type":"application/json",Authorization:`Bearer ${o.access_token}`}:(console.warn("getAuthHeaders: sessão inválida ou sem access_token"),{"Content-Type":"application/json"}),p=async(o,a,e=!1)=>{if(!o)return console.error("openJitsiRoom: roomName ausente"),{ok:!1,error:"Room name ausente"};const n={}.VITE_JAAS_APP_ID||"vpaas-magic-cookie-c837d3d52a48449b8d190279cac3b770";if(!n)return console.error("openJitsiRoom: VITE_JAAS_APP_ID não configurado"),{ok:!1,error:"Configuração da plataforma de vídeo pendente."};let r=null;try{r=window.open("","_blank")}catch(t){console.warn("Popup blocked synchronously",t)}r?r.document.write(`
      <html>
        <head>
          <title>Conectando...</title>
          <style>
            body { background-color: #0a2540; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
            .loader { border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #0ea5e9; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loader"></div>
          <h2>Preparando ambiente seguro da videochamada...</h2>
          <p style="color: #64748b;">Conectando com a JaaS 8x8</p>
        </body>
      </html>
    `):console.warn("Popup bloqueado para sala JaaS - Tentando workaround na mesma aba");try{const t=await c(o,a,e),i=l(n,o,t,a);return i?(console.log("Abrindo sala JaaS:",{roomName:o,isModerator:e,url:i.split("?")[0]}),r?(r.location.href=i,{ok:!0}):(window.location.href=i,{ok:!0})):(r&&r.close(),{ok:!1,error:"Falha ao gerar URL JaaS"})}catch(t){return console.error("openJitsiRoom: falha ao buscar JWT",t),r&&r.close(),{ok:!1,error:t.message}}};export{c as a,f,u as g,p as o};

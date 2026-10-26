(function(){
  if(window.ClearTubeBrowser)return;
  let zoom=100,dark=false;
  function applyTheme(){if(!document.documentElement)return;document.documentElement.style.colorScheme=dark?"dark":"light";if(/(^|\.)youtube\.com$/.test(location.hostname)){document.documentElement.toggleAttribute("dark",dark);document.documentElement.setAttribute("data-audiovox-theme",dark?"dark":"light");}else if(location.hostname==="appassets.androidplatform.net"||location.protocol==="audivox-assets:"){document.documentElement.setAttribute("data-audiovox-theme",dark?"dark":"light");}}
  function applyZoom(){if(document.documentElement){const full=document.fullscreenElement||document.webkitFullscreenElement;document.documentElement.style.zoom=String(full?1:zoom/100);}}
  window.ClearTubeBrowser={version:5,setTheme(value){dark=!!value;applyTheme();},setZoom(value){zoom=Math.max(50,Math.min(150,Number(value)||100));applyZoom();}};
  document.addEventListener('DOMContentLoaded',()=>{applyZoom();applyTheme();},{once:true});document.addEventListener('fullscreenchange',applyZoom);document.addEventListener('webkitfullscreenchange',applyZoom);
  // Hide the native-app promotion while retaining YouTube search and navigation.
  function tidyYouTube(){
    if(!/(^|\.)youtube\.com$/.test(location.hostname)||document.getElementById('cleartube-browser-style'))return;
    if(!document.documentElement)return;
    const logoUrl=window.AUDIVOX_LOGO_URL||"https://appassets.androidplatform.net/assets/audiovox-logo.png";
    const style=document.createElement('style');style.id='cleartube-browser-style';
    style.textContent='a[href*="feature=mweb_c3_open_app"],a[aria-label="Open App"]{display:none!important}'+
       'ytm-button-renderer:has(a[href*="feature=mweb_c3_open_app"]){display:none!important}'+
      'html[data-audiovox-theme=dark]{--yt-spec-base-background:#0f0f0f;--yt-spec-raised-background:#202020;--yt-spec-text-primary:#f1f1f1;--yt-spec-text-secondary:#aaa;background:#0f0f0f;color:#f1f1f1}'+
      'html[data-audiovox-theme=dark] body,html[data-audiovox-theme=dark] .mobile-topbar-header{background:#0f0f0f!important;color:#f1f1f1!important}'+
      'ytm-home-logo button{display:flex!important;align-items:center;gap:6px;min-width:138px;padding-right:10px!important}'+
      'ytm-home-logo button>*{display:none!important}'+
      'ytm-home-logo button::before{content:"";display:block;width:30px;height:30px;border-radius:7px;background:white url("'+logoUrl+'") center/contain no-repeat}'+
      'ytm-home-logo button::after{content:"AudiVox";font:700 21px system-ui;color:inherit;white-space:nowrap}';
    document.documentElement.appendChild(style);
  }
  document.addEventListener('DOMContentLoaded',tidyYouTube,{once:true});tidyYouTube();
  // Keep videos inline until users explicitly request fullscreen; the user exits
  // fullscreen to reach the bottom EQ bar.
  function inline(){document.querySelectorAll('video').forEach(function(v){v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');});}
  document.addEventListener('play',inline,true);inline();
})();

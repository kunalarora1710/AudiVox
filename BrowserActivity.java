package app.audivox;

import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.PackageInfo;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.net.http.SslError;
import android.view.*;
import android.view.inputmethod.InputMethodManager;
import android.webkit.*;
import android.widget.*;
import android.util.Log;
import androidx.webkit.*;
import org.json.*;
import java.io.*;
import java.util.*;

/** Native home always renders before the optional website engine is created. */
public class BrowserActivity extends Activity implements PlaybackService.Controller {
    private static final String TAG="AudiVox", LAB="https://appassets.androidplatform.net/assets/lab.html";
    private int ink=Color.rgb(22,32,49),muted=Color.rgb(105,117,132),blue=Color.rgb(27,107,239),paper=Color.rgb(246,248,252);
    private FrameLayout screen,content,browserBox,fullBox;
    private LinearLayout root,heading,nav;
    private ScrollView home;
    private EditText address;
    private TextView status;
    private ProgressBar progress;
    private WebView web;
    private View errorPanel,customVideo;
    private WebChromeClient.CustomViewCallback customCallback;
    private int orientationBeforeVideo,systemUiBeforeVideo;
    private ScriptHandler startup;
    private JSONObject sound;
    private Dialog effectsDialog;
    private int pageZoom=100;
    private boolean darkMode=false;
    private AlertDialog choiceDialog;
    private volatile boolean blockAds=true;
    private boolean large=false,software=false,homeShown=true,pageFailed=false,loading=false,scriptAtStart=false;
    private String engine,ads,bridge,lastUrl="https://m.youtube.com",webVersion="Not started";
    private ValueCallback<Uri[]> fileResult;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable saveHook=()->{save();installStartup();};
    private final Runnable timeout=()->{
        if(loading&&!homeShown)showError("This page is taking too long", "Check your connection, then retry. You can also try without ad blocking.");
    };
    private final Runnable poll=new Runnable(){public void run(){
        if(web!=null&&!homeShown&&!pageFailed){
            web.evaluateJavascript("JSON.stringify({url:location.href,status:window.ClearTubeAudio?window.ClearTubeAudio.status:''})",value->{
                try{
                    Object raw=new JSONTokener(value).nextValue();if(!(raw instanceof String))return;
                    JSONObject data=new JSONObject((String)raw);String message=data.optString("status");String actual=data.optString("url");if(actual.startsWith("https://")){lastUrl=actual;if(!address.hasFocus()&&!actual.equals(address.getText().toString()))address.setText(actual);}
                    if(!message.isEmpty())status.setText(message);
                }catch(Exception ignored){}
            });
        }
        handler.postDelayed(this,2500);
    }};

    @Override public void onCreate(Bundle state){
        darkMode=getPreferences(0).getBoolean("darkMode",false);setTheme(darkMode?R.style.AppThemeDark:R.style.AppTheme);setPalette();
        super.onCreate(state);
        resetSound();
        pageZoom=Math.max(50,Math.min(150,getPreferences(0).getInt("pageZoom",100)));PlaybackService.controller=new java.lang.ref.WeakReference<>(this);
        blockAds=getPreferences(0).getBoolean("ads",true);large=getPreferences(0).getBoolean("large",false);software=getPreferences(0).getBoolean("software",false);
        engine=asset("fx-adapted.js")+"\n"+asset("dsp.js")+"\n"+asset("audio.js");ads=asset("ads.js");bridge=asset("media.js")+"\n"+asset("browser.js")+"\n"+asset("seek.js");
        screen=new FrameLayout(this);screen.setBackgroundColor(paper);setContentView(screen);
        root=new LinearLayout(this);root.setOrientation(1);root.setBackgroundColor(paper);screen.addView(root,new FrameLayout.LayoutParams(-1,-1));
        root.setOnApplyWindowInsetsListener((v,i)->{v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());return i;});
        heading=row(16);TextView brand=label("AudiVox",23,ink);brand.setTypeface(null,1);heading.addView(brand,new LinearLayout.LayoutParams(0,-2,1));
        heading.addView(button("Menu",v->menu(),false));root.addView(heading);
        nav=row(12);address=new EditText(this);address.setSingleLine(true);address.setTextSize(14);address.setTextColor(ink);address.setHintTextColor(muted);
        address.setHint("Search YouTube or enter a website");address.setSelectAllOnFocus(true);address.setPadding(dp(14),0,dp(12),0);address.setBackground(shape(Color.WHITE,14));
        address.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);address.setImeOptions(android.view.inputmethod.EditorInfo.IME_ACTION_GO);
        address.setOnEditorActionListener((v,action,e)->{openAddress();return true;});nav.addView(address,new LinearLayout.LayoutParams(0,dp(50),1));nav.addView(button("Go",v->openAddress(),false));root.addView(nav);
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);progress.setVisibility(View.INVISIBLE);root.addView(progress,new LinearLayout.LayoutParams(-1,dp(3)));
        content=new FrameLayout(this);root.addView(content,new LinearLayout.LayoutParams(-1,0,1));
        browserBox=new FrameLayout(this);browserBox.setBackgroundColor(Color.WHITE);browserBox.setVisibility(View.GONE);content.addView(browserBox,new FrameLayout.LayoutParams(-1,-1));
        home=buildHome();content.addView(home,new FrameLayout.LayoutParams(-1,-1));
        status=label("Ready • Choose a website to begin",11,muted);status.setPadding(dp(16),dp(6),dp(16),dp(6));status.setMaxLines(2);status.setVisibility(View.GONE);root.addView(status);
        LinearLayout bottom=row(8);String[] labels={"Home","‹","›","Reload","EQ"};
        for(int i=0;i<labels.length;i++){final int item=i;Button b=button(labels[i],v->{if(item==0)showHome();if(item==1)goBack();if(item==2&&web!=null&&web.canGoForward()){showBrowser();web.goForward();}if(item==3)reload();if(item==4)showSound();},false);GradientDrawable border=shape(Color.WHITE,14);border.setStroke(dp(1),Color.rgb(168,182,202));b.setBackground(border);
            LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(0,dp(large?64:52),1);bp.setMargins(dp(3),dp(2),dp(3),dp(2));bottom.addView(b,bp);}
        root.addView(bottom);applyLarge();recolor(screen,darkMode);applySystemTheme();
        // Startup intentionally performs no WebView, network or injected-script work.
    }
    private ScrollView buildHome(){
        ScrollView sc=new ScrollView(this);LinearLayout box=new LinearLayout(this);box.setOrientation(1);box.setPadding(dp(22),dp(24),dp(22),dp(30));sc.addView(box);
        box.addView(label("YOUR MUSIC, YOUR SOUND",11,blue));TextView title=label("A better place\nto listen.",32,ink);title.setTypeface(null,1);box.addView(title);
        box.addView(label("Open a website. Play a song. Tap EQ below.",15,muted));
        LinearLayout first=row(0);first.setPadding(0,dp(26),0,dp(10));
        first.addView(tile("▶","Video Player","Videos & music",Color.rgb(224,44,63),()->navigate("https://m.youtube.com")),tileParams());
        first.addView(tile("♫","Music","Music browser",Color.rgb(147,62,202),()->navigate("https://music.youtube.com")),tileParams());box.addView(first);
        LinearLayout second=row(0);second.addView(tile("☁","SoundCloud","Discover audio",Color.rgb(238,119,40),()->navigate("https://soundcloud.com")),tileParams());
        second.addView(tile("♪","My audio","Files & sound check",blue,()->navigate(LAB)),tileParams());box.addView(second);
        LinearLayout card=new LinearLayout(this);card.setOrientation(1);card.setPadding(dp(18),dp(14),dp(18),dp(14));card.setBackground(shape(Color.rgb(231,239,252),18));
        LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(-1,-2);cp.topMargin=dp(24);box.addView(card,cp);
        card.addView(label("Make it sound like you.",18,ink));card.addView(label("Clarity • Ambience • Surround Sound\nEqualizer & Reverb presets",13,muted));card.addView(button("Open sound studio",v->showSound(),true));
        box.addView(label("Ad filtering is on by default. Results depend on the website.",11,muted));return sc;
    }
    private LinearLayout.LayoutParams tileParams(){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,-2,1);p.setMargins(dp(4),0,dp(4),dp(6));return p;}
    private View tile(String symbol,String title,String sub,int color,Runnable action){
        LinearLayout t=new LinearLayout(this);t.setOrientation(1);t.setGravity(Gravity.CENTER);t.setPadding(dp(8),dp(18),dp(8),dp(18));t.setBackground(shape(Color.WHITE,18));t.setMinimumHeight(dp(156));
        TextView icon=label(symbol,30,Color.WHITE);icon.setGravity(Gravity.CENTER);icon.setBackground(shape(color,14));t.addView(icon,new LinearLayout.LayoutParams(dp(54),dp(54)));
        TextView name=label(title,15,ink);name.setGravity(Gravity.CENTER);name.setTypeface(null,1);t.addView(name);TextView detail=label(sub,11,muted);detail.setGravity(Gravity.CENTER);t.addView(detail);
        t.setContentDescription(title);t.setFocusable(true);t.setOnClickListener(v->action.run());return t;
    }

    private boolean ensureWeb(){
        if(web!=null)return true;
        try{
            PackageInfo provider=WebView.getCurrentWebViewPackage();webVersion=provider==null?"Not available":provider.packageName+" "+provider.versionName;
            web=new WebView(this){
                @Override protected void onWindowVisibilityChanged(int visibility){super.onWindowVisibilityChanged(View.VISIBLE);}
            };web.setBackgroundColor(Color.WHITE);web.setLayerType(software?View.LAYER_TYPE_SOFTWARE:View.LAYER_TYPE_NONE,null);
            if(BuildConfig.DEBUG)WebView.setWebContentsDebuggingEnabled(true);
            WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setMediaPlaybackRequiresUserGesture(false);
            s.setAllowFileAccess(false);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            s.setLoadWithOverviewMode(true);s.setUseWideViewPort(true);s.setSupportMultipleWindows(false);s.setTextZoom(large?115:100);
            CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
            WebViewAssetLoader local=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
            web.setWebViewClient(new WebViewClient(){
                @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
                    WebResourceResponse bundled=local.shouldInterceptRequest(r.getUrl());if(bundled!=null)return bundled;
                    if(blockAds&&!r.isForMainFrame()&&AdRules.blocked(r.getUrl().toString()))return new WebResourceResponse("text/plain","UTF-8",204,"No Content",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
                    return null;
                }
                @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return route(r.getUrl());}
                @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){
                    lastUrl=url;address.setText(url);pageFailed=false;loading=true;clearError();progress.setVisibility(View.VISIBLE);status.setText("Loading website…");handler.removeCallbacks(timeout);handler.postDelayed(timeout,25000);
                }
                @Override public void onPageCommitVisible(WebView v,String url){loading=false;pageFailed=false;handler.removeCallbacks(timeout);clearError();}
                @Override public void onPageFinished(WebView v,String url){
                    loading=false;handler.removeCallbacks(timeout);progress.setVisibility(View.INVISIBLE);if(pageFailed)return;
                    inject();status.setText("Play a song, then tap EQ in the bottom bar.");
                }
                @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())showError("Website could not load",String.valueOf(e.getDescription()));}
                @Override public void onReceivedHttpError(WebView v,WebResourceRequest r,WebResourceResponse e){if(r.isForMainFrame()&&e.getStatusCode()>=400)showError("Website returned an error","HTTP "+e.getStatusCode()+". Try again or open another website.");}
                @Override public void onReceivedSslError(WebView v,SslErrorHandler h,SslError e){h.cancel();showError("Secure connection failed","Check the device date and internet connection, then retry.");}
                @Override public boolean onRenderProcessGone(WebView v,RenderProcessGoneDetail detail){
                    Log.w(TAG,"Website renderer terminated");PlaybackService.close(BrowserActivity.this);startup=null;browserBox.removeView(v);v.destroy();web=null;
                    showError("The website renderer stopped","Tap Retry to restart it. If this repeats, try compatibility rendering from Menu.");return true;
                }
            });
            web.setWebChromeClient(new WebChromeClient(){
                @Override public void onProgressChanged(WebView v,int p){progress.setProgress(p);if(p==100)progress.setVisibility(View.INVISIBLE);}
                @Override public boolean onConsoleMessage(ConsoleMessage m){Log.d(TAG,"Web: "+m.message());return true;}
                @Override public void onShowCustomView(View v,CustomViewCallback callback){showVideo(v,callback);}
                @Override public void onHideCustomView(){hideVideo();}
                @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> result,FileChooserParams params){
                    if(!LAB.equals(v.getUrl()))return false;if(fileResult!=null)fileResult.onReceiveValue(null);fileResult=result;
                    Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("audio/*");
                    try{startActivityForResult(pick,42);}catch(ActivityNotFoundException e){fileResult.onReceiveValue(null);fileResult=null;toast("No file picker found on this device.");}return true;
                }
            });
            if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){
                WebViewCompat.addWebMessageListener(web,"ClearTubePlayback",Collections.singleton("*"),(view,message,origin,isMainFrame,reply)->{
                    if(!isMainFrame||!"https".equals(origin.getScheme()))return;
                    try{String payload=message.getData();if(payload!=null&&payload.length()<4096)PlaybackService.report(this,new JSONObject(payload));}catch(Exception ignored){}
                });
            }
            browserBox.addView(web,0,new FrameLayout.LayoutParams(-1,-1));installStartup();return true;
        }catch(Exception|LinkageError ex){Log.e(TAG,"WebView initialization",ex);if(web!=null){browserBox.removeView(web);try{web.destroy();}catch(Exception ignored){}web=null;}
            showError("Website engine unavailable","Update Android System WebView or Chrome, then reopen AudiVox.\n"+ex.getClass().getSimpleName()+": "+ex.getMessage());return false;
        }
    }
    private boolean route(Uri uri){
        if("cleartube".equals(uri.getScheme())){if("equalizer".equals(uri.getHost()))showSound();return true;}
        if("https".equals(uri.getScheme()))return false;
        if("http".equals(uri.getScheme())){navigate(uri.buildUpon().scheme("https").build().toString());return true;}
        if("about".equals(uri.getScheme()))return false;
        toast("Open this content using an HTTPS website link.");return true;
    }
    private void navigate(String url){lastUrl=url;showBrowser();if(ensureWeb())web.loadUrl(url);}
    private void showBrowser(){heading.setVisibility(View.GONE);nav.setVisibility(View.GONE);homeShown=false;home.setVisibility(View.GONE);browserBox.setVisibility(View.VISIBLE);}
    private void showHome(){heading.setVisibility(View.VISIBLE);nav.setVisibility(View.VISIBLE);hideVideo();homeShown=true;if(web!=null)web.evaluateJavascript("document.querySelectorAll('video,audio').forEach(function(m){m.pause();})",null);browserBox.setVisibility(View.GONE);home.setVisibility(View.VISIBLE);address.setText("");status.setText("Ready • Choose a website to begin");}
    private void openAddress(){String q=address.getText().toString().trim();if(q.isEmpty())return;String url=q.contains("://")?q:(q.contains(".")&&!q.contains(" ")?"https://"+q:"https://m.youtube.com/results?search_query="+Uri.encode(q));if(!"https".equals(Uri.parse(url).getScheme())){toast("Use an HTTPS address.");return;}address.clearFocus();((InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(address.getWindowToken(),0);navigate(url);}
    private void goBack(){if(customVideo!=null){hideVideo();return;}if(!homeShown&&web!=null&&web.canGoBack())web.goBack();else showHome();}
    private void reload(){if(homeShown)return;clearError();if(ensureWeb()){
        final WebView current=web;
        current.evaluateJavascript("if(window.ClearTubeMedia)window.ClearTubeMedia.prepareReload();",value->{if(web==current&&!homeShown)current.reload();});
    }}
    private void showError(String title,String detail){
        pageFailed=true;loading=false;handler.removeCallbacks(timeout);progress.setVisibility(View.INVISIBLE);clearError();
        LinearLayout panel=new LinearLayout(this);panel.setOrientation(1);panel.setGravity(Gravity.CENTER);panel.setPadding(dp(28),dp(28),dp(28),dp(28));panel.setBackgroundColor(paper);
        panel.addView(label(title,23,ink));panel.addView(label(detail,14,muted));panel.addView(button("Retry",v->reload(),true));
        panel.addView(button("Try without ad blocking",v->{blockAds=false;save();installStartup();reload();},false));panel.addView(button("Back to home",v->showHome(),false));
        errorPanel=panel;browserBox.addView(panel,new FrameLayout.LayoutParams(-1,-1));status.setText(title);
    }
    private void clearError(){if(errorPanel!=null){browserBox.removeView(errorPanel);errorPanel=null;}}
    private String script(){return "if(window===window.top){"+engine+"\n"+ads+"\n"+bridge+"\nif(window.ClearTubeBrowser){window.ClearTubeBrowser.setZoom("+pageZoom+");window.ClearTubeBrowser.setTheme("+darkMode+");}if(window.ClearTubeAudio)window.ClearTubeAudio.apply("+sound+");if(window.ClearTubeAds)window.ClearTubeAds.setEnabled("+blockAds+");}";}
    private void installStartup(){
        if(web==null)return;
        try{
            if(startup!=null){startup.remove();startup=null;}scriptAtStart=false;
            if(WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)){
                // '*' is the documented all-origins rule. Each script independently
                // restricts its behavior, and navigation permits HTTPS only.
                startup=WebViewCompat.addDocumentStartJavaScript(web,script(),Collections.singleton("*"));scriptAtStart=true;
            }
        }catch(RuntimeException|LinkageError ex){Log.w(TAG,"Document-start unavailable; using page-finished fallback",ex);scriptAtStart=false;}
    }
    private void inject(){if(web!=null)web.evaluateJavascript(script(),null);}
    private void put(String key,Object value){try{sound.put(key,value);}catch(JSONException ignored){}}
    private void save(){getPreferences(0).edit().remove("soundV2").putInt("pageZoom",pageZoom).putBoolean("ads",blockAds).putBoolean("large",large).putBoolean("software",software).apply();}
    private void apply(){if(web!=null)web.evaluateJavascript("if(window.ClearTubeAudio)window.ClearTubeAudio.apply("+sound+");",null);handler.removeCallbacks(saveHook);handler.postDelayed(saveHook,350);}
    private void resetSound(){
        sound=new JSONObject();put("schema",5);put("enabled",true);
        for(String key:new String[]{"clarity","ambience","width","dynamics","bass","eqBass","eqMid","eqTreble","reverbPreset","reverbAmount"})put(key,0);
    }
    private void restore(){resetSound();save();installStartup();reload();toast("All effects reset to zero. Original audio.");}
    private void showVideo(View v,WebChromeClient.CustomViewCallback callback){
        if(customVideo!=null){callback.onCustomViewHidden();return;}customVideo=v;customCallback=callback;fullBox=new FrameLayout(this);fullBox.setBackgroundColor(Color.BLACK);
        orientationBeforeVideo=getRequestedOrientation();systemUiBeforeVideo=getWindow().getDecorView().getSystemUiVisibility();
        fullBox.addView(v,new FrameLayout.LayoutParams(-1,-1));
        screen.addView(fullBox,new FrameLayout.LayoutParams(-1,-1));root.setVisibility(View.GONE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
    }
    private void hideVideo(){
        if(customVideo==null)return;
        fullBox.removeView(customVideo);screen.removeView(fullBox);customVideo=null;fullBox=null;root.setVisibility(View.VISIBLE);
        getWindow().getDecorView().setSystemUiVisibility(systemUiBeforeVideo);setRequestedOrientation(orientationBeforeVideo);
        WebChromeClient.CustomViewCallback callback=customCallback;customCallback=null;if(callback!=null)callback.onCustomViewHidden();
    }
    private void menu(){new AlertDialog.Builder(this).setTitle("AudiVox").setItems(new String[]{"Home",blockAds?"Ad filtering: ON":"Ad filtering: OFF",large?"Large controls: ON":"Large controls: OFF",software?"Compatibility rendering: ON":"Compatibility rendering: OFF","Reset to original audio","Device / app info","Open-source licenses","Page zoom: "+pageZoom+"%",darkMode?"Theme: Dark → Light":"Theme: Light → Dark"},(d,i)->{
        if(i==8)toggleTheme();if(i==7)showZoom();if(i==0)showHome();if(i==1){blockAds=!blockAds;save();installStartup();reload();}
        if(i==2){large=!large;save();applyLarge();toast("Large controls "+(large?"enabled":"disabled"));}
        if(i==3){software=!software;save();if(web!=null)web.setLayerType(software?View.LAYER_TYPE_SOFTWARE:View.LAYER_TYPE_NONE,null);reload();}
        if(i==6)navigate("https://appassets.androidplatform.net/assets/licenses.html");if(i==4)restore();if(i==5)new AlertDialog.Builder(this).setTitle("Device / app info").setMessage("AudiVox "+BuildConfig.VERSION_NAME+"\nAndroid "+Build.VERSION.RELEASE+" (API "+Build.VERSION.SDK_INT+")\n"+Build.MANUFACTURER+" "+Build.MODEL+"\nWebView: "+webVersion+"\nEarly scripts: "+scriptAtStart+"\n\nEffects apply inside this browser. Ad filtering is best effort. Full Android head units are supported; Android Auto is not. Use video while parked.\n\nThis app made by Kunal").setPositiveButton("OK",null).show();
    }).show();}
    private void setPalette(){
        ink=darkMode?Color.rgb(235,240,248):Color.rgb(22,32,49);
        muted=darkMode?Color.rgb(170,184,204):Color.rgb(105,117,132);
        blue=darkMode?Color.rgb(122,177,255):Color.rgb(27,107,239);
        paper=darkMode?Color.rgb(17,21,28):Color.rgb(246,248,252);
        fxWhite=Color.rgb(243,243,246);fxGray=Color.rgb(169,169,181);
    }
    private int themeColor(int value,boolean dark){
        int[] light={Color.rgb(22,32,49),Color.rgb(105,117,132),Color.rgb(27,107,239),Color.rgb(246,248,252),Color.WHITE,Color.rgb(231,239,252)};
        int[] night={Color.rgb(235,240,248),Color.rgb(170,184,204),Color.rgb(122,177,255),Color.rgb(17,21,28),Color.rgb(30,37,48),Color.rgb(31,43,61)};
        for(int i=0;i<light.length;i++)if(value==(dark?light[i]:night[i]))return dark?night[i]:light[i];return value;
    }
    private void recolor(View view,boolean dark){
        if(view instanceof WebView)return;
        android.graphics.drawable.Drawable bg=view.getBackground();
        if(bg instanceof android.graphics.drawable.ColorDrawable)view.setBackgroundColor(themeColor(((android.graphics.drawable.ColorDrawable)bg).getColor(),dark));
        else if(bg instanceof GradientDrawable){GradientDrawable g=(GradientDrawable)bg.mutate();if(g.getColor()!=null)g.setColor(themeColor(g.getColor().getDefaultColor(),dark));}
        if(view instanceof TextView){TextView text=(TextView)view;int c=text.getCurrentTextColor();if(c!=Color.WHITE)text.setTextColor(themeColor(c,dark));if(view instanceof EditText)text.setHintTextColor(muted);}
        if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++)recolor(group.getChildAt(i),dark);}
    }
    private void applySystemTheme(){
        getWindow().setStatusBarColor(paper);getWindow().setNavigationBarColor(paper);
        int flags=getWindow().getDecorView().getSystemUiVisibility();int light=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(darkMode?flags&~light:flags|light);
    }
    private void toggleTheme(){
        darkMode=!darkMode;getPreferences(0).edit().putBoolean("darkMode",darkMode).apply();setPalette();setTheme(darkMode?R.style.AppThemeDark:R.style.AppTheme);
        recolor(screen,darkMode);applySystemTheme();installStartup();
        if(web!=null)web.evaluateJavascript("if(window.ClearTubeBrowser)window.ClearTubeBrowser.setTheme("+darkMode+");",null);
    }
    private void applyLarge(){if(web!=null)web.getSettings().setTextZoom(large?115:100);if(large)getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);}
    private int fxPink=Color.rgb(238,54,102),fxWhite=Color.rgb(243,243,246),fxGray=Color.rgb(169,169,181);
    private final String[] eqNames={"No filter","Bass −","Bass +","Bass ++","Mid −","Mid +","Treble −","Treble +"};
    private final String[] roomNames={"No reverb","Medium room","Concert hall","Cathedral (Not recommended)"};
    private int choice(String key,int count){return Math.max(0,Math.min(count-1,sound.optInt(key,0)));}
    private Button fxButton(String title,int color,View.OnClickListener action){
        Button b=button(title,action,false);b.setTextColor(color);b.setBackground(shape(Color.rgb(30,30,36),10));b.setStateListAnimator(null);return b;
    }
    private void showSound(){
        final Dialog dialog=new Dialog(this,android.R.style.Theme_Material_NoActionBar);effectsDialog=dialog;
        LinearLayout panel=new LinearLayout(this);panel.setOrientation(1);panel.setPadding(dp(18),dp(8),dp(18),dp(16));panel.setBackground(shape(Color.rgb(15,15,19),20));
        LinearLayout top=row(0);Button reset=fxButton("Reset",fxPink,v->{resetSound();apply();save();dialog.dismiss();showSound();});
        top.addView(reset);TextView title=label("Effects",21,fxWhite);title.setGravity(Gravity.CENTER);top.addView(title,new LinearLayout.LayoutParams(0,-2,1));
        top.addView(fxButton("Done",Color.rgb(90,159,255),v->dialog.dismiss()));panel.addView(top);
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(false);LinearLayout box=new LinearLayout(this);box.setOrientation(1);scroll.addView(box);panel.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        effectSlider(box,"Clarity","clarity",0);effectSlider(box,"Ambience","ambience",0);effectSlider(box,"Surround Sound","width",0);effectSlider(box,"Dynamic Boost","dynamics",0);
        View divider=new View(this);divider.setBackgroundColor(Color.rgb(54,54,62));LinearLayout.LayoutParams line=new LinearLayout.LayoutParams(-1,dp(1));line.setMargins(0,dp(10),0,dp(14));box.addView(divider,line);
        equalizerChoice(box);
        effectChoice(box,"Reverb","reverbPreset",roomNames);
        LinearLayout amount=row(0);TextView amountLabel=label("Reverb amount",14,fxGray);amount.addView(amountLabel,new LinearLayout.LayoutParams(0,-2,1));
        TextView value=label(String.valueOf(sound.optInt("reverbAmount",0)),17,fxWhite);value.setGravity(Gravity.CENTER);
        Button minus=fxButton("−",fxWhite,v->{put("reverbAmount",Math.max(0,sound.optInt("reverbAmount",0)-1));value.setText(String.valueOf(sound.optInt("reverbAmount")));apply();});
        Button plus=fxButton("+",fxWhite,v->{put("reverbAmount",Math.min(10,sound.optInt("reverbAmount",0)+1));value.setText(String.valueOf(sound.optInt("reverbAmount")));apply();});
        amount.addView(minus,new LinearLayout.LayoutParams(dp(48),dp(48)));amount.addView(value,new LinearLayout.LayoutParams(dp(42),dp(48)));amount.addView(plus,new LinearLayout.LayoutParams(dp(48),dp(48)));box.addView(amount);
        box.addView(label("Ambience adds short stereo space. Reverb adds a room tail.\nValues reset on a fresh launch. Locking keeps your EQ.",12,fxGray));
        dialog.setContentView(panel);dialog.setOnDismissListener(d->{save();installStartup();});dialog.show();
        Window w=dialog.getWindow();w.setBackgroundDrawableResource(android.R.color.transparent);w.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);w.setDimAmount(.58f);
        w.setLayout(Math.min(dp(540),getResources().getDisplayMetrics().widthPixels-dp(20)),(int)(getResources().getDisplayMetrics().heightPixels*.91));
    }
    private void effectSlider(LinearLayout box,String title,String key,int def){
        LinearLayout heading=row(0);TextView name=label(title,large?18:15,fxWhite);heading.addView(name,new LinearLayout.LayoutParams(0,-2,1));
        TextView value=label(String.valueOf(Math.round(sound.optInt(key,def)/10f)),15,fxPink);heading.addView(value);box.addView(heading);
        SeekBar slider=new SeekBar(this);slider.setMax(10);slider.setProgress(Math.round(sound.optInt(key,def)/10f));slider.setContentDescription(title);
        slider.setProgressTintList(android.content.res.ColorStateList.valueOf(fxPink));slider.setThumbTintList(android.content.res.ColorStateList.valueOf(fxPink));slider.setProgressBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(78,32,45)));
        slider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onProgressChanged(SeekBar b,int n,boolean user){value.setText(String.valueOf(n));if(user){put(key,n*10);apply();}}public void onStartTrackingTouch(SeekBar b){}public void onStopTrackingTouch(SeekBar b){save();}});
        box.addView(slider,new LinearLayout.LayoutParams(-1,dp(large?52:40)));
    }
    private String equalizerLabel(){
        ArrayList<String> parts=new ArrayList<>();String[] keys={"eqBass","eqMid","eqTreble"},names={"Bass","Mid","Treble"};
        for(int i=0;i<3;i++){int n=sound.optInt(keys[i],0);if(n!=0)parts.add(names[i]+(n==2?" ++":n>0?" +":" −"));}
        return parts.isEmpty()?"No filter":android.text.TextUtils.join(", ",parts);
    }
    private View popupHeader(String title,Runnable close){
        LinearLayout top=row(16);TextView name=label(title,20,fxWhite);top.addView(name,new LinearLayout.LayoutParams(0,-2,1));
        Button x=fxButton("×",fxPink,v->close.run());x.setTextSize(25);x.setContentDescription("Close "+title);top.addView(x,new LinearLayout.LayoutParams(dp(48),dp(48)));return top;
    }
    private void equalizerChoice(LinearLayout box){
        LinearLayout line=row(0);line.addView(label("Equalizer",large?18:16,fxWhite),new LinearLayout.LayoutParams(dp(100),-2));
        Button select=fxButton(equalizerLabel()+"  ▾",fxWhite,null);select.setGravity(Gravity.LEFT|Gravity.CENTER_VERTICAL);select.setContentDescription("Equalizer presets");select.setTextSize(14);
        select.setOnClickListener(v->{
            String[] keys={"eqBass","eqMid","eqTreble"};int[] draft={sound.optInt(keys[0],0),sound.optInt(keys[1],0),sound.optInt(keys[2],0)};
            int[] bands={-1,0,0,0,1,1,2,2},levels={0,-1,1,2,-1,1,-1,1};
            boolean[] checked=new boolean[eqNames.length];for(int i=1;i<checked.length;i++)checked[i]=draft[bands[i]]==levels[i];checked[0]=draft[0]==0&&draft[1]==0&&draft[2]==0;
            AlertDialog popup=new AlertDialog.Builder(this,android.R.style.Theme_Material_Dialog_Alert).setTitle("Equalizer")
                .setMultiChoiceItems(eqNames,checked,(d,index,on)->{
                    if(index==0){if(on)Arrays.fill(draft,0);}else{int band=bands[index];draft[band]=on?levels[index]:0;}
                    for(int i=0;i<3;i++)put(keys[i],draft[i]);select.setText(equalizerLabel()+"  ▾");apply();
                    ListView list=((AlertDialog)d).getListView();list.post(()->{
                        checked[0]=draft[0]==0&&draft[1]==0&&draft[2]==0;
                        for(int i=1;i<checked.length;i++)checked[i]=draft[bands[i]]==levels[i];
                        for(int i=0;i<checked.length;i++)list.setItemChecked(i,checked[i]);list.invalidateViews();
                    });
                }).create();choiceDialog=popup;popup.setCustomTitle(popupHeader("Equalizer",popup::dismiss));popup.show();
        });
        line.addView(select,new LinearLayout.LayoutParams(0,dp(60),1));box.addView(line);
    }
    private void effectChoice(LinearLayout box,String title,String key,String[] options){
        LinearLayout row=row(0);row.addView(label(title,large?18:16,fxWhite),new LinearLayout.LayoutParams(dp(100),-2));
        Button select=fxButton(options[choice(key,options.length)]+"  ▾",fxWhite,null);select.setGravity(Gravity.LEFT|Gravity.CENTER_VERTICAL);select.setContentDescription(title+" preset");
        select.setOnClickListener(v->{AlertDialog popup=new AlertDialog.Builder(this,android.R.style.Theme_Material_Dialog_Alert).setTitle(title).setSingleChoiceItems(options,choice(key,options.length),(d,index)->{put(key,index);select.setText(options[index]+"  ▾");apply();d.dismiss();}).setNegativeButton("Cancel",null).create();choiceDialog=popup;popup.show();});
        row.addView(select,new LinearLayout.LayoutParams(0,dp(52),1));box.addView(row);
    }
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private GradientDrawable shape(int color,int radius){GradientDrawable g=new GradientDrawable();g.setColor(color);g.setCornerRadius(dp(radius));return g;}
    private LinearLayout row(int pad){LinearLayout r=new LinearLayout(this);r.setGravity(Gravity.CENTER_VERTICAL);r.setPadding(dp(pad),dp(4),dp(pad),dp(4));return r;}
    private TextView label(String s,int size,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);t.setPadding(0,dp(6),0,dp(6));return t;}
    private Button button(String s,View.OnClickListener action,boolean filled){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextSize(large?17:14);b.setTextColor(filled?Color.WHITE:blue);b.setMinHeight(dp(48));b.setMinimumWidth(dp(48));b.setPadding(dp(12),dp(4),dp(12),dp(4));b.setBackground(shape(filled?blue:Color.WHITE,14));b.setElevation(0);b.setOnClickListener(action);return b;}
    private void toast(String message){Toast.makeText(this,message,Toast.LENGTH_SHORT).show();}
    private String asset(String name){try(InputStream in=getAssets().open(name)){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toString("UTF-8");}catch(IOException ex){Log.e(TAG,"Missing asset "+name,ex);return "";}}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==42&&fileResult!=null){fileResult.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);fileResult=null;}}
    @Override public void onBackPressed(){if(customVideo!=null||!homeShown)goBack();else super.onBackPressed();}
    @Override public void transport(String action,long position){
        handler.post(()->{if(web!=null)web.evaluateJavascript("if(window.ClearTubeMedia)window.ClearTubeMedia.command("+JSONObject.quote(action)+","+position+").catch(function(){});",null);});
    }
    private void showZoom(){
        LinearLayout box=new LinearLayout(this);box.setOrientation(1);box.setPadding(dp(20),dp(12),dp(20),dp(12));
        TextView value=label(pageZoom+"%",20,ink);box.addView(value);SeekBar slider=new SeekBar(this);slider.setMax(10);slider.setProgress((pageZoom-50)/10);slider.setContentDescription("Page zoom");box.addView(slider,new LinearLayout.LayoutParams(-1,dp(48)));
        box.addView(label("Applies to websites. Saved for your next visit.",14,muted));
        slider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onProgressChanged(SeekBar b,int n,boolean user){if(user){pageZoom=50+n*10;value.setText(pageZoom+"%");applyZoom();}}public void onStartTrackingTouch(SeekBar b){}public void onStopTrackingTouch(SeekBar b){save();installStartup();}});
        new AlertDialog.Builder(this).setTitle("Page zoom").setView(box).setNeutralButton("Reset 100%",(d,w)->{pageZoom=100;applyZoom();save();installStartup();}).setPositiveButton("Done",(d,w)->{save();installStartup();}).show();
    }
    private void applyZoom(){if(web!=null)web.evaluateJavascript("if(window.ClearTubeBrowser){window.ClearTubeBrowser.setZoom("+pageZoom+");window.ClearTubeBrowser.setTheme("+darkMode+");}",null);}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();handler.removeCallbacks(poll);handler.post(poll);}
    @Override protected void onPause(){save();handler.removeCallbacks(poll);super.onPause();}
    @Override protected void onDestroy(){PlaybackService.close(this);PlaybackService.controller.clear();handler.removeCallbacksAndMessages(null);hideVideo();if(fileResult!=null)fileResult.onReceiveValue(null);if(startup!=null)try{startup.remove();}catch(Exception ignored){}if(web!=null){browserBox.removeView(web);web.destroy();web=null;}super.onDestroy();}
}

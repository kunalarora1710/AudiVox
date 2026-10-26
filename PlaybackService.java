package app.audivox;

import android.app.*;
import android.content.*;
import android.media.*;
import android.media.session.*;
import android.os.*;
import java.lang.ref.WeakReference;
import org.json.JSONObject;

/** Foreground media session for the browser's currently playing media. */
public class PlaybackService extends Service {
    interface Controller { void transport(String action,long position); }
    static WeakReference<Controller> controller=new WeakReference<>(null);
    private static PlaybackService current;
    private static final String CHANNEL="audivox_playback";
    private static final int ID=41;
    private MediaSession session;
    private PowerManager.WakeLock wake;
    private boolean playing=false;
    private String lastNotice="",lastMetadata="";
    private String title="AudiVox",artist="";
    private long position=0,duration=0;
    private boolean canNext=false,canPrevious=false;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final Runnable idleStop=()->{if(!playing)stopSelf();};
    private final BroadcastReceiver noisy=new BroadcastReceiver(){public void onReceive(Context c,Intent i){command("pause",0);}};

    static void report(Context context,JSONObject data){
        if(current!=null){current.update(data);return;}
        if(!data.optBoolean("playing"))return;
        Intent intent=new Intent(context,PlaybackService.class).setAction("state").putExtra("state",data.toString());
        try{context.startForegroundService(intent);}catch(RuntimeException ignored){}
    }
    static void close(Context c){c.stopService(new Intent(c,PlaybackService.class));}
    private void command(String action,long at){
        Controller target=controller.get();if(target==null){stopSelf();return;}
        target.transport(action,at);
    }
    @Override public void onCreate(){
        super.onCreate();current=this;
        NotificationManager nm=getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL,"Music playback",NotificationManager.IMPORTANCE_LOW));
        wake=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"AudiVox:Playback");wake.setReferenceCounted(false);
        session=new MediaSession(this,"AudiVox");session.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS|MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        session.setCallback(new MediaSession.Callback(){
            @Override public void onPlay(){command("play",0);}
            @Override public void onPause(){command("pause",0);}
            @Override public void onSkipToNext(){command("next",0);}
            @Override public void onSkipToPrevious(){command("previous",0);}
            @Override public void onSeekTo(long pos){command("seek",pos);}
            @Override public void onStop(){command("pause",0);stopSelf();}
        },main);
        session.setSessionActivity(openApp());session.setActive(true);
        if(Build.VERSION.SDK_INT>=33)registerReceiver(noisy,new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(noisy,new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY));
        startForeground(ID,notification());
    }
    @Override public int onStartCommand(Intent i,int flags,int id){
        if(i==null){stopSelf();return START_NOT_STICKY;}
        String action=i.getAction();
        if("state".equals(action)){try{update(new JSONObject(i.getStringExtra("state")));}catch(Exception ignored){stopSelf();}}
        else if("stop".equals(action)){command("pause",0);stopSelf();}
        else if(action!=null)command(action,0);
        return START_NOT_STICKY;
    }
    private void update(JSONObject data){
        boolean wasPlaying=playing;playing=data.optBoolean("playing");title=data.optString("title","AudiVox");artist=data.optString("artist","");
        position=Math.max(0,data.optLong("position"));duration=Math.max(0,data.optLong("duration"));
        canNext=data.optBoolean("next");canPrevious=data.optBoolean("previous");
        if(playing){main.removeCallbacks(idleStop);if(!wake.isHeld())wake.acquire();}else{if(wake.isHeld())wake.release();if(wasPlaying)main.postDelayed(idleStop,300000);}
        long actions=PlaybackState.ACTION_PLAY|PlaybackState.ACTION_PAUSE|PlaybackState.ACTION_PLAY_PAUSE|PlaybackState.ACTION_STOP;
        if(duration>0)actions|=PlaybackState.ACTION_SEEK_TO;
        if(canNext)actions|=PlaybackState.ACTION_SKIP_TO_NEXT;
        if(canPrevious)actions|=PlaybackState.ACTION_SKIP_TO_PREVIOUS;
        String metadataKey=title+"|"+artist+"|"+duration;
        if(!metadataKey.equals(lastMetadata)){lastMetadata=metadataKey;session.setMetadata(new MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE,title).putString(MediaMetadata.METADATA_KEY_ARTIST,artist).putLong(MediaMetadata.METADATA_KEY_DURATION,duration).build());}
        session.setPlaybackState(new PlaybackState.Builder().setActions(actions).setState(playing?PlaybackState.STATE_PLAYING:PlaybackState.STATE_PAUSED,position,playing?1:0,SystemClock.elapsedRealtime()).build());
        String noticeKey=title+"|"+artist+"|"+playing+"|"+canNext+"|"+canPrevious;
        if(!noticeKey.equals(lastNotice)){lastNotice=noticeKey;getSystemService(NotificationManager.class).notify(ID,notification());}
    }
    private PendingIntent openApp(){return PendingIntent.getActivity(this,0,new Intent(this,BrowserActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    private PendingIntent action(String a){return PendingIntent.getService(this,a.hashCode(),new Intent(this,PlaybackService.class).setAction(a),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    private Notification notification(){
        Notification.Builder b=new Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_media_play).setContentTitle(title).setContentText(artist.isEmpty()?"AudiVox":artist)
            .setContentIntent(openApp()).setVisibility(Notification.VISIBILITY_PUBLIC).setOnlyAlertOnce(true).setShowWhen(false).setOngoing(playing).setDeleteIntent(action("stop"));
        if(canPrevious){b.addAction(new Notification.Action.Builder(android.R.drawable.ic_media_previous,"Previous",action("previous")).build());}
        b.addAction(new Notification.Action.Builder(playing?android.R.drawable.ic_media_pause:android.R.drawable.ic_media_play,playing?"Pause":"Play",action(playing?"pause":"play")).build());
        if(canNext)b.addAction(new Notification.Action.Builder(android.R.drawable.ic_media_next,"Next",action("next")).build());
        Notification.MediaStyle style=new Notification.MediaStyle().setMediaSession(session.getSessionToken());
        int count=1+(canPrevious?1:0)+(canNext?1:0);int[] compact=new int[count];for(int j=0;j<count;j++)compact[j]=j;
        b.setStyle(style.setShowActionsInCompactView(compact));return b.build();
    }
    @Override public void onTaskRemoved(Intent root){command("pause",0);stopSelf();}
    @Override public void onDestroy(){
        main.removeCallbacksAndMessages(null);if(wake!=null&&wake.isHeld())wake.release();
        if(session!=null){session.setActive(false);session.release();}unregisterReceiver(noisy);current=null;stopForeground(true);super.onDestroy();
    }
    @Override public IBinder onBind(Intent i){return null;}
}

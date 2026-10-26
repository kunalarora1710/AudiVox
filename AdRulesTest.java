import app.cleartube.AdRules;
public class AdRulesTest {
    public static void main(String[] args) {
        String[] blocked={"https://googleads.g.doubleclick.net/a","https://pagead2.googlesyndication.com/x","https://www.youtube.com/pagead/a","https://m.youtube.com/api/stats/ads?x=1"};
        String[] allowed={"https://m.youtube.com/watch?v=123","https://r1.googlevideo.com/videoplayback?x=1","https://doubleclick.net.example.org/a","https://www.youtube.com/youtubei/v1/player","https://accounts.google.com/","bad url"};
        for(String u:blocked)if(!AdRules.blocked(u))throw new AssertionError("Failed to block "+u);
        for(String u:allowed)if(AdRules.blocked(u))throw new AssertionError("Incorrectly blocked "+u);
        System.out.println("10 ad-request filtering checks passed");
    }
}

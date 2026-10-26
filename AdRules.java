package app.audivox;

import java.net.URI;
import java.util.Locale;

public final class AdRules {
    private static final String[] HOSTS = {"doubleclick.net", "googlesyndication.com", "googleadservices.com"};
    public static boolean blocked(String value) {
        try {
            URI uri = URI.create(value);
            String host = uri.getHost();
            if (host == null) return false;
            host = host.toLowerCase(Locale.ROOT);
            for (String domain : HOSTS) if (host.equals(domain) || host.endsWith("." + domain)) return true;
            String path = uri.getPath() == null ? "" : uri.getPath();
            boolean youtube = host.equals("youtube.com") || host.endsWith(".youtube.com");
            return youtube && (path.startsWith("/pagead/") || path.startsWith("/api/stats/ads"));
        } catch (IllegalArgumentException ex) { return false; }
    }
}

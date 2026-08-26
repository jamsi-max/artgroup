// Command artgroup-backend receives the contact-form submission from the
// artgroup.fun site and forwards it to a Telegram group via a bot.
//
// It exists so the bot token doesn't have to sit in client-side JS, where
// anyone viewing source could read it and abuse the bot directly.
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type config struct {
	botToken       string
	chatID         string
	allowedOrigins map[string]bool
	port           string
}

func loadConfig() config {
	origins := map[string]bool{}
	for _, o := range strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			origins[o] = true
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return config{
		botToken:       os.Getenv("TELEGRAM_BOT_TOKEN"),
		chatID:         os.Getenv("TELEGRAM_CHAT_ID"),
		allowedOrigins: origins,
		port:           port,
	}
}

type feedbackRequest struct {
	Name    string `json:"name"`
	Phone   string `json:"phone"`
	Comment string `json:"comment"`
}

// Mirrors the maxlength attributes on the form fields in index.html.
const (
	maxNameLen    = 50
	maxPhoneLen   = 20
	maxCommentLen = 300
	maxBodyBytes  = 4096
)

// Small in-memory per-IP limiter: this endpoint is unauthenticated and
// public, so it needs some abuse protection even though it's basic.
type rateLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{hits: make(map[string][]time.Time), limit: limit, window: window}
}

func (r *rateLimiter) allow(key string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-r.window)

	kept := r.hits[key][:0]
	for _, t := range r.hits[key] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}

	if len(kept) >= r.limit {
		r.hits[key] = kept
		return false
	}

	r.hits[key] = append(kept, now)
	return true
}

func clientIP(req *http.Request) string {
	// Render sits behind a proxy; the client's real address is the first
	// hop in X-Forwarded-For.
	if fwd := req.Header.Get("X-Forwarded-For"); fwd != "" {
		return strings.TrimSpace(strings.Split(fwd, ",")[0])
	}
	return req.RemoteAddr
}

func main() {
	cfg := loadConfig()

	if cfg.botToken == "" || cfg.chatID == "" {
		log.Fatal("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set")
	}
	if len(cfg.allowedOrigins) == 0 {
		log.Fatal("ALLOWED_ORIGINS must be set (comma-separated list of allowed site origins)")
	}

	limiter := newRateLimiter(5, 10*time.Minute)
	telegram := &telegramClient{
		botToken: cfg.botToken,
		chatID:   cfg.chatID,
		http:     &http.Client{Timeout: 10 * time.Second},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})
	mux.HandleFunc("/api/feedback", feedbackHandler(cfg, limiter, telegram))

	log.Printf("listening on :%s", cfg.port)
	log.Fatal(http.ListenAndServe(":"+cfg.port, mux))
}

func withCORS(cfg config, w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if cfg.allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
	}
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}

func writeJSON(w http.ResponseWriter, status int, body map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

func feedbackHandler(cfg config, limiter *rateLimiter, telegram *telegramClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if withCORS(cfg, w, r) {
			return
		}

		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
			return
		}

		// Origin not on the allow-list: CORS headers above were skipped, so a
		// browser call from anywhere else already fails client-side, but a
		// direct (non-browser) request should not be able to use the bot at all.
		if !cfg.allowedOrigins[r.Header.Get("Origin")] {
			writeJSON(w, http.StatusForbidden, map[string]any{"ok": false, "error": "origin not allowed"})
			return
		}

		if !limiter.allow(clientIP(r)) {
			writeJSON(w, http.StatusTooManyRequests, map[string]any{"ok": false, "error": "too many requests, try again later"})
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		var req feedbackRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid request body"})
			return
		}

		req.Name = strings.TrimSpace(req.Name)
		req.Phone = strings.TrimSpace(req.Phone)
		req.Comment = strings.TrimSpace(req.Comment)

		if req.Name == "" || req.Phone == "" || req.Comment == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "name, phone and comment are required"})
			return
		}
		if len(req.Name) > maxNameLen || len(req.Phone) > maxPhoneLen || len(req.Comment) > maxCommentLen {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "field too long"})
			return
		}

		message := "🟢 Заявка с сайта Art group\n" +
			"Имя: " + req.Name + "\n" +
			"Телефон: " + req.Phone + "\n" +
			"Комментарий: " + req.Comment

		if err := telegram.send(r.Context(), message); err != nil {
			log.Printf("telegram send failed: %v", err)
			writeJSON(w, http.StatusBadGateway, map[string]any{"ok": false, "error": "failed to deliver message"})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

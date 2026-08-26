package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"strings"
	"time"

	// Guarantees the IANA time zone database is available for
	// time.LoadLocation below regardless of the deploy image.
	_ "time/tzdata"
)

// moscow is loaded once; the zone data is embedded via time/tzdata above so
// this can't fail at runtime.
var moscow = func() *time.Location {
	loc, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		return time.UTC
	}
	return loc
}()

// formatMessage builds the HTML-formatted Telegram message for a feedback
// submission. Fields are escaped since they're sent with parse_mode HTML —
// otherwise a name like "Anna & Co" would break the formatting, and stray
// "<"/">" could be misread as markup.
func formatMessage(name, phone, comment string) string {
	return "📩 <b>Новая заявка — сайт Art Group</b>\n\n" +
		"👤 <b>Имя:</b> " + html.EscapeString(name) + "\n" +
		"📞 <b>Телефон:</b> " + html.EscapeString(phone) + "\n" +
		"💬 <b>Комментарий:</b> " + html.EscapeString(comment) + "\n\n" +
		"🕒 " + time.Now().In(moscow).Format("02.01.2006 15:04") + " МСК"
}

type telegramClient struct {
	botToken string
	chatID   string
	http     *http.Client
}

func (t *telegramClient) send(ctx context.Context, text string) error {
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", t.botToken)

	body, err := json.Marshal(map[string]string{
		"chat_id":    t.chatID,
		"text":       text,
		"parse_mode": "HTML",
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, strings.NewReader(string(body)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := t.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram API returned status %d", resp.StatusCode)
	}
	return nil
}

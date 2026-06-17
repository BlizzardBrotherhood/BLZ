# Blizzard Brotherhood ❄️

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue?style=flat-square&logo=github)](https://blizzardbrotherhood.github.io/BLZ/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

**Blizzard Brotherhood** is a website for light novel and web novel translations into Russian. The project was created for Russian-speaking readers who want to enjoy high-quality translations of foreign novels.

🌐 **Live site:** [blizzardbrotherhood.github.io/BLZ](https://blizzardbrotherhood.github.io/BLZ/)

💬 **Telegram:** [@blizzardbrotherhood](https://t.me/blizzardbrotherhood)

---

## 📖 About

The site provides:
- 📚 Translations of popular foreign novels
- 🔄 Convenient reader with settings (font, theme, spacing)
- 📱 Responsive design for mobile and desktop
- 🏷️ Chapter sorting (ascending/descending)
- 💾 Save reading settings and progress in browser

---

## 🛠️ Technologies

- **HTML5, CSS3, JavaScript** — site core
- **[Supabase](https://supabase.com)** — cloud database (content storage)
- **[GitHub Pages](https://pages.github.com)** — hosting
- **[Yandex Metrica](https://metrica.yandex.ru)** — analytics

---

## 📂 Project Structure

```
BLZ/
├── index.html          # Main page (title list)
├── title.html          # Title page (chapter list)
├── chapter.html        # Reading page
├── admin.html          # Admin panel
├── 404.html            # Error page
├── config.js           # Supabase configuration
├── assets/
│   ├── css/
│   │   └── style.css   # All styles
│   ├── js/
│   │   ├── app.js      # Core logic
│   │   ├── reader.js   # Reading logic
│   │   └── admin.js    # Admin panel
│   └── images/         # Logos, covers
└── README.md           # This file
```

---

## 🚀 How to run locally

1. **Clone repository:**
   ```bash
   git clone https://github.com/BlizzardBrotherhood/BLZ.git
   cd BLZ
   ```

2. **Open in browser:**
   - Just open `index.html` in browser
   - Or use Live Server extension in VS Code

3. **Supabase setup (optional):**
   - Create account on [Supabase](https://supabase.com)
   - Create `titles` and `chapters` tables
   - Update `config.js` with your keys

---

## 👨‍💻 Admin Panel

To add new content:

1. Go to `admin.html`
2. Enter password: `blizzard`
3. Add titles and chapters through forms

> **Important:** Admin panel is for content management only. Never expose your Supabase keys publicly!

---

## 🎯 Future Plans

- [x] Basic reader with settings
- [x] Chapter sorting
- [x] Progress saving
- [ ] Search by titles and chapters
- [ ] Comments on chapters
- [ ] Notification system for new chapters

---

## 🤝 How to contribute

- ⭐ Star the repository on GitHub
- 📢 Share the site on social media
- 🐛 Report bugs via [Issues](https://github.com/BlizzardBrotherhood/BLZ/issues)
- 📝 Suggest new features

---

## 📄 License

This project is licensed under the **MIT** License. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- All readers for support ❤️
- Supabase team for great platform
- Translation community for inspiration

---

**Made with ❄️ and ❤️ by Blizzard Brotherhood team**

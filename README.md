# 擇日通書 (zeri)

入塔、安奉歷代祖先牌位擇日 App（Android，WebView 包裝，離線可用）。

- 輸入亡者／參與人員生日（國曆自動轉農曆、顯示歲次生肖足歲虛歲）、座向
- 年／月／日／時四層煞忌檢核，沖剋生肖、座向犯煞
- 推送到 main 後由 GitHub Actions 自動打包簽章 APK，於 Releases 下載；簽章固定，可直接覆蓋安裝
- 網頁程式在 `app/src/main/assets/`（`engine.js` 擇日引擎、`app.js` 介面、`lunar.js` 繁體化萬年曆資料）

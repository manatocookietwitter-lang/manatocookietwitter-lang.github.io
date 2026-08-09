# PlayStudy

動画を開き、横画面で再生しながら気づきをメモできる、端末内完結型のスポーツ動画学習PWAです。

## 主な機能

- 動画の先頭フレームからサムネイルを自動生成
- 再生・一時停止・コマ送り・速度変更
- 再生位置に紐づくメモとシーン管理
- 横画面の再生中はページスクロールなし
- PWAとしてホーム画面に追加可能
- 動画とメモはブラウザ内に保存

## 開発

```bash
npm ci
npm test
npm run dev
```

## GitHub Pages

`main` ブランチへのpushで `.github/workflows/pages.yml` が静的PWAを作成し、GitHub Pagesへ公開します。リポジトリ名を含むURLでもService WorkerとManifestのスコープが自動調整されます。

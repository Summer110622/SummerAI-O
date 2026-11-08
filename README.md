# summer — AI Research & Engineering

AI の研究・開発ポートフォリオ。Attention アーキテクチャ、言語モデル、再現可能な実験を紹介しています。

## Website

[Portfolio を開く](https://summer110622.github.io/SummerAI-O/) 

静的な `index.html` だけで構成したレスポンシブサイトです。ビルドや依存パッケージは不要です。

## Featured work

- [Summer Delta Attention](https://github.com/Summer110622/SummerDeltaAttention) — Delta-rule state と bounded KV archive を組み合わせた研究プロトタイプ。実験条件と限界を含む公開実装。
- [Hugging Face / summerAIO](https://huggingface.co/summerAIO) — モデルとデータセット
- [Qwen3.8-27B-Longbook27-v2](https://huggingface.co/summerAIO/Qwen3.8-27B-Longbook27-v2)
- [Diffusion-Qwen3.8-27B](https://huggingface.co/summerAIO/Diffusion-Qwen3.8-27B)
- [LongBook-math-1M](https://huggingface.co/datasets/summerAIO/LongBook-math-1M)

## Development

```bash
python -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いてください。直接 `index.html` を開くこともできます。

## Publish with GitHub Pages

GitHub の **Settings → Pages** で **Deploy from a branch**、branch **main** / **/(root)** を選択すると、GitHub Pages で公開できます（この設定はリポジトリ管理者が行います）。

## Notes

SDA の掲載数値は特定の合成的な exact-key recall 実験であり、メモリ条件が異なる比較です。実際の言語モデルでの優位性を意味しません。詳しくは研究リポジトリを参照してください。

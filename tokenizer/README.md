# Custom Global 264K — Tokenizer Playground

Browser-only multilingual Byte-Level BPE tokenizer (264,498 entries, 264,232 merges). The page runs on GitHub Pages without a build, server, API key or third-party scripts.

## Usage

Open `/tokenizer/`. If the official model is not hosted yet, choose the original `Custom-Global-264K-HF.zip` or its extracted `tokenizer.json` in the file picker. ZIP support requires browser DecompressionStream (deflate-raw); otherwise use the extracted JSON.

The page automatically loads the original `tokenizer.json` from the repository root (`../tokenizer.json`). Do not replace it with the 64K model. The original file is 21,450,501 bytes with SHA-256:

`182d590a84060a0b0744005147fb91f66389c230e225f2dde89e218170e45cec`

The original model has been uploaded to the repository root. The file picker remains available for local use when served from localhost.

## Verification

The JavaScript encoder implements the original ByteLevel regex, byte mapping, ranked BPE merge heap, and literal special tokens. The page verifies the exact SHA-256 and runs 11 reference fixtures (expected IDs independently calculated from the original vocabulary and merge table, including multilingual text, whitespace, BOM and special tokens). The app refuses a model that fails these checks. These fixtures are not exhaustive parity testing against the Rust library.

Run `python -m http.server 8000` from the repository root and visit `http://localhost:8000/tokenizer/`. The input textarea normalizes newlines per browser behavior; Unicode byte fragments are displayed as hex when not independently valid UTF-8.

## License

MIT, see [LICENSE](LICENSE), applies to the new Playground code and the Custom Global tokenizer as designated by its author. Training datasets retain their respective licenses and terms. Existing unrelated portfolio content is not relicensed by this addition.

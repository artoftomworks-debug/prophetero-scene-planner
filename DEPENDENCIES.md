# Dependencies and attribution

The planner itself uses the existing ComfyUI Python (3.10+), aiohttp, Pillow and native H3 nodes. The browser page needs a current desktop browser with JavaScript and local storage. Optional translation needs a separately running Ollama and installed text model.

Use a supported, already-working H3 workflow as your source. The four bundled templates are convenience layouts, not complete model installations.

| Component | Source / credit | Included? |
| --- | --- | --- |
| ComfyUI host/native nodes | https://github.com/Comfy-Org/ComfyUI | No |
| DaSiWa MiniMax H3 | https://civitai.red/models/2877206 — Darksidewalker | No weights |
| H3 Eros Max | https://civitai.red/models/2851079 — tenstrip | No weights |
| Power LoRA Loader | https://github.com/rgthree/rgthree-comfy | No |
| Preview override and supporting nodes | https://github.com/kijai/ComfyUI-KJNodes | No |
| Conditioning switch / hardware metrics | https://github.com/crystian/ComfyUI-Crystools | No |
| Native expression/primitive nodes | Your compatible ComfyUI installation | No |
| Optional ArtofTomworks H3 monitor/global-language extension in DaSiWa templates | Existing ArtofTomworks companion workflow tools: https://civitai.red/models/3013792 | No |
| Ollama translation | https://ollama.com | No |

Templates retain recorded model filenames to make requirements inspectable. These can be version-specific aliases: select your actual compatible local file in the loader. For example, the bundled DaSiWa template refers to `DasiwaMinimaxH3_dasiwaHybridV4Turbo_3281858.safetensors`, Eros to `h3ErosMax_beta5_3185144.safetensors`, plus `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors`, `minimax_h3_video_vae_int8_convrot.safetensors` and `minimax_h3_audio_vae_fp32.safetensors`. Renaming a different model does not make it compatible.

The source model pages and all dependencies have independent licenses and usage restrictions. This utility's license does not grant rights in them. No generation model, third-party node implementation, personal image or video is bundled. The Windows installer verifies its own files, not compatibility of every installed node version.

If a template shows missing nodes, install the corresponding dependency or import a supported graph that already works in your backend. Restart the full backend after installing custom nodes. A browser refresh alone cannot register missing Python classes.

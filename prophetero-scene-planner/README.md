# Prophetero Scene Planner — H3 Public Beta

**Plan the scene. Keep the control.**

A local ComfyUI companion for planning DaSiWa and Eros MiniMax H3 Simple/Pro image-to-video workflows. Arrange up to six start, guide and end images, inspect their crops, set timing, edit a scene prompt and optional sound direction, and export a new workflow copy. It opens in a large browser page; **it does not generate a video or queue a job itself**.

![Scene Planner cover](assets/Scene_Planner_Cover.png)

Version **0.2.0-beta.1**, 11 November 2026. English first; EN, HU, DE, FR, ES, IT, PT and PL interfaces.

## What you can do

- Capture the currently open supported H3 workflow from its node button or the ComfyUI canvas menu. Template selection and manual UI-JSON import remain available.
- Drop images, arrange their order, choose Start/Intermediate/End roles, and adjust fill/crop, whole-image padding or stretching in a large preview. New plans suggest an orientation from the first image; you retain manual control.
- Choose smaller trial sizes, landscape, portrait, square or custom sizes. Presets include **1088 × 608**, 1024 × 576, 1344 × 768 and their portrait equivalents. The current validator accepts multiples of 32 from 256 to 4096 per side, at most 8 megapixels; acceptance is not a VRAM or model-quality guarantee.
- Set 1–15 requested seconds and see the **actual frame-derived duration**. H3 output uses 24 FPS and aligned `17k+5` frame counts; for example 10 requested seconds becomes 243 frames, or 10.125 seconds.
- Write timed action/camera events and editable sound direction, then build, edit and copy the final prompt. Sound choices are instructions, not audio generation or guaranteed speech/music suppression.
- Search this backend's LoRA catalog; add, remove, toggle or adjust supported Power/native loader rows. Hidden disabled rows retain their saved state. Compatibility is not inferred from a filename.
- Compare the **imported source snapshot** with the **planned JSON settings**. Restore one setting without clearing unrelated work. The source snapshot is not a live mirror of later ComfyUI edits.
- Continue through local browser drafts or save/load a project JSON containing the scene images and source graph. Export a separate, executable ComfyUI workflow JSON when ready.

## Download and install

The downloadable ZIP is the complete application package, not a chain of patches. Extract the entire ZIP before installing. The Windows installer is the tested installation path; Linux/macOS installation is not validated for this beta.

1. Stop ComfyUI, including the backend started by SwarmUI.
2. Run `INSTALL.cmd`. Choose the **actual ComfyUI folder containing main.py**, not a folder of saved workflow JSONs. In SwarmUI, use the backend configured by SwarmUI, not another ComfyUI installation on the computer.
3. The installer checks the existing ComfyUI Python environment and package hashes, backs up replaced plugin files, and installs the plugin plus launcher workflow. It does not download models or change your generation dependencies.
4. Fully restart SwarmUI/ComfyUI. Then refresh the ComfyUI page with Ctrl+F5.
5. Open your supported H3 graph and use **Open Scene Planner** on its `MiniMaxH3ImageToVideo` node, or right-click the canvas and choose **Prophetero · Scene Planner**. Alternatively load `Prophetero_Scene_Planner_GLOBAL.json` and click its button; this launcher does not need to be queued.

Python 3.10+, aiohttp and Pillow must already be present in the same backend environment. If Python is not detected, the installer accepts `-ComfyRoot` and `-PythonExe` arguments. The plugin can also be copied manually into `ComfyUI/custom_nodes/prophetero-scene-planner`; do not create an extra nested plugin folder. Restart the backend afterward.

## First scene

1. Capture/import a supported source workflow, or choose a template and click **Use template**. An old saved draft is not evidence that a new source has been imported; review its name and settings.
2. Add exactly one Start image. Add optional Intermediate images at different times strictly between first and last frame; at most one End image. Six images total.
3. Choose size and requested duration. The End time is the **last frame timestamp**, one frame before the clip's total duration; it follows the clip duration rather than being independently editable.
4. Write a base scene and optional events. Click **Build / replace**, then review the editable prompt. Later event changes do not silently overwrite your edited prompt.
5. Check enabled LoRAs and the source/planned comparison. Save a project if you want to continue editing later.
6. Click **Save new workflow JSON**. Load that file in the **same ComfyUI backend**, check the graph, then start generation yourself. Begin with a short, modest-resolution trial.

The exported workflow uses Scene Planner's active width, height, length and FPS controls. Recognized exclusively owned legacy time controls are synchronized; shared old controls are labelled and retained for their other consumers. **Changing an old Duration widget does not necessarily change the active output branch.** Change duration in the planner and export a new JSON.

## Files, privacy and sharing

- A **Project JSON** is for **Load project inside Scene Planner**. A **Workflow JSON** is for ComfyUI. They are different files.
- Prepared images are saved in `ComfyUI/input/PropheteroScenePlanner/<unique-id>/`. Workflow copies and source snapshots are saved under the backend's configured output folder in `Prophetero/ScenePlanner/`.
- Local drafts and exported projects can contain your own images and prompts. This public package contains none of your archive or projects. Before sharing your own project/workflow, review its text, paths and images.
- A workflow referencing prepared images is **not self-contained**. Share those PNGs at the referenced input paths as well, or select new images in the receiving backend.
- Browser drafts are local browser storage, not a backup. Save a project file before changing browser/profile or clearing site data.

## Optional local translation

Ollama is optional and separate. Select an installed text-capable model in the translation panel, request a translation, review it and explicitly apply it. The translator does not change original text automatically. Installation of this utility does not install Ollama or any language model. Avoid running local language-model inference alongside heavy image/video generation on a memory-limited GPU.

## Supported scope and beta limits

This release supports recognized **DaSiWa/Eros H3 Simple and Pro** branches. It is **not a universal workflow editor**; LTX and arbitrary video architectures are not supported here. Unknown or ambiguous graphs/loaders are rejected or left read-only rather than guessed. Template models, VAEs, encoders, third-party nodes and optional monitors are separate dependencies; see [DEPENDENCIES.md](DEPENDENCIES.md).

Keyframes guide the generation model; they are not deterministic edits, cuts, transitions or guaranteed poses. Event times in natural language are approximate. Sound direction does not synthesize, repair or synchronize actual audio. No lip-sync engine is included. The resource information does not enforce a memory limit on a workflow you later queue in ComfyUI.

Tests cover image preparation, graph structure, settings preservation, duration, LoRA edits, draft recovery, translation plumbing, the installer and real browser controls. They do **not** establish generation quality, exact motion/audio compliance or universal hardware compatibility. This is a public beta; try a short clip with your own installed models before committing to a long render.

## Credits and license

Planning UI, image preparation and workflow assembly: **Prophetero / ArtofTomworks**. This utility does not train or redistribute generation models and does not claim authorship of its dependencies.

- [ComfyUI / Comfy Org](https://github.com/Comfy-Org/ComfyUI): host and native workflow nodes.
- [DaSiWa MiniMax H3 — Darksidewalker](https://civitai.red/models/2877206): DaSiWa generation models.
- [H3 Eros Max — tenstrip](https://civitai.red/models/2851079): Eros generation models.
- [rgthree-comfy](https://github.com/rgthree/rgthree-comfy), [KJNodes](https://github.com/kijai/ComfyUI-KJNodes), [Crystools](https://github.com/crystian/ComfyUI-Crystools): separately installed source-workflow dependencies.

The included JSON layouts are Prophetero / ArtofTomworks companion templates. Model authors retain credit and their own licensing terms. No model weights, example media or third-party custom-node code are bundled.

See [LICENSE.txt](LICENSE.txt): free personal and commercial creative use; free sharing/modification with the license retained; **no resale or paid bundling of this utility or modified versions**. Your generated media and the models/dependencies used to create it have their own applicable rights.

For bug reports, include the utility version, ComfyUI/frontend versions, workflow type, expected versus actual behavior and the error text. Do not post private images, prompts or credentials by accident.

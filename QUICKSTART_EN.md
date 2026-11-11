# First scene — beginner guide

1. Extract the whole ZIP. Stop SwarmUI/ComfyUI, then run INSTALL.cmd.
2. Choose the ComfyUI backend containing main.py. It is not your saved-workflow folder. Restart the whole backend after installation, then Ctrl+F5.
3. Open a working DaSiWa/Eros H3 graph. Right-click the canvas → Prophetero · Scene Planner. Or use the Open Scene Planner button on the H3 node. A new browser page opens; allow local pop-ups if necessary.
4. Confirm the intended source is loaded. Old drafts may reappear; source replacement is explicit. Alternatively select a template and click Use template.
5. Drop a picture, select its card, set role Start. For a first trial, use only that picture and a short duration at a modest resolution.
6. Choose crop/fill or whole-image padding. Use the large preview to inspect it. Choose the actual output size and read the actual duration.
7. Enter a simple scene, e.g. “The subject makes one small natural movement. The camera remains steady. Keep the original composition.” Build, review and edit the prompt.
8. Optional: expand Source settings and LoRAs. Enable only installed, compatible LoRAs. Show disabled LoRAs reveals existing hidden rows. A blank CLIP strength follows model strength where supported.
9. Review changes: left is the imported source snapshot; right is what the new JSON will use. Later ComfyUI edits are not automatically synchronized back into that snapshot.
10. Save project to continue later. Save new workflow JSON to run in ComfyUI. Do not confuse these two JSON files.
11. Load the workflow export in the same backend, check model/image selections, and click Run there. Scene Planner itself does not run the generator.

Adding more pictures: keep exactly one Start, at most one End, and place Intermediate pictures at different times between them. The End follows the last frame. Six pictures total. Drag the preview to adjust the crop; the card/timeline selects which picture you edit.

Changing duration: change Requested seconds in the planner, read Actual duration and export again. An already exported JSON does not update automatically. Changing a disconnected old Duration widget does not change the active Scene Planner length control.

Missing images: the receiving backend needs the prepared PNGs referenced by the exported graph. Re-export in the correct backend or choose real files in ComfyUI. Missing nodes: install the required source-workflow dependencies, then restart. The planner does not install them.

Empty translation model list: install/configure Ollama and a text-capable model separately; translation is optional. The scene planner remains usable without it.

This beta supports H3 Simple/Pro, not LTX or arbitrary architectures. Prompts, keyframes and sound direction guide a model; they cannot guarantee its behavior.

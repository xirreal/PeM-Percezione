import { createEffect, onMount, onCleanup } from "solid-js";
import { createController } from "./Utils/ViewController";

import defaultImage from "/mela.jpg";

function App() {
  let sourceCanvas: HTMLCanvasElement | undefined = undefined;
  let container: HTMLDivElement | undefined = undefined;
  const controller = createController();

  onMount(async () => {
    controller.addEventListeners();
    controller.setContainer(container!);
    const result = await controller.initializeVideo(sourceCanvas!);
    if (!result) {
      controller.setImage(defaultImage);
      // Disable camera option
      const source = document.getElementById("source") as HTMLSelectElement;
      source.value = "file";
      const picker = document.getElementById("picker") as HTMLInputElement;
      picker.style.display = "block";
      source.disabled = true;
    }
    controller.initialize();
  });

  onCleanup(() => {
    controller?.removeEventListeners?.();
  });

  const handleSourceChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const isCamera = target.value === "camera";
    const picker = document.getElementById("picker") as HTMLInputElement;
    if (isCamera) {
      controller.setImage(undefined);
      picker.style.display = "none";
    } else {
      picker.style.display = "block";
    }

    // Clear files from input
    picker.value = "";
  };

  const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        controller.setImage(result as string);
      };
      reader.readAsDataURL(file);
    } else {
      controller.setImage(undefined);
    }
  };

  return (
    <div>
      <div class="legend">
        <h3>Controlli</h3>
        <ul>
          <li>Trascina: Rotazione</li>
          <li>Scroll: Zoom</li>
          <li>Ctrl+Scroll: Distanza</li>
          <li>R: Reset</li>
        </ul>
        <br />
        <h3>Impostazioni</h3>
        <label for="select">Tipo di filtro:</label>
        <select
          id="select"
          onChange={(e) => {
            controller.changeFilter(parseInt(e.currentTarget.value));
          }}
        >
          <option value="0">Canny edge</option>
          <option value="1">Sobel edge</option>
          <option value="2">Blob detection</option>
        </select>
        <br />
        <label for="sigma">Sigma:</label>
        <input
          type="range"
          id="sigma"
          onInput={(e) => {
            controller.changeSigma(
              parseFloat((e.target as HTMLInputElement).value)
            );
          }}
          min="0.1"
          max="16"
          step="0.1"
          value={controller.getSigma()}
        />
        <br />
        <label for="source">Sorgente:</label>
        <select id="source" onChange={handleSourceChange}>
          <option value="camera">Camera</option>
          <option value="file">File</option>
        </select>
        <input
          type="file"
          id="picker"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      <div
        class="scene"
        id="scene"
        onWheel={controller.handleWheel}
        onMouseUp={controller.handleMouseUp}
        onMouseDown={controller.handleMouseDown}
        onMouseMove={controller.handleMouseMove}
        onMouseLeave={controller.handleMouseLeave}
      >
        <div
          class="container"
          id="container"
          style={controller.containerStyle()}
          ref={container}
        >
          <div class="box">
            <canvas id="sourceCanvas" ref={sourceCanvas}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

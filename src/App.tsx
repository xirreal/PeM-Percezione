import {
  createSignal,
  createMemo,
  onMount,
  onCleanup,
  createComputed,
  createEffect,
  on,
} from "solid-js";

import ImageFeed from "./Utils/ImageFeed";
import CannyEdge from "./Filtri/CannyEdge";
import { Filter } from "./Utils/utils";
import SobelEdge from "./Filtri/SobelEdge";
import Laplacian from "./Filtri/Laplacian";

function App() {
  const video = document.createElement("video");
  let sourceCanvas;
  let videoFeed: ImageFeed;
  let filterInstance: any;
  let container;

  const [currentFilter, setCurrentFilter] = createSignal(0);
  const [isCtrlDown, setIsCtrlDown] = createSignal(false);
  const [isExpanded, setIsExpanded] = createSignal(false);
  const [isDown, setIsDown] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [previousMousePosition, setPreviousMousePosition] = createSignal({
    x: 0,
    y: 0,
  });
  const [rotation, setRotation] = createSignal({ x: -12, y: 33 });
  const [distance, setDistance] = createSignal(100);
  const [zoom, setZoom] = createSignal(1.5);

  // boxes contains the divs for the canvases
  const [boxes, setBoxes] = createSignal([] as HTMLDivElement[]);

  const [sigma, setSigma] = createSignal(1.4);

  const gaussian = createMemo(
    () => {
      const gaussian = Filter.Gaussian(sigma());
      filterInstance?.updateGaussian(gaussian);
      return gaussian;
    },
    null,
    {
      equals: (a, b) => a.sigma === b.sigma,
    }
  );
  const laplacian = createMemo(
    ()  => { 
      const laplacian = Filter.LaplacianOfGaussian(sigma())
      filterInstance?.updateLaplacian(laplacian);
      return laplacian;
    },
    null,
    {
      equals: (a, b) => a.sigma === b.sigma,
    }

  );
  const containerStyle = createMemo(() => ({
    transform: `rotateX(${rotation().x}deg) rotateY(${
      rotation().y
    }deg) scale(${zoom()})`,
  }));

  createComputed(() => {
    const boxCount = boxes().length;
    let middleIndex = Math.floor(boxCount / 2);
    if (middleIndex != 0 && boxCount % 2 === 0) {
      middleIndex -= 0.5;
    }

    boxes().map((box, index) => {
      if (isExpanded()) {
        const zDistance = (index - middleIndex) * distance();
        box.style.transform = `translateZ(${zDistance}px)`;
        box.style.opacity = "0.9";
      } else {
        box.style.transform = "translateZ(0)";
        box.style.opacity = "1";
      }
    });
  });

  const handleMouseDown = (e: MouseEvent) => {
    setIsDown(true);
    setPreviousMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDown()) return;

    const deltaMove = {
      x: e.clientX - previousMousePosition().x,
      y: e.clientY - previousMousePosition().y,
    };

    if (!isDragging() && Math.abs(deltaMove.x) < 2 && Math.abs(deltaMove.y) < 2)
      return;
    setIsDragging(true);

    setRotation((prev) => ({
      x: Math.min(Math.max(-80, prev.x + deltaMove.y * -0.5), 80),
      y: prev.y + deltaMove.x * 0.5,
    }));

    setPreviousMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDown(false);
    if (!isDragging()) {
      setIsExpanded(!isExpanded());
    }
    setIsDragging(false);
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    if (isCtrlDown()) {
      setDistance((prev) =>
        Math.min(Math.max(100, prev + e.deltaY * -0.5), 300)
      );
    } else {
      setZoom((prev) => Math.min(Math.max(0.5, prev + e.deltaY * -0.001), 2));
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      setIsExpanded(!isExpanded());
    } else if (e.code === "KeyR") {
      setRotation({ x: -12, y: 33 });
      setDistance(100);
      setZoom(1.5);
      setIsExpanded(false);
    }

    if (e.code === "ControlLeft") setIsCtrlDown(true);
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === "ControlLeft") setIsCtrlDown(false);
  };

  function initialize() {
    if (!videoFeed) return;
    videoFeed.clear();

    console.log("Initializing filter");

    switch (currentFilter()) {
      case 0:
        filterInstance = new CannyEdge(videoFeed, gaussian());
        // filterInstance = null
        break;
      case 1:
        filterInstance = new SobelEdge(videoFeed);
        // filterInstance = null
        break;
      case 2:
        filterInstance = new Laplacian(videoFeed, laplacian());
        break;
    }

    const toRemove = container!.children.length - 1;
    for (let i = 0; i < toRemove; i++) {
      container!.lastChild.remove();
    }

    for (let canvas of filterInstance?.canvases || []) {
      const box = document.createElement("div");
      box.classList.add("box");
      box.appendChild(canvas);
      container!.append(box);
    }

    setBoxes(Array.from(container!.children) as HTMLDivElement[]);
  }

  createEffect(on(currentFilter, initialize));

  onMount(async () => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.play();

    videoFeed = new ImageFeed(video, sourceCanvas! as HTMLCanvasElement);
    initialize();
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    document.removeEventListener("contextmenu", (e) => e.preventDefault());
  });

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
            console.log("Changing filter")
            setCurrentFilter(parseInt(e.target.value));
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
            setSigma(parseFloat(e.target.value));
            console.log(e.target.value)
          }}
          min="0.1"
          max="5"
          step="0.1"
          value="1.4"
        />
      </div>

      <div
        class="scene"
        id="scene"
        onWheel={handleWheel}
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          class="container"
          id="container"
          style={containerStyle()}
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

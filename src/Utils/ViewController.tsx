import { createStore } from "solid-js/store";
import {
  createSignal,
  createMemo,
  onMount,
  onCleanup,
  createComputed,
  createEffect,
  on,
} from "solid-js";
import ImageFeed from "../Utils/ImageFeed";
import CannyEdge from "../Filtri/CannyEdge";
import { Filter } from "../Utils/utils";
import SobelEdge from "../Filtri/SobelEdge";
import BlobDetector from "../Filtri/Laplacian";

export function createController() {
  const video = document.createElement("video");
  let videoFeed: ImageFeed;
  let filterInstance: any;
  let container: HTMLDivElement;

  const [source, setSource] = createStore({
    video: true,
    image: "",
  });

  createEffect(() => {
    videoFeed?.setUseCamera?.(source.video);
    if (source.image) {
      videoFeed?.setImage?.(source.image);
    }
  });

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

  const [boxes, setBoxes] = createSignal([] as HTMLDivElement[]);

  const [sigma, setSigma] = createSignal(1.4);

  const gaussian = createMemo(
    () => {
      const gaussian = Filter.Gaussian(sigma());
      filterInstance?.updateGaussian?.(gaussian);
      return gaussian;
    },
    null,
    {
      equals: (a, b) => a.sigma === b.sigma,
    }
  );

  const containerStyle = createMemo(() => {
    return {
      transform: `rotateX(${rotation().x}deg) rotateY(${
        rotation().y
      }deg) scale(${zoom()})`,
    };
  });

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

  function handleMouseDown(e: MouseEvent) {
    setIsDown(true);
    setPreviousMousePosition({ x: e.clientX, y: e.clientY });
  }

  function handleMouseMove(e: MouseEvent) {
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
  }

  function handleMouseLeave() {
    setIsDragging(false);
  }

  function handleMouseUp() {
    setIsDown(false);
    if (!isDragging()) {
      setIsExpanded(!isExpanded());
    }
    setIsDragging(false);
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();

    if (isCtrlDown()) {
      setDistance((prev) =>
        Math.min(Math.max(100, prev + e.deltaY * -0.5), 300)
      );
    } else {
      setZoom((prev) => Math.min(Math.max(0.5, prev + e.deltaY * -0.001), 2));
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.code === "Space") {
      setIsExpanded(!isExpanded());
    } else if (e.code === "KeyR") {
      setRotation({ x: -12, y: 33 });
      setDistance(100);
      setZoom(1.5);
      setIsExpanded(false);
    }

    if (e.code === "ControlLeft") setIsCtrlDown(true);
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === "ControlLeft") setIsCtrlDown(false);
  }

  const filterConstructors = [CannyEdge, SobelEdge, BlobDetector];

  createEffect(on(currentFilter, initialize));

  function initialize() {
    if (!videoFeed) return;
    videoFeed.clear();

    filterInstance = new filterConstructors[currentFilter()](
      videoFeed,
      gaussian()
    );

    const toRemove = container.children.length - 1;
    for (let i = 0; i < toRemove; i++) {
      container.lastChild?.remove();
    }

    for (let canvas of filterInstance?.canvases || []) {
      const box = document.createElement("div");
      box.classList.add("box");
      box.appendChild(canvas);
      container.append(box);
    }

    setBoxes(Array.from(container.children) as HTMLDivElement[]);
  }

  async function initializeVideo(sourceCanvas: HTMLCanvasElement) {
    let errored = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      video.play();
    } catch (e) {
      console.error("Camera unavailable", e);
      errored = true;
    }

    videoFeed = new ImageFeed(video, sourceCanvas);
    videoFeed.setUseCamera(!videoFeed.getUseCamera());

    return !errored;
  }

  function addEventListeners() {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function removeEventListeners() {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    document.removeEventListener("contextmenu", (e) => e.preventDefault());
  }

  return {
    containerStyle,
    handleMouseDown,
    handleMouseMove,
    handleMouseLeave,
    handleMouseUp,
    handleWheel,
    handleKeyDown,
    handleKeyUp,
    initialize,
    initializeVideo,
    addEventListeners,
    removeEventListeners,
    setImage: (data: string | undefined) => {
      if (data) {
        setSource({ video: false, image: data });
      } else {
        setSource({ video: true, image: "" });
      }
    },
    changeFilter: (index: number) => {
      setCurrentFilter(index);
    },
    changeSigma: (value: number) => {
      setSigma(value);
    },
    getSigma: () => sigma(),
    setContainer: (element: HTMLDivElement) => {
      container = element;
    },
  };
}

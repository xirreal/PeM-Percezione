import { Matrix } from "./utils";
import { RESOLUTION, MS_PER_FRAME } from "./config";

class ImageFeed {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private filterCallbacks: ((image: Matrix) => void)[] = [];
  private frame: Matrix;
  // private image: HTMLImageElement;

  private lastRender: number = 0;

  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d", {
      willReadFrequently: true,
    })!;

    video.addEventListener("loadedmetadata", () => {
      this.canvas.width = RESOLUTION;
      this.canvas.height = RESOLUTION;
      this.drawFrame();
    });

    this.frame = new Matrix(RESOLUTION, RESOLUTION);

    // this.image = document.createElement("img");
    // this.image.src = "https://shcors.uwu.network/https://www.melarossa.it/wp-content/uploads/2018/01/tagli-caschetto-emma-stone.jpg";
    // this.image.crossOrigin = "Anonymous";
  }

  private drawFrame(): void {
    if (performance.now() - this.lastRender < MS_PER_FRAME) {
      requestAnimationFrame(this.drawFrame.bind(this));
      return;
    }

    this.ctx.drawImage(this.video, 0, 0, RESOLUTION, RESOLUTION);
    const imageData = this.ctx.getImageData(0, 0, RESOLUTION, RESOLUTION);
    this.frame.updateData(imageData.data);

    for (const callback of this.filterCallbacks) {
      callback(this.frame);
    }

    this.lastRender = performance.now();
    requestAnimationFrame(this.drawFrame.bind(this));
  }

  register(callback: (image: Matrix) => void): void {
    this.filterCallbacks.push(callback);
  }

  clear(): void {
    this.filterCallbacks = [];
  }
}

export default ImageFeed;

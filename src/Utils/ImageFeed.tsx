import { Matrix } from "./utils";
import { RESOLUTION, MS_PER_FRAME } from "./config";

class ImageFeed {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private filterCallbacks: ((image: Matrix) => void)[] = [];
  private frame: Matrix;
  private image: HTMLImageElement;
  private useCamera: boolean = false;

  private lastRender: number = 0;

  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d", {
      willReadFrequently: true,
    })!;

    this.canvas.width = RESOLUTION;
    this.canvas.height = RESOLUTION;

    this.frame = new Matrix(RESOLUTION, RESOLUTION);

    this.image = document.createElement("img");
    this.image.crossOrigin = "Anonymous";

    setTimeout(() => {
      this.drawFrame();
    });
  }

  private drawFrame(): void {
    const timeSinceLastRender = performance.now() - this.lastRender;
    if (timeSinceLastRender < MS_PER_FRAME) {
      const timeToNextFrame = MS_PER_FRAME - timeSinceLastRender;
      setTimeout(() => {
        requestAnimationFrame(this.drawFrame.bind(this));
      }, timeToNextFrame);
      return;
    }

    if (this.useCamera) {
      this.ctx.drawImage(this.video, 0, 0, RESOLUTION, RESOLUTION);
    } else {
      this.ctx.drawImage(this.image, 0, 0, RESOLUTION, RESOLUTION);
    }

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

  setUseCamera(useCamera: boolean): void {
    this.useCamera = useCamera;
  }

  getUseCamera(): boolean {
    return this.useCamera;
  }

  setImage(imageUrl: string): void {
    this.image.src = imageUrl;
    this.ctx.clearRect(0, 0, RESOLUTION, RESOLUTION);
  }
}

export default ImageFeed;

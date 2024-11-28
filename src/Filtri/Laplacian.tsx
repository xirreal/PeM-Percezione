import { RESOLUTION } from "../Utils/config";
import ImageFeed from "../Utils/ImageFeed";
import { Filter, Matrix } from "../Utils/utils";

class BlobDetector {
  public readonly canvases: HTMLCanvasElement[] = [];
  private gaussian: Filter;

  constructor(imageFeed: ImageFeed, gaussian: Filter) {
    this.gaussian = gaussian;

    for (let i = 0; i < 4; i++) {
      this.canvases.push(document.createElement("canvas"));
      this.canvases[i].width = RESOLUTION;
      this.canvases[i].height = RESOLUTION;
    }

    imageFeed.register((image: Matrix) => {
      // Step 1: Convert to grayscale
      const grayscale = image.applyFilter((x, y) => {
        const [r, g, b] = image.getPixel(x, y);
        const lumaCoefficients = [0.299, 0.587, 0.114];
        const luma =
          lumaCoefficients[0] * r +
          lumaCoefficients[1] * g +
          lumaCoefficients[2] * b;
        return [luma, luma, luma, 1];
      });
      grayscale.drawToCanvas(this.canvases[0]);

      // Step 2: Apply Gaussian blur
      const blurred = grayscale.convolute(this.gaussian);
      blurred.drawToCanvas(this.canvases[1]);

      // Step 3: Apply Laplacian filter
      const LoG = blurred.convolute(Filter.laplacian);
      const normalizedLoG = LoG.applyFilter((x, y) => {
        const [r] = LoG.getPixel(x, y);
        const normalizedR = r * this.gaussian.sigma! ** 2;
        return [normalizedR, normalizedR, normalizedR, 255];
      });

      normalizedLoG.drawToCanvas(this.canvases[2]);

      const radius = Math.round(this.gaussian.sigma! * Math.sqrt(2));
      // Find the location of the peak response
      let maxResponse = 0;
      let maxResponseX = 0;
      let maxResponseY = 0;

      normalizedLoG.applyFilter((x, y) => {
        const [r] = normalizedLoG.getPixel(x, y);
        if (r > maxResponse) {
          maxResponse = r;
          maxResponseX = x;
          maxResponseY = y;
        }
        return [r, r, r, 255];
      });

      // Draw the detected circle on the original image
      const result = image.clone();
      this.drawCircle(result, maxResponseX, maxResponseY, radius);
      result.drawToCanvas(this.canvases[3]);

      const maxResponseText = document.getElementById("response");
      if (maxResponseText) {
        maxResponseText.textContent = `Max response: ${maxResponse.toFixed(3)}`;
      } else {
        const container = this.canvases[3].parentElement;
        const text = document.createElement("div");
        text.id = "response";
        text.style.position = "absolute";
        text.style.top = "0";
        text.style.left = "7px";
        text.style.color = "white";
        text.style.fontSize = "20px";
        text.style.textShadow = "0 0 10px black";
        text.textContent = `Max response: ${maxResponse.toFixed(3)}`;
        container?.appendChild(text);
      }
    });
  }

  private drawCircle(
    image: Matrix,
    centerX: number,
    centerY: number,
    radius: number
  ): void {
    for (let theta = 0; theta < 360; theta++) {
      const x = Math.round(
        centerX + radius * Math.cos((theta * Math.PI) / 180)
      );
      const y = Math.round(
        centerY + radius * Math.sin((theta * Math.PI) / 180)
      );
      if (x >= 0 && x < RESOLUTION && y >= 0 && y < RESOLUTION) {
        image.setPixel(x, y, [255, 0, 0, 255]);
      }
    }
  }

  updateGaussian(gaussian: Filter): void {
    this.gaussian = gaussian;
  }
}

export default BlobDetector;

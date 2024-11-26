import { RESOLUTION } from "../Utils/config";
import ImageFeed from "../Utils/ImageFeed";
import { Filter, Matrix } from "../Utils/utils";

class BlobDetector {
  public readonly canvases: HTMLCanvasElement[] = [];
  private gaussian: Filter;

  constructor(imageFeed: ImageFeed, gaussian: Filter) {
    this.gaussian = gaussian;

    for (let i = 0; i < 5; i++) {
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

      // Step 4: Threshold the LoG result
      const threshold = LoG.applyFilter((x, y) => {
        const [r] = LoG.getPixel(x, y);
        return [r < 0 ? 255 : 0, r < 0 ? 255 : 0, r < 0 ? 255 : 0, 255];
      });
      threshold.drawToCanvas(this.canvases[4]);

      // Step 5: Hough transform for circle detection
      const radius = Math.round(this.gaussian.sigma! * Math.sqrt(2));
      //   const houghSpace = new Array(RESOLUTION)
      //     .fill(0)
      //     .map(() => new Array(RESOLUTION).fill(0));

      //   for (let y = 0; y < RESOLUTION; y++) {
      //     for (let x = 0; x < RESOLUTION; x++) {
      //       const [value] = threshold.getPixel(x, y);
      //       if (value === 255) {
      //         for (let theta = 0; theta < 360; theta += 1) {
      //           const a = Math.round(
      //             x - radius * Math.cos((theta * Math.PI) / 180)
      //           );
      //           const b = Math.round(
      //             y - radius * Math.sin((theta * Math.PI) / 180)
      //           );
      //           if (a >= 0 && a < RESOLUTION && b >= 0 && b < RESOLUTION) {
      //             houghSpace[a][b]++;
      //           }
      //         }
      //       }
      //     }
      //   }

      //   // Find the maximum value in the Hough space
      //   let maxVal = 0;
      //   let centerX = 0;
      //   let centerY = 0;
      //   for (let y = 0; y < RESOLUTION; y++) {
      //     for (let x = 0; x < RESOLUTION; x++) {
      //       if (houghSpace[x][y] > maxVal) {
      //         maxVal = houghSpace[x][y];
      //         centerX = x;
      //         centerY = y;
      //       }
      //     }
      //   }

      // Draw the detected circle on the original image
      const result = image.clone();
      this.drawCircle(
        result,
        Math.floor(RESOLUTION / 2),
        Math.floor(RESOLUTION / 2),
        radius
      );
      result.drawToCanvas(this.canvases[4]);
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

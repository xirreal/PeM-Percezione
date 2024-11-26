import ImageFeed from "../Utils/ImageFeed";
import { Matrix, Filter } from "../Utils/utils";
import { RESOLUTION } from "../Utils/config";

class CannyEdge {
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

      const blurred = grayscale.convolute(this.gaussian);
      blurred.drawToCanvas(this.canvases[1]);

      const sobelX = blurred.convolute(Filter.sobelX);
      const sobelY = blurred.convolute(Filter.sobelY);
      const angles: number[] = [];
      const gradient = sobelX.applyFilter((x, y) => {
        const [dx] = sobelX.getPixel(x, y);
        const [dy] = sobelY.getPixel(x, y);
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx);
        angles.push(angle);
        return [magnitude, magnitude, magnitude, 1];
      });

      gradient.drawToCanvas(this.canvases[2]);

      let maxIntensity = 0;
      const nms = gradient.applyFilter((x, y) => {
        const [q] = gradient.getPixel(x, y);
        let angle = angles[x + y * RESOLUTION] * (180 / Math.PI);

        if (q > maxIntensity) {
          maxIntensity = q;
        }

        if (angle < 0) {
          angle += 180;
        }

        let q1 = 0,
          q2 = 0;

        if ((0 <= angle && angle < 22.5) || (157.5 <= angle && angle <= 180)) {
          q1 = gradient.getPixel(x + 1, y)[0];
          q2 = gradient.getPixel(x - 1, y)[0];
        }
        // angle 45
        else if (22.5 <= angle && angle < 67.5) {
          q1 = gradient.getPixel(x + 1, y - 1)[0];
          q2 = gradient.getPixel(x - 1, y + 1)[0];
        }
        // angle 90
        else if (67.5 <= angle && angle < 112.5) {
          q1 = gradient.getPixel(x, y - 1)[0];
          q2 = gradient.getPixel(x, y + 1)[0];
        }
        // angle 135
        else if (112.5 <= angle && angle < 157.5) {
          q1 = gradient.getPixel(x - 1, y - 1)[0];
          q2 = gradient.getPixel(x + 1, y + 1)[0];
        }

        if (q > q1 && q > q2) {
          return [q, q, q, 1];
        }

        return [0, 0, 0, 1];
      });

      nms.drawToCanvas(this.canvases[3]);

      const hThresh = maxIntensity * 0.11;
      const lThresh = hThresh * 0.05;

      const doubleThreshold = nms.applyFilter((x, y) => {
        const [q] = nms.getPixel(x, y);
        if (q > hThresh) {
          return [1, 1, 1, 1];
        } else if (q > lThresh) {
          return [0.5, 0.5, 0.5, 1];
        }
        return [0, 0, 0, 1];
      });

      const hysterisis = doubleThreshold.applyFilter((x, y) => {
        const [q] = doubleThreshold.getPixel(x, y);
        if (q === 0.5) {
          let found = false;
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              if (i === 0 && j === 0) continue;
              const [q] = doubleThreshold.getPixel(x + i, y + j);
              if (q === 1) {
                found = true;
                break;
              }
            }
          }
          if (found) {
            return [1, 1, 1, 1];
          } else {
            return [0, 0, 0, 1];
          }
        }
        return [q, q, q, 1];
      });

      hysterisis.drawToCanvas(this.canvases[4]);
    });
  }

  updateGaussian(gaussian: Filter): void {
    this.gaussian = gaussian;
  }
}

export default CannyEdge;

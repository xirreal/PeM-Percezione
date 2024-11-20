import { RESOLUTION } from "../Utils/config";
import ImageFeed from "../Utils/ImageFeed";
import { Filter, Matrix } from "../Utils/utils";

class SobelEdge {
   public readonly canvases: HTMLCanvasElement[] = [];

   constructor(videoFeed: ImageFeed) {
      for (let i = 0; i < 2; i++) {
         this.canvases.push(document.createElement("canvas"));
         this.canvases[i].width = RESOLUTION;
         this.canvases[i].height = RESOLUTION;
      }

      videoFeed.register((image: Matrix) => {
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

         const sobelX = grayscale.convolute(Filter.sobelX);
         const sobelY = grayscale.convolute(Filter.sobelY);
         const gradient = sobelX.applyFilter((x, y) => {
            const [dx] = sobelX.getPixel(x, y);
            const [dy] = sobelY.getPixel(x, y);
            const magnitude = Math.sqrt(dx * dx + dy * dy);
            return [magnitude, magnitude, magnitude, 1];
         });

         gradient.drawToCanvas(this.canvases[1]);
      });
   }
}

export default SobelEdge
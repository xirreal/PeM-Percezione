import { RESOLUTION } from "../Utils/config";
import ImageFeed from "../Utils/ImageFeed";
import { Filter, Matrix } from "../Utils/utils";

class Laplacian {

    public readonly canvases: HTMLCanvasElement[] = [];
    private laplacian: Filter;

    constructor(imageFeed: ImageFeed, laplacian: Filter) {
        this.laplacian = laplacian;
    
        for (let i = 0; i < 2; i++) {
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
    
        const blurred = grayscale.convolute(this.laplacian);
        blurred.drawToCanvas(this.canvases[1]);
        });
    }
    updateLaplacian(laplacian: Filter): void {
        this.laplacian = laplacian;
    }
}
export default Laplacian;
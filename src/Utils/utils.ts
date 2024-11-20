class Matrix {
  public readonly data: Float32Array;

  constructor(
    public width: number,
    public height: number,
    data: Float32Array | undefined = undefined
  ) {
    if (!data) {
      data = new Float32Array(width * height * 4);
    }
    this.data = data;
  }

  updateData(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i++) {
      this.data[i] = data[i] / 255;
    }
  }

  getPixel(x: number, y: number): [number, number, number, number] {
    const index = (y * this.width + x) * 4;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return [0, 0, 0, 0];
    }
    return [
      this.data[index],
      this.data[index + 1],
      this.data[index + 2],
      this.data[index + 3],
    ];
  }

  convolute(filter: Filter): Matrix {
    const newData = new Float32Array(this.data.length);
    const filterSize = filter.size;
    const half = Math.floor(filterSize / 2);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let r = 0,
          g = 0,
          b = 0;

        for (let i = 0; i < filterSize; i++) {
          for (let j = 0; j < filterSize; j++) {
            const pixelX = Math.min(Math.max(x + j - half, 0), this.width - 1);
            const pixelY = Math.min(Math.max(y + i - half, 0), this.height - 1);
            const pixelIndex = (pixelY * this.width + pixelX) * 4;
            const filterIndex = i * filterSize + j;

            r += this.data[pixelIndex] * filter.data[filterIndex];
            g += this.data[pixelIndex + 1] * filter.data[filterIndex];
            b += this.data[pixelIndex + 2] * filter.data[filterIndex];
          }
        }

        const index = (y * this.width + x) * 4;
        newData[index] = r;
        newData[index + 1] = g;
        newData[index + 2] = b;
        newData[index + 3] = this.data[index + 3]; // Tanto e' inutile per i nostri scopi
      }
    }

    return new Matrix(this.width, this.height, newData);
  }

  applyFilter(
    filterFunction: (x: number, y: number) => [number, number, number, number]
  ): Matrix {
    const newData = new Float32Array(this.data.length);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const [r, g, b, a] = filterFunction(x, y);
        const index = (y * this.width + x) * 4;
        newData[index] = r;
        newData[index + 1] = g;
        newData[index + 2] = b;
        newData[index + 3] = a;
      }
    }

    return new Matrix(this.width, this.height, newData);
  }

  drawToCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.createImageData(this.width, this.height);
    const u8Data = new Uint8ClampedArray(this.data.length);
    for(let i = 0; i < this.data.length; i++) {
      u8Data[i] = this.data[i] * 255;
    }
    imageData.data.set(u8Data);
    ctx.putImageData(imageData, 0, 0);
  }
}

class Filter {
  constructor(
    public readonly size: number,
    public readonly data: Float32Array,
    public readonly sigma?: number
  ) {
    if (size % 2 === 0) {
      throw new Error("Filter size must be odd");
    }
    this.size = size;
    this.data = data;
    this.sigma = sigma;
  }

  static sobelX: Filter = new Filter(
    3,
    new Float32Array([-1, 0, 1, -2, 0, 2, -1, 0, 1])
  );

  static sobelY: Filter = new Filter(
    3,
    new Float32Array([1, 2, 1, 0, 0, 0, -1, -2, -1])
  );

  static sharpen: Filter = new Filter(
    3,
    new Float32Array([-1, -1, -1, -1, 8, -1, -1, -1, -1])
  );

  static Gaussian(sigma: number): Filter {
    let size = Math.floor(sigma * 3) + 1;
    size = size % 2 === 0 ? size + 1 : size;
    const data = new Float32Array(size * size);
    const half = Math.floor(size / 2);
    let sum = 0;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const x = i - half;
        const y = j - half;
        const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
        data[i * size + j] = value;
        sum += value;
      }
    }

    for (let i = 0; i < size * size; i++) {
      data[i] /= sum;
    }

    return new Filter(size, data, sigma);
  }
}

export { Matrix, Filter };

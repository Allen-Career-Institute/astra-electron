import { ThumbImageBuffer } from 'agora-electron-sdk';

export const getThumbImageBufferToBase64 = (target?: ThumbImageBuffer) => {
  if (!target) {
    return '';
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const width = (canvas.width = target.width!);
  const height = (canvas.height = target.height!);

  const rowBytes = width * 4;
  for (let row = 0; row < height; row++) {
    const srow = row;
    const imageData = ctx.createImageData(width, 1);
    const start = srow * width * 4;
    if (process.platform === 'win32') {
      for (let i = 0; i < rowBytes; i += 4) {
        imageData.data[i] = target.buffer![start + i + 2]!;
        imageData.data[i + 1] = target.buffer![start + i + 1]!;
        imageData.data[i + 2] = target.buffer![start + i]!;
        imageData.data[i + 3] = target.buffer![start + i + 3]!;
      }
    } else {
      for (let i = 0; i < rowBytes; ++i) {
        imageData.data[i] = target.buffer![start + i]!;
      }
    }
    ctx.putImageData(imageData, 0, row);
  }

  return canvas.toDataURL('image/png');
};

import sharp from 'sharp'

const DHASH_WIDTH = 9
const DHASH_HEIGHT = 8

/**
 * 64-bit dHash perceptual hash: resize to 9x8 grayscale, compare each pixel
 * to its horizontal neighbor, pack the 64 bits into 16 hex chars.
 */
export const dhash = async (image: Buffer): Promise<string> => {
  const pixels = await grayscalePixels(image)
  const bits = horizontalNeighborBits(pixels)
  return bitsToHex(bits)
}

const grayscalePixels = (image: Buffer): Promise<Buffer> =>
  sharp(image)
    .grayscale()
    .resize(DHASH_WIDTH, DHASH_HEIGHT, { fit: 'fill' })
    .raw()
    .toBuffer()

const horizontalNeighborBits = (pixels: Buffer): number[] => {
  const bits: number[] = []
  for (let y = 0; y < DHASH_HEIGHT; y++) {
    for (let x = 0; x < DHASH_WIDTH - 1; x++) {
      const left = pixels[y * DHASH_WIDTH + x]
      const right = pixels[y * DHASH_WIDTH + x + 1]
      bits.push(left > right ? 1 : 0)
    }
  }
  return bits
}

const bitsToHex = (bits: number[]): string => {
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3]
    hex += nibble.toString(16)
  }
  return hex
}

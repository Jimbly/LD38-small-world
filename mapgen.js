// Generate 2D noise in a 1024x768 grid, scaled to [0, 255]

const FastSimplexNoise = require('fast-simplex-noise').default;
const noiseGen = new FastSimplexNoise({ frequency: 0.01, max: 100, min: 0, octaves: 8 });

const res = 30;
const zoom = 10;
const threshold = 70;

for (let x = 0; x < res; x++) {
  let line = [];
  for (let y = 0; y < res; y++) {
    let v = Math.floor(noiseGen.scaled([x*zoom, y*zoom]));
    //line.push(v);
    //line.push(v < threshold ? ' ' : 'XX');
    line.push(v);
  }
  console.log('[' + line.join(',') + '],');
}

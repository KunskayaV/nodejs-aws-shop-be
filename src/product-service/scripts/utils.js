const log = (msg) => console.log(`[SCENARIO] ${msg}`);

function* chunkArray(arr, stride = 1) {
  for (let i = 0; i < arr.length; i += stride) {
    yield arr.slice(i, Math.min(i + stride, arr.length));
  }
}

module.exports = {
  log,
  chunkArray,
};


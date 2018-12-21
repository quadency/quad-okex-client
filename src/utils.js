async function delay(duration) {
  if (duration < 0) {
    return null;
  }
  return new Promise((resolve) => {
    setTimeout(async () => {
      resolve();
    }, duration);
  });
}

const COMMON_CURRENCIES = {
  'FAIR': 'FairGame',
  'HOT': 'Hydro Protocol',
  'HSR': 'HC',
  'MAG': 'Maggie',
  'YOYO': 'YOYOW',
};

export { delay, COMMON_CURRENCIES };

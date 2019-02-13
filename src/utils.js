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
  FAIR: 'FairGame',
  HOT: 'Hydro Protocol',
  HSR: 'HC',
  MAG: 'Maggie',
  YOYO: 'YOYOW',
  XBT: 'BTC',
  BCC: 'BCH',
  DRK: 'DASH',
  BCHABC: 'BCH',
  BCHSV: 'BSV',
};

export { delay, COMMON_CURRENCIES };

import { describe, expect, it } from 'vitest';
import { istIosImBrowser } from './installhinweis';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPAD_ALS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const MAC = IPAD_ALS_MAC;

describe('istIosImBrowser', () => {
  it('iPhone im Browser: ja', () => expect(istIosImBrowser(IPHONE, 5, false)).toBe(true));
  it('iPhone, schon installiert (standalone): nein', () => expect(istIosImBrowser(IPHONE, 5, true)).toBe(false));
  it('iPhone, standalone unbekannt: ja', () => expect(istIosImBrowser(IPHONE, 5, undefined)).toBe(true));
  it('iPad, das sich als Mac meldet: ja', () => expect(istIosImBrowser(IPAD_ALS_MAC, 5, false)).toBe(true));
  it('echter Mac ohne Touch: nein', () => expect(istIosImBrowser(MAC, 0, undefined)).toBe(false));
  it('Android: nein', () => expect(istIosImBrowser(ANDROID, 5, false)).toBe(false));
});

import { istInAppBrowser } from './installhinweis';
describe('istInAppBrowser', () => {
  it('erkennt Instagram und Facebook', () => {
    expect(istInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit Mobile/15E148 Instagram 300.0')).toBe(true);
    expect(istInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit [FBAN/FBIOS;FBAV/450.0]')).toBe(true);
  });
  it('normaler Safari und Chrome sind keine In-App-Browser', () => {
    expect(istInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(istInAppBrowser('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36')).toBe(false);
  });
});

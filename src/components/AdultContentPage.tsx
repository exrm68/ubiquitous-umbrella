import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, Flame, Lock, Unlock, AlertCircle } from 'lucide-react';
import { AdultBannerItem, AppSettings } from '../types';
import { doc, getDoc, updateDoc, increment, addDoc, collection, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AdultContentPageProps {
  items: AdultBannerItem[];
  tutorialBanner?: string;
  tutorialLink?: string;
  appSettings?: AppSettings;
  onClose: () => void;
}

const PAGE_SIZE = 12;

// ── Unlock key helpers ──
const getUnlockKey = (itemId: string) => `adult_unlock_${itemId}`;
const getPermanentKey = (itemId: string) => `adult_perm_${itemId}`;

const isUnlocked = (itemId: string): boolean => {
  // Permanent unlock check
  if (localStorage.getItem(getPermanentKey(itemId)) === '1') return true;
  // 24hr unlock check
  const ts = localStorage.getItem(getUnlockKey(itemId));
  if (!ts) return false;
  const unlockTime = parseInt(ts, 10);
  const now = Date.now();
  const hrs24 = 24 * 60 * 60 * 1000;
  return now - unlockTime < hrs24;
};

const saveUnlock24h = (itemId: string) => {
  localStorage.setItem(getUnlockKey(itemId), String(Date.now()));
};

const saveUnlockPermanent = (itemId: string) => {
  localStorage.setItem(getPermanentKey(itemId), '1');
};

const AdultContentPage: React.FC<AdultContentPageProps> = ({
  items, tutorialBanner, tutorialLink, appSettings, onClose
}) => {
  const allCats = Array.from(new Set(items.map(i => i.category || 'General')));
  const [activeCat, setActiveCat] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const defaultCat = allCats[0] || '';
  const currentCat = activeCat || defaultCat;
  const filtered = items.filter(i => (i.category || 'General') === currentCat);
  const displayed = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    if (!activeCat && allCats.length > 0) setActiveCat(allCats[0]);
  }, [items]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeCat]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setLoadingMore(true);
        setTimeout(() => { setVisibleCount(p => p + PAGE_SIZE); setLoadingMore(false); }, 400);
      }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0d0d10', zIndex: 200, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

      {/* ── Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'linear-gradient(to bottom, #0d0d10 85%, transparent)', padding: '14px 16px 10px', transform: 'translateZ(0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={20} color="#fff" />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* ✅ CINEFLIX gold color */}
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px', letterSpacing: '1px', background: 'linear-gradient(90deg, #FFD700, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CINEFLIX</span>
                <span style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', borderRadius: '6px', padding: '2px 8px' }}>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '11px', fontWeight: 900, color: '#fff', letterSpacing: '0.05em' }}>ADULT HUB</span>
                </span>
              </div>
              {/* ✅ "18+ Content" instead of "18+ Channel" */}
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>18+ Content · Adults only</p>
            </div>
          </div>
          <div style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: '20px', padding: '4px 10px' }}>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '11px', fontWeight: 700, color: '#ec4899' }}>{filtered.length} videos</span>
          </div>
        </div>

        {/* Category tabs */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {allCats.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)} style={{
              flexShrink: 0, padding: '7px 16px', borderRadius: '20px',
              border: currentCat === cat ? 'none' : '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 700,
              background: currentCat === cat ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'rgba(255,255,255,0.06)',
              color: currentCat === cat ? '#fff' : 'rgba(255,255,255,0.5)',
              boxShadow: currentCat === cat ? '0 3px 12px rgba(236,72,153,0.4)' : 'none',
            }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '10px 16px 100px' }}>
        {tutorialBanner && (
          <div onClick={() => tutorialLink && window.open(tutorialLink, '_blank')} style={{ borderRadius: '14px', overflow: 'hidden', marginBottom: '14px', cursor: tutorialLink ? 'pointer' : 'default', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            <img src={tutorialBanner} alt="Tutorial" style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        {displayed.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Sans',sans-serif", fontSize: '13px' }}>এই category তে কোনো content নেই</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayed.map(item => (
              <ContentCard key={item.id} item={item} appSettings={appSettings} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1 }} />
        {loadingMore && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '16px 0' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#ec4899', animation: `bounce 0.8s ease-in-out ${i*0.15}s infinite` }} />)}
          </div>
        )}
        {!hasMore && filtered.length > PAGE_SIZE && (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '11px', padding: '12px 0', fontFamily: "'DM Sans',sans-serif" }}>— সব {filtered.length}টা দেখা হয়ে গেছে —</p>
        )}
      </div>
    </div>
  );
};

// ── Ad helper ──
const runOneAd = (appSettings?: AppSettings): Promise<'watched'|'skipped'> => {
  return new Promise(resolve => {
    const monetagZoneId = appSettings?.adZoneId || '';
    const adsgramBlockId = appSettings?.adsgramBlockId || '';
    const useAdsgram = !!(appSettings?.adsgramEnabled && adsgramBlockId);

    if (useAdsgram) {
      let tries = 0;
      const try_ = () => {
        // @ts-ignore
        const A = window.Adsgram;
        if (A) {
          try { A.init({ blockId: String(adsgramBlockId) }).show().then(() => resolve('watched')).catch(() => resolve('skipped')); }
          catch { resolve('skipped'); }
        } else if (tries++ < 25) setTimeout(try_, 400);
        else resolve('skipped');
      };
      try_();
    } else {
      let tries = 0;
      const try_ = () => {
        // @ts-ignore
        const fn = window[`show_${monetagZoneId}`];
        if (typeof fn === 'function') fn().then(() => resolve('watched')).catch(() => resolve('skipped'));
        else if (tries++ < 30) setTimeout(try_, 200);
        else resolve('skipped');
      };
      try_();
    }
  });
};

// ── Custom Alert Modal ──
interface AlertModalProps {
  message: string;
  type: 'error' | 'success' | 'info';
  onClose: () => void;
}
const AlertModal: React.FC<AlertModalProps> = ({ message, type, onClose }) => {
  const colors = { error: '#ef4444', success: '#22c55e', info: '#8b5cf6' };
  const icons = { error: '❌', success: '✅', info: 'ℹ️' };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#18181b', borderRadius: '20px', padding: '24px 20px', width: '100%', maxWidth: 320, border: `1px solid ${colors[type]}30`, boxShadow: `0 0 40px ${colors[type]}20` }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 36 }}>{icons[type]}</span>
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#fff', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
        <button onClick={onClose} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: colors[type], color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          OK
        </button>
      </div>
    </div>
  );
};

// ── Single Content Card ──
const ContentCard: React.FC<{ item: AdultBannerItem; appSettings?: AppSettings }> = ({ item, appSettings }) => {
  const isPremium = item.isPremium === true;
  const premiumPrice = item.premiumPrice || appSettings?.adultDefaultPrice || 5;
  const adCount = appSettings?.defaultWatchAdCount ?? 0;
  const adsEnabled = !!(appSettings?.adEnabled && (appSettings?.adZoneId || appSettings?.adsgramBlockId));

  // ✅ Check local unlock status on mount
  const [unlocked, setUnlocked] = useState(() => isUnlocked(item.id));
  const [adLoading, setAdLoading] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [watched, setWatched] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [alert, setAlert] = useState<{msg: string; type: 'error'|'success'|'info'} | null>(null);
  const lastAdTimeRef = useRef(0);

  const openLink = useCallback(async () => {
    if (!item.channelLink) return;
    // Increment view count in Firestore
    try {
      await updateDoc(doc(db, 'adultContent', item.id), { views: increment(1) });
    } catch {}
    // @ts-ignore
    if (window.Telegram?.WebApp) { window.Telegram.WebApp.openLink(item.channelLink); }
    else { window.open(item.channelLink, '_blank'); }
  }, [item.channelLink, item.id]);

  const startCooldown = useCallback(() => {
    const secs = appSettings?.taskCooldownSecs ?? 5;
    lastAdTimeRef.current = Date.now();
    let s = secs; setCooldown(s);
    const iv = setInterval(() => { s--; if (s <= 0) { clearInterval(iv); setCooldown(0); } else setCooldown(s); }, 1000);
  }, [appSettings]);

  const handleWatch = useCallback(async () => {
    if (unlocked) { openLink(); return; }
    if (adLoading) return;

    // ── Premium paid unlock ──
    if (isPremium) {
      setAdLoading(true);
      try {
        const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        if (!tgUser) {
          setAlert({ msg: 'Telegram এ login করো!', type: 'error' });
          setAdLoading(false); return;
        }
        const uid = String(tgUser.id);
        const userSnap = await getDoc(doc(db, 'users', uid));
        const balance = userSnap.data()?.takaBalance || 0;
        if (balance < premiumPrice) {
          // ✅ Custom alert modal — not browser alert()
          setAlert({ msg: `টাকা কম! ৳${premiumPrice} দরকার, কিন্তু তোমার account এ আছে মাত্র ৳${balance.toFixed(2)}\n\nটাস্ক করে বা রেফার করে টাকা যোগ করো।`, type: 'error' });
          setAdLoading(false); return;
        }
        // Deduct taka
        await updateDoc(doc(db, 'users', uid), { takaBalance: increment(-premiumPrice) });
        await addDoc(collection(db, `users/${uid}/coinHistory`), {
          type: 'spend', reason: `🔞 Premium 18+ Content: ${item.title}`,
          amount: premiumPrice, currency: 'taka', createdAt: serverTimestamp(),
        });
        // ✅ Permanent unlock — Firestore + localStorage
        await setDoc(doc(db, `users/${uid}/adultUnlocks`, item.id), {
          itemId: item.id, title: item.title,
          unlockedAt: serverTimestamp(), type: 'premium', permanent: true,
        });
        saveUnlockPermanent(item.id);
        setUnlocked(true);
        setAdLoading(false);
        setAlert({ msg: `✅ Unlock হয়েছে! ৳${premiumPrice} কাটা হয়েছে।`, type: 'success' });
        setTimeout(() => openLink(), 600);
      } catch(e) {
        console.warn(e);
        setAlert({ msg: 'Error হয়েছে! আবার চেষ্টা করো।', type: 'error' });
        setAdLoading(false);
      }
      return;
    }

    // ── Ad based unlock ──
    const secs = appSettings?.taskCooldownSecs ?? 5;
    const diff = Date.now() - lastAdTimeRef.current;
    if (lastAdTimeRef.current > 0 && diff < secs * 1000) return;
    if (!adsEnabled || adCount <= 0) { openLink(); return; }

    setAdLoading(true); setSkipped(false);

    const result = await runOneAd(appSettings);
    setAdLoading(false);
    startCooldown();

    if (result === 'skipped') { setSkipped(true); return; }

    const newWatched = watched + 1;
    setWatched(newWatched);

    if (newWatched >= adCount) {
      // ✅ 24hr unlock — Firestore + localStorage
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser) {
        const uid = String(tgUser.id);
        try {
          await setDoc(doc(db, `users/${uid}/adultUnlocks`, item.id), {
            itemId: item.id, title: item.title,
            unlockedAt: serverTimestamp(), type: 'ads',
            expiresAt: new Date(Date.now() + 24*60*60*1000),
            permanent: false,
          });
        } catch {}
      }
      saveUnlock24h(item.id);
      setUnlocked(true);
      setTimeout(() => openLink(), 300);
    }
  }, [unlocked, adLoading, watched, adCount, adsEnabled, isPremium, premiumPrice, appSettings, openLink, startCooldown, item]);

  const buttonLabel = () => {
    if (unlocked) return '▶ WATCH NOW';
    if (adLoading) return isPremium ? 'Processing...' : 'Ad লোড হচ্ছে...';
    if (cooldown > 0) return `⏳ ${cooldown}s অপেক্ষা করো`;
    if (isPremium) return `💳 ৳${premiumPrice} দিয়ে Unlock করো`;
    if (!adsEnabled || adCount <= 0) return '▶ WATCH NOW';
    return `🔓 UNLOCK (${watched}/${adCount})`;
  };

  // Unlock time remaining
  const unlockTs = localStorage.getItem(getUnlockKey(item.id));
  const isPerm = localStorage.getItem(getPermanentKey(item.id)) === '1';
  const hoursLeft = unlockTs ? Math.max(0, Math.ceil((24*3600*1000 - (Date.now() - parseInt(unlockTs,10))) / 3600000)) : 0;

  return (
    <>
      {alert && <AlertModal message={alert.msg} type={alert.type} onClose={() => setAlert(null)} />}
      <div style={{ background: '#18181b', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', gap: '0', alignItems: 'stretch' }}>
          {/* Thumbnail */}
          <div style={{ position: 'relative', width: '140px', flexShrink: 0, aspectRatio: '16/9', alignSelf: 'center', margin: '10px 0 10px 10px', borderRadius: '10px', overflow: 'hidden', background: '#111' }}>
            <img src={item.thumbnail} alt={item.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Premium badge */}
            {isPremium && !unlocked && (
              <div style={{ position: 'absolute', top: 5, left: 5, background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '5px', padding: '2px 7px' }}>
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#000' }}>💳 ৳{premiumPrice}</span>
              </div>
            )}
            {/* Duration */}
            {item.duration && (
              <div style={{ position: 'absolute', bottom: 5, right: 5, background: 'rgba(0,0,0,0.8)', borderRadius: '4px', padding: '2px 5px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff' }}>{item.duration}</span>
              </div>
            )}
            {/* Unlocked play overlay */}
            {unlocked && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '22px' }}>▶</span>
              </div>
            )}
          </div>

          {/* Right content */}
          <div style={{ flex: 1, padding: '12px 12px 12px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: 700, color: '#fff', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.3', marginBottom: '4px' }}>
              {item.title}
            </p>

            {item.category && <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px', display: 'block' }}>{item.category}</span>}

            {/* Unlock status */}
            {unlocked && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <Unlock size={10} color="#22c55e" />
                <span style={{ fontSize: '10px', color: '#22c55e', fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>
                  {isPerm ? 'Permanent Unlock ✅' : `${hoursLeft}hr বাকি`}
                </span>
              </div>
            )}

            {skipped && <p style={{ fontSize: '10px', color: '#f87171', fontFamily: "'DM Sans',sans-serif", marginBottom: '4px' }}>⚠️ Ad skip, আবার চেষ্টা করো</p>}

            {!unlocked && adsEnabled && adCount > 0 && !isPremium && (
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '11px', fontWeight: 700, color: '#ec4899', marginBottom: '6px' }}>WATCH & UNLOCK 😊</p>
            )}

            {/* Progress dots */}
            {!unlocked && adsEnabled && adCount > 1 && !isPremium && (
              <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                {Array.from({ length: adCount }).map((_, i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < watched ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'rgba(255,255,255,0.15)' }} />
                ))}
              </div>
            )}

            {/* Watch Button */}
            <button onClick={handleWatch} disabled={adLoading || cooldown > 0} style={{
              width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
              background: unlocked ? 'linear-gradient(135deg, #22c55e, #16a34a)' : (adLoading || cooldown > 0) ? 'rgba(255,255,255,0.08)' : isPremium ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #1877F2, #0a5cd8)',
              color: (adLoading || cooldown > 0) ? 'rgba(255,255,255,0.4)' : '#fff',
              fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: 800,
              cursor: (adLoading || cooldown > 0) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', letterSpacing: '0.03em', transition: 'all 0.2s',
            }}>
              {adLoading && <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />}
              {buttonLabel()}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdultContentPage;

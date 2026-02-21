/**
 * Kaza Namazı Takip
 * ─────────────────
 * Sıfır native modül: sadece expo-linear-gradient ve async-storage.
 * Konum → ip-api.com (ücretsiz, konum izni gerektirmez).
 * Bildirim → setTimeout + Alert (uygulama açıkken çalışır).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Switch, StatusBar, ToastAndroid, Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';

// ─── RENKLER ─────────────────────────────────────────
const C = {
  bg: '#0d0d1a',
  surface: '#16162a',
  surface2: '#1e1e38',
  gold: '#c9a84c',
  goldLight: '#e8c97a',
  goldDim: 'rgba(201,168,76,0.15)',
  teal: '#4ecdc4',
  text: '#f0ede6',
  textDim: '#8a8aaa',
  border: 'rgba(201,168,76,0.2)',
  red: '#e07070',
};

// ─── NAMAz LİSTESİ ───────────────────────────────────
const PRAYERS = [
  { key: 'sabah',  name: 'Sabah',  arabic: 'صَلاةُ الْفَجْر',  icon: '🌅', timeKey: 'Fajr' },
  { key: 'ogle',   name: 'Öğle',   arabic: 'صَلاةُ الظُّهْر',  icon: '☀️', timeKey: 'Dhuhr' },
  { key: 'ikindi', name: 'İkindi', arabic: 'صَلاةُ الْعَصْر',  icon: '🌤️', timeKey: 'Asr' },
  { key: 'aksam',  name: 'Akşam',  arabic: 'صَلاةُ الْمَغْرِب', icon: '🌇', timeKey: 'Maghrib' },
  { key: 'yatsi',  name: 'Yatsı',  arabic: 'صَلاةُ الْعِشَاء', icon: '🌙', timeKey: 'Isha' },
  { key: 'vitr',   name: 'Vitir',  arabic: 'صَلاةُ الْوِتْر',  icon: '⭐', timeKey: null },
] as const;

type PrayerKey = 'sabah' | 'ogle' | 'ikindi' | 'aksam' | 'yatsi' | 'vitr';
type Gender = 'erkek' | 'kadin';

interface AppState {
  setup: boolean;
  years: number;
  gender: Gender;
  counts: Record<PrayerKey, number>;
  doneCounts: Record<PrayerKey, number>;
  notifyEnabled: boolean;
}

const EMPTY_COUNTS: Record<PrayerKey, number> = {
  sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0, vitr: 0,
};

const DEFAULT_STATE: AppState = {
  setup: false, years: 0, gender: 'erkek',
  counts: { ...EMPTY_COUNTS }, doneCounts: { ...EMPTY_COUNTS },
  notifyEnabled: false,
};

// ─── YARDIMCI ────────────────────────────────────────
function showToast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ═══════════════════════════════════════════════════
export default function App() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [screen, setScreen] = useState<'onboard' | 'main' | 'settings'>('onboard');
  const [yearsInput, setYearsInput] = useState('');
  const [prayerTimes, setPrayerTimes] = useState<Record<string, string> | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string } | null>(null);
  const [clock, setClock] = useState('');
  const [loading, setLoading] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [fontsLoaded] = useFonts({ Amiri_400Regular, Amiri_700Bold });

  // ── Saat
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Kayıtlı state yükle
  useEffect(() => {
    AsyncStorage.getItem('kazaState').then(raw => {
      if (!raw) return;
      const s: AppState = JSON.parse(raw);
      setState(s);
      if (s.setup) { setScreen('main'); loadPrayerTimes(s.notifyEnabled); }
    }).catch(() => {});
  }, []);

  // ── Kaydet
  const save = useCallback((s: AppState) => {
    AsyncStorage.setItem('kazaState', JSON.stringify(s)).catch(() => {});
  }, []);

  const update = useCallback((patch: Partial<AppState>) => {
    setState(prev => { const next = { ...prev, ...patch }; save(next); return next; });
  }, [save]);

  // ── Başlangıç hesabı
  function calcCounts(years: number, gender: Gender): Record<PrayerKey, number> {
    const days = years * (gender === 'erkek' ? 365 : 351);
    return {
      sabah: days, ogle: days, ikindi: days, aksam: days, yatsi: days,
      vitr: gender === 'erkek' ? days : 0,
    };
  }

  async function startApp() {
    const y = parseInt(yearsInput, 10);
    if (!y || y < 1 || y > 80) {
      Alert.alert('Hata', 'Lütfen 1 ile 80 arasında bir yıl sayısı girin.');
      return;
    }
    const next: AppState = {
      ...state, setup: true, years: y,
      counts: calcCounts(y, state.gender),
      doneCounts: { ...EMPTY_COUNTS },
    };
    setState(next);
    save(next);
    setScreen('main');
    loadPrayerTimes(next.notifyEnabled);
  }

  // ── IP bazlı konum + namaz vakitleri (native izin gerektirmez)
  async function loadPrayerTimes(notifyEnabled: boolean) {
    setLoading(true);
    try {
      // 1) IP'den koordinat al
      const geoRes = await fetch('http://ip-api.com/json/?fields=lat,lon,city');
      const geo = await geoRes.json();
      const lat = geo.lat ?? 41.0082;
      const lon = geo.lon ?? 28.9784;

      // 2) Aladhan'dan vakitleri al
      const today = new Date();
      const url =
        `https://api.aladhan.com/v1/timings/` +
        `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}` +
        `?latitude=${lat}&longitude=${lon}&method=13&school=1`;
      const res = await fetch(url);
      const data = await res.json();
      const times: Record<string, string> = data.data.timings;
      setPrayerTimes(times);
      updateNextPrayer(times);
      scheduleAlerts(times, notifyEnabled);
    } catch (e) {
      showToast('Namaz vakitleri alınamadı. İnternet bağlantısını kontrol edin.');
    } finally {
      setLoading(false);
    }
  }

  function updateNextPrayer(times: Record<string, string>) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const order = [
      { name: 'Sabah', key: 'Fajr' }, { name: 'Öğle', key: 'Dhuhr' },
      { name: 'İkindi', key: 'Asr' }, { name: 'Akşam', key: 'Maghrib' },
      { name: 'Yatsı', key: 'Isha' },
    ];
    for (const k of order) {
      if (times[k.key] && timeToMinutes(times[k.key]) > nowMin) {
        setNextPrayer({ name: k.name, time: times[k.key] }); return;
      }
    }
    setNextPrayer({ name: 'Sabah (yarın)', time: times['Fajr'] ?? '--:--' });
  }

  // ── setTimeout tabanlı vakit uyarıları
  function scheduleAlerts(times: Record<string, string>, enabled: boolean) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!enabled) return;
    const order = [
      { name: 'Sabah', key: 'Fajr' }, { name: 'Öğle', key: 'Dhuhr' },
      { name: 'İkindi', key: 'Asr' }, { name: 'Akşam', key: 'Maghrib' },
      { name: 'Yatsı', key: 'Isha' },
    ];
    const now = Date.now();
    order.forEach(p => {
      const t = times[p.key];
      if (!t) return;
      const [h, m] = t.split(':').map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);
      const diff = target.getTime() - now;
      if (diff > 0 && diff < 86_400_000) {
        timers.current.push(setTimeout(() => {
          Alert.alert(
            `🕌 ${p.name} Vakti – ${t}`,
            `Kaza ${p.name} namazını kılmayı unutmayın!`,
            [{ text: 'Tamam' }]
          );
        }, diff));
      }
    });
  }

  // ── Sayaç
  function changeCount(key: PrayerKey, delta: 1 | -1) {
    const counts = { ...state.counts };
    const done = { ...state.doneCounts };
    if (delta === 1) { counts[key] += 1; }
    else { done[key] = Math.min(counts[key], done[key] + 1); }
    update({ counts, doneCounts: done });
  }

  // ── İstatistik
  const total = (Object.values(state.counts) as number[]).reduce((a, b) => a + b, 0);
  const doneTotal = (Object.values(state.doneCounts) as number[]).reduce((a, b) => a + b, 0);
  const remaining = total - doneTotal;
  const pct = total > 0 ? Math.round((doneTotal / total) * 100) : 0;

  if (!fontsLoaded) return null;

  // ══════════════════════════════════════════════════
  //  ONBOARDING
  // ══════════════════════════════════════════════════
  if (screen === 'onboard') return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.onboardScroll} keyboardShouldPersistTaps="handled">
        <Text style={s.logoAr}>قضاء النماز</Text>
        <Text style={s.logoSub}>KAZA NAMAZI TAKİP</Text>
        <View style={s.divider} />
        <View style={s.card}>
          <Text style={s.cardTitle}>Hoş Geldiniz</Text>
          <Text style={s.cardSub}>
            Kılınamamış namazlarınızı kolayca takip edin. Başlamak için yıl sayısı ve cinsiyetinizi girin.
          </Text>

          <Text style={s.label}>KAÇ YILLIK KAZA NAMAZINIZ VAR?</Text>
          <TextInput
            style={s.textInput}
            placeholder="Örnek: 5"
            placeholderTextColor={C.textDim}
            keyboardType="number-pad"
            value={yearsInput}
            onChangeText={setYearsInput}
          />

          <Text style={s.label}>CİNSİYET</Text>
          <View style={s.genderRow}>
            {(['erkek', 'kadin'] as Gender[]).map(g => (
              <TouchableOpacity
                key={g}
                style={[s.genderBtn, state.gender === g && s.genderBtnOn]}
                onPress={() => update({ gender: g })}
              >
                <Text style={[s.genderTxt, state.gender === g && s.genderTxtOn]}>
                  {g === 'erkek' ? '♂ Erkek' : '♀ Kadın'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.hint}>
            Erkek → Vitir dahil · 365 gün/yıl{'\n'}
            Kadın → Vitir hariç · ~351 gün/yıl (hayız)
          </Text>

          <TouchableOpacity onPress={startApp} activeOpacity={0.85}>
            <LinearGradient colors={['#e8c97a', '#c9a84c', '#a8813a']} style={s.btnPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.btnPrimaryTxt}>Hesapla ve Başla →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  // ══════════════════════════════════════════════════
  //  ANA EKRAN
  // ══════════════════════════════════════════════════
  if (screen === 'main') return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Üst bar */}
      <View style={s.topBar}>
        <Text style={s.logoAr2}>قضاء النماز</Text>
        <View style={s.clockBadge}><Text style={s.clockTxt}>{clock}</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Sonraki vakit */}
        <View style={s.nextBanner}>
          <View>
            <Text style={s.nextLbl}>BİR SONRAKİ VAKİT</Text>
            <Text style={s.nextName}>{nextPrayer?.name ?? (loading ? 'Yükleniyor...' : '—')}</Text>
          </View>
          {loading
            ? <ActivityIndicator color={C.gold} />
            : <Text style={s.nextTime}>{nextPrayer?.time ?? '--:--'}</Text>
          }
        </View>

        {/* Uyarı toggle */}
        <View style={s.row}>
          <View>
            <Text style={s.rowTitle}>🔔 Vakit Uyarıları</Text>
            <Text style={s.rowSub}>Uygulama açıkken ekrana uyarı</Text>
          </View>
          <Switch
            value={state.notifyEnabled}
            onValueChange={v => {
              update({ notifyEnabled: v });
              if (prayerTimes) scheduleAlerts(prayerTimes, v);
            }}
            trackColor={{ false: C.surface2, true: C.goldDim }}
            thumbColor={state.notifyEnabled ? C.gold : C.textDim}
          />
        </View>

        {/* İstatistik */}
        <View style={s.statsRow}>
          {[
            { val: remaining.toLocaleString('tr-TR'), lbl: 'Kalan' },
            { val: doneTotal.toLocaleString('tr-TR'), lbl: 'Kılınan' },
            { val: `%${pct}`, lbl: 'Tamamlanan', color: C.teal },
          ].map(item => (
            <View key={item.lbl} style={s.statCard}>
              <Text style={[s.statVal, item.color ? { color: item.color } : {}]}>{item.val}</Text>
              <Text style={s.statLbl}>{item.lbl}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>KAZA NAMAZLARI</Text>

        {/* Namaz kartları */}
        {PRAYERS
          .filter(p => !(p.key === 'vitr' && state.gender === 'kadin'))
          .map(p => {
            const rem = state.counts[p.key] - state.doneCounts[p.key];
            const isDone = rem <= 0;
            return (
              <View key={p.key} style={[s.pCard, isDone && s.pCardDone]}>
                <View style={[s.pIcon, isDone && s.pIconDone]}>
                  <Text style={{ fontSize: 22 }}>{isDone ? '✅' : p.icon}</Text>
                </View>
                <View style={s.pInfo}>
                  <Text style={s.pName}>{p.name}</Text>
                  <Text style={s.pAr}>{p.arabic}</Text>
                  {prayerTimes && p.timeKey
                    ? <Text style={s.pTime}>⏰ {prayerTimes[p.timeKey] ?? '--:--'}</Text>
                    : null}
                </View>
                <View style={s.counter}>
                  <TouchableOpacity style={s.cBtn} onPress={() => changeCount(p.key, -1)}>
                    <Text style={[s.cBtnTxt, { color: C.red }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[s.cVal, isDone && { color: C.teal }]}>
                    {isDone ? '✓' : rem.toLocaleString('tr-TR')}
                  </Text>
                  <TouchableOpacity style={s.cBtn} onPress={() => changeCount(p.key, 1)}>
                    <Text style={s.cBtnTxt}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={s.nav}>
        <TouchableOpacity style={s.navItem} onPress={() => setScreen('main')}>
          <Text style={s.navIcon}>🕌</Text>
          <Text style={[s.navLbl, { color: C.gold }]}>Namazlar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={() => setScreen('settings')}>
          <Text style={s.navIcon}>⚙️</Text>
          <Text style={s.navLbl}>Ayarlar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ══════════════════════════════════════════════════
  //  AYARLAR
  // ══════════════════════════════════════════════════
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Text style={[s.sectionTitle, { marginTop: 52 }]}>AYARLAR</Text>
      <ScrollView>
        <View style={s.settCard}>

          <View style={s.settRow}>
            <View><Text style={s.settLbl}>Yıl Sayısı</Text><Text style={s.settSub}>Girilen kaza yılı</Text></View>
            <Text style={s.settVal}>{state.years} yıl</Text>
          </View>

          <View style={s.settRow}>
            <Text style={s.settLbl}>Cinsiyet</Text>
            <Text style={s.settVal}>{state.gender === 'erkek' ? 'Erkek' : 'Kadın'}</Text>
          </View>

          <View style={s.settRow}>
            <View><Text style={s.settLbl}>Vakit Uyarıları</Text><Text style={s.settSub}>Uygulama açıkken</Text></View>
            <Switch
              value={state.notifyEnabled}
              onValueChange={v => {
                update({ notifyEnabled: v });
                if (prayerTimes) scheduleAlerts(prayerTimes, v);
              }}
              trackColor={{ false: C.surface2, true: C.goldDim }}
              thumbColor={state.notifyEnabled ? C.gold : C.textDim}
            />
          </View>

          <TouchableOpacity style={s.settRow} onPress={() => loadPrayerTimes(state.notifyEnabled)}>
            <View><Text style={s.settLbl}>Namaz Vakitlerini Yenile</Text><Text style={s.settSub}>IP bazlı konum kullanılır</Text></View>
            <Text style={{ fontSize: 20 }}>🔄</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.settRow, { borderBottomWidth: 0 }]} onPress={() =>
            Alert.alert('Sıfırla', 'Tüm veriler silinecek. Emin misiniz?', [
              { text: 'İptal' },
              { text: 'Sıfırla', style: 'destructive', onPress: async () => {
                timers.current.forEach(clearTimeout);
                await AsyncStorage.removeItem('kazaState');
                setState(DEFAULT_STATE);
                setScreen('onboard');
              }},
            ])
          }>
            <View><Text style={[s.settLbl, { color: C.red }]}>Sıfırla</Text><Text style={s.settSub}>Tüm verileri sil</Text></View>
            <Text style={{ fontSize: 20 }}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.hint, { margin: 20, textAlign: 'center' }]}>
          Namaz vakitleri Aladhan API ile{'\n'}Diyanet İşleri / Hanefî metoduyla hesaplanır.{'\n'}Konum için ip-api.com kullanılır.
        </Text>
        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={s.nav}>
        <TouchableOpacity style={s.navItem} onPress={() => setScreen('main')}>
          <Text style={s.navIcon}>🕌</Text><Text style={s.navLbl}>Namazlar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={() => setScreen('settings')}>
          <Text style={s.navIcon}>⚙️</Text>
          <Text style={[s.navLbl, { color: C.gold }]}>Ayarlar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── STİLLER ─────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  onboardScroll: { padding: 24, paddingTop: 64, paddingBottom: 40 },
  logoAr: { fontFamily: 'Amiri_700Bold', fontSize: 38, color: C.gold, textAlign: 'center', letterSpacing: 2 },
  logoAr2: { fontFamily: 'Amiri_400Regular', fontSize: 22, color: C.gold },
  logoSub: { color: C.textDim, fontSize: 11, letterSpacing: 4, textAlign: 'center', marginTop: 4 },
  divider: { width: 60, height: 1, backgroundColor: C.gold, alignSelf: 'center', marginVertical: 20, opacity: 0.4 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 24 },
  cardTitle: { color: C.goldLight, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  cardSub: { color: C.textDim, fontSize: 13, lineHeight: 20, marginBottom: 24 },
  label: { color: C.textDim, fontSize: 10, letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  textInput: {
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, color: C.text, fontSize: 24, fontWeight: '800',
    padding: 14, textAlign: 'center', marginBottom: 20,
  },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  genderBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', backgroundColor: C.surface2 },
  genderBtnOn: { borderColor: C.gold, backgroundColor: C.goldDim },
  genderTxt: { color: C.textDim, fontWeight: '700', fontSize: 15 },
  genderTxtOn: { color: C.goldLight },
  hint: { color: C.textDim, fontSize: 12, lineHeight: 19, marginBottom: 22 },
  btnPrimary: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  btnPrimaryTxt: { color: '#0d0d1a', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 12, backgroundColor: C.bg },
  clockBadge: { backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  clockTxt: { color: C.goldLight, fontSize: 13, fontWeight: '700' },
  nextBanner: { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.gold, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextLbl: { color: C.textDim, fontSize: 10, letterSpacing: 2 },
  nextName: { color: C.goldLight, fontSize: 18, fontWeight: '800', marginTop: 4 },
  nextTime: { color: C.gold, fontSize: 30, fontWeight: '900' },
  row: { marginHorizontal: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  rowTitle: { color: C.text, fontSize: 14, fontWeight: '700' },
  rowSub: { color: C.textDim, fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 4 },
  statCard: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, alignItems: 'center' },
  statVal: { color: C.goldLight, fontSize: 20, fontWeight: '900' },
  statLbl: { color: C.textDim, fontSize: 10, letterSpacing: 1, marginTop: 4 },
  sectionTitle: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10, color: C.textDim, fontSize: 10, letterSpacing: 3 },
  pCard: { marginHorizontal: 16, marginBottom: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  pCardDone: { borderColor: 'rgba(78,205,196,0.4)' },
  pIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: C.goldDim, alignItems: 'center', justifyContent: 'center' },
  pIconDone: { backgroundColor: 'rgba(78,205,196,0.1)' },
  pInfo: { flex: 1 },
  pName: { color: C.text, fontSize: 15, fontWeight: '700' },
  pAr: { fontFamily: 'Amiri_400Regular', color: C.gold, fontSize: 13, marginTop: 2 },
  pTime: { color: C.textDim, fontSize: 11, marginTop: 2 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  cBtnTxt: { color: C.goldLight, fontSize: 22, fontWeight: '700', lineHeight: 26 },
  cVal: { minWidth: 54, textAlign: 'center', color: C.goldLight, fontSize: 15, fontWeight: '900' },
  nav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(13,13,26,0.97)', borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row' },
  navItem: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  navIcon: { fontSize: 22 },
  navLbl: { color: C.textDim, fontSize: 10, letterSpacing: 1, marginTop: 2, fontWeight: '700' },
  settCard: { marginHorizontal: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  settRow: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border },
  settLbl: { color: C.text, fontSize: 15, fontWeight: '600' },
  settSub: { color: C.textDim, fontSize: 12, marginTop: 2 },
  settVal: { color: C.gold, fontWeight: '700', fontSize: 15 },
});

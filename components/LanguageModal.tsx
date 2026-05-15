import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { changeLanguage } from '../src/i18n';

// ─── Theme ────────────────────────────────────────────────────────────────────
const PURPLE      = '#7C3AED';
const PURPLE_LIGHT = '#F0EBFF';
const PURPLE_MID  = '#EDE9FE';
const PURPLE_DARK = '#6D28D9';
const TEXT_DARK   = '#111827';
const TEXT_MID    = '#374151';
const TEXT_LIGHT  = '#9CA3AF';
const GRAY_BORDER = '#E5E7EB';
const WHITE       = '#FFFFFF';
const GREEN       = '#16A34A';
const GREEN_LIGHT = '#F0FDF4';
const GREEN_BORDER = '#BBF7D0';

// ─── Language options ─────────────────────────────────────────────────────────
const LANGUAGES = [
  {
    code: 'en' as const,
    flag: '🇬🇧',
    name: 'English',
    region: 'Cameroon',
    nativeName: 'English',
  },
  {
    code: 'fr' as const,
    flag: '🇫🇷',
    name: 'Français',
    region: 'Cameroun',
    nativeName: 'Français',
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  visible: boolean;
  onClose: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LanguageModal({ visible, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [selected, setSelected]   = useState<'en' | 'fr'>(i18n.language as 'en' | 'fr');
  const [applying, setApplying]   = useState(false);
  const [applied, setApplied]     = useState(false);

  const currentLang = i18n.language as 'en' | 'fr';

  const handleApply = async () => {
    if (selected === currentLang) {
      onClose();
      return;
    }
    setApplying(true);
    try {
      await changeLanguage(selected);
      setApplied(true);
      setTimeout(() => {
        setApplied(false);
        onClose();
      }, 1200);
    } catch (e) {
      console.error('Language change failed:', e);
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    setSelected(currentLang);   // reset selection if dismissed without applying
    setApplied(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>

      {/* Backdrop */}
      <Pressable style={s.backdrop} onPress={handleClose}>
        {/* Card — stop propagation so tapping inside doesn't close */}
        <Pressable style={s.card} onPress={e => e.stopPropagation()}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.iconBox}>
                <Feather name="globe" size={18} color={PURPLE} />
              </View>
              <View>
                <Text style={s.title}>{t('language.title')}</Text>
                <Text style={s.subtitle}>{t('language.subtitle')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Feather name="x" size={18} color={TEXT_LIGHT} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={s.divider} />

          {/* Language options */}
          <View style={s.optionsList}>
            {LANGUAGES.map(lang => {
              const isSelected = selected === lang.code;
              const isCurrent  = currentLang === lang.code;

              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[s.option, isSelected && s.optionSelected]}
                  onPress={() => setSelected(lang.code)}
                  activeOpacity={0.75}>

                  {/* Flag */}
                  <Text style={s.flag}>{lang.flag}</Text>

                  {/* Name block */}
                  <View style={s.optionText}>
                    <View style={s.optionNameRow}>
                      <Text style={[s.optionName, isSelected && s.optionNameSelected]}>
                        {lang.name}
                      </Text>
                      {isCurrent && (
                        <View style={s.currentBadge}>
                          <Text style={s.currentBadgeTxt}>{t('language.current')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.optionRegion}>{lang.region}</Text>
                  </View>

                  {/* Radio */}
                  <View style={[s.radio, isSelected && s.radioSelected]}>
                    {isSelected && <View style={s.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Hint */}
          <View style={s.hintRow}>
            <Feather name="info" size={12} color={TEXT_LIGHT} />
            <Text style={s.hintTxt}>{t('language.restartNotice')}</Text>
          </View>

          {/* Success banner */}
          {applied && (
            <View style={s.successBanner}>
              <Feather name="check-circle" size={14} color={GREEN} />
              <Text style={s.successTxt}>{t('language.changed')}</Text>
            </View>
          )}

          {/* Divider */}
          <View style={s.divider} />

          {/* Action buttons */}
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
              <Text style={s.cancelBtnTxt}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.applyBtn,
                selected === currentLang && s.applyBtnDisabled,
                applying && s.applyBtnDisabled,
              ]}
              onPress={handleApply}
              disabled={applying}
              activeOpacity={0.85}>
              {applying ? (
                <ActivityIndicator color={WHITE} size="small" />
              ) : (
                <>
                  <Feather name="check" size={15} color={WHITE} />
                  <Text style={s.applyBtnTxt}>{t('language.apply')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: 16, fontWeight: '700', color: TEXT_DARK, letterSpacing: -0.2 },
  subtitle: { fontSize: 12, color: TEXT_LIGHT, marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },

  divider: { height: 1, backgroundColor: '#F0F0F0' },

  // Options
  optionsList: { padding: 16, gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: GRAY_BORDER,
    backgroundColor: WHITE,
  },
  optionSelected: {
    borderColor: PURPLE,
    backgroundColor: PURPLE_LIGHT,
  },
  flag:       { fontSize: 28 },
  optionText: { flex: 1 },
  optionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionName: { fontSize: 15, fontWeight: '600', color: TEXT_DARK },
  optionNameSelected: { color: PURPLE_DARK },
  optionRegion: { fontSize: 12, color: TEXT_LIGHT, marginTop: 2 },

  // Current badge
  currentBadge: {
    backgroundColor: PURPLE_MID,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  currentBadgeTxt: { fontSize: 10, fontWeight: '700', color: PURPLE },

  // Radio
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: GRAY_BORDER,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: WHITE,
  },
  radioSelected: { borderColor: PURPLE },
  radioDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: PURPLE,
  },

  // Hint
  hintRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    marginHorizontal: 16, marginBottom: 12,
  },
  hintTxt: { flex: 1, fontSize: 11.5, color: TEXT_LIGHT, lineHeight: 17 },

  // Success
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GREEN_LIGHT,
    borderWidth: 1, borderColor: GREEN_BORDER,
    borderRadius: 12, padding: 12,
    marginHorizontal: 16, marginBottom: 12,
  },
  successTxt: { fontSize: 13, fontWeight: '600', color: GREEN },

  // Actions
  actions: {
    flexDirection: 'row', gap: 10,
    padding: 16,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 13,
    borderWidth: 1.5, borderColor: GRAY_BORDER,
    borderRadius: 14, alignItems: 'center',
  },
  cancelBtnTxt: { fontSize: 14, fontWeight: '600', color: TEXT_MID },
  applyBtn: {
    flex: 2, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PURPLE_DARK, borderRadius: 14, paddingVertical: 13,
    shadowColor: '#5B21B6', shadowOpacity: 0.3,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  applyBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  applyBtnTxt: { fontSize: 14, fontWeight: '700', color: WHITE },
});
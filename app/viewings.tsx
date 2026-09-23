import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../constants/api';
import { useAppTheme } from '../hooks/use-app-theme';

type Viewing = any;

export default function ViewingsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const [rows, setRows] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<number | string | null>(null);
  const [owner, setOwner] = useState(false);

  const load = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    try {
      const [token, userRaw, roleRaw] = await Promise.all([
        AsyncStorage.getItem('token'), AsyncStorage.getItem('user'), AsyncStorage.getItem('role'),
      ]);
      if (!token) { router.replace('/house_seekers_login_signup' as any); return; }
      let role = roleRaw || '';
      try { const u = userRaw ? JSON.parse(userRaw) : null; role = role || u?.role || u?.profile?.role || ''; } catch {}
      const isOwner = String(role).toUpperCase() === 'SELLER';
      setOwner(isOwner);
      const res = await fetch(`${BASE_URL}/viewing-requests/${isOwner ? 'received' : 'mine'}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t('viewings.loadError'));
      setRows(Array.isArray(data) ? data : (data.viewingRequests || []));
    } catch (e: any) {
      Alert.alert(t('viewings.title'), e?.message || t('viewings.loadError'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patch = async (v: Viewing, action: 'cancel'|'confirm'|'decline') => {
    const run = async () => {
      setBusy(v.id);
      try {
        const token = await AsyncStorage.getItem('token');
        const body = action === 'confirm' ? { confirmedDate: v.preferredDate, confirmedTime: v.preferredTime } : {};
        const res = await fetch(`${BASE_URL}/viewing-requests/${v.id}/${action}`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t('viewings.updateError'));
        await load(true);
      } catch (e:any) { Alert.alert(t('viewings.title'), e?.message || t('viewings.updateError')); }
      finally { setBusy(null); }
    };
    if (action === 'cancel' || action === 'decline') {
      Alert.alert(t('viewings.confirmTitle'), action === 'cancel' ? t('viewings.cancelConfirm') : t('viewings.declineConfirm'), [
        { text: t('viewings.keep'), style: 'cancel' }, { text: action === 'cancel' ? t('viewings.cancel') : t('viewings.decline'), style: 'destructive', onPress: run },
      ]);
    } else run();
  };

  const statusLabel = (x:string) => t(`viewings.status.${String(x||'PENDING').toLowerCase()}` as any);
  const imageOf = (v:Viewing) => v?.listing?.images?.find?.((x:any)=>x.isPrimary)?.imageUrl || v?.listing?.images?.[0]?.imageUrl || v?.listing?.imageUrl;

  return <SafeAreaView style={s.safe} edges={['top']}>
    <View style={s.header}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.text}/></TouchableOpacity>
      <View style={{flex:1}}><Text style={s.title}>{owner ? t('viewings.ownerTitle') : t('viewings.myTitle')}</Text><Text style={s.sub}>{owner ? t('viewings.ownerSub') : t('viewings.mySub')}</Text></View>
    </View>
    {loading ? <View style={s.center}><ActivityIndicator color={colors.primary}/><Text style={s.muted}>{t('viewings.loading')}</Text></View> :
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load(true)} tintColor={colors.primary}/>}>
      {!rows.length ? <View style={s.empty}><View style={s.emptyIcon}><Feather name="calendar" size={28} color={colors.primary}/></View><Text style={s.emptyTitle}>{t('viewings.emptyTitle')}</Text><Text style={s.muted}>{owner ? t('viewings.emptyOwner') : t('viewings.emptySeeker')}</Text>{!owner && <TouchableOpacity style={s.primary} onPress={()=>router.push('/search' as any)}><Text style={s.primaryText}>{t('viewings.findProperty')}</Text></TouchableOpacity>}</View> : rows.map(v => {
        const status=String(v.status||'PENDING').toUpperCase(); const img=imageOf(v); const isBusy=busy===v.id;
        return <View key={String(v.id)} style={s.card}>
          <View style={s.top}>{img ? <Image source={{uri:img}} style={s.thumb}/> : <View style={[s.thumb,s.placeholder]}><Feather name="home" size={24} color={colors.primary}/></View>}
            <View style={{flex:1}}><Text style={s.property} numberOfLines={2}>{v?.listing?.title || t('viewings.property')}</Text><Text style={s.place} numberOfLines={1}>{[v?.listing?.neighborhood,v?.listing?.city,v?.listing?.region].filter(Boolean).join(', ')}</Text><View style={s.badge}><Text style={s.badgeText}>{statusLabel(status)}</Text></View></View>
          </View>
          <View style={s.schedule}><View style={s.scheduleItem}><Feather name="calendar" size={16} color={colors.primary}/><View><Text style={s.small}>{t('viewings.requestedDate')}</Text><Text style={s.value}>{v.preferredDate || '—'}</Text></View></View><View style={s.scheduleItem}><Feather name="clock" size={16} color={colors.primary}/><View><Text style={s.small}>{t('viewings.requestedTime')}</Text><Text style={s.value}>{v.preferredTime || '—'}</Text></View></View></View>
          {!!v.note && <View style={s.note}><Text style={s.small}>{t('viewings.message')}</Text><Text style={s.noteText}>{v.note}</Text></View>}
          {!!v.confirmedDate && <Text style={s.confirmed}>{t('viewings.confirmedFor')} {v.confirmedDate} • {v.confirmedTime}</Text>}
          {!!v.agentMessage && <View style={s.note}><Text style={s.small}>{t('viewings.ownerResponse')}</Text><Text style={s.noteText}>{v.agentMessage}</Text></View>}
          <View style={s.actions}>
            {!!v?.listing?.id && <TouchableOpacity style={s.secondary} onPress={()=>router.push({pathname:'/propertydetail',params:{id:String(v.listing.id)}} as any)}><Feather name="eye" size={16} color={colors.primary}/><Text style={s.secondaryText}>{t('viewings.viewProperty')}</Text></TouchableOpacity>}
            {!owner && status==='PENDING' && <TouchableOpacity disabled={isBusy} style={s.danger} onPress={()=>patch(v,'cancel')}><Text style={s.dangerText}>{t('viewings.cancel')}</Text></TouchableOpacity>}
            {owner && status==='PENDING' && <><TouchableOpacity disabled={isBusy} style={s.secondary} onPress={()=>patch(v,'decline')}><Text style={s.secondaryText}>{t('viewings.decline')}</Text></TouchableOpacity><TouchableOpacity disabled={isBusy} style={s.primarySmall} onPress={()=>patch(v,'confirm')}>{isBusy?<ActivityIndicator size="small" color="#fff"/>:<Text style={s.primaryText}>{t('viewings.confirm')}</Text>}</TouchableOpacity></>}
          </View>
        </View>;
      })}
    </ScrollView>}
  </SafeAreaView>;
}

const styles=(c:any)=>StyleSheet.create({
  safe:{flex:1,backgroundColor:c.background},header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:18,paddingVertical:14,backgroundColor:c.card,borderBottomWidth:1,borderBottomColor:c.borderLight},back:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:c.cardMuted},title:{fontSize:20,fontWeight:'800',color:c.text},sub:{fontSize:12,color:c.textLight,marginTop:2},content:{padding:18,paddingBottom:40,gap:14},center:{flex:1,alignItems:'center',justifyContent:'center',gap:10},muted:{fontSize:13,color:c.textLight,textAlign:'center',lineHeight:19},empty:{marginTop:70,alignItems:'center',padding:24},emptyIcon:{width:64,height:64,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:c.primaryTint,marginBottom:14},emptyTitle:{fontSize:18,fontWeight:'800',color:c.text,marginBottom:6},card:{backgroundColor:c.card,borderRadius:18,padding:14,borderWidth:1,borderColor:c.borderLight},top:{flexDirection:'row',gap:12},thumb:{width:78,height:72,borderRadius:13,backgroundColor:c.cardMuted},placeholder:{alignItems:'center',justifyContent:'center'},property:{fontSize:15,fontWeight:'800',color:c.text},place:{fontSize:12,color:c.textLight,marginTop:3},badge:{alignSelf:'flex-start',marginTop:8,paddingHorizontal:9,paddingVertical:4,borderRadius:999,backgroundColor:c.primaryTint},badgeText:{fontSize:10,fontWeight:'800',color:c.primary},schedule:{flexDirection:'row',gap:10,marginTop:14},scheduleItem:{flex:1,flexDirection:'row',alignItems:'center',gap:8,padding:10,borderRadius:12,backgroundColor:c.cardMuted},small:{fontSize:10,color:c.textLight,fontWeight:'600'},value:{fontSize:13,color:c.text,fontWeight:'800',marginTop:1},note:{marginTop:12,padding:11,borderRadius:12,backgroundColor:c.cardMuted},noteText:{fontSize:13,color:c.text,lineHeight:18,marginTop:3},confirmed:{marginTop:12,fontSize:12,fontWeight:'800',color:c.primary},actions:{flexDirection:'row',flexWrap:'wrap',justifyContent:'flex-end',gap:8,marginTop:14},secondary:{minHeight:40,paddingHorizontal:13,borderRadius:11,borderWidth:1,borderColor:c.borderLight,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:6},secondaryText:{fontSize:12,fontWeight:'800',color:c.primary},danger:{minHeight:40,paddingHorizontal:13,borderRadius:11,backgroundColor:'#FEF2F2',alignItems:'center',justifyContent:'center'},dangerText:{fontSize:12,fontWeight:'800',color:'#DC2626'},primary:{marginTop:18,minHeight:46,paddingHorizontal:20,borderRadius:13,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'},primarySmall:{minHeight:40,paddingHorizontal:15,borderRadius:11,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'},primaryText:{fontSize:12,fontWeight:'800',color:'#fff'}
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../constants/api';
import { useAppTheme } from '../hooks/use-app-theme';

const xaf = (v:any) => `${Math.round(Number(v)||0).toLocaleString('en-US')} XAF`;

const RESIDENTIAL_LEASE_TEXT = `RESIDENTIAL
LEASE AND PLATFORM FACILITATION AGREEMENT

This Master Tenancy and
Facilitation Agreement (the "Agreement") is entered into by and
between:

• The House Owner (“Landlord”): The verified
property owner or authorized property administrator listed on the SweetCasa
platform.

• The House Seeker (“Tenant”): The verified
individual seeking to lease and occupy the residential premises listed on the
SweetCasa platform.

• SweetCasa Technologies (“Platform / Facilitator”): The
digital platform providing property matching, secure transaction management,
and dispute facilitation services (within the 7 days period).

1. Grant of Tenancy
& Rental Terms

• 1.1 Lease Grant: The Landlord hereby agrees to
lease the designated property to the Tenant, and the Tenant agrees to occupy
the premises in accordance with the terms, conditions, and tenure options
(Short-Term or Long-Term Lease) selected within the SweetCasa mobile
application.

• 1.2 All-Inclusive Rental Fee: The total agreed
initial rental fee paid by the Tenant through the platform includes base rent
and pre-integrated property viewing and inspection fees. Neither the Landlord
nor any third-party agent shall demand, request, or accept cash payments,
hidden inspection fees, or off-platform commissions on-site. Any demand for
off-platform cash fees constitutes a direct breach of this Agreement.

2. Secure Payment
Vaulting & 7-Day Move-In Verification

• 2.1 Platform Payment Vaulting: The Tenant must
deposit 100% of the initial rental payment into the SweetCasa Secure Payment
System prior to key handover or taking physical possession of the property.

• 2.2 Verification Window: A mandatory 7-Day
Move-In Verification Window commences on the exact calendar date the tenant
physically moves-in (key handover). During this 7-day period, funds remain
securely held in the SweetCasa payment system to verify that the property
condition and advertised facilities(electricity, water-supply, etc) match the
verified app listing.

• 2.3 Standard Release Schedule (No Disputes):

• Day 8 Payout: If the Tenant occupies the
property past Day 7 without filing a formal dispute or amenity breach claim,
SweetCasa shall deduct its 5% platform commission and release the remaining 95%
of the total rent to the Landlord's designated financial account.

• 2.4 Voluntary Early Departure (Tenant Personal
Choice):

• If all advertised facilities are fully functional and
present, but the Tenant chooses to vacate the property within the 7-day window
purely due to personal preference, the payment shall be distributed as follows:

• Tenant: Receives a 94% refund of total funds
paid.

• Landlord: Receives 4% of the total payment as
reservation compensation for holding the property off the market.

• SweetCasa: Retains 2% for administrative and
platform transaction fees.

3. Listing Accuracy,
Amenity Misrepresentation & Specific Violation Rules

• 3.1 Duty of Listing Accuracy: The Landlord
guarantees that all facilities, utility connections, structural amenities, and
property features displayed on the SweetCasa app listing are fully functional
and physically present upon key handover.

• Example: If the listing explicitly advertises
running pipe-borne water, grid/backup electricity, secure perimeter fencing, or
specific bathroom fixtures, those exact items must be fully operational when
the Tenant takes possession.

• 3.2 Claim Filing & Proof Requirement: If the
Tenant moves in and discovers that an advertised amenity (such as running water
supply or electricity) is missing, non-functional, or misrepresented, the
Tenant must file a formal claim in the SweetCasa app(Report section) within the
7-Day Verification Window. The claim must be accompanied by tangible digital
evidence (e.g., clear video recordings of dry taps or broken fixtures,
photographic proof with time-stamps, or written corroboration).

• 3.3 Verified Remedy Options: Upon review and
verification of the submitted evidence by SweetCasa, the following legal
remedies apply:

• Option A: Tenant Elects to Remain (Partial Rent
Adjustment - 15% Rule)

• Example: If running water is absent but the
Tenant decides to stay in the property anyway.

• Tenant: Receives a 15% direct cash refund of the
total monthly rent as compensation for the missing amenity.

• Landlord: Receives 80% of the total monthly
rent.

• SweetCasa: Retains its standard 5% platform
commission.

• Option B: Tenant Elects to Vacate (Landlord
Misrepresentation Breach)

• Example: If the Tenant refuses to live in the
home due to the missing water supply and vacates within the 7-day window.

• Tenant: Entitled to a 96% full refund of total
funds paid.

• Landlord: Receives a reduced compensation of 2%
(penalized down from the standard 4%) for false advertising and failure to
deliver advertised property features.

• SweetCasa: Retains 2% to cover dispute
processing and administrative costs.

4. Caution Fee
(Security Deposit) & Disbursement Terms

• 4.1 Payment Collection & Direct Remittance: In
addition to the initial rental fee, the Tenant shall deposit a one-time
refundable Caution Fee (Security Deposit) into the SweetCasa Secure Payment
System prior to taking physical possession of the property. The Caution Fee is
collected simultaneously with the initial rental payment and shall be disbursed
directly to the Landlord alongside the rent payout (in accordance with Section
2.3). SweetCasa does not retain or hold the Caution Fee for the duration of the
tenancy.

• 4.2 Purpose of Caution Fee: The Caution Fee is
held by the Landlord solely as financial security against physical property
damage, broken fixtures (including sinks, water tanks, toilet units, taps, and
electrical fittings), unauthorized structural modifications, or unpaid tenant
utility arrears incurred during the tenancy. The Caution Fee shall not be
treated by the Tenant as advance rent.

• 4.3 Landlord Refund Obligation: Upon the
expiration, agreed termination, or voluntary departure from the tenancy, the
Landlord and Tenant shall conduct a joint physical inspection of the premises.
If the Tenant surrenders the property in its original, tenantable
condition—reasonable wear and tear excepted—with all fixtures intact and no
outstanding utility bills, the Landlord shall refund 100% of the Caution Fee
directly to the Tenant within seven (7) calendar days of move-out.

• 4.4 Itemized Deductions for Damage: If the
Landlord establishes actual physical damage or unfulfilled utility obligations
caused by Tenant misuse or negligence, the Landlord may deduct the reasonable,
actual cost of repairs or utility settlement from the Caution Fee. The Landlord
shall provide the Tenant with an itemized written breakdown of deductions along
with supporting repair receipts or utility bills, and must return any remaining
balance of the Caution Fee within seven (7) calendar days.

• 4.5 Document Priority & Evidentiary Reference: This
Agreement serves as the legal, binding record between the Landlord and Tenant regarding
the payment and receipt of the Caution Fee. In the event of an off-platform
dispute regarding unreturned deposits or unjustified deductions at tenancy end,
either party may submit this executed Agreement and transaction proof as
primary legal evidence before competent local authorities or courts under
Section 8.2.

5. Rights and
Obligations of Contracting Parties

• 5.1 Obligations of the Tenant:

• Pay recurring utility fees (such as electricity, water
bills, and sanitation rates) where specified in the individual listing terms.

• Maintain the interior premises in a clean, tenantable
condition, refraining from intentional structural modifications or physical
damage.

• Comply with local residential rules, avoiding illegal
activities, public nuisances, or unauthorized sub-leasing.

• Submit dispute claims with clear, verifiable evidence
within the mandatory 7-day period.

• 5.2 Obligations of the Landlord:

• Provide quiet, peaceful enjoyment and physical
possession of the property free from unannounced intrusions or unauthorized key
access.

• Ensure 100% accuracy of advertised amenities on the
SweetCasa listing before onboarding the property.

• Perform major structural maintenance and exterior
repairs (such as roof leaks or main plumbing pipes) not caused by tenant
misuse.

6. SweetCasa Platform
Role & Specific Limitations of Liability

Both Landlord and Tenant
explicitly acknowledge and agree that SweetCasa Technologies acts exclusively
as an intermediary technology matchmaker and financial escrow facilitator.
SweetCasa does not own, lease, manage, or inspect real estate directly. To
protect SweetCasa from legal liability:

• 6.1 Maintenance & Physical Repairs Exclusions: SweetCasa
is not responsible for physical property maintenance, plumbing breakdowns,
electrical grid failures, structural defects, or repairs before, during, or
after the tenancy period.

• 6.2 Personal Misconduct & Liability Exclusions: SweetCasa
is not liable for personal disputes between parties, noise complaints, physical
altercations, criminal activity, tenant property damage, stolen personal
belongings, or unpaid utility bills incurred by either party.

• 6.3 Voiding of Protection for Off-Platform
Transactions: Any side agreements, cash payments, deposit top-ups, or lease
modifications made outside the SweetCasa mobile application strictly void all
SweetCasa escrow protections, dispute resolution mechanisms, and liability
guarantees. SweetCasa bears zero legal liability for off-platform financial
losses.

• 6.4 Insurance Notice: SweetCasa does not act as
an insurance carrier. Both Landlord and Tenant are encouraged to secure
independent personal property and home insurance policies.

7. Communication
Consent & Feature Updates

• 7.1 Authorization for Direct Contact: By
accepting this Agreement, both the Landlord and Tenant explicitly grant consent
to be contacted by SweetCasa Technologies via in-app notification, SMS, phone
call, or email.

• 7.2 Permitted Communication Scope: Contact may
occur for:

1.        
Transaction updates, payment receipts, move-in
verification alerts, and dispute resolution proceedings.

2.        
Urgent platform updates, security alerts, and changes
to Terms of Service.

3.        
Tailored recommendations for new SweetCasa platform
features, including post-settlement vendor services (such as verified local
home technicians, plumbers, painters, movers, and living tools) designed to
enhance their housing and living experience.

8. Dispute Resolution
& Governing Jurisdiction

• 8.1 Platform Binding Mediation: Any conflict
arising within the 7-Day Move-In Verification Window concerning property
condition, held payments, or listing accuracy shall be submitted to SweetCasa's
administrative dispute panel. Both parties agree that SweetCasa's decision
regarding the disbursement, refund, or partial deduction of held escrow
funds—based on submitted digital proof—shall be final and binding regarding the
held funds.

• 8.2 Governing Law & Specific Jurisdiction: This
Agreement, its interpretation, and any legal actions arising from or related to
it shall be governed by, construed, and enforced in accordance with the civil,
commercial, and tenancy laws of the Republic of Cameroon. Any formal legal
proceedings outside platform mediation shall fall under the exclusive
territorial jurisdiction of the competent courts of Cameroon (including the
High Court / Court of First Instance of the applicable regional jurisdiction,
such as Bamenda, Mezam Division, Northwest Region, or Yaoundé, Centre Region).

9. Digital Signature
& Binding Execution

This Agreement is executed
digitally and becomes legally binding upon all parties once:

1.        
The Landlord confirms the property reservation and
accepts terms within the SweetCasa app.

2.        
The Tenant completes the payment authorization and
accepts terms within the SweetCasa app.

3.        
SweetCasa Technologies processes and validates the
digital booking authorization.`;

export default function LeaseAgreementScreen() {
  const p = useLocalSearchParams<{listingId:string;title:string;price:string;paymentFrequency:string;cautionFee:string;requiredAmount:string;availableBalance:string}>();
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const s = useMemo(()=>styles(colors),[colors]);
  const isSale = p.paymentFrequency === 'For Sale';
  const [signatureName,setSignatureName]=useState('');
  const [moveInDate,setMoveInDate]=useState('');
  const [accepted,setAccepted]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [listing,setListing]=useState<any>(null);
  const [tenantName,setTenantName]=useState('');
  const [loadingDetails,setLoadingDetails]=useState(true);
  const [agreementUrl,setAgreementUrl]=useState<string|null>(null);
  const [transactionId,setTransactionId]=useState<number|null>(null);
  const scrollRef=useRef<ScrollView>(null);
  const revealSigningFields=()=>setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),220);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoadingDetails(true);
      try {
        const token=await AsyncStorage.getItem('token');
        const [listingRes,userRaw]=await Promise.all([
          fetch(`${BASE_URL}/listings/${Number(p.listingId)}`,{headers:{...(token?{Authorization:`Bearer ${token}`}:{})}}),
          AsyncStorage.getItem('user'),
        ]);
        const listingData=await listingRes.json().catch(()=>({}));
        if(!listingRes.ok) throw new Error(listingData?.error||'Could not load property details.');
        if(cancelled) return;
        setListing(listingData?.listing||null);
        try {
          const u=userRaw?JSON.parse(userRaw):null;
          setTenantName(String(u?.name||u?.fullName||u?.email||''));
        } catch {}
      } catch(e:any){ if(!cancelled) setError(e.message||'Could not load agreement details.'); }
      finally { if(!cancelled) setLoadingDetails(false); }
    })();
    return()=>{cancelled=true};
  },[p.listingId]);

  const available=Number(p.availableBalance||0);
  const required=Number(p.requiredAmount||0);
  const balanceAfter=Math.max(0,available-required);
  const propertyLocation=[listing?.neighborhood,listing?.city,listing?.region].filter(Boolean).join(', ');
  const landlordName=listing?.agent?.name||'SweetCasa verified house owner';

  const submit = async () => {
    setError(null);
    if(!signatureName.trim()) return setError(i18n.language.startsWith('fr')?'Veuillez saisir votre signature électronique.':'Please enter your electronic signature.');
    if(!isSale && !/^\d{4}-\d{2}-\d{2}$/.test(moveInDate)) return setError(i18n.language.startsWith('fr')?'Saisissez la date d’emménagement au format AAAA-MM-JJ.':'Enter the move-in date as YYYY-MM-DD.');
    if(!accepted) return setError(i18n.language.startsWith('fr')?'Vous devez accepter les conditions avant de signer.':'You must accept the terms before signing.');
    setBusy(true);
    try {
      const token=await AsyncStorage.getItem('token');
      const res=await fetch(`${BASE_URL}/wallet/purchase`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({listingId:Number(p.listingId),signatureName:signatureName.trim(),moveInDate:isSale?undefined:moveInDate})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data?.error||'Could not complete purchase.');
      setAgreementUrl(data?.agreement?.url||null);
      setTransactionId(data?.transaction?.id||null);
    } catch(e:any){setError(e.message||t('common.error'));} finally {setBusy(false);}
  };

  return <SafeAreaView style={s.safe}><StatusBar barStyle={isDark?'light-content':'dark-content'} backgroundColor={colors.card}/><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={Platform.OS==='ios'?8:0}>
    <View style={s.header}><TouchableOpacity onPress={()=>router.back()} style={s.icon}><Feather name="arrow-left" size={20} color={colors.text}/></TouchableOpacity><Text style={s.headerTitle}>{isSale?(i18n.language.startsWith('fr')?'Accord d’achat':'Property Agreement'):(i18n.language.startsWith('fr')?'Contrat de bail':'Lease Agreement')}</Text><View style={s.icon}/></View>
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      {agreementUrl ? <View style={s.card}>
        <View style={s.successIcon}><Feather name="check" size={24} color="#fff"/></View>
        <Text style={[s.title,{textAlign:'center'}]}>{i18n.language.startsWith('fr')?'Accord signé avec succès':'Agreement signed successfully'}</Text>
        <Text style={[s.row,{textAlign:'center'}]}>{i18n.language.startsWith('fr')?'Les fonds requis, y compris la caution, ont été déplacés vers le solde bloqué SweetCasa.':'The required funds, including the caution fee, have been moved into your SweetCasa held balance.'}</Text>
        {transactionId&&<Text style={[s.row,{textAlign:'center'}]}>Transaction: E{transactionId}</Text>}
        <TouchableOpacity style={s.button} onPress={()=>Linking.openURL(agreementUrl)}><Text style={s.buttonText}>{i18n.language.startsWith('fr')?'Télécharger l’accord signé':'Download Signed Agreement'}</Text></TouchableOpacity>
        <TouchableOpacity style={s.secondaryButton} onPress={()=>router.replace('/(tabs)/wallet' as any)}><Text style={s.secondaryButtonText}>{i18n.language.startsWith('fr')?'Retour au portefeuille':'Back to Wallet'}</Text></TouchableOpacity>
      </View> : <>
      <View style={s.card}>
        <Text style={s.section}>{i18n.language.startsWith('fr')?'Détails de l’accord':'Agreement Details'}</Text>
        {loadingDetails?<ActivityIndicator color={colors.primary}/>:<>
          <Text style={s.dataLabel}>{i18n.language.startsWith('fr')?'Propriété':'Property'}</Text><Text style={s.dataValue}>{listing?.title||p.title}</Text>
          {!!propertyLocation&&<><Text style={s.dataLabel}>{i18n.language.startsWith('fr')?'Emplacement':'Location'}</Text><Text style={s.dataValue}>{propertyLocation}</Text></>}
          <Text style={s.dataLabel}>{i18n.language.startsWith('fr')?'Propriétaire':'Landlord'}</Text><Text style={s.dataValue}>{landlordName}</Text>
          {!!tenantName&&<><Text style={s.dataLabel}>{i18n.language.startsWith('fr')?'Locataire':'Tenant'}</Text><Text style={s.dataValue}>{tenantName}</Text></>}
          <Text style={s.dataLabel}>{i18n.language.startsWith('fr')?'Type de paiement':'Payment type'}</Text><Text style={s.dataValue}>{p.paymentFrequency}</Text>
        </>}
      </View>
      <View style={s.card}>
        <Text style={s.section}>{i18n.language.startsWith('fr')?'Résumé financier avant signature':'Financial Summary Before Signing'}</Text>
        {!isSale&&<><View style={s.moneyRow}><Text style={s.row}>{i18n.language.startsWith('fr')?'Loyer initial':'Initial rent'}</Text><Text style={s.bold}>{xaf(p.price)}</Text></View><View style={s.moneyRow}><Text style={s.row}>{i18n.language.startsWith('fr')?'Caution':'Caution fee'}</Text><Text style={s.bold}>{xaf(p.cautionFee)}</Text></View></>}
        {isSale&&<View style={s.moneyRow}><Text style={s.row}>{i18n.language.startsWith('fr')?'Engagement minimum (25 %)':'Minimum commitment (25%)'}</Text><Text style={s.bold}>{xaf(required)}</Text></View>}
        <View style={s.divider}/><View style={s.moneyRow}><Text style={s.lockLabel}>{i18n.language.startsWith('fr')?'TOTAL À BLOQUER':'TOTAL TO BE LOCKED'}</Text><Text style={s.lockAmount}>{xaf(required)}</Text></View>
        <View style={s.moneyRow}><Text style={s.row}>{i18n.language.startsWith('fr')?'Solde disponible':'Available escrow balance'}</Text><Text style={s.bold}>{xaf(available)}</Text></View>
        <View style={s.moneyRow}><Text style={s.row}>{i18n.language.startsWith('fr')?'Solde après signature':'Balance after signing'}</Text><Text style={s.bold}>{xaf(balanceAfter)}</Text></View>
        {!isSale&&<Text style={s.notice}>{i18n.language.startsWith('fr')?'Le loyer et la caution seront bloqués ensemble après votre signature. La fenêtre de vérification de 7 jours commence à la date réelle d’emménagement/remise des clés.':'The rent and caution fee will be locked together only after you sign. The 7-day verification window starts on the actual move-in/key-handover date.'}</Text>}
      </View>
      {!isSale ? <>
        <Text style={s.section}>Residential Lease and Platform Facilitation Agreement</Text>
        <Text style={s.body}>{RESIDENTIAL_LEASE_TEXT}</Text>
      </> : <>
        <Text style={s.section}>{i18n.language.startsWith('fr')?'Engagement d’achat':'Property purchase commitment'}</Text>
        <Text style={s.body}>{i18n.language.startsWith('fr')?'Cette étape bloque 25 % du prix de vente. Le contrat de bail résidentiel ne s’applique pas à une vente immobilière.':'This step holds 25% of the listed sale price. The Residential Lease Agreement does not apply to a property sale.'}</Text>
      </>}
      {!isSale&&<><Text style={s.label}>{i18n.language.startsWith('fr')?'Date d’emménagement':'Move-in date'}</Text><TextInput style={s.input} value={moveInDate} onChangeText={setMoveInDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textLight} keyboardType="numbers-and-punctuation" returnKeyType="next" onFocus={revealSigningFields}/></>}
      <Text style={s.label}>{i18n.language.startsWith('fr')?'Signature électronique (nom complet)':'Electronic signature (full name)'}</Text><TextInput style={s.input} value={signatureName} onChangeText={setSignatureName} placeholder={i18n.language.startsWith('fr')?'Saisissez votre nom complet':'Type your full name'} placeholderTextColor={colors.textLight} autoCapitalize="words" returnKeyType="done" onFocus={revealSigningFields}/>
      <TouchableOpacity style={s.accept} onPress={()=>setAccepted(v=>!v)}><View style={[s.check,accepted&&{backgroundColor:colors.primary,borderColor:colors.primary}]}>{accepted&&<Feather name="check" size={14} color="#fff"/>}</View><Text style={s.acceptText}>{i18n.language.startsWith('fr')?'Je confirme avoir lu et accepté cet accord et j’adopte le nom saisi comme ma signature électronique.':'I confirm that I have read and accepted this agreement and adopt the name entered above as my electronic signature.'}</Text></TouchableOpacity>
      {error&&<Text style={s.error}>{error}</Text>}<TouchableOpacity style={[s.button,(!accepted||busy||loadingDetails)&&{opacity:.55}]} disabled={!accepted||busy||loadingDetails} onPress={submit}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.buttonText}>{i18n.language.startsWith('fr')?'Signer et bloquer les fonds':'Sign & Hold Funds'}</Text>}</TouchableOpacity>
      </>}
    </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles=(c:any)=>StyleSheet.create({safe:{flex:1,backgroundColor:c.background},header:{height:56,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,backgroundColor:c.card,borderBottomWidth:1,borderBottomColor:c.borderLight},icon:{width:40,height:40,alignItems:'center',justifyContent:'center'},headerTitle:{fontSize:16,fontWeight:'800',color:c.text},content:{padding:20,paddingBottom:180},card:{backgroundColor:c.card,borderRadius:18,padding:18,borderWidth:1,borderColor:c.borderLight,marginBottom:22},title:{fontSize:18,fontWeight:'800',color:c.text,marginBottom:10},row:{fontSize:13.5,color:c.textSecondary,marginTop:5},bold:{fontWeight:'800',color:c.text},section:{fontSize:15,fontWeight:'800',color:c.text,marginTop:18,marginBottom:8},body:{fontSize:13.5,lineHeight:21,color:c.textSecondary,marginBottom:10},label:{fontSize:13,fontWeight:'700',color:c.text,marginTop:16,marginBottom:7},input:{minHeight:50,borderWidth:1,borderColor:c.border,borderRadius:13,paddingHorizontal:14,color:c.text,backgroundColor:c.card,fontSize:14},accept:{flexDirection:'row',gap:11,alignItems:'flex-start',marginTop:22},check:{width:22,height:22,borderRadius:6,borderWidth:1.5,borderColor:c.border,alignItems:'center',justifyContent:'center',marginTop:1},acceptText:{flex:1,fontSize:13,lineHeight:19,color:c.textSecondary},error:{color:c.danger,fontSize:13,marginTop:14},button:{height:52,borderRadius:14,backgroundColor:c.primary,alignItems:'center',justifyContent:'center',marginTop:20},buttonText:{color:'#fff',fontWeight:'800',fontSize:14},dataLabel:{fontSize:11,fontWeight:'700',color:c.textLight,textTransform:'uppercase',marginTop:10},dataValue:{fontSize:14,fontWeight:'700',color:c.text,marginTop:3},moneyRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginTop:8},divider:{height:1,backgroundColor:c.borderLight,marginVertical:12},lockLabel:{fontSize:12,fontWeight:'900',color:c.primary},lockAmount:{fontSize:17,fontWeight:'900',color:c.primary},notice:{fontSize:12.5,lineHeight:18,color:c.textSecondary,backgroundColor:c.primaryTint,borderRadius:12,padding:12,marginTop:14},successIcon:{width:48,height:48,borderRadius:24,backgroundColor:c.success,alignSelf:'center',alignItems:'center',justifyContent:'center',marginBottom:14},secondaryButton:{height:50,borderRadius:14,borderWidth:1,borderColor:c.border,alignItems:'center',justifyContent:'center',marginTop:10},secondaryButtonText:{color:c.text,fontWeight:'800',fontSize:14}});

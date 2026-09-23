import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type Nearby={name:string;category:string;latitude?:number;longitude?:number;source?:string;selected?:boolean};
@Component({selector:'sc-upload',imports:[FormsModule],templateUrl:'./upload.html',styleUrl:'./upload.css'})
export class Upload{
 readonly propertyTypes=['Room / Studio','Apartment','Bungalow (Maison Basse)','Office','Duplex / Villa','Guest House / Hotel','Penthouse','Mansion / Residence','Commercial Building (Immeuble)','School Dorm'];
 readonly amenitiesList=['Wifi','Electricity','Water Supply','Gated','Parking','Green Area','Generator','School','Bank','Restaurant','Market','Clinic'];
 readonly durations=['1 day to 7 days','7 days to 1 month','1 month to 5 months','6 months to 1 year','2 to 5 years','5 years and above'];
 readonly nearbyCategories=['School','Bank','Restaurant','Market','Clinic','Hospital','Pharmacy','Supermarket','Police'];
 title='';price='';type='Apartment';country='Cameroon';region='';city='';neighborhood='';description='';bedrooms=2;bathrooms=1;toilets=2;parlors=1;kitchens=1;area='';paymentFrequency='Monthly';cautionFee='';rentalDuration='';visitHours='';latitude='';longitude='';amenities:string[]=['Wifi','Electricity'];
 photos:File[]=[];video:File|null=null;floorPlan:File|null=null;legalDocuments:File[]=[];
 autoFacilities:Nearby[]=[];manualFacilities:Nearby[]=[];newFacilityName='';newFacilityCategory='School';
 step=signal(1); busy=signal(false);error=signal('');success=signal('');locating=signal(false);nearbyLoading=signal(false);showManual=signal(false); locationQuery=''; locationResults:any[]=[]; locationSearching=signal(false); locationSearchTimer:any=null; draggingPin=signal(false); pinX=signal(0); pinY=signal(0); dragStartX=0; dragStartY=0;
 constructor(private api:ApiService,private sanitizer:DomSanitizer){}
 get rental(){return this.paymentFrequency!=='For Sale'}
 get mapUrl():SafeResourceUrl|null{const lat=Number(this.latitude),lng=Number(this.longitude);return Number.isFinite(lat)&&Number.isFinite(lng)&&this.latitude&&this.longitude?this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`):null}

 searchLocation(){clearTimeout(this.locationSearchTimer);const q=this.locationQuery.trim();if(q.length<3){this.locationResults=[];return}this.locationSearchTimer=setTimeout(()=>{this.locationSearching.set(true);this.api.get<any>('/listings/places-autocomplete',{input:q}).subscribe({next:r=>{const raw=r?.predictions||r?.suggestions||r?.results||[];this.locationResults=raw.map((x:any)=>({description:x.description||x.text?.text||x.name||x.formatted_address||'',placeId:x.place_id||x.placeId||x.id||x.placePrediction?.placeId})).filter((x:any)=>x.description&&x.placeId);this.locationSearching.set(false)},error:()=>{this.locationResults=[];this.locationSearching.set(false)}})},300)}
 chooseLocationResult(x:any){
  this.locationQuery=x.description;this.locationResults=[];
  this.api.get<any>('/listings/places-details',{placeId:x.placeId}).subscribe({next:r=>{
    const d=r?.result||r?.place||r?.data?.result||r?.data?.place||r?.data||r;
    const loc=d?.geometry?.location||d?.location||{};
    const lat=Number(loc.lat??loc.latitude??d?.latitude),lng=Number(loc.lng??loc.longitude??d?.longitude);
    if(Number.isFinite(lat)&&Number.isFinite(lng)){this.latitude=String(lat);this.longitude=String(lng);this.pinX.set(0);this.pinY.set(0);this.loadNearby()}
    const comps=d?.address_components||d?.addressComponents||d?.address?.address_components||d?.address?.addressComponents||[];
    const get=(types:string[])=>{const c=comps.find((a:any)=>types.some(t=>(a.types||a.type||[]).includes?.(t)));return c?.long_name||c?.longText||c?.short_name||c?.shortText||''};
    let country=get(['country']);
    let region=get(['administrative_area_level_1']);
    let city=get(['locality','postal_town','administrative_area_level_2']);
    let neighborhood=get(['sublocality_level_1','sublocality','neighborhood','administrative_area_level_3']);
    // Some Places backends return only the formatted description. Keep the form useful in that case.
    const address=String(d?.formatted_address||d?.formattedAddress||x.description||'');
    const parts=address.split(',').map((v:string)=>v.trim()).filter(Boolean);
    if(!country && parts.length) country=parts[parts.length-1];
    if(!neighborhood && parts.length>=3) neighborhood=parts[parts.length-2];
    if(!city && parts.length>=3) city=parts[parts.length-3];
    // Cameroon Google results occasionally omit some administrative components. Use the selected address only as a fallback.
    const cityRegion:Record<string,string>={douala:'Littoral',yaounde:'Centre','yaoundé':'Centre',bafoussam:'West',bamenda:'North-West',buea:'South-West',limbe:'South-West',garoua:'North',maroua:'Far North',bertoua:'East',ebolowa:'South'};
    const normalized=address.toLowerCase();
    const matchedCity=Object.keys(cityRegion).find(k=>normalized.includes(k));
    if(matchedCity && (!city || !Object.keys(cityRegion).some(k=>city.toLowerCase().includes(k)))) city=matchedCity==='yaounde'?'Yaoundé':matchedCity.charAt(0).toUpperCase()+matchedCity.slice(1);
    if(!region && matchedCity) region=cityRegion[matchedCity];
    if(!region && city){const k=Object.keys(cityRegion).find(v=>city.toLowerCase().includes(v));if(k)region=cityRegion[k]}
    if(!neighborhood){const known=['Bonabéri','Bonapriso','Akwa','Deido','Bali','Makepe','Bonamoussadi','Bepanda'];neighborhood=known.find(v=>normalized.includes(v.toLowerCase()))||neighborhood}
    this.country=country||this.country;this.region=region||this.region;this.city=city||this.city;this.neighborhood=neighborhood||this.neighborhood;
  },error:()=>this.error.set('Could not load that location. Please try another search result.')})
 }
 startPinDrag(e:PointerEvent){if(!this.latitude||!this.longitude)return;this.draggingPin.set(true);this.dragStartX=e.clientX-this.pinX();this.dragStartY=e.clientY-this.pinY();(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);e.preventDefault()}
 movePin(e:PointerEvent){if(!this.draggingPin())return;this.pinX.set(e.clientX-this.dragStartX);this.pinY.set(e.clientY-this.dragStartY)}
 endPinDrag(e:PointerEvent){if(!this.draggingPin())return;this.draggingPin.set(false);const dx=this.pinX(),dy=this.pinY();const lat=Number(this.latitude),lng=Number(this.longitude);const zoom=17;const scale=256*Math.pow(2,zoom);const worldX=(lng+180)/360*scale;const sin=Math.sin(lat*Math.PI/180);const worldY=(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale;const nx=worldX+dx,ny=worldY+dy;const newLng=nx/scale*360-180;const n= Math.PI-2*Math.PI*ny/scale;const newLat=180/Math.PI*Math.atan(Math.sinh(n));this.latitude=newLat.toFixed(7);this.longitude=newLng.toFixed(7);this.pinX.set(0);this.pinY.set(0);this.loadNearby()}

 toggleAmenity(v:string){this.amenities=this.amenities.includes(v)?this.amenities.filter(x=>x!==v):[...this.amenities,v]}
 pick(e:Event,kind:'photos'|'video'|'floor'|'legal'){const files=Array.from((e.target as HTMLInputElement).files||[]);if(kind==='photos')this.photos=files;if(kind==='video')this.video=files[0]||null;if(kind==='floor')this.floorPlan=files[0]||null;if(kind==='legal')this.legalDocuments=files}
 setFrequency(v:string){this.paymentFrequency=v;if(v==='For Sale'){this.cautionFee='';this.rentalDuration=''}}
 useLocation(){if(!navigator.geolocation){this.error.set('Location is not available in this browser.');return}this.locating.set(true);navigator.geolocation.getCurrentPosition(p=>{this.latitude=String(p.coords.latitude);this.longitude=String(p.coords.longitude);this.locating.set(false);this.loadNearby()},()=>{this.locating.set(false);this.error.set('Could not get your location. Allow location access and try again.')},{enableHighAccuracy:true,timeout:12000})}
 loadNearby(){const lat=Number(this.latitude),lng=Number(this.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng)){this.error.set('Enter valid latitude and longitude first.');return}this.nearbyLoading.set(true);this.api.get<any>('/listings/preview-nearby',{lat,lng}).subscribe({next:r=>{this.autoFacilities=(r.facilities||[]).map((f:any)=>({...f,selected:true,source:'google'}));this.nearbyLoading.set(false)},error:()=>{this.autoFacilities=[];this.nearbyLoading.set(false)}})}
 toggleNearby(i:number){this.autoFacilities=this.autoFacilities.map((f,n)=>n===i?{...f,selected:!f.selected}:f)}
 addManual(){const name=this.newFacilityName.trim();if(!name)return;this.manualFacilities=[...this.manualFacilities,{name,category:this.newFacilityCategory,source:'manual'}];this.newFacilityName='';this.showManual.set(false)}
 removeManual(i:number){this.manualFacilities=this.manualFacilities.filter((_,n)=>n!==i)}
 canContinueStep(){
  if(this.step()===1)return !!(this.title&&this.price&&this.type);
  if(this.step()===2)return !!(this.region&&this.city&&this.latitude&&this.longitude);
  if(this.step()===3)return !!(this.description&&(!this.rental||this.rentalDuration));
  return true;
 }
 nextStep(){this.error.set('');if(!this.canContinueStep()){this.error.set(this.step()===1?'Complete the required basic property information.':this.step()===2?'Search and select the property location, then confirm the required location fields.':'Complete the required property details and rental terms.');return}this.step.update(v=>Math.min(4,v+1));window.scrollTo({top:0,behavior:'smooth'})}
 previousStep(){this.error.set('');this.step.update(v=>Math.max(1,v-1));window.scrollTo({top:0,behavior:'smooth'})}
 goToStep(n:number){if(n<this.step()){this.step.set(n);window.scrollTo({top:0,behavior:'smooth'})}}
 submit(){this.error.set('');this.success.set('');if(!this.title||!this.price||!this.region||!this.city||!this.description){this.error.set('Please complete the required property, location and description fields.');return}if(!this.latitude||!this.longitude){this.error.set("Please set the property's exact location.");return}if(!this.photos.length){this.error.set('Please add at least one property photo.');return}if(!this.video){this.error.set('Please add a video walkthrough of the property.');return}if(!this.legalDocuments.length){this.error.set('Please upload at least one proof-of-ownership document.');return}if(this.rental&&!this.rentalDuration){this.error.set('Please select a rental duration.');return}
 const normalizedPrice=String(this.price??'').replace(/,/g,'').trim();
 const f=new FormData();const fields:any={title:this.title,price:normalizedPrice,type:this.type,status:'Pending',country:this.country,region:this.region,city:this.city,neighborhood:this.neighborhood,description:this.description,bedrooms:this.bedrooms,bathrooms:this.bathrooms,toilets:this.toilets,parlors:this.parlors,kitchens:this.kitchens,areaSqm:this.area,paymentFrequency:this.paymentFrequency,visitHours:this.visitHours,latitude:this.latitude,longitude:this.longitude,facilities:JSON.stringify(this.amenities),nearbyFacilities:JSON.stringify([...this.autoFacilities.filter(x=>x.selected).map(({selected,...x})=>x),...this.manualFacilities])};if(this.rental){fields.cautionFee=this.cautionFee||'0';fields.rentalDurationRange=this.rentalDuration}Object.entries(fields).forEach(([k,v])=>f.append(k,String(v??'')));this.photos.forEach(x=>f.append('photos',x,x.name));f.append('video',this.video,this.video.name);if(this.floorPlan)f.append('floorPlan',this.floorPlan,this.floorPlan.name);this.legalDocuments.forEach(x=>f.append('legalDocuments',x,x.name));this.busy.set(true);this.api.post<any>('/listings',f).subscribe({next:()=>{this.busy.set(false);this.success.set('Your property has been submitted for SweetCasa review.')},error:e=>{this.busy.set(false);this.error.set(e.error?.error||'Could not submit the property.')}})}
}

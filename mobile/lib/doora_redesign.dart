import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';
import 'models/doora_task.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';
import 'provider_profile.dart';
import 'messages.dart';

const bg=Color(0xFFF7F8F5), white=Colors.white, ink=Color(0xFF20251F), muted=Color(0xFF7A8474), line=Color(0xFFE8EDE4), green=Color(0xFFA9B98E), darkGreen=Color(0xFF263B2B), mint=Color(0xFFEDF1E9), soft=Color(0xFFF5F7F2);
const districts=['Muratpaşa','Konyaaltı','Kepez','Aksu','Döşemealtı'];
const categories=['Alışveriş','Teslimat','Ev işleri','Taşıma','Tamir','Diğer'];
IconData catIcon(String c){switch(c){case 'Alışveriş':return PhosphorIconsRegular.shoppingBag;case 'Teslimat':return PhosphorIconsRegular.truck;case 'Ev işleri':return PhosphorIconsRegular.broom;case 'Taşıma':return PhosphorIconsRegular.package;case 'Tamir':return PhosphorIconsRegular.wrench;default:return PhosphorIconsRegular.squaresFour;}}
void main(){WidgetsFlutterBinding.ensureInitialized();SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(statusBarColor:Colors.transparent,statusBarIconBrightness:Brightness.dark,systemNavigationBarColor:white,systemNavigationBarIconBrightness:Brightness.dark));runApp(const DooraApp());}

final GlobalKey<NavigatorState> dooraNavigatorKey=GlobalKey<NavigatorState>();

class DooraApp extends StatefulWidget{const DooraApp({super.key});@override State<DooraApp> createState()=>_DooraAppState();}
class _DooraAppState extends State<DooraApp>{
 Map<String,dynamic>? user;bool loading=true;
 @override void initState(){super.initState();DooraAuth.instance.restore().then((u){if(mounted)setState((){user=u;loading=false;});});}
 Future<void> login()async{final navigator=dooraNavigatorKey.currentState;if(navigator==null)return;final u=await navigator.push<Map<String,dynamic>>(MaterialPageRoute(builder:(_)=>const AuthPage()));if(u!=null&&mounted)setState(()=>user=u);}
 Future<void> logout()async{
  final navContext=dooraNavigatorKey.currentContext;if(navContext==null)return;
  final confirmed=await showDialog<bool>(context:navContext,builder:(dialogContext)=>AlertDialog(
    backgroundColor:white,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(20)),
    title:const Text('Çıkış yapmak istiyor musun?',style:TextStyle(color:ink,fontWeight:FontWeight.w900,fontSize:17)),
    content:const Text('Hesabından güvenli şekilde çıkış yapılacak.',style:TextStyle(color:muted,fontSize:12)),
    actions:[
      TextButton(onPressed:()=>Navigator.pop(dialogContext,false),child:const Text('Vazgeç',style:TextStyle(color:muted))),
      FilledButton(onPressed:()=>Navigator.pop(dialogContext,true),style:FilledButton.styleFrom(backgroundColor:darkGreen),child:const Text('Çıkış yap')),
    ],
  ));
  if(confirmed!=true)return;
  try{await DooraAuth.instance.signOut();}
  catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(DooraApi.instance.errorMessage(e))));}
  finally{if(mounted)setState(()=>user=null);}
}
 @override Widget build(BuildContext c)=>MaterialApp(navigatorKey:dooraNavigatorKey,title:'DOORA',debugShowCheckedModeBanner:false,theme:ThemeData(useMaterial3:true,scaffoldBackgroundColor:bg,colorScheme:ColorScheme.fromSeed(seedColor:green),textTheme:GoogleFonts.plusJakartaSansTextTheme(),appBarTheme:const AppBarTheme(backgroundColor:white,foregroundColor:ink,elevation:0)),home:loading?const Scaffold(body:Center(child:CircularProgressIndicator(color:green))):Shell(user:user,onLogin:login,onLogout:logout,onUser:(u)=>setState(()=>user=u)));
}
class Shell extends StatefulWidget{const Shell({super.key,required this.user,required this.onLogin,required this.onLogout,required this.onUser});final Map<String,dynamic>? user;final VoidCallback onLogin,onLogout;final ValueChanged<Map<String,dynamic>?> onUser;@override State<Shell> createState()=>_ShellState();}
class _ShellState extends State<Shell>{int tab=0,refresh=0;Future<void> create()async{if(widget.user==null){widget.onLogin();return;}if(!mounted)return;Navigator.push(context,MaterialPageRoute(builder:(_)=>CreatePage(onDone:(){setState((){refresh++;tab=1;});})));} @override Widget build(BuildContext c){final pages=[Discover(user:widget.user,onLogin:widget.onLogin,onCreate:create,refresh:refresh),MyTasks(user:widget.user,onLogin:widget.onLogin,onCreate:create,refresh:refresh),Saved(user:widget.user,onLogin:widget.onLogin),Profile(user:widget.user,onLogin:widget.onLogin,onLogout:widget.onLogout)];return Scaffold(extendBody:true,body:IndexedStack(index:tab,children:pages),bottomNavigationBar:SafeArea(top:false,minimum:const EdgeInsets.fromLTRB(14,0,14,8),child:Container(height:69,padding:const EdgeInsets.all(5),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(23),border:Border.all(color:line),boxShadow:[BoxShadow(color:ink.withValues(alpha:.09),blurRadius:25,offset:const Offset(0,7))]),child:Row(children:[nav(PhosphorIconsRegular.compass,'Keşfet',0),nav(PhosphorIconsRegular.briefcase,'İşler',1),Expanded(child:Center(child:InkWell(onTap:create,borderRadius:BorderRadius.circular(16),child:Container(width:48,height:48,decoration:BoxDecoration(color:const Color(0xFFE4EBD9),borderRadius:BorderRadius.circular(16),border:Border.all(color:const Color(0xFFD5DFC9)),boxShadow:[BoxShadow(color:darkGreen.withValues(alpha:.10),blurRadius:14,offset:const Offset(0,5))]),child:const Icon(Icons.add,color:Color(0xFF171B17),size:27))))),nav(PhosphorIconsRegular.heart,'Kaydedilen',2),nav(PhosphorIconsRegular.user,'Hesabım',3)]))));}
 Widget nav(IconData icon,String label,int index)=>Expanded(child:InkWell(onTap:(){HapticFeedback.selectionClick();if(index!=0&&widget.user==null){widget.onLogin();return;}setState(()=>tab=index);},child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[Icon(tab==index?(index==0?PhosphorIconsFill.compass:index==1?PhosphorIconsFill.briefcase:index==2?PhosphorIconsFill.heart:PhosphorIconsFill.user):icon,color:const Color(0xFF171B17).withValues(alpha:tab==index?1:.72),size:22),const SizedBox(height:4),Text(label,style:TextStyle(color:const Color(0xFF171B17).withValues(alpha:tab==index?1:.72),fontSize:9,fontWeight:tab==index?FontWeight.w800:FontWeight.w600))])));
}

class Discover extends StatefulWidget{const Discover({super.key,required this.user,required this.onLogin,required this.onCreate,required this.refresh});final Map<String,dynamic>? user;final VoidCallback onLogin,onCreate;final int refresh;@override State<Discover> createState()=>_DiscoverState();}
class _DiscoverState extends State<Discover>{final search=TextEditingController();List<DooraTask> tasks=[];Set<String> saved={};int unreadCount=0,unreadMessageCount=0;Timer? badgeTimer;String district='Tüm Antalya',category='Tümü',sort='En yeni';double minBudget=0,maxBudget=50000;bool busy=true;String? error;
 @override void initState(){super.initState();load();badgeTimer=Timer.periodic(const Duration(seconds:12),(_)=>refreshBadges());}@override void didUpdateWidget(covariant Discover old){super.didUpdateWidget(old);if(old.refresh!=widget.refresh||old.user!=widget.user)load();}@override void dispose(){badgeTimer?.cancel();search.dispose();super.dispose();}
 Future<void> refreshBadges() async {
  if(widget.user==null)return;
  try {
   final values=await Future.wait([DooraApi.instance.getUnreadNotificationCount(),DooraApi.instance.getUnreadMessageCount()]);
   if(mounted)setState(() { unreadCount=values[0]; unreadMessageCount=values[1]; });
  } catch (_) {}
 }
 Future<void> load()async{setState((){busy=true;error=null;});try{List<Map<String,dynamic>> rows;try{rows=widget.user!=null&&search.text.isEmpty&&category=='Tümü'?await DooraApi.instance.getNearbyTasks():await DooraApi.instance.getTasks(query:search.text,category:category);if(rows.isEmpty)rows=await DooraApi.instance.getTasks(query:search.text,category:category);}catch(_){rows=await DooraApi.instance.getTasks(query:search.text,category:category);}int unread=0,unreadMessages=0;if(widget.user!=null){try{saved=await DooraApi.instance.getSavedTaskIds();}catch(_){saved={};}try{unread=await DooraApi.instance.getUnreadNotificationCount();}catch(_){unread=0;}try{unreadMessages=await DooraApi.instance.getUnreadMessageCount();}catch(_){unreadMessages=0;}}var list=rows.map(DooraTask.fromJson).toList();list=list.where((t)=>t.budget>=minBudget&&t.budget<=maxBudget).toList();if(district!='Tüm Antalya')list=list.where((t)=>t.location.toLowerCase().contains(district.toLowerCase())).toList();if(sort=='En düşük bütçe')list.sort((a,b)=>a.budget.compareTo(b.budget));if(sort=='En yüksek bütçe')list.sort((a,b)=>b.budget.compareTo(a.budget));if(mounted)setState(() { tasks = list; unreadCount = unread; unreadMessageCount = unreadMessages; });}catch(e){if(mounted)setState(()=>error=DooraApi.instance.errorMessage(e));}finally{if(mounted)setState(()=>busy=false);}}
 Future<void> save(DooraTask t)async{if(widget.user==null){widget.onLogin();return;}final old=saved.contains(t.id);setState((){if(old){saved.remove(t.id);}else{saved.add(t.id);}});try{final v=await DooraApi.instance.toggleSavedTask(t.id);if(mounted)setState((){if(v){saved.add(t.id);}else{saved.remove(t.id);}});}catch(e){if(mounted){setState((){if(old){saved.add(t.id);}else{saved.remove(t.id);}});toast(context,DooraApi.instance.errorMessage(e));}}}
 @override Widget build(BuildContext c)=>SafeArea(child:RefreshIndicator(color:green,onRefresh:load,child:ListView(physics:const AlwaysScrollableScrollPhysics(),padding:const EdgeInsets.fromLTRB(18,12,18,112),children:[
 Row(children:[const Text('doora.',style:TextStyle(color:ink,fontSize:25,fontWeight:FontWeight.w900,letterSpacing:-1.5)),const Spacer(),InkWell(onTap:()=>showModalBottomSheet(context:context,backgroundColor:white,showDragHandle:true,builder:(_)=>DistrictSheet(value:district,onSelect:(v){setState(()=>district=v);load();})),child:Container(padding:const EdgeInsets.symmetric(horizontal:11,vertical:9),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(25),border:Border.all(color:line)),child:Row(children:[const Icon(Icons.location_on_outlined,color:darkGreen,size:14),const SizedBox(width:4),Text(district+', Antalya',style:const TextStyle(color:ink,fontSize:10,fontWeight:FontWeight.w700)),const Icon(Icons.keyboard_arrow_down,size:15,color:muted)]))),const SizedBox(width:8),if(widget.user!=null)Stack(clipBehavior:Clip.none,children:[circle(PhosphorIconsRegular.chatCircle,(){Navigator.push(c,MaterialPageRoute(builder:(_)=>MessagesInboxPage(currentUserId:widget.user?['id']?.toString()??''))).then((_)=>refreshBadges());}),if(unreadMessageCount>0)Positioned(right:-3,top:-3,child:Container(width:17,height:17,decoration:const BoxDecoration(color:Color(0xFFE53935),shape:BoxShape.circle,border:Border.fromBorderSide(BorderSide(color:white,width:1.5))),child:Center(child:Text(unreadMessageCount>9?'9+':'$unreadMessageCount',style:const TextStyle(color:white,fontSize:7,fontWeight:FontWeight.w900))))) ]),const SizedBox(width:6),Stack(clipBehavior:Clip.none,children:[circle(PhosphorIconsRegular.bell,(){if(widget.user==null){widget.onLogin();}else{Navigator.push(c,MaterialPageRoute(builder:(_)=>const Notifications()));}}),if(unreadCount>0)Positioned(right:-2,top:-2,child:Container(width:15,height:15,decoration:const BoxDecoration(color:Color(0xFFE53935),shape:BoxShape.circle,border:Border.fromBorderSide(BorderSide(color:white,width:1.5))),child:Center(child:Text(unreadCount>9?'9+':'$unreadCount',style:const TextStyle(color:white,fontSize:7,fontWeight:FontWeight.w900)))))])]),
 const SizedBox(height:18),Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(gradient:const LinearGradient(colors:[Color(0xFFF0F3E9),Color(0xFFDDE7CF),Color(0xFFA9B98E)],begin:Alignment.topLeft,end:Alignment.bottomRight),borderRadius:BorderRadius.circular(21)),child:Row(children:[const Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('İşin mi var?',style:TextStyle(color:ink,fontSize:19,fontWeight:FontWeight.w800,height:1.15)),Text('DOORA var.',style:TextStyle(color:ink,fontSize:19,fontWeight:FontWeight.w900,height:1.15)),SizedBox(height:5),Text('İhtiyacını paylaş, çözüm yakında.',style:TextStyle(color:Color(0xFF315E53),fontSize:9.5))])),FilledButton(onPressed:widget.onCreate,style:FilledButton.styleFrom(backgroundColor:darkGreen,foregroundColor:white,padding:const EdgeInsets.symmetric(horizontal:12,vertical:12),shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12))),child:const Text('İlan Oluştur',style:TextStyle(fontSize:10,fontWeight:FontWeight.w800)))])),
 const SizedBox(height:20),const Text('Kategoriler',style:TextStyle(color:ink,fontSize:16,fontWeight:FontWeight.w800)),const SizedBox(height:10),
 SizedBox(height:80,child:ListView(scrollDirection:Axis.horizontal,children:[categoryTile('Tümü',PhosphorIconsRegular.squaresFour),...categories.map((v)=>categoryTile(v,catIcon(v)))])),
 const SizedBox(height:12),Container(height:47,padding:const EdgeInsets.symmetric(horizontal:12),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(14),border:Border.all(color:line)),child:Row(children:[const Icon(Icons.search,color:muted,size:19),const SizedBox(width:8),Expanded(child:TextField(controller:search,onSubmitted:(_)=>load(),decoration:const InputDecoration(border:InputBorder.none,hintText:'Hangi işi arıyorsun?',hintStyle:TextStyle(fontSize:11,color:muted)))),InkWell(onTap:load,child:const Icon(Icons.arrow_forward,color:green,size:18))])),
 const SizedBox(height:20),Row(children:[const Expanded(child:Text('Yakınındaki işler',style:TextStyle(color:ink,fontSize:16,fontWeight:FontWeight.w800))),IconButton(tooltip:'Bütçe filtresi',onPressed:budgetFilter,icon:Icon(Icons.tune_rounded,color:(minBudget>0||maxBudget<50000)?darkGreen:muted,size:19)),PopupMenuButton<String>(onSelected:(v){setState(()=>sort=v);load();},itemBuilder:(_)=>['En yeni','En düşük bütçe','En yüksek bütçe'].map((v)=>PopupMenuItem(value:v,child:Text(v))).toList(),child:Row(children:[Text(sort,style:const TextStyle(color:muted,fontSize:10,fontWeight:FontWeight.w700)),const Icon(Icons.keyboard_arrow_down,color:muted,size:16)]))]),
 const SizedBox(height:10),if(busy)const Skeletons()else if(error!=null)EmptyState(title:'İlanlar yüklenemedi',message:error!,action:'Tekrar dene',onTap:load)else if(tasks.isEmpty)EmptyState(title:'Henüz ilan yok',message:'Bu bölgede listelenecek bir iş bulamadık. İlk ilanı sen oluşturabilirsin.',action:'İlan oluştur',onTap:widget.onCreate)else ...tasks.map((t)=>Padding(padding:const EdgeInsets.only(bottom:10),child:TaskCard(task:t,saved:saved.contains(t.id),onSave:()=>save(t),onTap:()=>openTask(c,t,widget.user,widget.onLogin,load),onOffer:(){if(widget.user==null){widget.onLogin();}else{showModalBottomSheet(context:c,isScrollControlled:true,backgroundColor:Colors.transparent,builder:(_)=>OfferSheet(task:t,onSent:load));}})))
 ])));
 Future<void> budgetFilter() async {
  var draft = RangeValues(minBudget, maxBudget);
  final result = await showModalBottomSheet<RangeValues>(
    context: context,
    backgroundColor: white,
    showDragHandle: true,
    builder: (sheetContext) {
      return StatefulBuilder(
        builder: (context, setSheet) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Bütçe aralığı', style: TextStyle(color: ink, fontSize: 17, fontWeight: FontWeight.w900)),
                const SizedBox(height: 6),
                Text('${draft.start.round()} ₺ – ${draft.end.round()} ₺', style: const TextStyle(color: darkGreen, fontSize: 13, fontWeight: FontWeight.w800)),
                RangeSlider(
                  values: draft,
                  min: 0,
                  max: 50000,
                  divisions: 100,
                  activeColor: darkGreen,
                  labels: RangeLabels('${draft.start.round()} ₺', '${draft.end.round()} ₺'),
                  onChanged: (value) => setSheet(() => draft = value),
                ),
                Row(children: [
                  TextButton(
                    onPressed: () => setSheet(() => draft = const RangeValues(0, 50000)),
                    child: const Text('Sıfırla'),
                  ),
                  const Spacer(),
                  FilledButton(
                    onPressed: () => Navigator.pop(sheetContext, draft),
                    style: FilledButton.styleFrom(backgroundColor: darkGreen),
                    child: const Text('Uygula'),
                  ),
                ]),
              ],
            ),
          );
        },
      );
    },
  );
  if (result != null && mounted) {
    setState(() => minBudget = result.start);
    setState(() => maxBudget = result.end);
    load();
  }
 }
 Widget categoryTile(String value,IconData icon){final active=category==value;return GestureDetector(onTap:(){setState(()=>category=value);load();},child:SizedBox(width:65,child:Column(children:[AnimatedContainer(duration:const Duration(milliseconds:180),width:52,height:52,decoration:BoxDecoration(color:active?green:const Color(0xFFEAF0EF),borderRadius:BorderRadius.circular(16)),child:Icon(icon,color:active?white:ink,size:22)),const SizedBox(height:6),Text(value,style:TextStyle(color:active?darkGreen:ink,fontSize:9,fontWeight:FontWeight.w700))])));}
}

Widget circle(IconData icon,VoidCallback tap)=>Material(color:white,shape:const CircleBorder(),child:InkWell(onTap:tap,customBorder:const CircleBorder(),child:Container(width:36,height:36,decoration:BoxDecoration(shape:BoxShape.circle,border:Border.all(color:line)),child:Icon(icon,color:ink,size:17))));
class DistrictSheet extends StatelessWidget{const DistrictSheet({super.key,required this.value,required this.onSelect});final String value;final ValueChanged<String> onSelect;@override Widget build(BuildContext c)=>SafeArea(child:Padding(padding:const EdgeInsets.all(20),child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('Bölge seç',style:TextStyle(fontSize:18,fontWeight:FontWeight.w800)),...['Tüm Antalya',...districts].map((d)=>ListTile(title:Text(d),trailing:d==value?const Icon(Icons.check_circle,color:green):null,onTap:(){onSelect(d);Navigator.pop(c);} ))])));}
class _TaskAvatar extends StatelessWidget {
 const _TaskAvatar({required this.name,required this.url,this.radius=13});
 final String name,url; final double radius;
 @override Widget build(BuildContext context) {
  final fallback=CircleAvatar(radius:radius,backgroundColor:mint,child:Text(name.isEmpty?'D':name.characters.first.toUpperCase(),style:TextStyle(color:darkGreen,fontSize:radius*.65,fontWeight:FontWeight.w800)));
  if(url.isEmpty)return fallback;
  if(url.startsWith('data:image/')){
   try{
    final bytes=base64Decode(url.substring(url.indexOf(',')+1));
    return ClipOval(child:SizedBox(width:radius*2,height:radius*2,child:Image.memory(bytes,fit:BoxFit.cover,errorBuilder:(_,__,___)=>fallback)));
   }catch(_){return fallback;}
  }
  return ClipOval(child:SizedBox(width:radius*2,height:radius*2,child:Image.network(DooraApi.instance.absoluteUrl(url),fit:BoxFit.cover,errorBuilder:(_,__,___)=>fallback,loadingBuilder:(c,w,p)=>p==null?w:fallback)));
 }
}

class TaskCard extends StatelessWidget {
 const TaskCard({super.key,required this.task,required this.onTap,this.saved=false,this.onSave,this.onOffer});
 final DooraTask task; final VoidCallback onTap; final bool saved; final VoidCallback? onSave,onOffer;
 @override Widget build(BuildContext context)=>Material(
  color:white,borderRadius:BorderRadius.circular(18),
  child:InkWell(onTap:onTap,borderRadius:BorderRadius.circular(18),child:Container(
   padding:const EdgeInsets.all(15),
   decoration:BoxDecoration(borderRadius:BorderRadius.circular(18),border:Border.all(color:line),boxShadow:[BoxShadow(color:ink.withValues(alpha:.035),blurRadius:14,offset:const Offset(0,4))]),
   child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    Row(children:[
     Container(padding:const EdgeInsets.symmetric(horizontal:9,vertical:5),decoration:BoxDecoration(color:mint,borderRadius:BorderRadius.circular(20)),child:Text(task.category,style:const TextStyle(color:darkGreen,fontSize:9,fontWeight:FontWeight.w800))),
     const Spacer(),
     if(onSave!=null)InkWell(onTap:onSave,borderRadius:BorderRadius.circular(20),child:Padding(padding:const EdgeInsets.all(3),child:Icon(saved?PhosphorIconsFill.heart:PhosphorIconsRegular.heart,color:saved?const Color(0xFFE36B75):muted,size:19)))
    ]),
    const SizedBox(height:10),
    Text(task.title,maxLines:2,overflow:TextOverflow.ellipsis,style:const TextStyle(color:ink,fontSize:15,fontWeight:FontWeight.w900,height:1.25)),
    if(task.description.isNotEmpty)Padding(padding:const EdgeInsets.only(top:5),child:Text(task.description,maxLines:2,overflow:TextOverflow.ellipsis,style:const TextStyle(color:muted,fontSize:10,height:1.45))),
    const SizedBox(height:10),
    Row(children:[const Icon(Icons.location_on_outlined,color:muted,size:13),const SizedBox(width:3),Expanded(child:Text(task.location.isEmpty?'Antalya':task.location,maxLines:1,overflow:TextOverflow.ellipsis,style:const TextStyle(color:muted,fontSize:9))),const Icon(Icons.schedule_outlined,color:muted,size:13),const SizedBox(width:4),Text(task.time,style:const TextStyle(color:muted,fontSize:9))]),
    const Padding(padding:EdgeInsets.symmetric(vertical:11),child:Divider(height:1,color:line)),
    Row(children:[
     _TaskAvatar(name:task.owner,url:task.ownerAvatar,radius:16),const SizedBox(width:8),
     Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      Text(task.owner,maxLines:1,overflow:TextOverflow.ellipsis,style:const TextStyle(color:ink,fontSize:10,fontWeight:FontWeight.w800)),
      Text('${task.offers} teklif · DOORA üyesi',style:const TextStyle(color:muted,fontSize:8))
     ])),
     Column(crossAxisAlignment:CrossAxisAlignment.end,children:[
      const Text('İLAN BÜTÇESİ',style:TextStyle(color:muted,fontSize:7,fontWeight:FontWeight.w800,letterSpacing:.5)),
      Text(task.formattedBudget,style:const TextStyle(color:darkGreen,fontSize:16,fontWeight:FontWeight.w900))
     ])
    ]),
    const SizedBox(height:10),
    SizedBox(width:double.infinity,height:39,child:FilledButton(onPressed:onOffer??onTap,style:FilledButton.styleFrom(backgroundColor:onOffer==null?soft:darkGreen,foregroundColor:onOffer==null?darkGreen:white,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(11))),child:Text(onOffer==null?'İlanı incele':'Ben yaparım',style:const TextStyle(fontSize:10,fontWeight:FontWeight.w800))))
   ])
  ))
 );
}

void openTask(BuildContext c,DooraTask t,Map<String,dynamic>? user,VoidCallback login,VoidCallback? changed){Navigator.push(c,MaterialPageRoute(builder:(_)=>TaskDetail(task:t,user:user,onLogin:login,onChanged:changed)));}
class TaskDetail extends StatelessWidget {
 const TaskDetail({super.key,required this.task,required this.user,required this.onLogin,this.onChanged});
 final DooraTask task; final Map<String,dynamic>? user; final VoidCallback onLogin; final VoidCallback? onChanged;
 @override Widget build(BuildContext c) {
  final own=user?['id']?.toString()==task.ownerId && task.ownerId.isNotEmpty;
  return Scaffold(
   backgroundColor:white,
   body:CustomScrollView(slivers:[
    SliverToBoxAdapter(child:SizedBox(height:270,child:Stack(fit:StackFit.expand,children:[
     const MapPanel(),
     Positioned(left:17,top:MediaQuery.of(c).padding.top+8,child:circle(Icons.arrow_back,()=>Navigator.pop(c))),
     Positioned(right:17,top:MediaQuery.of(c).padding.top+8,child:circle(Icons.share_outlined,()=>toast(c,'Paylaşım yakında.'))),
     const Align(alignment:Alignment.bottomCenter,child:SizedBox(height:24,child:ColoredBox(color:white))),
    ]))),
    SliverPadding(padding:const EdgeInsets.fromLTRB(20,16,20,120),sliver:SliverList(delegate:SliverChildListDelegate([
     Row(children:[const Text('Teklif bekliyor',style:TextStyle(color:Color(0xFF8C5B17),fontSize:10,fontWeight:FontWeight.w700)),const Spacer(),Text(task.formattedBudget,style:const TextStyle(color:ink,fontSize:20,fontWeight:FontWeight.w900))]),
     const SizedBox(height:10),Text(task.title,style:const TextStyle(color:ink,fontSize:24,fontWeight:FontWeight.w900)),
     const SizedBox(height:12),Text(task.location.isEmpty?'Antalya':task.location,style:const TextStyle(color:muted,fontSize:11)),
     const Divider(height:28,color:line),const Text('İşin detayları',style:TextStyle(color:ink,fontSize:14,fontWeight:FontWeight.w800)),
     const SizedBox(height:8),Text(task.description.isEmpty?'İlan sahibi henüz açıklama eklememiş.':task.description,style:const TextStyle(color:muted,fontSize:12,height:1.6)),
     const SizedBox(height:18),ListTile(tileColor:soft,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(15)),leading:_TaskAvatar(name:task.owner,url:task.ownerAvatar,radius:21),title:Text(task.owner,style:const TextStyle(color:ink,fontSize:12,fontWeight:FontWeight.w800)),subtitle:const Text('Hizmet veren profilini görüntüle',style:TextStyle(color:muted,fontSize:9)),trailing:Row(mainAxisSize:MainAxisSize.min,children:[Text(task.offers.toString()+' teklif',style:const TextStyle(color:darkGreen,fontSize:10,fontWeight:FontWeight.w800)),const SizedBox(width:5),const Icon(Icons.chevron_right,color:muted,size:17)]),onTap:task.ownerId.isEmpty?null:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>ProviderProfilePage(userId:task.ownerId,fallbackName:task.owner,currentUserId:user?['id']?.toString())))),
     if(user!=null&&!own&&task.ownerId.isNotEmpty)Padding(padding:const EdgeInsets.only(top:10),child:OutlinedButton.icon(onPressed:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>ConversationPage(currentUserId:user?['id']?.toString()??'',peerId:task.ownerId,peerName:task.owner,taskId:task.id,taskTitle:task.title))),icon:const Icon(PhosphorIconsRegular.chatCircle),label:const Text('İlan sahibiyle mesajlaş'),style:OutlinedButton.styleFrom(foregroundColor:darkGreen,side:const BorderSide(color:line),padding:const EdgeInsets.symmetric(vertical:13),shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(14))))),
    ]))),
   ]),
   bottomNavigationBar:SafeArea(top:false,child:Container(padding:const EdgeInsets.all(14),decoration:const BoxDecoration(color:white,border:Border(top:BorderSide(color:line))),child:Row(children:[
    Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('İlan bütçesi',style:TextStyle(color:muted,fontSize:9)),Text(task.formattedBudget,style:const TextStyle(color:ink,fontSize:16,fontWeight:FontWeight.w900))]),
    const SizedBox(width:15),Expanded(child:FilledButton(onPressed:own?null:(){if(user==null){onLogin();return;}showModalBottomSheet(context:c,isScrollControlled:true,backgroundColor:Colors.transparent,builder:(_)=>OfferSheet(task:task,onSent:onChanged));},style:FilledButton.styleFrom(backgroundColor:green,foregroundColor:white),child:Text(own?'Kendi ilanına teklif veremezsin':'Ben yaparım'))),
   ]))),
  );
 }
}

class MapPanel extends StatelessWidget{const MapPanel({super.key});@override Widget build(BuildContext c)=>Stack(fit:StackFit.expand,children:[CustomPaint(painter:MapPainter()),const Positioned(left:0,right:0,top:110,child:Center(child:Text('Antalya',style:TextStyle(color:Color(0xFF637A75),fontSize:17,fontWeight:FontWeight.w700)))),Center(child:Container(width:42,height:42,decoration:BoxDecoration(color:green,borderRadius:BorderRadius.circular(15),boxShadow:[BoxShadow(color:green.withValues(alpha:.25),blurRadius:16)]),child:const Icon(Icons.check,color:white,size:23)))]);}
class MapPainter extends CustomPainter {
 @override void paint(Canvas canvas,Size s) {
  canvas.drawRect(Offset.zero & s,Paint()..color=const Color(0xFFE8EFEB));
  final sea=Path()..moveTo(0,s.height*.58)..cubicTo(s.width*.3,s.height*.4,s.width*.4,s.height*.75,s.width*.6,s.height*.6)..cubicTo(s.width*.8,s.height*.5,s.width*.9,s.height*.7,s.width,s.height*.58)..lineTo(s.width,s.height)..lineTo(0,s.height)..close();
  canvas.drawPath(sea,Paint()..color=const Color(0xFFD8EAE8));
  for(int i=0;i<7;i++){
   final p=Path()..moveTo(-20,20+i*39)..cubicTo(s.width*.3,i*35,s.width*.6,45+i*33,s.width+20,15+i*38);
   canvas.drawPath(p,Paint()..color=white..strokeWidth=7..style=PaintingStyle.stroke);
   canvas.drawPath(p,Paint()..color=const Color(0xFFD0DCD7)..strokeWidth=1.5..style=PaintingStyle.stroke);
  }
 }
 @override bool shouldRepaint(covariant CustomPainter old)=>false;
}

class OfferSheet extends StatefulWidget{const OfferSheet({super.key,required this.task,this.onSent});final DooraTask task;final VoidCallback? onSent;@override State<OfferSheet> createState()=>_OfferSheetState();}
class _OfferSheetState extends State<OfferSheet>{late final amount=TextEditingController(text:widget.task.budget.toStringAsFixed(0));final message=TextEditingController();bool busy=false;String? error;@override void dispose(){amount.dispose();message.dispose();super.dispose();}Future<void> send()async{final n=num.tryParse(amount.text.replaceAll('.','').replaceAll(',','.'));if(n==null||n<=0){setState(()=>error='Geçerli bir tutar gir.');return;}setState(()=>busy=true);try{await DooraApi.instance.createOffer(taskId:widget.task.id,amount:n,message:message.text);widget.onSent?.call();if(mounted){Navigator.pop(context);toast(context,'Teklifin iletildi.');}}catch(e){if(mounted)setState(()=>error=DooraApi.instance.errorMessage(e));}finally{if(mounted)setState(()=>busy=false);}}
 @override Widget build(BuildContext c)=>Padding(padding:EdgeInsets.only(bottom:MediaQuery.of(c).viewInsets.bottom),child:Container(padding:const EdgeInsets.fromLTRB(18,10,18,20),decoration:const BoxDecoration(color:white,borderRadius:BorderRadius.vertical(top:Radius.circular(25))),child:SafeArea(top:false,child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[Center(child:Container(width:36,height:4,decoration:BoxDecoration(color:line,borderRadius:BorderRadius.circular(4)))),Row(children:[const Expanded(child:Text('Teklif ver',style:TextStyle(color:ink,fontSize:17,fontWeight:FontWeight.w900))),IconButton(onPressed:()=>Navigator.pop(c),icon:const Icon(Icons.close,color:muted))]),TextField(controller:amount,keyboardType:TextInputType.number,decoration:const InputDecoration(hintText:'Teklif tutarı',suffixText:'₺')),const SizedBox(height:9),Wrap(spacing:7,children:[for(final f in [.9,1.0,1.1])ActionChip(label:Text((widget.task.budget*f).round().toString()+' ₺'),onPressed:()=>setState(()=>amount.text=(widget.task.budget*f).round().toString()),backgroundColor:soft,side:const BorderSide(color:line))]),const SizedBox(height:9),TextField(controller:message,maxLines:2,decoration:const InputDecoration(hintText:'Kısa mesaj (isteğe bağlı)')),if(error!=null)Text(error!,style:const TextStyle(color:Colors.red,fontSize:10)),const SizedBox(height:12),SizedBox(width:double.infinity,child:FilledButton(onPressed:busy?null:send,style:FilledButton.styleFrom(backgroundColor:green,foregroundColor:white,padding:const EdgeInsets.symmetric(vertical:14)),child:Text(busy?'Gönderiliyor…':'Teklif Gönder')))]))));}

class CreatePage extends StatefulWidget{const CreatePage({super.key,required this.onDone});final VoidCallback onDone;@override State<CreatePage> createState()=>_CreatePageState();}
class _CreatePageState extends State<CreatePage>{final title=TextEditingController(),desc=TextEditingController(),budget=TextEditingController(text:'450');String category='Alışveriş',district='Muratpaşa';double slider=450;bool busy=false;String? error;@override void dispose(){title.dispose();desc.dispose();budget.dispose();super.dispose();}Future<void> submit()async{final n=num.tryParse(budget.text.replaceAll('.','').replaceAll(',','.'));if(title.text.trim().length<5||desc.text.trim().length<10||n==null||n<=0){setState(()=>error='Başlık, açıklama ve bütçeyi kontrol et.');return;}setState(()=>busy=true);try{await DooraApi.instance.createTask(title:title.text,description:desc.text,category:category,budget:n,district:district);widget.onDone();if(mounted){Navigator.pop(context);toast(context,'İlanın yayınlandı.');}}catch(e){if(mounted)setState(()=>error=DooraApi.instance.errorMessage(e));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext c)=>Scaffold(
   backgroundColor:bg,
   appBar:AppBar(backgroundColor:bg,scrolledUnderElevation:0,title:const Text('İlan oluştur',style:TextStyle(fontSize:16,fontWeight:FontWeight.w900,color:ink)),leading:IconButton(onPressed:()=>Navigator.pop(c),icon:const Icon(Icons.arrow_back_ios_new,size:17,color:ink))),
   bottomNavigationBar:SafeArea(top:false,child:Padding(padding:const EdgeInsets.fromLTRB(18,8,18,14),child:SizedBox(height:52,child:FilledButton(onPressed:busy?null:submit,style:FilledButton.styleFrom(backgroundColor:darkGreen,foregroundColor:white,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(16)),elevation:0),child:Row(mainAxisAlignment:MainAxisAlignment.center,children:[Icon(busy?Icons.hourglass_top_rounded:Icons.arrow_upward_rounded,size:18),const SizedBox(width:9),Text(busy?'Yayınlanıyor…':'İlanı yayınla',style:const TextStyle(fontSize:13,fontWeight:FontWeight.w800))]))))),
   body:SafeArea(child:ListView(padding:const EdgeInsets.fromLTRB(18,8,18,22),children:[
    Container(padding:const EdgeInsets.all(18),decoration:BoxDecoration(gradient:const LinearGradient(colors:[Color(0xFFEAF0E2),Color(0xFFF7F8F5)],begin:Alignment.topLeft,end:Alignment.bottomRight),borderRadius:BorderRadius.circular(22),border:Border.all(color:line)),child:Row(children:[Container(width:46,height:46,decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(15)),child:const Icon(Icons.auto_awesome_outlined,color:darkGreen,size:23)),const SizedBox(width:13),const Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('İhtiyacını paylaş.',style:TextStyle(color:ink,fontSize:20,fontWeight:FontWeight.w900,letterSpacing:-.5)),SizedBox(height:4),Text('Yakınındaki kişilerden teklif al, işini kolayca çözüme kavuştur.',style:TextStyle(color:muted,fontSize:10,height:1.45))]))])),
    const SizedBox(height:20),
    Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(20),border:Border.all(color:line)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
     const FormLabel('Hangi konuda yardıma ihtiyacın var?'),const SizedBox(height:12),
     GridView.count(shrinkWrap:true,physics:const NeverScrollableScrollPhysics(),crossAxisCount:3,mainAxisSpacing:9,crossAxisSpacing:9,childAspectRatio:1.45,children:categories.map((v){final active=category==v;return GestureDetector(onTap:()=>setState(()=>category=v),child:AnimatedContainer(duration:const Duration(milliseconds:160),decoration:BoxDecoration(color:active?const Color(0xFFE8EFDF):const Color(0xFFF8F9F6),borderRadius:BorderRadius.circular(13),border:Border.all(color:active?green:line,width:active?1.4:1)),child:Row(mainAxisAlignment:MainAxisAlignment.center,children:[Icon(catIcon(v),color:active?darkGreen:muted,size:18),const SizedBox(width:6),Flexible(child:Text(v,maxLines:1,overflow:TextOverflow.ellipsis,style:TextStyle(color:active?darkGreen:ink,fontSize:9,fontWeight:FontWeight.w800)))])));}).toList())
    ])),
    const SizedBox(height:12),
    Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(20),border:Border.all(color:line)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
     const FormLabel('İlan bilgileri'),const SizedBox(height:12),
     const FormLabel('İlan başlığı'),const SizedBox(height:6),TextField(controller:title,onChanged:(_)=>setState((){}),textCapitalization:TextCapitalization.sentences,decoration:const InputDecoration(hintText:'Örn. Market alışverişi yapılacak',prefixIcon:Icon(Icons.edit_outlined,size:18))),
     const SizedBox(height:14),const FormLabel('İşin detayları'),const SizedBox(height:6),TextField(controller:desc,minLines:4,maxLines:6,textCapitalization:TextCapitalization.sentences,decoration:const InputDecoration(hintText:'Ne yapılmasını istediğini, varsa önemli detayları anlat…',alignLabelWithHint:true)),
    ])),
    const SizedBox(height:12),
    Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(20),border:Border.all(color:line)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
     const FormLabel('Bütçe ve konum'),const SizedBox(height:12),
     Row(children:[const Expanded(child:Text('Ayırdığın bütçe',style:TextStyle(color:ink,fontSize:11,fontWeight:FontWeight.w800))),Text(budget.text+' ₺',style:const TextStyle(color:darkGreen,fontSize:18,fontWeight:FontWeight.w900))]),
     Slider(value:slider.clamp(50,10000).toDouble(),min:50,max:10000,divisions:199,activeColor:darkGreen,inactiveColor:line,onChanged:(v)=>setState((){slider=v;budget.text=v.round().toString();})),
     TextField(controller:budget,keyboardType:TextInputType.number,onChanged:(v){final n=double.tryParse(v);if(n!=null)setState(()=>slider=n.clamp(50,10000).toDouble());},decoration:const InputDecoration(prefixIcon:Icon(Icons.payments_outlined,size:18),suffixText:'₺',hintText:'Bütçe gir')),
     const SizedBox(height:14),const FormLabel('İşin yapılacağı ilçe'),const SizedBox(height:6),DropdownButtonFormField<String>(value:district,decoration:const InputDecoration(prefixIcon:Icon(Icons.location_on_outlined,size:18)),items:districts.map((d)=>DropdownMenuItem(value:d,child:Text(d))).toList(),onChanged:(v)=>setState(()=>district=v??district)),
    ])),
    const SizedBox(height:12),
    Container(padding:const EdgeInsets.all(15),decoration:BoxDecoration(color:const Color(0xFFEAF0E2),borderRadius:BorderRadius.circular(17)),child:Row(children:[const Icon(Icons.lightbulb_outline_rounded,color:darkGreen,size:20),const SizedBox(width:10),const Expanded(child:Text('Açık ve anlaşılır bir açıklama, doğru teklifleri daha hızlı almanı sağlar.',style:TextStyle(color:darkGreen,fontSize:10,height:1.45,fontWeight:FontWeight.w600)))])),
    if(error!=null)Padding(padding:const EdgeInsets.only(top:12),child:Text(error!,style:const TextStyle(color:Colors.red,fontSize:11,fontWeight:FontWeight.w600))),
   ]))
  );
 }
class FormLabel extends StatelessWidget{const FormLabel(this.text,{super.key});final String text;@override Widget build(BuildContext c)=>Text(text,style:const TextStyle(color:ink,fontSize:11,fontWeight:FontWeight.w800));}

class MyTasks extends StatefulWidget {
 const MyTasks({super.key,required this.user,required this.onLogin,required this.onCreate,required this.refresh});
 final Map<String,dynamic>? user; final VoidCallback onLogin,onCreate; final int refresh;
 @override State<MyTasks> createState()=>_MyTasksState();
}
class _MyTasksState extends State<MyTasks> {
 List<DooraTask> tasks=[]; List<Map<String,dynamic>> offers=[]; bool busy=false; String? error,offersError; int segment=0;
 @override void initState(){super.initState();load();}
 @override void didUpdateWidget(covariant MyTasks old){super.didUpdateWidget(old);if(old.refresh!=widget.refresh||old.user!=widget.user)load();}
 Future<void> load() async {
  if(widget.user==null){if(mounted)setState(() { tasks=[]; offers=[]; busy=false; });return;}
  setState(()=>busy=true);error=null;offersError=null;
  final id=widget.user?['id']?.toString()??'';
  try {
   final sent=await DooraApi.instance.getMyOffers();
   if(mounted)setState(()=>offers=sent);
  } catch(e) {
   if(mounted)setState(()=>offersError=DooraApi.instance.errorMessage(e));
  }
  try {
   final rows=await DooraApi.instance.getMyTasks();
   if(mounted)setState(()=>tasks=rows.map(DooraTask.fromJson).where((t)=>t.ownerId==id).toList());
  } catch(e) {
   if(mounted)setState(()=>error=DooraApi.instance.errorMessage(e));
  }
  if(mounted)setState(()=>busy=false);
 }
 Widget offerSection(){
  if(offersError!=null)return EmptyState(title:'Tekliflerin yüklenemedi',message:offersError!,action:'Tekrar dene',onTap:load);
  if(offers.isEmpty)return const EmptyState(title:'Henüz teklif vermedin',message:'İlgini çeken bir ilanda “Ben yaparım” diyerek teklifini iletebilirsin.');
  return Column(children:offers.map((o)=>offerHistoryCard(o)).toList());
 }
 void openReview(String taskId){
  showModalBottomSheet(context:context,isScrollControlled:true,backgroundColor:Colors.transparent,builder:(_)=>ReviewComposer(taskId:taskId,onDone:load));
 }
 Widget myTaskCard(DooraTask task)=>Column(children:[
  TaskCard(task:task,onTap:()=>openTask(context,task,widget.user,widget.onLogin,load)),
  if(task.status=='completed')Padding(padding:const EdgeInsets.only(top:6,bottom:5),child:Align(alignment:Alignment.centerRight,child:TextButton.icon(onPressed:()=>openReview(task.id),icon:const Icon(Icons.star_outline_rounded,size:16),label:const Text('İşi değerlendir'),style:TextButton.styleFrom(foregroundColor:darkGreen)))),
 ]);

 Widget offerHistoryCard(Map<String,dynamic> offer){
  final status=offer['status']?.toString()??'pending';
  final label=status=='accepted'?'Kabul edildi':status=='rejected'?'Reddedildi':status=='withdrawn'?'Geri çekildi':'Yanıt bekliyor';
  final color=status=='accepted'?darkGreen:status=='rejected'?const Color(0xFFB45A55):const Color(0xFF9B742D);
  final amount=num.tryParse(offer['amount']?.toString()??'0')??0;
  final formatted=amount.toStringAsFixed(0).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'),(m)=>'.');
  return Container(margin:const EdgeInsets.only(bottom:9),padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(17),border:Border.all(color:line)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
   Row(children:[Expanded(child:Text(offer['task_title']?.toString()??'İlan',maxLines:2,overflow:TextOverflow.ellipsis,style:const TextStyle(color:ink,fontSize:12,fontWeight:FontWeight.w900))),Container(padding:const EdgeInsets.symmetric(horizontal:8,vertical:5),decoration:BoxDecoration(color:color.withValues(alpha:.09),borderRadius:BorderRadius.circular(20)),child:Text(label,style:TextStyle(color:color,fontSize:8,fontWeight:FontWeight.w800)))]),
   const SizedBox(height:8),Row(children:[const Icon(Icons.person_outline,color:muted,size:14),const SizedBox(width:4),Expanded(child:Text(offer['owner_name']?.toString()??'İlan sahibi',style:const TextStyle(color:muted,fontSize:9))),Text('$formatted ₺',style:const TextStyle(color:darkGreen,fontSize:14,fontWeight:FontWeight.w900))]),
   if((offer['message']?.toString()??'').isNotEmpty)Padding(padding:const EdgeInsets.only(top:8),child:Text(offer['message'].toString(),style:const TextStyle(color:muted,fontSize:9,height:1.4))),
   if(offer['task_status']=='completed'&&status=='accepted')Align(alignment:Alignment.centerRight,child:TextButton.icon(onPressed:()=>openReview(offer['task_id']?.toString()??''),icon:const Icon(Icons.star_outline_rounded,size:15),label:const Text('İşi değerlendir'),style:TextButton.styleFrom(foregroundColor:darkGreen))),
  ]));
 }
 @override Widget build(BuildContext c)=>SafeArea(child:RefreshIndicator(color:green,onRefresh:load,child:ListView(padding:const EdgeInsets.fromLTRB(18,18,18,112),children:[
  Row(children:[
   const Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    Text('İşlerim',style:TextStyle(color:ink,fontSize:25,fontWeight:FontWeight.w900,letterSpacing:-.8)),
    SizedBox(height:4),Text('İlanlarını ve tekliflerini tek yerden yönet.',style:TextStyle(color:muted,fontSize:10)),
   ])),
   IconButton(onPressed:busy?null:load,icon:const Icon(Icons.refresh_rounded,color:darkGreen)),
  ]),
  const SizedBox(height:14),
  Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(
   gradient:const LinearGradient(colors:[Color(0xFF263B2B),Color(0xFF405B43)],begin:Alignment.topLeft,end:Alignment.bottomRight),
   borderRadius:BorderRadius.circular(20)),
   child:Row(children:[
    Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
     const Text('DOORA iş panelin',style:TextStyle(color:Colors.white70,fontSize:9,fontWeight:FontWeight.w700)),
     const SizedBox(height:5),
     Text(widget.user==null?'İşlerini takip etmeye başla':'Her şey kontrol altında.',style:const TextStyle(color:white,fontSize:16,fontWeight:FontWeight.w900)),
     const SizedBox(height:4),
     const Text('İlanlarını ve teklif süreçlerini kolayca takip et.',style:TextStyle(color:Colors.white70,fontSize:9)),
    ])),
    Container(width:58,height:58,decoration:BoxDecoration(color:white.withValues(alpha:.13),borderRadius:BorderRadius.circular(17)),
     child:const Icon(PhosphorIconsRegular.briefcase,color:white,size:27)),
   ]),
  ),
  const SizedBox(height:15),
  Row(children:[
   Expanded(child:_taskMetric('Paylaştığın ilan',tasks.length.toString(),PhosphorIconsRegular.briefcase)),
   const SizedBox(width:8),
   Expanded(child:_taskMetric('Verdiğin teklif',offers.length.toString(),PhosphorIconsRegular.chatCircle)),
  ]),
  const SizedBox(height:17),
  Container(padding:const EdgeInsets.all(4),decoration:BoxDecoration(color:const Color(0xFFECEFE7),borderRadius:BorderRadius.circular(14)),child:Row(children:[
   Expanded(child:GestureDetector(onTap:()=>setState(()=>segment=0),child:AnimatedContainer(duration:const Duration(milliseconds:160),padding:const EdgeInsets.symmetric(vertical:12),decoration:BoxDecoration(color:segment==0?white:Colors.transparent,borderRadius:BorderRadius.circular(11),boxShadow:segment==0?[BoxShadow(color:ink.withValues(alpha:.05),blurRadius:8,offset:const Offset(0,2))]:[]),child:Text('Paylaştıklarım  ${tasks.length}',textAlign:TextAlign.center,style:TextStyle(color:segment==0?darkGreen:muted,fontSize:9,fontWeight:FontWeight.w900))))),
   Expanded(child:GestureDetector(onTap:()=>setState(()=>segment=1),child:AnimatedContainer(duration:const Duration(milliseconds:160),padding:const EdgeInsets.symmetric(vertical:12),decoration:BoxDecoration(color:segment==1?white:Colors.transparent,borderRadius:BorderRadius.circular(11),boxShadow:segment==1?[BoxShadow(color:ink.withValues(alpha:.05),blurRadius:8,offset:const Offset(0,2))]:[]),child:Text('Teklif verdiklerim  ${offers.length}',textAlign:TextAlign.center,style:TextStyle(color:segment==1?darkGreen:muted,fontSize:9,fontWeight:FontWeight.w900))))),
  ])),
  const SizedBox(height:14),
  if(widget.user==null)EmptyState(title:'Hesabına giriş yap',message:'İşlerini ve tekliflerini takip etmek için giriş yap.',action:'Giriş yap',onTap:widget.onLogin)
  else if(busy)const Skeletons()
  else if(segment==1)offerSection()
  else if(error!=null)EmptyState(title:'İşlerin yüklenemedi',message:error!,action:'Tekrar dene',onTap:load)
  else if(tasks.isEmpty)EmptyState(title:'Henüz ilan paylaşmadın',message:'İlk ilanını oluştur, yakınındaki kişilerden teklif almaya başla.',action:'İlan oluştur',onTap:widget.onCreate)
  else ...tasks.map((t)=>Padding(padding:const EdgeInsets.only(bottom:10),child:myTaskCard(t))),
 ])));
}

Widget _taskMetric(String label,String value,IconData icon)=>Container(
 padding:const EdgeInsets.all(12),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(15),border:Border.all(color:line)),
 child:Row(children:[Container(width:34,height:34,decoration:BoxDecoration(color:mint,borderRadius:BorderRadius.circular(11)),child:Icon(icon,color:darkGreen,size:17)),const SizedBox(width:9),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(value,style:const TextStyle(color:ink,fontSize:15,fontWeight:FontWeight.w900)),Text(label,style:const TextStyle(color:muted,fontSize:8,fontWeight:FontWeight.w700))]))]),
);

class Saved extends StatefulWidget {
 const Saved({super.key,required this.user,required this.onLogin});
 final Map<String,dynamic>? user; final VoidCallback onLogin;
 @override State<Saved> createState()=>_SavedState();
}
class _SavedState extends State<Saved> {
 List<DooraTask> tasks=[]; bool busy=true; String? error;
 @override void initState(){super.initState();load();}
 @override void didUpdateWidget(covariant Saved old){super.didUpdateWidget(old);if(old.user!=widget.user)load();}
 Future<void> load() async {
  if(widget.user==null){if(mounted)setState(()=>busy=false);return;}
  setState(()=>busy=true);error=null;
  try{final ids=await DooraApi.instance.getSavedTaskIds();final rows=await DooraApi.instance.getTasks();if(mounted)setState(()=>tasks=rows.map(DooraTask.fromJson).where((t)=>ids.contains(t.id)).toList());}
  catch(e){if(mounted)setState(()=>error=DooraApi.instance.errorMessage(e));}
  finally{if(mounted)setState(()=>busy=false);}
 }
 Future<void> remove(DooraTask t) async {
  final old=List<DooraTask>.from(tasks);setState(()=>tasks.removeWhere((x)=>x.id==t.id));
  try{await DooraApi.instance.toggleSavedTask(t.id);}
  catch(e){if(mounted){setState(()=>tasks=old);toast(context,DooraApi.instance.errorMessage(e));}}
 }
 @override Widget build(BuildContext c)=>SafeArea(child:RefreshIndicator(color:darkGreen,onRefresh:load,child:ListView(padding:const EdgeInsets.fromLTRB(18,18,18,112),children:[
  Row(children:[const Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Kaydedilenler',style:TextStyle(color:ink,fontSize:24,fontWeight:FontWeight.w900,letterSpacing:-.7)),SizedBox(height:4),Text('Beğendiğin işleri burada sakla.',style:TextStyle(color:muted,fontSize:11))])),Container(width:42,height:42,decoration:BoxDecoration(color:const Color(0xFFE8EFDF),borderRadius:BorderRadius.circular(14)),child:const Icon(PhosphorIconsRegular.bookmarkSimple,color:darkGreen,size:22))]),
  const SizedBox(height:17),
  Container(padding:const EdgeInsets.all(17),decoration:BoxDecoration(gradient:const LinearGradient(colors:[Color(0xFF263B2B),Color(0xFF405B43)],begin:Alignment.topLeft,end:Alignment.bottomRight),borderRadius:BorderRadius.circular(21),boxShadow:[BoxShadow(color:darkGreen.withValues(alpha:.12),blurRadius:18,offset:const Offset(0,8))]),child:Row(children:[Container(width:43,height:43,decoration:BoxDecoration(color:white.withValues(alpha:.13),borderRadius:BorderRadius.circular(14)),child:const Icon(PhosphorIconsFill.bookmarkSimple,color:white,size:21)),const SizedBox(width:13),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(tasks.length.toString(),style:const TextStyle(color:white,fontSize:23,fontWeight:FontWeight.w900)),const Text('Kaydettiğin ilan',style:TextStyle(color:Colors.white70,fontSize:10,fontWeight:FontWeight.w600))])),const Text('Sonra devam et.  →',style:TextStyle(color:Colors.white70,fontSize:9,fontWeight:FontWeight.w700))])),
  const SizedBox(height:20),
  Row(children:[const Expanded(child:Text('Senin listen',style:TextStyle(color:ink,fontSize:15,fontWeight:FontWeight.w900))),Text(tasks.length==1?'1 ilan':'${tasks.length} ilan',style:const TextStyle(color:muted,fontSize:10,fontWeight:FontWeight.w700))]),
  const SizedBox(height:11),
  if(widget.user==null)EmptyState(title:'İlanları kaydet',message:'Kaydettiklerini görmek için giriş yap.',action:'Giriş yap',onTap:widget.onLogin)
  else if(busy)const Skeletons()
  else if(error!=null)EmptyState(title:'Listen yüklenemedi',message:error!,action:'Tekrar dene',onTap:load)
  else if(tasks.isEmpty)Container(padding:const EdgeInsets.symmetric(vertical:28,horizontal:20),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(19),border:Border.all(color:line)),child:Column(children:[Container(width:58,height:58,decoration:const BoxDecoration(color:mint,shape:BoxShape.circle),child:const Icon(PhosphorIconsRegular.bookmarkSimple,color:darkGreen,size:25)),const SizedBox(height:12),const Text('Listen henüz boş',style:TextStyle(color:ink,fontSize:14,fontWeight:FontWeight.w900)),const SizedBox(height:5),const Text('İlgini çeken bir ilanın kalp simgesine dokun. Daha sonra buradan kolayca ulaşabilirsin.',textAlign:TextAlign.center,style:TextStyle(color:muted,fontSize:10,height:1.5))])
  )
  else ...tasks.map((t)=>Padding(padding:const EdgeInsets.only(bottom:10),child:Dismissible(key:ValueKey(t.id),direction:DismissDirection.endToStart,background:Container(alignment:Alignment.centerRight,padding:const EdgeInsets.only(right:20),decoration:BoxDecoration(color:const Color(0xFFFFE9E7),borderRadius:BorderRadius.circular(18)),child:const Icon(Icons.delete_outline,color:Colors.red)),onDismissed:(_)=>remove(t),child:TaskCard(task:t,saved:true,onSave:()=>remove(t),onTap:()=>openTask(c,t,widget.user,widget.onLogin,load))))),
 ])));
}
class Profile extends StatefulWidget {
 const Profile({super.key,required this.user,required this.onLogin,required this.onLogout});
 final Map<String,dynamic>? user; final VoidCallback onLogin,onLogout;
 @override State<Profile> createState()=>_ProfileState();
}
class _ProfileState extends State<Profile> {
 Map<String,dynamic>? wallet; Map<String,dynamic> profile={};
 bool loadingWallet=false; String? walletError;
 @override void initState(){super.initState();if(widget.user!=null){loadWallet();loadProfile();}}
 @override void didUpdateWidget(covariant Profile old){super.didUpdateWidget(old);if(old.user!=widget.user){wallet=null;profile={};walletError=null;if(widget.user!=null){loadWallet();loadProfile();}}}
 Future<void> loadProfile()async{
  if(widget.user==null)return;
  try{final value=await DooraApi.instance.getProfile();if(mounted)setState(()=>profile=value);}
  catch(_){}
 }
 Future<void> refreshAccount()async{await Future.wait([loadWallet(),loadProfile()]);}
 Future<void> loadWallet()async{
  if(widget.user==null)return;setState(()=>loadingWallet=true);walletError=null;
  try{final data=await DooraApi.instance.getWallet();if(mounted)setState(()=>wallet=data);}
  catch(e){if(mounted)setState(()=>walletError=DooraApi.instance.errorMessage(e));}
  finally{if(mounted)setState(()=>loadingWallet=false);}
 }
 String money(dynamic value){final parts=(num.tryParse(value?.toString()??'')??0).toStringAsFixed(2).split('.');final whole=parts.first.replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'),(m)=>'.');return '$whole,${parts.last} ₺';}
 @override Widget build(BuildContext c){
  final name=profile['name']?.toString()??widget.user?['name']?.toString()??'DOORA üyesi';
  final avatar=profile['avatarUrl']?.toString()??'';
  final verified=profile['isVerified']==true;
  final account=wallet?['account'] is Map?Map<String,dynamic>.from(wallet!['account'] as Map):<String,dynamic>{};
  final available=account['available_balance']??0,held=account['held_balance']??0;
  final transactions=wallet?['transactions'] is List?List<Map<String,dynamic>>.from((wallet!['transactions'] as List).whereType<Map>().map((e)=>Map<String,dynamic>.from(e))):<Map<String,dynamic>>[];
  return SafeArea(child:RefreshIndicator(color:darkGreen,onRefresh:refreshAccount,child:ListView(padding:const EdgeInsets.fromLTRB(18,18,18,112),children:[
   Row(children:[const Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    Text('Hesabım',style:TextStyle(color:ink,fontSize:25,fontWeight:FontWeight.w900,letterSpacing:-.8)),
    SizedBox(height:4),Text('DOORA deneyimini buradan yönet.',style:TextStyle(color:muted,fontSize:11)),
   ])),Container(width:42,height:42,decoration:BoxDecoration(color:mint,borderRadius:BorderRadius.circular(14)),child:const Icon(PhosphorIconsRegular.userCircle,color:darkGreen,size:23))]),
   const SizedBox(height:17),
   Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(19),border:Border.all(color:line)),child:Row(children:[_TaskAvatar(name:name,url:avatar,radius:27),const SizedBox(width:12),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(widget.user==null?'DOORA’ya hoş geldin':name,style:const TextStyle(color:ink,fontWeight:FontWeight.w900,fontSize:14)),const SizedBox(height:3),Text(widget.user?['email']?.toString()??'İşlerini kolayca yönet.',style:const TextStyle(color:muted,fontSize:10))])),if(verified)const Icon(Icons.verified_rounded,color:Color(0xFF3985C8),size:20)])),
   const SizedBox(height:15),
   if(widget.user==null)Container(padding:const EdgeInsets.all(18),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(19),border:Border.all(color:line)),child:Column(children:[const Icon(PhosphorIconsRegular.wallet,color:darkGreen,size:30),const SizedBox(height:9),const Text('DOORA cüzdanını kullan',style:TextStyle(color:ink,fontSize:14,fontWeight:FontWeight.w900)),const SizedBox(height:5),const Text('Bakiyeni ve iş hareketlerini takip etmek için giriş yap.',textAlign:TextAlign.center,style:TextStyle(color:muted,fontSize:10)),const SizedBox(height:12),SizedBox(width:double.infinity,child:FilledButton(onPressed:widget.onLogin,style:FilledButton.styleFrom(backgroundColor:darkGreen),child:const Text('Giriş yap / Kayıt ol')))]))
   else Container(padding:const EdgeInsets.all(18),decoration:BoxDecoration(gradient:const LinearGradient(colors:[Color(0xFF1F3024),Color(0xFF3B5940),Color(0xFF607653)],begin:Alignment.topLeft,end:Alignment.bottomRight),borderRadius:BorderRadius.circular(22),boxShadow:[BoxShadow(color:darkGreen.withValues(alpha:.18),blurRadius:22,offset:const Offset(0,9))]),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    Row(children:[Container(width:31,height:31,decoration:BoxDecoration(color:white.withValues(alpha:.14),borderRadius:BorderRadius.circular(10)),child:const Center(child:Text('d',style:TextStyle(color:white,fontSize:20,fontWeight:FontWeight.w900)))),const SizedBox(width:8),const Text('DOORA WALLET',style:TextStyle(color:white,fontSize:11,fontWeight:FontWeight.w900,letterSpacing:1)),const Spacer(),Container(padding:const EdgeInsets.symmetric(horizontal:9,vertical:5),decoration:BoxDecoration(color:white.withValues(alpha:.15),borderRadius:BorderRadius.circular(20)),child:const Text('TEST MODU',style:TextStyle(color:white,fontSize:8,fontWeight:FontWeight.w900,letterSpacing:.5)))]),
    const SizedBox(height:18),const Text('KULLANILABİLİR BAKİYE',style:TextStyle(color:Colors.white70,fontSize:9,fontWeight:FontWeight.w800,letterSpacing:.7)),
    const SizedBox(height:4),Text(walletError!=null?'—':money(available),style:const TextStyle(color:white,fontSize:30,fontWeight:FontWeight.w900,letterSpacing:-1)),
    const SizedBox(height:14),Container(height:1,color:white.withValues(alpha:.17)),
    const SizedBox(height:12),Row(children:[const Icon(PhosphorIconsRegular.lockKeyOpen,color:Colors.white70,size:15),const SizedBox(width:6),const Text('Emanette',style:TextStyle(color:Colors.white70,fontSize:10)),const Spacer(),Text(walletError!=null?'—':money(held),style:const TextStyle(color:white,fontSize:12,fontWeight:FontWeight.w800))]),
    if(walletError!=null)Padding(padding:const EdgeInsets.only(top:9),child:Row(children:[Expanded(child:Text(walletError!,style:const TextStyle(color:Colors.white70,fontSize:9))),TextButton(onPressed:loadingWallet?null:loadWallet,child:const Text('Yenile',style:TextStyle(color:white,fontSize:10,fontWeight:FontWeight.w800)))])),
    if(loadingWallet&&wallet==null)const Padding(padding:EdgeInsets.only(top:12),child:LinearProgressIndicator(minHeight:2,backgroundColor:Colors.white24,color:white)),
   ])),
   if(widget.user!=null) ...[
    const SizedBox(height:17),
    const Text('Hızlı erişim',style:TextStyle(color:ink,fontSize:15,fontWeight:FontWeight.w900)),
    const SizedBox(height:9),
    Row(children:[
     Expanded(child:_WalletAction(icon:PhosphorIconsRegular.chatCircle,label:'Mesajlar',onTap:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>MessagesInboxPage(currentUserId:widget.user?['id']?.toString()??''))))),
     const SizedBox(width:8),
     Expanded(child:_WalletAction(icon:PhosphorIconsRegular.images,label:'Portföyüm',onTap:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>ProviderProfilePage(userId:widget.user?['id']?.toString()??'',fallbackName:name,currentUserId:widget.user?['id']?.toString()))))),
    ]),
    const SizedBox(height:11),
    Row(children:[
     Expanded(child:_WalletAction(icon:PhosphorIconsRegular.plusCircle,label:'Bakiye yükle',onTap:()=>showModalBottomSheet(context:c,isScrollControlled:true,backgroundColor:Colors.transparent,builder:(_)=>WalletActionSheet(action:'test_topup',onDone:loadWallet)))),
     const SizedBox(width:9),
     Expanded(child:_WalletAction(icon:PhosphorIconsRegular.arrowUpRight,label:'Bakiye çek',onTap:()=>showModalBottomSheet(context:c,isScrollControlled:true,backgroundColor:Colors.transparent,builder:(_)=>WalletActionSheet(action:'withdraw',onDone:loadWallet)))),
    ]),
    const SizedBox(height:19),
    Row(children:[const Expanded(child:Text('Son hesap hareketleri',style:TextStyle(color:ink,fontSize:15,fontWeight:FontWeight.w900))),TextButton(onPressed:refreshAccount,child:const Text('Yenile',style:TextStyle(color:darkGreen,fontSize:10,fontWeight:FontWeight.w800)))]),
    if(loadingWallet&&wallet==null)const Skeletons()
    else if(transactions.isEmpty)Container(padding:const EdgeInsets.all(17),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(17),border:Border.all(color:line)),child:const Row(children:[Icon(PhosphorIconsRegular.receipt,color:muted,size:20),SizedBox(width:10),Expanded(child:Text('Henüz hesap hareketi yok.',style:TextStyle(color:muted,fontSize:10)))]))
    else ...transactions.take(4).map((tx){final type=tx['type']?.toString()??'';final outgoing=type=='escrow_lock'||type=='withdrawal_request';return Container(margin:const EdgeInsets.only(bottom:8),padding:const EdgeInsets.all(13),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(15),border:Border.all(color:line)),child:Row(children:[Container(width:35,height:35,decoration:BoxDecoration(color:mint,borderRadius:BorderRadius.circular(12)),child:Icon(outgoing?PhosphorIconsRegular.arrowUpRight:PhosphorIconsRegular.arrowDownLeft,color:darkGreen,size:18)),const SizedBox(width:10),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(tx['description']?.toString()??'Hesap hareketi',maxLines:1,overflow:TextOverflow.ellipsis,style:const TextStyle(color:ink,fontSize:10,fontWeight:FontWeight.w800)),const SizedBox(height:3),Text(tx['status']=='pending'?'Bekliyor':'Tamamlandı',style:const TextStyle(color:muted,fontSize:8))])),Text((outgoing?'−':'+')+money(tx['amount']),style:TextStyle(color:outgoing?ink:darkGreen,fontSize:11,fontWeight:FontWeight.w900))]));}),
   ],
   const SizedBox(height:12),
   if(widget.user!=null)_ProfileItem(icon:PhosphorIconsRegular.images,title:'Hizmet portföyüm',subtitle:'Yaptığın işleri fotoğraflarla sergile',tap:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>ProviderProfilePage(userId:widget.user?['id']?.toString()??'',fallbackName:name,currentUserId:widget.user?['id']?.toString())))),
   if(widget.user!=null)_ProfileItem(icon:PhosphorIconsRegular.chatCircle,title:'Mesajlar',subtitle:'Müşteri ve hizmet verenlerle yazış',tap:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>MessagesInboxPage(currentUserId:widget.user?['id']?.toString()??'')))),
   _ProfileItem(icon:PhosphorIconsRegular.bell,title:'Bildirimler',subtitle:'İş ve teklif bildirimleri',tap:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>const Notifications()))),
   _ProfileItem(icon:PhosphorIconsRegular.lightbulb,title:'Nasıl çalışır?',subtitle:'DOORA’yı 3 adımda keşfet',tap:()=>showModalBottomSheet(context:c,showDragHandle:true,backgroundColor:white,builder:(_)=>const HowSheet())),
   _ProfileItem(icon:PhosphorIconsRegular.shieldCheck,title:'Güvenli kullanım',subtitle:'Güvenli işlem önerileri',tap:()=>toast(c,'Doğrulama kodlarını kimseyle paylaşma.')),
   if(widget.user!=null)_ProfileItem(icon:PhosphorIconsRegular.gearSix,title:'Ayarlar',subtitle:'Profil bilgileri ve bildirim tercihleri',tap:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>const SettingsPage()))),
   if(widget.user!=null)Padding(padding:const EdgeInsets.only(top:7),child:OutlinedButton.icon(onPressed:widget.onLogout,icon:const Icon(Icons.logout),label:const Text('Çıkış yap'),style:OutlinedButton.styleFrom(foregroundColor:ink,side:const BorderSide(color:line),padding:const EdgeInsets.symmetric(vertical:13),shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(14)))))
  ])));
 }
}

class SettingsPage extends StatefulWidget {
 const SettingsPage({super.key});
 @override State<SettingsPage> createState()=>_SettingsPageState();
}
class _SettingsPageState extends State<SettingsPage> {
 final name=TextEditingController(),district=TextEditingController(),bio=TextEditingController();
 bool taskUpdates=true,offerUpdates=true,walletUpdates=true,productUpdates=false;
 bool loading=true,saving=false;String? error;
 @override void initState(){super.initState();load();}
 @override void dispose(){name.dispose();district.dispose();bio.dispose();super.dispose();}
 Future<void> load()async{
  setState(()=>loading=true);
  try{
   final p=await DooraApi.instance.getProfile();
   name.text=p['name']?.toString()??'';district.text=p['district']?.toString()??'';bio.text=p['bio']?.toString()??'';
   final n=p['notifications'] is Map?Map<String,dynamic>.from(p['notifications'] as Map):<String,dynamic>{};
   taskUpdates=n['taskUpdates']!=false;offerUpdates=n['offerUpdates']!=false;walletUpdates=n['walletUpdates']!=false;productUpdates=n['productUpdates']==true;
   if(mounted)setState(()=>error=null);
  }catch(e){if(mounted)setState(()=>error=DooraApi.instance.errorMessage(e));}
  finally{if(mounted)setState(()=>loading=false);}
 }
 Future<void> save()async{
  if(name.text.trim().length<2){setState(()=>error='Ad soyad en az 2 karakter olmalı.');return;}
  setState(()=>saving=true);error=null;
  try{
   await DooraApi.instance.updateProfile(name:name.text,district:district.text,bio:bio.text,notifications:{'taskUpdates':taskUpdates,'offerUpdates':offerUpdates,'walletUpdates':walletUpdates,'productUpdates':productUpdates});
   if(mounted){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Ayarların kaydedildi.'),behavior:SnackBarBehavior.floating));Navigator.pop(context);}
  }catch(e){if(mounted)setState(()=>error=DooraApi.instance.errorMessage(e));}
  finally{if(mounted)setState(()=>saving=false);}
 }
 Widget field(String label,TextEditingController controller,{int lines=1})=>Padding(
  padding:const EdgeInsets.only(bottom:12),
  child:TextField(controller:controller,maxLines:lines,decoration:InputDecoration(labelText:label,filled:true,fillColor:white,border:OutlineInputBorder(borderRadius:BorderRadius.circular(13),borderSide:const BorderSide(color:line)),enabledBorder:OutlineInputBorder(borderRadius:BorderRadius.circular(13),borderSide:const BorderSide(color:line)))),
 );
 Widget pref(String title,String subtitle,bool value,ValueChanged<bool> change)=>SwitchListTile(
  value:value,onChanged:change,activeColor:darkGreen,contentPadding:const EdgeInsets.symmetric(horizontal:12),
  title:Text(title,style:const TextStyle(color:ink,fontSize:11,fontWeight:FontWeight.w800)),
  subtitle:Text(subtitle,style:const TextStyle(color:muted,fontSize:9)),
 );
 @override Widget build(BuildContext context)=>Scaffold(
  backgroundColor:bg,
  appBar:AppBar(backgroundColor:bg,elevation:0,title:const Text('Ayarlar',style:TextStyle(color:ink,fontSize:17,fontWeight:FontWeight.w900)),iconTheme:const IconThemeData(color:ink)),
  body:loading?const Center(child:CircularProgressIndicator(color:darkGreen)):ListView(
   padding:const EdgeInsets.fromLTRB(18,12,18,28),
   children:[
    Container(padding:const EdgeInsets.all(15),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(18),border:Border.all(color:line)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
     const Text('Profil bilgileri',style:TextStyle(color:ink,fontSize:14,fontWeight:FontWeight.w900)),
     const SizedBox(height:14),field('Ad soyad',name),field('İlçe',district),field('Hakkında',bio,lines:3),
    ])),
    const SizedBox(height:13),
    Container(decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(18),border:Border.all(color:line)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
     const Padding(padding:EdgeInsets.fromLTRB(14,15,14,5),child:Text('Bildirim tercihleri',style:TextStyle(color:ink,fontSize:14,fontWeight:FontWeight.w900))),
     pref('İş güncellemeleri','İlanların ve iş durumların',taskUpdates,(v)=>setState(()=>taskUpdates=v)),
     pref('Teklif bildirimleri','Yeni teklifler ve teklif durumları',offerUpdates,(v)=>setState(()=>offerUpdates=v)),
     pref('Cüzdan bildirimleri','Bakiye ve hesap hareketleri',walletUpdates,(v)=>setState(()=>walletUpdates=v)),
     pref('DOORA duyuruları','Ürün ve hizmet duyuruları',productUpdates,(v)=>setState(()=>productUpdates=v)),
    ])),
    if(error!=null)Padding(padding:const EdgeInsets.only(top:12),child:Text(error!,style:const TextStyle(color:Colors.red,fontSize:10))),
    const SizedBox(height:14),
    SizedBox(height:49,child:FilledButton(onPressed:saving?null:save,style:FilledButton.styleFrom(backgroundColor:darkGreen,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(14))),child:Text(saving?'Kaydediliyor…':'Değişiklikleri kaydet',style:const TextStyle(color:white,fontWeight:FontWeight.w800)))),
   ],
  ),
 );
}

class _WalletAction extends StatelessWidget{const _WalletAction({required this.icon,required this.label,required this.onTap});final IconData icon;final String label;final VoidCallback onTap;@override Widget build(BuildContext c)=>Material(color:white,borderRadius:BorderRadius.circular(15),child:InkWell(onTap:onTap,borderRadius:BorderRadius.circular(15),child:Container(padding:const EdgeInsets.symmetric(vertical:14),decoration:BoxDecoration(borderRadius:BorderRadius.circular(15),border:Border.all(color:line)),child:Row(mainAxisAlignment:MainAxisAlignment.center,children:[Icon(icon,color:darkGreen,size:18),const SizedBox(width:8),Text(label,style:const TextStyle(color:ink,fontSize:10,fontWeight:FontWeight.w800))]))));}
class WalletActionSheet extends StatefulWidget{const WalletActionSheet({super.key,required this.action,required this.onDone});final String action;final VoidCallback onDone;@override State<WalletActionSheet> createState()=>_WalletActionSheetState();}
class _WalletActionSheetState extends State<WalletActionSheet>{final amount=TextEditingController();final iban=TextEditingController();bool busy=false;String? error;@override void dispose(){amount.dispose();iban.dispose();super.dispose();}Future<void> submit()async{final n=num.tryParse(amount.text.replaceAll('.','').replaceAll(',','.'));if(n==null||n<=0||n>50000){setState(()=>error='1 ₺ ile 50.000 ₺ arasında geçerli bir tutar gir.');return;}if(widget.action=='withdraw'&&!RegExp(r'^TR[0-9]{24}$').hasMatch(iban.text.replaceAll(' ','').toUpperCase())){setState(()=>error='Geçerli bir TR IBAN gir.');return;}setState(()=>busy=true);try{await DooraApi.instance.walletAction(action:widget.action,amount:n,iban:iban.text);widget.onDone();if(mounted){Navigator.pop(context);toast(context,widget.action=='test_topup'?'Test bakiyen eklendi.':'Çekim talebin alındı.');}}catch(e){if(mounted)setState(()=>error=DooraApi.instance.errorMessage(e));}finally{if(mounted)setState(()=>busy=false);}}@override Widget build(BuildContext c)=>Padding(padding:EdgeInsets.only(bottom:MediaQuery.of(c).viewInsets.bottom),child:Container(padding:const EdgeInsets.fromLTRB(20,12,20,24),decoration:const BoxDecoration(color:white,borderRadius:BorderRadius.vertical(top:Radius.circular(25))),child:SafeArea(top:false,child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[Center(child:Container(width:38,height:4,decoration:BoxDecoration(color:line,borderRadius:BorderRadius.circular(5)))),const SizedBox(height:14),Text(widget.action=='test_topup'?'Bakiye yükle':'Bakiye çek',style:const TextStyle(color:ink,fontSize:18,fontWeight:FontWeight.w900)),const SizedBox(height:5),Text(widget.action=='test_topup'?'Cüzdanına eklenecek test bakiyesi tutarını gir.':'Çekim talebin için IBAN bilgini ve tutarı gir.',style:const TextStyle(color:muted,fontSize:10)),const SizedBox(height:14),if(widget.action=='withdraw')TextField(controller:iban,textCapitalization:TextCapitalization.characters,decoration:const InputDecoration(labelText:'IBAN',hintText:'TR00 0000 0000 0000 0000 0000 00')),if(widget.action=='withdraw')const SizedBox(height:10),TextField(controller:amount,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Tutar',suffixText:'₺',hintText:'Örn. 500')),if(error!=null)Padding(padding:const EdgeInsets.only(top:9),child:Text(error!,style:const TextStyle(color:Colors.red,fontSize:10))),const SizedBox(height:15),SizedBox(width:double.infinity,height:48,child:FilledButton(onPressed:busy?null:submit,style:FilledButton.styleFrom(backgroundColor:darkGreen,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(14))),child:Text(busy?'İşleniyor…':widget.action=='test_topup'?'Bakiye yükle':'Çekim talebi oluştur',style:const TextStyle(color:white,fontWeight:FontWeight.w800))))]))));}

class _ProfileItem extends StatelessWidget{const _ProfileItem({required this.icon,required this.title,required this.subtitle,required this.tap});final IconData icon;final String title,subtitle;final VoidCallback tap;@override Widget build(BuildContext c)=>Padding(padding:const EdgeInsets.only(bottom:8),child:ListTile(dense:true,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(14),side:const BorderSide(color:line)),tileColor:white,leading:Icon(icon,color:darkGreen),title:Text(title,style:const TextStyle(color:ink,fontSize:11,fontWeight:FontWeight.w800)),subtitle:Text(subtitle,style:const TextStyle(color:muted,fontSize:9)),trailing:const Icon(Icons.chevron_right,color:muted),onTap:tap));}
class HowSheet extends StatelessWidget{const HowSheet({super.key});@override Widget build(BuildContext c)=>SafeArea(child:Padding(padding:const EdgeInsets.all(20),child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('DOORA nasıl çalışır?',style:TextStyle(color:ink,fontSize:18,fontWeight:FontWeight.w900)),for(final s in ['İhtiyacını paylaş','Teklifleri değerlendir','İşi tamamla'])ListTile(leading:const CircleAvatar(backgroundColor:mint,child:Icon(Icons.check,color:darkGreen)),title:Text(s,style:const TextStyle(color:ink,fontWeight:FontWeight.w700,fontSize:12)))])));}

class Notifications extends StatefulWidget {
 const Notifications({super.key});
 @override State<Notifications> createState()=>_NotificationsState();
}
class _NotificationsState extends State<Notifications> {
 List<Map<String,dynamic>> items=[];
 bool busy=true,markingAll=false;
 String? error;
 @override void initState(){super.initState();load();}
 Future<void> load() async {
  setState(()=>busy=true); error=null;
  try { items=await DooraApi.instance.getNotifications(); }
  catch(e) { error=DooraApi.instance.errorMessage(e); }
  if(mounted)setState(()=>busy=false);
 }
 Future<void> markRead(Map<String,dynamic> item) async {
  final id=item['id']?.toString()??'';
  if(id.isEmpty||item['read_at']!=null)return;
  setState(()=>item['read_at']=DateTime.now().toIso8601String());
  try { await DooraApi.instance.markNotificationRead(id); }
  catch(e) { if(mounted)toast(context,DooraApi.instance.errorMessage(e)); }
 }
 Future<void> markAll() async {
  setState(()=>markingAll=true);
  try {
   await DooraApi.instance.markNotificationsRead();
   if(mounted)setState(()=>items=items.map((n)=>{...n,'read_at':n['read_at']??DateTime.now().toIso8601String()}).toList());
  } catch(e) { if(mounted)toast(context,DooraApi.instance.errorMessage(e)); }
  finally { if(mounted)setState(()=>markingAll=false); }
 }
 String dateLabel(dynamic raw) {
  final d=DateTime.tryParse(raw?.toString()??'')?.toLocal();
  if(d==null)return 'Yeni';
  final now=DateTime.now();
  if(now.difference(d).inHours<24&&now.day==d.day)return 'Bugün · ${d.hour.toString().padLeft(2,'0')}:${d.minute.toString().padLeft(2,'0')}';
  return '${d.day.toString().padLeft(2,'0')}.${d.month.toString().padLeft(2,'0')}.${d.year}';
 }
 IconData iconFor(String type) {
  if(type.contains('message'))return PhosphorIconsRegular.chatCircle;
  if(type.contains('offer'))return PhosphorIconsRegular.handshake;
  if(type.contains('wallet')||type.contains('withdraw'))return PhosphorIconsRegular.wallet;
  if(type.contains('task')||type.contains('work'))return PhosphorIconsRegular.briefcase;
  if(type.contains('review'))return PhosphorIconsRegular.star;
  return PhosphorIconsRegular.bell;
 }
 Widget notificationCard(Map<String,dynamic> n) {
  final read=n['read_at']!=null;
  final type=n['type']?.toString()??'';
  return Padding(
   padding:const EdgeInsets.only(bottom:9),
   child:Material(
    color:white,borderRadius:BorderRadius.circular(17),
    child:InkWell(
     onTap:()=>markRead(n),borderRadius:BorderRadius.circular(17),
     child:Container(
      padding:const EdgeInsets.all(14),
      decoration:BoxDecoration(
       borderRadius:BorderRadius.circular(17),
       border:Border.all(color:read?line:const Color(0xFFD8E3CE)),
       boxShadow:read?[]:[BoxShadow(color:darkGreen.withValues(alpha:.035),blurRadius:12,offset:const Offset(0,3))],
      ),
      child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[
       Container(width:40,height:40,decoration:BoxDecoration(color:read?soft:mint,borderRadius:BorderRadius.circular(13)),child:Icon(iconFor(type),color:darkGreen,size:19)),
       const SizedBox(width:11),
       Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
        Row(children:[
         Expanded(child:Text(n['title']?.toString()??'Bildirim',style:TextStyle(color:ink,fontSize:11,fontWeight:read?FontWeight.w700:FontWeight.w900))),
         if(!read)Container(width:7,height:7,decoration:const BoxDecoration(color:Color(0xFF76945E),shape:BoxShape.circle)),
        ]),
        const SizedBox(height:4),
        Text(n['message']?.toString()??'',style:const TextStyle(color:muted,fontSize:10,height:1.45)),
        const SizedBox(height:7),
        Text(dateLabel(n['created_at']),style:const TextStyle(color:muted,fontSize:8,fontWeight:FontWeight.w700)),
       ])),
      ]),
     ),
    ),
   ),
  );
 }
 @override Widget build(BuildContext c) {
  final unread=items.where((n)=>n['read_at']==null).length;
  final children=<Widget>[
   Container(
    padding:const EdgeInsets.all(18),
    decoration:BoxDecoration(gradient:const LinearGradient(colors:[Color(0xFF263B2B),Color(0xFF506B4C)],begin:Alignment.topLeft,end:Alignment.bottomRight),borderRadius:BorderRadius.circular(21)),
    child:Row(children:[
     Container(width:44,height:44,decoration:BoxDecoration(color:white.withValues(alpha:.14),borderRadius:BorderRadius.circular(14)),child:const Icon(PhosphorIconsFill.bell,color:white,size:22)),
     const SizedBox(width:13),
     Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      const Text('Her şeyden haberin olsun.',style:TextStyle(color:white,fontSize:15,fontWeight:FontWeight.w900)),
      const SizedBox(height:4),
      Text(unread==0?'Şu an okunmamış bildirimin yok.':'$unread okunmamış bildirimin var.',style:const TextStyle(color:Colors.white70,fontSize:10)),
     ])),
     if(unread>0)Text('$unread',style:const TextStyle(color:white,fontSize:24,fontWeight:FontWeight.w900)),
    ]),
   ),
   const SizedBox(height:19),
   Row(children:[
    const Expanded(child:Text('Son bildirimler',style:TextStyle(color:ink,fontSize:15,fontWeight:FontWeight.w900))),
    if(unread>0)TextButton(onPressed:markingAll?null:markAll,child:Text(markingAll?'İşleniyor…':'Tümünü okundu işaretle',style:const TextStyle(color:darkGreen,fontSize:9,fontWeight:FontWeight.w800))),
   ]),
  ];
  if(items.isEmpty) {
   children.add(Container(
    padding:const EdgeInsets.symmetric(vertical:32,horizontal:20),
    decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(19),border:Border.all(color:line)),
    child:Column(children:[
     Container(width:58,height:58,decoration:const BoxDecoration(color:mint,shape:BoxShape.circle),child:const Icon(PhosphorIconsRegular.bellSlash,color:darkGreen,size:25)),
     const SizedBox(height:12),
     const Text('Şimdilik sessiz',style:TextStyle(color:ink,fontSize:14,fontWeight:FontWeight.w900)),
     const SizedBox(height:5),
     const Text('İşlerinle ilgili yeni gelişmeler burada görünecek.',textAlign:TextAlign.center,style:TextStyle(color:muted,fontSize:10,height:1.5)),
    ]),
   ));
  } else {
   for(final n in items) { children.add(notificationCard(n)); }
  }
  return Scaffold(
   backgroundColor:bg,
   appBar:AppBar(
    backgroundColor:bg,scrolledUnderElevation:0,
    title:const Text('Bildirimler',style:TextStyle(color:ink,fontSize:17,fontWeight:FontWeight.w900)),
    leading:IconButton(onPressed:()=>Navigator.pop(c),icon:const Icon(Icons.arrow_back_ios_new,size:17,color:ink)),
    actions:[IconButton(onPressed:busy?null:load,icon:const Icon(Icons.refresh_rounded,color:ink))],
   ),
   body:SafeArea(
    child:busy?const Center(child:CircularProgressIndicator(color:darkGreen)):
    error!=null?Padding(padding:const EdgeInsets.all(18),child:EmptyState(title:'Bildirimler yüklenemedi',message:error!,action:'Tekrar dene',onTap:load)):
    ListView(padding:const EdgeInsets.fromLTRB(18,8,18,28),children:children),
   ),
  );
 }
}
class AuthPage extends StatefulWidget{const AuthPage({super.key});@override State<AuthPage> createState()=>_AuthPageState();}
class _AuthPageState extends State<AuthPage>{
 final name=TextEditingController(),email=TextEditingController(),pass=TextEditingController(),confirm=TextEditingController(),otp=TextEditingController();
 bool signup=false,verify=false,busy=false,showPassword=false;String? error;
 @override void dispose(){name.dispose();email.dispose();pass.dispose();confirm.dispose();otp.dispose();super.dispose();}
 Future<void> submit()async{
  if(verify&&otp.text.trim().length!=6){setState(()=>error='E-postana gelen 6 haneli kodu gir.');return;}
  if(!verify&&pass.text.length<8){setState(()=>error='Şifren en az 8 karakter olmalı.');return;}
  if(signup&&!verify&&pass.text!=confirm.text){setState(()=>error='Şifreler birbiriyle eşleşmiyor.');return;}
  if(signup&&!verify&&name.text.trim().length<2){setState(()=>error='Ad soyad bilgini gir.');return;}
  if(!email.text.contains('@')){setState(()=>error='Geçerli bir e-posta adresi gir.');return;}
  setState(()=>busy=true);error=null;
  try{
   if(verify){
    await DooraAuth.instance.verifyEmail(email.text,otp.text);
    final u=await DooraAuth.instance.signIn(email.text,pass.text);
    if(mounted)Navigator.pop(context,u);
   }else if(signup){
    await DooraAuth.instance.signUp(name.text,email.text,pass.text);
    if(mounted)setState(()=>verify=true);
   }else{
    final u=await DooraAuth.instance.signIn(email.text,pass.text);
    if(mounted)Navigator.pop(context,u);
   }
  }catch(e){if(mounted)setState(()=>error=DooraApi.instance.errorMessage(e));}
  finally{if(mounted)setState(()=>busy=false);}
 }
 InputDecoration field(String label,String hint,{Widget? suffix})=>InputDecoration(
  labelText:label,hintText:hint,suffixIcon:suffix,filled:true,fillColor:const Color(0xFFF6F8F3),
  contentPadding:const EdgeInsets.symmetric(horizontal:15,vertical:15),
  border:OutlineInputBorder(borderRadius:BorderRadius.circular(14),borderSide:BorderSide.none),
  enabledBorder:OutlineInputBorder(borderRadius:BorderRadius.circular(14),borderSide:const BorderSide(color:line)),
  focusedBorder:OutlineInputBorder(borderRadius:BorderRadius.circular(14),borderSide:const BorderSide(color:darkGreen,width:1.3)),
  labelStyle:const TextStyle(color:muted,fontSize:11),hintStyle:const TextStyle(color:muted,fontSize:11),
 );
 @override Widget build(BuildContext c)=>Scaffold(
  backgroundColor:bg,
  appBar:AppBar(
   backgroundColor:bg,scrolledUnderElevation:0,
   leading:IconButton(onPressed:()=>Navigator.maybePop(c),icon:const Icon(Icons.arrow_back_ios_new_rounded,size:17,color:ink)),
   title:const Text('doora.',style:TextStyle(color:ink,fontSize:19,fontWeight:FontWeight.w900,letterSpacing:-1)),
  ),
  body:SafeArea(child:Center(child:ConstrainedBox(
   constraints:const BoxConstraints(maxWidth:480),
   child:ListView(padding:const EdgeInsets.fromLTRB(22,12,22,30),children:[
    Container(padding:const EdgeInsets.all(17),decoration:BoxDecoration(
     color:const Color(0xFFEAF0E2),borderRadius:BorderRadius.circular(20),border:Border.all(color:const Color(0xFFDCE5D2))),
     child:Row(children:[
      Container(width:46,height:46,decoration:BoxDecoration(color:darkGreen,borderRadius:BorderRadius.circular(15)),
       child:const Center(child:Text('d',style:TextStyle(color:white,fontSize:29,fontWeight:FontWeight.w900)))),
      const SizedBox(width:13),
      Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
       const Text('DOORA',style:TextStyle(color:darkGreen,fontSize:10,fontWeight:FontWeight.w900,letterSpacing:1.5)),
       const SizedBox(height:4),
       Text(verify?'E-posta adresini doğrula':signup?'Aramıza katıl.':'Tekrar hoş geldin.',
        style:const TextStyle(color:ink,fontSize:19,fontWeight:FontWeight.w900,letterSpacing:-.5)),
       const SizedBox(height:3),
       Text(verify?'Gelen 6 haneli kodu gir.':'İşlerini kolayca hallet, doğru kişilerle buluş.',
        style:const TextStyle(color:muted,fontSize:9.5)),
      ])),
     ]),
    ),
    const SizedBox(height:18),
    if(!verify)Container(padding:const EdgeInsets.all(4),decoration:BoxDecoration(color:const Color(0xFFECEFE7),borderRadius:BorderRadius.circular(14)),child:Row(children:[
     Expanded(child:_modeButton('Giriş yap',false)),
     Expanded(child:_modeButton('Kayıt ol',true)),
    ])),
    const SizedBox(height:14),
    Container(padding:const EdgeInsets.all(18),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(20),border:Border.all(color:line)),
     child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      if(signup&&!verify) ...[
       const Text('Seni tanıyalım',style:TextStyle(color:ink,fontSize:13,fontWeight:FontWeight.w900)),
       const SizedBox(height:12),
       TextField(controller:name,textCapitalization:TextCapitalization.words,autofillHints:const [AutofillHints.name],decoration:field('Ad soyad','Adını ve soyadını yaz')),
       const SizedBox(height:11),
      ],
      if(verify)const Text('Doğrulama kodu',style:TextStyle(color:ink,fontSize:13,fontWeight:FontWeight.w900)),
      if(verify)const SizedBox(height:12),
      TextField(controller:email,keyboardType:TextInputType.emailAddress,autocorrect:false,autofillHints:const [AutofillHints.email],decoration:field('E-posta adresi','ornek@mail.com')),
      const SizedBox(height:11),
      if(!verify)TextField(controller:pass,obscureText:!showPassword,autofillHints:[signup?AutofillHints.newPassword:AutofillHints.password],decoration:field('Şifre','En az 8 karakter',suffix:IconButton(onPressed:()=>setState(()=>showPassword=!showPassword),icon:Icon(showPassword?Icons.visibility_off_outlined:Icons.visibility_outlined,color:muted,size:19)))),
      if(signup&&!verify)const SizedBox(height:11),
      if(signup&&!verify)TextField(controller:confirm,obscureText:true,decoration:field('Şifre tekrar','Şifreni yeniden yaz')),
      if(verify)TextField(controller:otp,keyboardType:TextInputType.number,maxLength:6,decoration:field('6 haneli kod','E-postana gelen kod')),
      if(error!=null)Padding(padding:const EdgeInsets.only(top:12),child:Container(padding:const EdgeInsets.all(12),decoration:BoxDecoration(color:const Color(0xFFFFF0EF),borderRadius:BorderRadius.circular(12)),child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[const Icon(Icons.error_outline_rounded,color:Color(0xFFB33F3A),size:16),const SizedBox(width:8),Expanded(child:Text(error!,style:const TextStyle(color:Color(0xFFB33F3A),fontSize:10,height:1.4)))]))),
      const SizedBox(height:16),
      SizedBox(height:50,child:FilledButton(onPressed:busy?null:submit,style:FilledButton.styleFrom(backgroundColor:darkGreen,foregroundColor:white,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(14)),elevation:0),
       child:busy?const SizedBox(width:18,height:18,child:CircularProgressIndicator(strokeWidth:2,color:white)):Text(verify?'E-postayı doğrula':signup?'Hesap oluştur':'Giriş yap',style:const TextStyle(fontSize:12,fontWeight:FontWeight.w900)))),
      if(!verify)Padding(padding:const EdgeInsets.only(top:13),child:Text(signup?'Hesabın zaten var mı? Giriş yap':'Henüz hesabın yok mu? Kayıt ol',textAlign:TextAlign.center,style:const TextStyle(color:muted,fontSize:10))),
     ]),
    ),
    const SizedBox(height:14),
    const Text('Güvenli giriş · Bilgilerin koruma altında',textAlign:TextAlign.center,style:TextStyle(color:muted,fontSize:9)),
   ]),
  ))),
 );
 Widget _modeButton(String label,bool value)=>GestureDetector(onTap:busy?null:()=>setState(()=>signup=value),child:AnimatedContainer(duration:const Duration(milliseconds:160),padding:const EdgeInsets.symmetric(vertical:12),decoration:BoxDecoration(color:signup==value?white:Colors.transparent,borderRadius:BorderRadius.circular(11),boxShadow:signup==value?[BoxShadow(color:ink.withValues(alpha:.06),blurRadius:8,offset:const Offset(0,2))]:[]),child:Text(label,textAlign:TextAlign.center,style:TextStyle(color:signup==value?darkGreen:muted,fontSize:11,fontWeight:FontWeight.w900))));
}

class Skeletons extends StatelessWidget{const Skeletons({super.key});@override Widget build(BuildContext c)=>Column(children:List.generate(3,(_)=>Container(height:118,margin:const EdgeInsets.only(bottom:10),padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(18),border:Border.all(color:line)),child:const Column(crossAxisAlignment:CrossAxisAlignment.start,children:[_Block(150,12),SizedBox(height:10),_Block(200,9),Spacer(),_Block(90,15)]))));}
class _Block extends StatelessWidget{const _Block(this.w,this.h);final double w,h;@override Widget build(BuildContext c)=>Container(width:w,height:h,decoration:BoxDecoration(color:soft,borderRadius:BorderRadius.circular(7)));}
class EmptyState extends StatelessWidget{const EmptyState({super.key,required this.title,required this.message,this.action,this.onTap});final String title,message;final String? action;final VoidCallback? onTap;@override Widget build(BuildContext c)=>Container(padding:const EdgeInsets.all(22),decoration:BoxDecoration(color:white,borderRadius:BorderRadius.circular(18),border:Border.all(color:line)),child:Column(children:[const Icon(Icons.inbox_outlined,color:green,size:30),const SizedBox(height:10),Text(title,textAlign:TextAlign.center,style:const TextStyle(color:ink,fontWeight:FontWeight.w800,fontSize:13)),const SizedBox(height:5),Text(message,textAlign:TextAlign.center,style:const TextStyle(color:muted,fontSize:10,height:1.5)),if(action!=null&&onTap!=null)TextButton(onPressed:onTap,child:Text(action!,style:const TextStyle(color:darkGreen,fontWeight:FontWeight.w800)))]));}
void toast(BuildContext c,String m)=>ScaffoldMessenger.of(c).showSnackBar(SnackBar(content:Text(m),behavior:SnackBarBehavior.floating,backgroundColor:ink));

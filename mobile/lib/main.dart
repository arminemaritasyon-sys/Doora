import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import 'package:reicons/reicons.dart';
import 'package:flutter_lucide_animated/flutter_lucide_animated.dart';
import 'theme/doora_theme.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';
import 'models/doora_task.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';

const ink = Color(0xFF18211E);
const forest = Color(0xFF245B49);
const green = Color(0xFF347A62);
const mint = Color(0xFFEAF2ED);
const paper = Color(0xFFF7F8F6);
const muted = Color(0xFF7D8983);
const line = Color(0xFFE8ECE8);
const white = Colors.white;

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: white,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));
  runApp(const DooraApp());
}

class DooraApp extends StatefulWidget {
  const DooraApp({super.key});
  @override
  State<DooraApp> createState() => _DooraAppState();
}

class _DooraAppState extends State<DooraApp> {
  Map<String, dynamic>? user;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final restored = await DooraAuth.instance.restore();
    if (!mounted) return;
    setState(() {
      user = restored;
      loading = false;
    });
  }

  Future<void> _openAuth() async {
    final result = await Navigator.of(context).push<Map<String, dynamic>>(
      _route(const AuthPage()),
    );
    if (result != null && mounted) setState(() => user = result);
  }

  Future<void> _signOut() async {
    await DooraAuth.instance.signOut();
    if (mounted) setState(() => user = null);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DOORA',
      debugShowCheckedModeBanner: false,
      theme: DooraTheme.light,
      home: loading ? const LaunchScreen() : DooraShell(
        user: user,
        onLogin: _openAuth,
        onSignOut: _signOut,
        onUserChanged: (value) => setState(() => user = value),
      ),
    );
  }
}

Route<T> _route<T>(Widget page) => PageRouteBuilder<T>(
  pageBuilder: (_, __, ___) => page,
  transitionDuration: const Duration(milliseconds: 280),
  reverseTransitionDuration: const Duration(milliseconds: 220),
  transitionsBuilder: (_, animation, __, child) => FadeTransition(
    opacity: animation,
    child: SlideTransition(
      position: Tween<Offset>(begin: const Offset(0.035, 0), end: Offset.zero)
          .animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic)),
      child: child,
    ),
  ),
);

class LaunchScreen extends StatelessWidget {
  const LaunchScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: forest,
    body: Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: 76, height: 76,
          decoration: BoxDecoration(color: white.withValues(alpha: .12), borderRadius: BorderRadius.circular(25), border: Border.all(color: white.withValues(alpha: .18))),
          child: const Center(child: Text('d.', style: TextStyle(color: white, fontSize: 43, height: 1, fontWeight: FontWeight.w800, letterSpacing: -3))),
        ).animate().fadeIn(duration: 500.ms).scale(begin: const Offset(.85, .85), curve: Curves.easeOutBack),
        const SizedBox(height: 20),
        const Text('DOORA', style: TextStyle(color: white, fontSize: 19, fontWeight: FontWeight.w800, letterSpacing: 3)),
        const SizedBox(height: 7),
        Text('İşler kolaylaşsın.', style: TextStyle(color: white.withValues(alpha: .72), fontSize: 13)),
        const SizedBox(height: 30),
        SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: white.withValues(alpha: .8))),
      ]),
    ),
  );
}

class DooraShell extends StatefulWidget {
  const DooraShell({super.key, required this.user, required this.onLogin, required this.onSignOut, required this.onUserChanged});
  final Map<String, dynamic>? user;
  final VoidCallback onLogin, onSignOut;
  final ValueChanged<Map<String, dynamic>?> onUserChanged;
  @override
  State<DooraShell> createState() => _DooraShellState();
}

class _DooraShellState extends State<DooraShell> {
  int tab = 0;
  int refreshKey = 0;

  void _createTask() {
    if (widget.user == null) {
      widget.onLogin();
      return;
    }
    Navigator.of(context).push(_route(CreateTaskPage(onCreated: () {
      setState(() => refreshKey++);
      setState(() => tab = 1);
    })));
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      DiscoverPage(user: widget.user, onLogin: widget.onLogin, onCreate: _createTask, refreshKey: refreshKey),
      MyWorkPage(user: widget.user, onLogin: widget.onLogin, onCreate: _createTask, refreshKey: refreshKey),
      MessagesPage(user: widget.user, onLogin: widget.onLogin),
      AccountPage(user: widget.user, onLogin: widget.onLogin, onSignOut: widget.onSignOut, onUserChanged: widget.onUserChanged),
    ];
    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: tab, children: pages),
      bottomNavigationBar: _BottomDock(
        selected: tab,
        onSelect: (value) => setState(() => tab = value),
        onCreate: _createTask,
      ),
    );
  }
}

class _BottomDock extends StatelessWidget {
  const _BottomDock({required this.selected, required this.onSelect, required this.onCreate});
  final int selected;
  final ValueChanged<int> onSelect;
  final VoidCallback onCreate;
  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    minimum: const EdgeInsets.fromLTRB(14, 0, 14, 10),
    child: Container(
      height: 76,
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 7),
      decoration: BoxDecoration(
        color: white.withValues(alpha: .97),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: const Color(0xFFE4EAE5)),
        boxShadow: [BoxShadow(color: const Color(0xFF10271E).withValues(alpha: .11), blurRadius: 30, offset: const Offset(0, 10))],
      ),
      child: Row(children: [
        _DockItem(icon: ReiconIcons.home, label: 'Keşfet', selected: selected == 0, onTap: () => onSelect(0)),
        _DockItem(icon: PhosphorIconsRegular.briefcase, label: 'İşlerim', selected: selected == 1, onTap: () => onSelect(1)),
        Expanded(child: Center(child: GestureDetector(
          onTap: onCreate,
          child: Container(
            width: 51, height: 51,
            decoration: BoxDecoration(
              gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF36745D), Color(0xFF173D32)]),
              borderRadius: BorderRadius.circular(18),
              boxShadow: [BoxShadow(color: forest.withValues(alpha: .25), blurRadius: 14, offset: const Offset(0, 6))],
            ),
            child: const Icon(PhosphorIconsRegular.plus, color: white, size: 25),
          ).animate().scale(duration: 280.ms, curve: Curves.easeOutBack),
        ))),
        _DockItem(icon: PhosphorIconsRegular.chatCircleDots, label: 'Mesajlar', selected: selected == 2, onTap: () => onSelect(2)),
        _DockItem(icon: ReiconIcons.userCircle, label: 'Hesabım', selected: selected == 3, onTap: () => onSelect(3)),
      ]),
    ),
  );
}

class _DockItem extends StatelessWidget {
  const _DockItem({required this.icon, required this.label, required this.selected, required this.onTap});
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Expanded(child: InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(18),
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(color: selected ? const Color(0xFFEDF4EF) : Colors.transparent, borderRadius: BorderRadius.circular(18)),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        AnimatedScale(
          scale: selected ? 1.08 : 1,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutBack,
          child: Icon(icon, size: 22, color: selected ? forest : const Color(0xFF98A39C)),
        ),
        const SizedBox(height: 4),
        Text(label, style: TextStyle(fontSize: 9.5, letterSpacing: -.1, fontWeight: selected ? FontWeight.w800 : FontWeight.w600, color: selected ? forest : muted)),
      ]),
    ),
  ));
}

class DiscoverPage extends StatefulWidget {
  const DiscoverPage({super.key, required this.user, required this.onLogin, required this.onCreate, required this.refreshKey});
  final Map<String, dynamic>? user;
  final VoidCallback onLogin, onCreate;
  final int refreshKey;
  @override
  State<DiscoverPage> createState() => _DiscoverPageState();
}

class _DiscoverPageState extends State<DiscoverPage> {
  final search = TextEditingController();
  List<DooraTask> tasks = [];
  bool loading = true;
  String? error;
  String category = 'Tümü';
  static const categories = ['Tümü', 'Temizlik', 'Tamir', 'Nakliye', 'Alışveriş', 'Montaj', 'Diğer'];

  @override
  void initState() { super.initState(); load(); }
  @override
  void didUpdateWidget(covariant DiscoverPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshKey != widget.refreshKey) load();
  }
  @override
  void dispose() { search.dispose(); super.dispose(); }

  Future<void> load() async {
    setState(() { loading = true; error = null; });
    try {
      final rows = await DooraApi.instance.getTasks(query: search.text, category: category);
      if (!mounted) return;
      setState(() => tasks = rows.map(DooraTask.fromJson).toList());
    } catch (e) {
      if (!mounted) return;
      setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: RefreshIndicator(
      color: forest,
      onRefresh: load,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 125),
            sliver: SliverList(delegate: SliverChildListDelegate([
              _HomeHeader(user: widget.user, onLogin: widget.onLogin),
              const SizedBox(height: 23),
              _HeroPanel(onCreate: widget.onCreate).animate().fadeIn(duration: 450.ms).slideY(begin: .05),
              const SizedBox(height: 25),
              _SearchBox(controller: search, onSubmit: load),
              const SizedBox(height: 27),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const _SectionTitle('Kategoriler'),
                TextButton(onPressed: () => setState(() => category = 'Tümü'), child: const Text('Tümünü gör', style: TextStyle(color: forest, fontSize: 12, fontWeight: FontWeight.w700))),
              ]),
              const SizedBox(height: 12),
              SizedBox(
                height: 104,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (_, index) {
                    final item = categories[index];
                    final selected = category == item;
                    return _CategoryTile(label: item, icon: _categoryIcon(item), selected: selected, onTap: () {
                      setState(() => category = item);
                      load();
                    });
                  },
                ),
              ),
              const SizedBox(height: 27),
              Row(children: [
                const Expanded(child: _SectionTitle('Yakınındaki işler')),
                Text(tasks.length.toString() + ' ilan', style: const TextStyle(color: muted, fontSize: 12, fontWeight: FontWeight.w600)),
              ]),
              const SizedBox(height: 13),
              if (loading)
                const _LoadingList()
              else if (error != null)
                _EmptyState(icon: PhosphorIconsRegular.wifiSlash, title: 'Bağlantı kurulamadı', description: error!, action: 'Yeniden dene', onTap: load)
              else if (tasks.isEmpty)
                _EmptyState(icon: PhosphorIconsRegular.magnifyingGlass, title: 'Şimdilik ilan yok', description: 'Aradığın hizmeti bulamadık. Filtreyi değiştirebilir veya ilk ilanı sen oluşturabilirsin.', action: 'İlan oluştur', onTap: widget.onCreate)
              else
                ...tasks.map((task) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: JobCard(task: task, onTap: () => _openTask(context, task, widget.user, widget.onLogin, onChanged: load)),
                )),
              const SizedBox(height: 12),
              _TrustStrip(),
            ])),
          ),
        ],
      ),
    ),
  );
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({required this.user, required this.onLogin});
  final Map<String, dynamic>? user;
  final VoidCallback onLogin;
  @override
  Widget build(BuildContext context) {
    final name = user?['name']?.toString().split(' ').first ?? 'Merhaba';
    return Row(children: [
      Container(
        width: 43, height: 43,
        decoration: BoxDecoration(color: forest, borderRadius: BorderRadius.circular(15)),
        child: const Center(child: Text('d.', style: TextStyle(color: white, fontSize: 27, fontWeight: FontWeight.w800, height: 1, letterSpacing: -2))),
      ),
      const SizedBox(width: 11),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('DOORA', style: TextStyle(color: ink, fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 2)),
        Text(user == null ? 'Günlük işler, kolay çözümler.' : 'Tekrar hoş geldin, ' + name, style: const TextStyle(color: muted, fontSize: 11)),
      ])),
      _RoundIconButton(icon: PhosphorIconsRegular.bell, onTap: () {
        if (user == null) { onLogin(); return; }
        Navigator.of(context).push(_route(const NotificationsPage()));
      }),
    ]);
  }
}

class _HeroPanel extends StatelessWidget {
  const _HeroPanel({required this.onCreate});
  final VoidCallback onCreate;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.fromLTRB(22, 22, 18, 20),
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF234F40), Color(0xFF102F27)]),
      borderRadius: BorderRadius.circular(27),
      boxShadow: [BoxShadow(color: forest.withValues(alpha: .16), blurRadius: 24, offset: const Offset(0, 10))],
    ),
    child: Stack(children: [
      Positioned(right: -43, top: -58, child: Container(width: 190, height: 190, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: white.withValues(alpha: .075), width: 29)))),
      Positioned(right: 10, bottom: -34, child: PhosphorIcon(PhosphorIconsDuotone.sparkle, size: 126, color: white.withValues(alpha: .075))),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(color: white.withValues(alpha: .11), borderRadius: BorderRadius.circular(30), border: Border.all(color: white.withValues(alpha: .12))),
          child: const Row(mainAxisSize: MainAxisSize.min, children: [
            LucideAnimatedIcon(icon: sparkles, size: 14, color: Color(0xFFD9E8B5), duration: Duration(milliseconds: 650)),
            SizedBox(width: 6),
            Text('İŞİNİ KOLAYLAŞTIR', style: TextStyle(color: Color(0xFFE6F0E9), fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 1.15)),
          ]),
        ),
        const SizedBox(height: 17),
        const Text('İhtiyacın var.\\nÇözümü DOORA’da.', style: TextStyle(color: white, fontSize: 27, height: 1.12, fontWeight: FontWeight.w800, letterSpacing: -1.05)),
        const SizedBox(height: 9),
        Text('İşini paylaş, sana uygun kişilerle buluş.', style: TextStyle(color: white.withValues(alpha: .76), fontSize: 12, fontWeight: FontWeight.w500)),
        const SizedBox(height: 19),
        FilledButton(
          onPressed: onCreate,
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFFE4EDDB), foregroundColor: const Color(0xFF183F33), elevation: 0, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
          child: const Row(mainAxisSize: MainAxisSize.min, children: [
            Text('Hemen ilan oluştur', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
            SizedBox(width: 9),
            Icon(PhosphorIconsRegular.arrowUpRight, size: 16),
          ]),
        ),
      ]),
    ]),
  );
}

class _SearchBox extends StatelessWidget {
  const _SearchBox({required this.controller, required this.onSubmit});
  final TextEditingController controller;
  final VoidCallback onSubmit;
  @override
  Widget build(BuildContext context) => Container(
    height: 55,
    decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(17), border: Border.all(color: line), boxShadow: [BoxShadow(color: ink.withValues(alpha: .025), blurRadius: 10, offset: const Offset(0, 3))]),
    child: Row(children: [
      const SizedBox(width: 15),
      const Icon(PhosphorIconsRegular.magnifyingGlass, color: muted, size: 20),
      const SizedBox(width: 10),
      Expanded(child: TextField(
        controller: controller,
        textInputAction: TextInputAction.search,
        onSubmitted: (_) => onSubmit(),
        decoration: const InputDecoration(border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, fillColor: Colors.transparent, hintText: 'Hangi hizmeti arıyorsun?'),
      )),
      IconButton(onPressed: onSubmit, icon: const Icon(PhosphorIconsRegular.arrowRight, color: forest, size: 19)),
    ]),
  );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.value);
  final String value;
  @override
  Widget build(BuildContext context) => Text(value, style: const TextStyle(color: ink, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -.45));
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({required this.label, required this.icon, required this.selected, required this.onTap});
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: Colors.transparent,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        width: 82,
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 7),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFE8F1EA) : white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: selected ? const Color(0xFFC8DCCF) : const Color(0xFFE8EDE9)),
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 39, height: 39,
            decoration: BoxDecoration(color: selected ? forest : const Color(0xFFF1F4F1), borderRadius: BorderRadius.circular(13)),
            child: Icon(icon, color: selected ? white : const Color(0xFF597567), size: 20),
          ),
          const SizedBox(height: 8),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: selected ? forest : const Color(0xFF53615A), fontSize: 10, fontWeight: FontWeight.w800)),
        ]),
      ),
    ),
  );
}

IconData _categoryIcon(String value) {
  switch (value) {
    case 'Temizlik': return PhosphorIconsRegular.broom;
    case 'Tamir': return PhosphorIconsRegular.wrench;
    case 'Nakliye': return PhosphorIconsRegular.truck;
    case 'Alışveriş': return PhosphorIconsRegular.shoppingBag;
    case 'Montaj': return PhosphorIconsRegular.hammer;
    default: return PhosphorIconsRegular.squaresFour;
  }
}

class JobCard extends StatelessWidget {
  const JobCard({super.key, required this.task, required this.onTap});
  final DooraTask task;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: white,
    borderRadius: BorderRadius.circular(22),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFE7ECE8)),
          boxShadow: [BoxShadow(color: const Color(0xFF172A20).withValues(alpha: .025), blurRadius: 15, offset: const Offset(0, 5))],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(width: 46, height: 46, decoration: BoxDecoration(color: const Color(0xFFEEF4EF), borderRadius: BorderRadius.circular(15)), child: Icon(_categoryIcon(task.category), color: forest, size: 22)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(task.category.toUpperCase(), style: const TextStyle(color: Color(0xFF648171), fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: .8)),
              const SizedBox(height: 4),
              Text(task.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: ink, fontSize: 14, height: 1.25, fontWeight: FontWeight.w800, letterSpacing: -.25)),
            ])),
            const SizedBox(width: 8),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(task.formattedBudget, style: const TextStyle(color: forest, fontSize: 15, fontWeight: FontWeight.w900, letterSpacing: -.4)),
              const SizedBox(height: 3),
              const Text('BÜTÇE', style: TextStyle(color: Color(0xFF9AA59E), fontSize: 8, fontWeight: FontWeight.w800, letterSpacing: .7)),
            ]),
          ]),
          if (task.description.isNotEmpty) ...[
            const SizedBox(height: 13),
            Text(task.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF7B8780), fontSize: 11.5, height: 1.5)),
          ],
          const SizedBox(height: 14),
          Wrap(spacing: 13, runSpacing: 7, children: [
            _TaskMeta(icon: PhosphorIconsRegular.mapPin, text: task.location.isEmpty ? 'Konum belirtilmedi' : task.location),
            _TaskMeta(icon: PhosphorIconsRegular.clock, text: task.time),
            _TaskMeta(icon: PhosphorIconsRegular.chatCircleDots, text: '${task.offers} teklif'),
          ]),
          const Padding(padding: EdgeInsets.symmetric(vertical: 13), child: Divider(height: 1, color: line)),
          Row(children: [
            if (task.ownerAvatar.isNotEmpty)
              ClipOval(child: CachedNetworkImage(
                imageUrl: task.ownerAvatar.startsWith('http') ? task.ownerAvatar : 'https://doora.arminemaritasyon.workers.dev' + task.ownerAvatar,
                width: 27, height: 27, fit: BoxFit.cover,
                placeholder: (_, __) => _OwnerInitial(name: task.owner),
                errorWidget: (_, __, ___) => _OwnerInitial(name: task.owner),
              ))
            else
              _OwnerInitial(name: task.owner),
            const SizedBox(width: 8),
            Expanded(child: Text(task.owner, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF59655F), fontSize: 10.5, fontWeight: FontWeight.w700))),
            const Text('Detayları gör', style: TextStyle(color: forest, fontSize: 10.5, fontWeight: FontWeight.w800)),
            const SizedBox(width: 4),
            const Icon(PhosphorIconsRegular.arrowUpRight, size: 14, color: forest),
          ]),
        ]),
      ),
    ),
  );
}

class _OwnerInitial extends StatelessWidget {
  const _OwnerInitial({required this.name});
  final String name;
  @override
  Widget build(BuildContext context) => CircleAvatar(
    radius: 13.5,
    backgroundColor: const Color(0xFFEAF0EB),
    child: Text(name.isEmpty ? 'D' : name.characters.first.toUpperCase(), style: const TextStyle(color: forest, fontSize: 10, fontWeight: FontWeight.w800)),
  );
}

class _TaskMeta extends StatelessWidget {
  const _TaskMeta({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, size: 13, color: const Color(0xFF87948C)),
    const SizedBox(width: 4),
    Text(text, style: const TextStyle(color: Color(0xFF87948C), fontSize: 9.5, fontWeight: FontWeight.w600)),
  ]);
}

void _openTask(BuildContext context, DooraTask task, Map<String, dynamic>? user, VoidCallback onLogin, {VoidCallback? onChanged}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => TaskDetailSheet(task: task, signedIn: user != null, currentUserId: user?['id']?.toString() ?? '', onLogin: onLogin, onChanged: onChanged),
  );
}

class TaskDetailSheet extends StatelessWidget {
  const TaskDetailSheet({super.key, required this.task, required this.signedIn, required this.currentUserId, required this.onLogin, this.onChanged});
  final DooraTask task;
  final bool signedIn;
  final String currentUserId;
  final VoidCallback onLogin;
  final VoidCallback? onChanged;
  @override
  Widget build(BuildContext context) {
    final isOwner = currentUserId.isNotEmpty && currentUserId == task.ownerId;
    return Container(
      padding: EdgeInsets.fromLTRB(22, 12, 22, MediaQuery.of(context).viewInsets.bottom + 24),
      decoration: const BoxDecoration(color: white, borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      child: SafeArea(
        top: false,
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(child: Container(width: 38, height: 4, decoration: BoxDecoration(color: line, borderRadius: BorderRadius.circular(8)))),
          const SizedBox(height: 23),
          Row(children: [
            _Pill(text: task.category, color: mint, foreground: forest),
            const Spacer(),
            Text(task.formattedBudget, style: const TextStyle(color: forest, fontSize: 21, fontWeight: FontWeight.w900)),
          ]),
          const SizedBox(height: 12),
          Text(task.title, style: const TextStyle(color: ink, fontSize: 25, height: 1.15, fontWeight: FontWeight.w900, letterSpacing: -.7)),
          const SizedBox(height: 12),
          Text(task.description, style: const TextStyle(color: muted, fontSize: 14, height: 1.6)),
          const SizedBox(height: 20),
          _InfoLine(icon: PhosphorIconsRegular.mapPin, label: task.location.isEmpty ? 'Konum belirtilmedi' : task.location),
          const SizedBox(height: 10),
          _InfoLine(icon: PhosphorIconsRegular.clock, label: task.time),
          const SizedBox(height: 10),
          _InfoLine(icon: PhosphorIconsRegular.user, label: task.owner),
          const SizedBox(height: 23),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: isOwner ? null : () {
                Navigator.pop(context);
                if (!signedIn) { onLogin(); return; }
                Navigator.of(context).push(_route(OfferPage(task: task, onSent: onChanged)));
              },
              style: FilledButton.styleFrom(backgroundColor: forest, foregroundColor: white, disabledBackgroundColor: line, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
              child: Text(isOwner ? 'Kendi ilanına teklif veremezsin' : 'Ben yaparım', style: const TextStyle(fontWeight: FontWeight.w800)),
            ),
          ),
        ]),
      ),
    );
  }
}

class OfferPage extends StatefulWidget {
  const OfferPage({super.key, required this.task, this.onSent});
  final DooraTask task;
  final VoidCallback? onSent;
  @override
  State<OfferPage> createState() => _OfferPageState();
}

class _OfferPageState extends State<OfferPage> {
  final amount = TextEditingController();
  final message = TextEditingController();
  bool busy = false;
  String? error;
  @override
  void dispose() { amount.dispose(); message.dispose(); super.dispose(); }

  Future<void> send() async {
    final value = num.tryParse(amount.text.replaceAll('.', '').replaceAll(',', '.'));
    if (value == null || value <= 0) { setState(() => error = 'Geçerli bir teklif tutarı gir.'); return; }
    setState(() { busy = true; error = null; });
    try {
      await DooraApi.instance.createOffer(taskId: widget.task.id, amount: value, message: message.text);
      widget.onSent?.call();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Teklifin ilan sahibine iletildi.')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Teklifini oluştur', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
    body: SafeArea(child: ListView(padding: const EdgeInsets.fromLTRB(20, 12, 20, 30), children: [
      Container(padding: const EdgeInsets.all(17), decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(18), border: Border.all(color: line)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _Pill(text: widget.task.category, color: mint, foreground: forest),
        const SizedBox(height: 9),
        Text(widget.task.title, style: const TextStyle(color: ink, fontSize: 17, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text('İlan bütçesi: ' + widget.task.formattedBudget, style: const TextStyle(color: muted, fontSize: 12)),
      ])),
      const SizedBox(height: 25),
      const _FormLabel('Teklif tutarın'),
      const SizedBox(height: 8),
      TextField(controller: amount, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: 'Örn. 1.500', suffixText: '₺')),
      const SizedBox(height: 19),
      const _FormLabel('İlan sahibine mesajın'),
      const SizedBox(height: 8),
      TextField(controller: message, minLines: 4, maxLines: 6, decoration: const InputDecoration(hintText: 'Bu işi nasıl yapacağını kısaca anlat...')),
      if (error != null) _ErrorBanner(error!),
      const SizedBox(height: 22),
      _PrimaryButton(label: 'Teklif gönder', busy: busy, onTap: send),
    ])),
  );
}

class CreateTaskPage extends StatefulWidget {
  const CreateTaskPage({super.key, required this.onCreated});
  final VoidCallback onCreated;
  @override
  State<CreateTaskPage> createState() => _CreateTaskPageState();
}

class _CreateTaskPageState extends State<CreateTaskPage> {
  final title = TextEditingController();
  final description = TextEditingController();
  final budget = TextEditingController();
  final district = TextEditingController();
  String category = 'Temizlik';
  bool busy = false;
  String? error;
  @override
  void dispose() { title.dispose(); description.dispose(); budget.dispose(); district.dispose(); super.dispose(); }

  Future<void> submit() async {
    final amount = num.tryParse(budget.text.replaceAll('.', '').replaceAll(',', '.'));
    if (title.text.trim().length < 5 || description.text.trim().length < 10 || district.text.trim().length < 2 || amount == null || amount <= 0) {
      setState(() => error = 'Başlık, açıklama, ilçe ve bütçe alanlarını kontrol et.');
      return;
    }
    setState(() { busy = true; error = null; });
    try {
      await DooraApi.instance.createTask(title: title.text, description: description.text, category: category, budget: amount, district: district.text);
      widget.onCreated();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('İlanın yayınlandı. Teklifler geldikçe haberdar olacaksın.')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Yeni ilan', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
    body: SafeArea(child: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 35), children: [
      const Text('İhtiyacını anlat, çözüm bulalım.', style: TextStyle(color: ink, fontSize: 24, height: 1.2, fontWeight: FontWeight.w900, letterSpacing: -.7)),
      const SizedBox(height: 8),
      const Text('İlanını oluştur. Sana uygun kişiler teklif versin.', style: TextStyle(color: muted, fontSize: 13)),
      const SizedBox(height: 25),
      const _FormLabel('İlan başlığı'),
      const SizedBox(height: 8),
      TextField(controller: title, maxLength: 100, decoration: const InputDecoration(hintText: 'Örn. Evimin temizlenmesini istiyorum')),
      const SizedBox(height: 15),
      const _FormLabel('Kategori'),
      const SizedBox(height: 8),
      DropdownButtonFormField<String>(
        value: category,
        decoration: const InputDecoration(),
        items: const ['Temizlik','Tamir','Nakliye','Alışveriş','Montaj','Diğer'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
        onChanged: (value) => setState(() => category = value ?? category),
      ),
      const SizedBox(height: 15),
      const _FormLabel('İşin detayları'),
      const SizedBox(height: 8),
      TextField(controller: description, minLines: 4, maxLines: 6, maxLength: 5000, decoration: const InputDecoration(hintText: 'Ne yapılmasını istediğini açıkça anlat...')),
      const SizedBox(height: 15),
      const _FormLabel('Bütçe'),
      const SizedBox(height: 8),
      TextField(controller: budget, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: 'Örn. 1.500', suffixText: '₺')),
      const SizedBox(height: 15),
      const _FormLabel('İlçe / Konum'),
      const SizedBox(height: 8),
      TextField(controller: district, decoration: const InputDecoration(hintText: 'Örn. Muratpaşa')),
      if (error != null) _ErrorBanner(error!),
      const SizedBox(height: 22),
      _PrimaryButton(label: 'İlanı yayınla', busy: busy, onTap: submit),
      const SizedBox(height: 10),
      const Text('İlanın yayınlandıktan sonra uygun hizmet verenler sana teklif gönderebilir.', textAlign: TextAlign.center, style: TextStyle(color: muted, fontSize: 11, height: 1.45)),
    ])),
  );
}

class MyWorkPage extends StatefulWidget {
  const MyWorkPage({super.key, required this.user, required this.onLogin, required this.onCreate, required this.refreshKey});
  final Map<String, dynamic>? user;
  final VoidCallback onLogin, onCreate;
  final int refreshKey;
  @override
  State<MyWorkPage> createState() => _MyWorkPageState();
}

class _MyWorkPageState extends State<MyWorkPage> {
  List<DooraTask> ownTasks = [];
  bool loading = false;
  String? error;
  int filter = 0;

  @override
  void initState() { super.initState(); load(); }
  @override
  void didUpdateWidget(covariant MyWorkPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshKey != widget.refreshKey || oldWidget.user != widget.user) load();
  }

  Future<void> load() async {
    if (widget.user == null) { setState(() { ownTasks = []; loading = false; }); return; }
    setState(() { loading = true; error = null; });
    try {
      final rows = await DooraApi.instance.getTasks();
      final id = widget.user?['id']?.toString() ?? '';
      if (!mounted) return;
      setState(() => ownTasks = rows.map(DooraTask.fromJson).where((task) => id.isNotEmpty && task.ownerId == id).toList());
    } catch (e) {
      if (mounted) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: RefreshIndicator(
      color: forest,
      onRefresh: load,
      child: ListView(padding: const EdgeInsets.fromLTRB(20, 20, 20, 125), children: [
        const Text('İşlerin', style: TextStyle(color: ink, fontSize: 27, fontWeight: FontWeight.w900, letterSpacing: -.8)),
        const SizedBox(height: 6),
        const Text('İlanlarını ve iş akışını buradan takip et.', style: TextStyle(color: muted, fontSize: 13)),
        const SizedBox(height: 22),
        Container(padding: const EdgeInsets.all(4), decoration: BoxDecoration(color: const Color(0xFFEDF0ED), borderRadius: BorderRadius.circular(14)), child: Row(children: [
          _Segment(label: 'Açtığım ilanlar', selected: filter == 0, onTap: () => setState(() => filter = 0)),
          _Segment(label: 'Tekliflerim', selected: filter == 1, onTap: () => setState(() => filter = 1)),
        ])),
        const SizedBox(height: 18),
        if (widget.user == null)
          _EmptyState(icon: PhosphorIconsRegular.userCircle, title: 'Hesabına giriş yap', description: 'İlanlarını ve tekliflerini takip etmek için DOORA hesabınla giriş yap.', action: 'Giriş yap', onTap: widget.onLogin)
        else if (filter == 1)
          const _EmptyState(icon: PhosphorIconsRegular.paperPlaneTilt, title: 'Tekliflerin burada görünecek', description: 'Keşfet bölümünden bir ilana teklif verdiğinde teklif durumunu burada takip edebilirsin.')
        else if (loading)
          const _LoadingList()
        else if (error != null)
          _EmptyState(icon: PhosphorIconsRegular.wifiSlash, title: 'İşlerin yüklenemedi', description: error!, action: 'Tekrar dene', onTap: load)
        else if (ownTasks.isEmpty)
          _EmptyState(icon: PhosphorIconsRegular.clipboardText, title: 'Henüz açık ilan yok', description: 'İlk ilanını oluştur. Sana uygun kişiler teklif versin, sen de en iyisini seç.', action: 'İlan oluştur', onTap: widget.onCreate)
        else
          ...ownTasks.map((task) => Padding(padding: const EdgeInsets.only(bottom: 12), child: JobCard(task: task, onTap: () => _openTask(context, task, widget.user, widget.onLogin, onChanged: load)))),
        const SizedBox(height: 18),
        _HelpCard(),
      ]),
    ),
  );
}

class _Segment extends StatelessWidget {
  const _Segment({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Expanded(child: GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(color: selected ? white : Colors.transparent, borderRadius: BorderRadius.circular(11), boxShadow: selected ? [BoxShadow(color: ink.withValues(alpha: .05), blurRadius: 8)] : []),
      child: Text(label, textAlign: TextAlign.center, style: TextStyle(color: selected ? ink : muted, fontSize: 11, fontWeight: FontWeight.w800)),
    ),
  ));
}

class MessagesPage extends StatelessWidget {
  const MessagesPage({super.key, required this.user, required this.onLogin});
  final Map<String, dynamic>? user;
  final VoidCallback onLogin;
  @override
  Widget build(BuildContext context) => SafeArea(child: ListView(padding: const EdgeInsets.fromLTRB(20, 20, 20, 125), children: [
    const Text('Mesajlar', style: TextStyle(color: ink, fontSize: 27, fontWeight: FontWeight.w900, letterSpacing: -.8)),
    const SizedBox(height: 6),
    const Text('İşlerinle ilgili konuşmaların tek yerde.', style: TextStyle(color: muted, fontSize: 13)),
    const SizedBox(height: 22),
    if (user == null)
      _EmptyState(icon: PhosphorIconsRegular.chatCircleDots, title: 'Sohbetlerine ulaş', description: 'Mesajlarını görmek için hesabına giriş yap.', action: 'Giriş yap', onTap: onLogin)
    else
      const _EmptyState(icon: PhosphorIconsRegular.chatCircleDots, title: 'Henüz mesajın yok', description: 'Bir teklif kabul edildiğinde işin diğer tarafıyla iletişim kurabileceğin sohbetlerin burada listelenecek.'),
  ]));
}

class _AccountRow extends StatelessWidget {
  const _AccountRow({required this.icon, required this.title, required this.subtitle, required this.onTap});
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Material(
      color: white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: line)),
          child: Row(children: [
            Container(width: 39, height: 39, decoration: BoxDecoration(color: mint, borderRadius: BorderRadius.circular(13)), child: Icon(icon, color: forest, size: 19)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(color: ink, fontSize: 12, fontWeight: FontWeight.w800)),
              const SizedBox(height: 3),
              Text(subtitle, style: const TextStyle(color: muted, fontSize: 10)),
            ])),
            const Icon(PhosphorIconsRegular.caretRight, color: muted, size: 17),
          ]),
        ),
      ),
    ),
  );
}

class AccountPage extends StatefulWidget {
  const AccountPage({super.key, required this.user, required this.onLogin, required this.onSignOut, required this.onUserChanged});
  final Map<String, dynamic>? user;
  final VoidCallback onLogin, onSignOut;
  final ValueChanged<Map<String, dynamic>?> onUserChanged;
  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  Map<String, dynamic> profile = {};
  bool loading = false;
  @override
  void initState() { super.initState(); if (widget.user != null) load(); }
  @override
  void didUpdateWidget(covariant AccountPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.user != widget.user && widget.user != null) load();
  }
  Future<void> load() async {
    setState(() => loading = true);
    try { profile = await DooraApi.instance.getProfile(); }
    catch (_) {}
    if (mounted) setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final name = profile['name']?.toString().isNotEmpty == true ? profile['name'].toString() : widget.user?['name']?.toString() ?? 'DOORA üyesi';
    final email = widget.user?['email']?.toString() ?? '';
    return SafeArea(child: ListView(padding: const EdgeInsets.fromLTRB(20, 20, 20, 125), children: [
      const Text('Hesabım', style: TextStyle(color: ink, fontSize: 27, fontWeight: FontWeight.w900, letterSpacing: -.8)),
      const SizedBox(height: 6),
      const Text('Profilini ve hesap ayarlarını yönet.', style: TextStyle(color: muted, fontSize: 13)),
      const SizedBox(height: 22),
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: forest, borderRadius: BorderRadius.circular(22)),
        child: Row(children: [
          CircleAvatar(radius: 27, backgroundColor: white.withValues(alpha: .16), child: Text(name.isEmpty ? 'D' : name.characters.first.toUpperCase(), style: const TextStyle(color: white, fontSize: 20, fontWeight: FontWeight.w900))),
          const SizedBox(width: 13),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.user == null ? 'DOORA’ya hoş geldin' : name, style: const TextStyle(color: white, fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(widget.user == null ? 'İşlerini tek yerden yönet.' : email, style: TextStyle(color: white.withValues(alpha: .72), fontSize: 11)),
          ])),
          if (widget.user != null) IconButton(onPressed: () => Navigator.of(context).push(_route(EditProfilePage(profile: profile, onSaved: load))), icon: const Icon(PhosphorIconsRegular.pencilSimple, color: white, size: 19)),
        ]),
      ),
      const SizedBox(height: 19),
      if (widget.user == null)
        _PrimaryButton(label: 'Giriş yap / Kayıt ol', onTap: widget.onLogin)
      else ...[
        _AccountRow(icon: PhosphorIconsRegular.userCircle, title: 'Profil bilgilerim', subtitle: 'Adın, konumun ve kendini tanıt', onTap: () => Navigator.of(context).push(_route(EditProfilePage(profile: profile, onSaved: load)))),
        _AccountRow(icon: PhosphorIconsRegular.bell, title: 'Bildirimler', subtitle: 'İş ve teklif bildirimlerini görüntüle', onTap: () => Navigator.of(context).push(_route(const NotificationsPage()))),
        _AccountRow(icon: PhosphorIconsRegular.shieldCheck, title: 'Güvenli kullanım', subtitle: 'DOORA’da güvenli işlem önerileri', onTap: () => _showInfo(context, 'Güvenli kullanım', 'Ödeme ve iş detaylarını DOORA üzerinden takip et. Kişisel bilgilerini ve doğrulama kodlarını kimseyle paylaşma.')),
        _AccountRow(icon: PhosphorIconsRegular.headset, title: 'Yardım ve destek', subtitle: 'Destek ekibine ulaş', onTap: () => _showInfo(context, 'Yardım ve destek', 'Destek kanalı bu yerel uygulama sürümüne henüz bağlanmadı.')),
        const SizedBox(height: 14),
        OutlinedButton.icon(
          onPressed: widget.onSignOut,
          icon: const Icon(PhosphorIconsRegular.signOut, size: 18),
          label: const Text('Çıkış yap', style: TextStyle(fontWeight: FontWeight.w800)),
          style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF9A4A43), side: const BorderSide(color: Color(0xFFE9D8D5)), padding: const EdgeInsets.symmetric(vertical: 15), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
        ),
      ],
      if (loading) const Padding(padding: EdgeInsets.all(12), child: Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: forest)))),
      const SizedBox(height: 24),
      const Center(child: Text('DOORA  •  Daha kolay, birlikte.', style: TextStyle(color: muted, fontSize: 10, letterSpacing: .2))),
    ]));
  }
}

class EditProfilePage extends StatefulWidget {
  const EditProfilePage({super.key, required this.profile, required this.onSaved});
  final Map<String, dynamic> profile;
  final VoidCallback onSaved;
  @override
  State<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends State<EditProfilePage> {
  late final name = TextEditingController(text: widget.profile['name']?.toString() ?? '');
  late final district = TextEditingController(text: widget.profile['district']?.toString() ?? '');
  late final bio = TextEditingController(text: widget.profile['bio']?.toString() ?? '');
  bool busy = false;
  String? error;
  @override
  void dispose() { name.dispose(); district.dispose(); bio.dispose(); super.dispose(); }
  Future<void> save() async {
    setState(() { busy = true; error = null; });
    try {
      await DooraApi.instance.updateProfile(name: name.text, district: district.text, bio: bio.text);
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Profil bilgileri', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
    body: ListView(padding: const EdgeInsets.all(20), children: [
      const _FormLabel('Ad soyad'),
      const SizedBox(height: 8),
      TextField(controller: name, decoration: const InputDecoration(hintText: 'Adın ve soyadın')),
      const SizedBox(height: 17),
      const _FormLabel('İlçe / Konum'),
      const SizedBox(height: 8),
      TextField(controller: district, decoration: const InputDecoration(hintText: 'Örn. Muratpaşa')),
      const SizedBox(height: 17),
      const _FormLabel('Kendinden bahset'),
      const SizedBox(height: 8),
      TextField(controller: bio, minLines: 3, maxLines: 5, maxLength: 500, decoration: const InputDecoration(hintText: 'Kısaca kendini tanıt...')),
      if (error != null) _ErrorBanner(error!),
      const SizedBox(height: 22),
      _PrimaryButton(label: 'Değişiklikleri kaydet', busy: busy, onTap: save),
    ]),
  );
}

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});
  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}
class _NotificationsPageState extends State<NotificationsPage> {
  List<Map<String, dynamic>> rows = [];
  bool loading = true;
  String? error;
  @override
  void initState() { super.initState(); load(); }
  Future<void> load() async {
    setState(() { loading = true; error = null; });
    try {
      rows = await DooraApi.instance.getNotifications();
      await DooraApi.instance.markNotificationsRead();
    } catch (e) { error = DooraApi.instance.errorMessage(e); }
    if (mounted) setState(() => loading = false);
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Bildirimler', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
    body: loading ? const Center(child: CircularProgressIndicator(color: forest))
      : error != null ? _EmptyState(icon: PhosphorIconsRegular.wifiSlash, title: 'Bildirimler alınamadı', description: error!, action: 'Tekrar dene', onTap: load)
      : rows.isEmpty ? const _EmptyState(icon: PhosphorIconsRegular.bell, title: 'Yeni bildirim yok', description: 'İlan ve teklif hareketlerinden burada haberdar olacaksın.')
      : ListView.separated(
          padding: const EdgeInsets.all(18),
          itemCount: rows.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (_, index) {
            final row = rows[index];
            return Container(padding: const EdgeInsets.all(15), decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(16), border: Border.all(color: line)), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 38, height: 38, decoration: BoxDecoration(color: mint, borderRadius: BorderRadius.circular(12)), child: const Icon(PhosphorIconsRegular.bell, color: forest, size: 18)),
              const SizedBox(width: 11),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(row['title']?.toString() ?? 'Bildirim', style: const TextStyle(color: ink, fontSize: 13, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text(row['body']?.toString() ?? '', style: const TextStyle(color: muted, fontSize: 12, height: 1.4)),
              ])),
            ]));
          },
        ),
  );
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => Row(children: [Icon(icon, size: 17, color: forest), const SizedBox(width: 9), Expanded(child: Text(label, style: const TextStyle(color: Color(0xFF59655F), fontSize: 12, fontWeight: FontWeight.w600)))]);
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text, required this.color, required this.foreground});
  final String text;
  final Color color, foreground;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(30)), child: Text(text, style: TextStyle(color: foreground, fontSize: 10, fontWeight: FontWeight.w800)));
}

class _RoundIconButton extends StatelessWidget {
  const _RoundIconButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(color: white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: line)), child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(14), child: SizedBox(width: 43, height: 43, child: Icon(icon, color: ink, size: 19))));
}

class _LoadingList extends StatelessWidget {
  const _LoadingList();
  @override
  Widget build(BuildContext context) => Column(children: List.generate(3, (index) =>
    Container(
      height: 165,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(22), border: Border.all(color: line)),
      child: Shimmer.fromColors(
        baseColor: const Color(0xFFE9EEEA),
        highlightColor: const Color(0xFFF8FAF8),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(width: 46, height: 46, decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(15))),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 74, height: 8, decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(8))),
              const SizedBox(height: 9),
              Container(width: double.infinity, height: 11, decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(8))),
            ])),
            const SizedBox(width: 14),
            Container(width: 55, height: 14, decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(8))),
          ]),
          const SizedBox(height: 17),
          Container(width: double.infinity, height: 8, decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(8))),
          const SizedBox(height: 8),
          Container(width: 190, height: 8, decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(8))),
          const Spacer(),
          Container(width: double.infinity, height: 1, color: white),
          const SizedBox(height: 13),
          Row(children: [
            Container(width: 26, height: 26, decoration: const BoxDecoration(color: white, shape: BoxShape.circle)),
            const SizedBox(width: 8),
            Container(width: 90, height: 8, decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(8))),
          ]),
        ]),
      ),
    ),
  ));
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.title, required this.description, this.action, this.onTap});
  final IconData icon;
  final String title, description;
  final String? action;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.fromLTRB(23, 29, 23, 25),
    decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(21), border: Border.all(color: line)),
    child: Column(children: [
      Container(width: 58, height: 58, decoration: BoxDecoration(color: mint, borderRadius: BorderRadius.circular(19)), child: Icon(icon, color: forest, size: 27)),
      const SizedBox(height: 15),
      Text(title, textAlign: TextAlign.center, style: const TextStyle(color: ink, fontSize: 15, fontWeight: FontWeight.w900)),
      const SizedBox(height: 7),
      Text(description, textAlign: TextAlign.center, style: const TextStyle(color: muted, fontSize: 12, height: 1.5)),
      if (action != null) ...[
        const SizedBox(height: 17),
        TextButton(onPressed: onTap, child: Text(action!, style: const TextStyle(color: forest, fontWeight: FontWeight.w800))),
      ],
    ]),
  );
}

class _TrustStrip extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(15),
    decoration: BoxDecoration(color: const Color(0xFFEEF3EF), borderRadius: BorderRadius.circular(17)),
    child: const Row(children: [
      Icon(PhosphorIconsRegular.shieldCheck, color: forest, size: 21),
      SizedBox(width: 10),
      Expanded(child: Text('Daha güvenli işler için ilan ve teklif detaylarını DOORA üzerinden takip et.', style: TextStyle(color: forest, fontSize: 11, height: 1.45, fontWeight: FontWeight.w600))),
    ]),
  );
}

class _HelpCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: const Color(0xFFEEF3EF), borderRadius: BorderRadius.circular(17)),
    child: const Row(children: [
      Icon(PhosphorIconsRegular.info, color: forest, size: 20),
      SizedBox(width: 10),
      Expanded(child: Text('İşlerini oluşturduğun ilanlar ve gelen teklifler üzerinden takip edebilirsin.', style: TextStyle(color: forest, fontSize: 11, height: 1.45, fontWeight: FontWeight.w600))),
    ]),
  );
}

class _FormLabel extends StatelessWidget {
  const _FormLabel(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Text(text, style: const TextStyle(color: ink, fontSize: 12, fontWeight: FontWeight.w800));
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Container(margin: const EdgeInsets.only(top: 15), padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFFFFF0ED), borderRadius: BorderRadius.circular(12)), child: Text(text, style: const TextStyle(color: Color(0xFF9D493F), fontSize: 12)));
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({required this.label, required this.onTap, this.busy = false});
  final String label;
  final VoidCallback onTap;
  final bool busy;
  @override
  Widget build(BuildContext context) => SizedBox(
    height: 53,
    child: FilledButton(
      onPressed: busy ? null : onTap,
      style: FilledButton.styleFrom(backgroundColor: forest, foregroundColor: white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
      child: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: white)) : Text(label, style: const TextStyle(fontWeight: FontWeight.w800)),
    ),
  );
}

void _showInfo(BuildContext context, String title, String message) {
  showModalBottomSheet(context: context, backgroundColor: Colors.transparent, builder: (_) => Container(
    padding: const EdgeInsets.fromLTRB(22, 25, 22, 35),
    decoration: const BoxDecoration(color: white, borderRadius: BorderRadius.vertical(top: Radius.circular(25))),
    child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(color: ink, fontSize: 19, fontWeight: FontWeight.w900)),
      const SizedBox(height: 10),
      Text(message, style: const TextStyle(color: muted, fontSize: 13, height: 1.55)),
    ]),
  ));
}

class AuthPage extends StatefulWidget {
  const AuthPage({super.key});
  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  final name = TextEditingController();
  final otp = TextEditingController();
  bool signup = false, verifying = false, busy = false, obscure = true;
  String? error;
  @override
  void dispose() { email.dispose(); password.dispose(); name.dispose(); otp.dispose(); super.dispose(); }

  Future<void> submit() async {
    setState(() { busy = true; error = null; });
    try {
      if (verifying) {
        await DooraAuth.instance.verifyEmail(email.text, otp.text);
        final result = await DooraAuth.instance.signIn(email.text, password.text);
        if (mounted) Navigator.pop(context, result);
      } else if (signup) {
        await DooraAuth.instance.signUp(name.text, email.text, password.text);
        if (mounted) setState(() { verifying = true; error = 'E-posta adresine gönderilen 6 haneli kodu gir.'; });
      } else {
        final result = await DooraAuth.instance.signIn(email.text, password.text);
        if (mounted) Navigator.pop(context, result);
      }
    } catch (e) {
      if (mounted) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(leading: IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(PhosphorIconsRegular.arrowLeft))),
    body: SafeArea(child: ListView(padding: const EdgeInsets.fromLTRB(23, 14, 23, 35), children: [
      Container(width: 52, height: 52, alignment: Alignment.center, decoration: BoxDecoration(color: forest, borderRadius: BorderRadius.circular(17)), child: const Text('d.', style: TextStyle(color: white, fontSize: 31, fontWeight: FontWeight.w900, height: 1, letterSpacing: -2))),
      const SizedBox(height: 27),
      Text(verifying ? 'E-postanı doğrula.' : signup ? 'DOORA’ya katıl.' : 'Tekrar hoş geldin.', style: const TextStyle(color: ink, fontSize: 29, fontWeight: FontWeight.w900, letterSpacing: -.8)),
      const SizedBox(height: 9),
      const Text('İşlerini kolaylaştırmak için hesabına devam et.', style: TextStyle(color: muted, fontSize: 13)),
      const SizedBox(height: 29),
      if (signup && !verifying) ...[
        const _FormLabel('Ad soyad'), const SizedBox(height: 7),
        TextField(controller: name, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(hintText: 'Adın ve soyadın')),
        const SizedBox(height: 15),
      ],
      const _FormLabel('E-posta'), const SizedBox(height: 7),
      TextField(controller: email, enabled: !verifying, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(hintText: 'ornek@mail.com')),
      const SizedBox(height: 15),
      if (verifying) ...[
        const _FormLabel('Doğrulama kodu'), const SizedBox(height: 7),
        TextField(controller: otp, keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(counterText: '', hintText: '6 haneli kod')),
      ] else ...[
        const _FormLabel('Şifre'), const SizedBox(height: 7),
        TextField(controller: password, obscureText: obscure, decoration: InputDecoration(hintText: 'Şifren', suffixIcon: IconButton(onPressed: () => setState(() => obscure = !obscure), icon: Icon(obscure ? PhosphorIconsRegular.eye : PhosphorIconsRegular.eyeSlash)))),
      ],
      if (error != null) _ErrorBanner(error!),
      const SizedBox(height: 22),
      _PrimaryButton(label: verifying ? 'E-postayı doğrula' : signup ? 'Hesap oluştur' : 'Giriş yap', busy: busy, onTap: submit),
      if (!verifying) TextButton(onPressed: busy ? null : () => setState(() { signup = !signup; error = null; }), child: Text(signup ? 'Zaten hesabın var mı? Giriş yap' : 'Yeni misin? Hesap oluştur', style: const TextStyle(color: forest, fontWeight: FontWeight.w800))),
      const SizedBox(height: 20),
      const Text('Devam ederek DOORA kullanım koşullarını kabul etmiş olursun.', textAlign: TextAlign.center, style: TextStyle(color: muted, fontSize: 10)),
    ])),
  );
}

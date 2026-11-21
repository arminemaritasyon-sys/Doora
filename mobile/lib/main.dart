import 'package:flutter/material.dart';
import 'models/doora_task.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';

const ink = Color(0xFF171A1C);
const muted = Color(0xFF777E7B);
const green = Color(0xFF28745F);
const canvas = Color(0xFFF6F7F6);

void main() => runApp(const DooraApp());

class DooraApp extends StatefulWidget {
  const DooraApp({super.key});
  @override
  State<DooraApp> createState() => _DooraAppState();
}

class _DooraAppState extends State<DooraApp> {
  Map<String, dynamic>? user;
  bool restoring = true;

  @override
  void initState() { super.initState(); _restore(); }

  Future<void> _restore() async {
    final restored = await DooraAuth.instance.restore();
    if (!mounted) return;
    setState(() { user = restored; restoring = false; });
  }

  Future<void> _openAuth() async {
    final result = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(builder: (_) => const AuthPage()),
    );
    if (result != null && mounted) setState(() => user = result);
  }

  Future<void> _signOut() async {
    await DooraAuth.instance.signOut();
    if (mounted) setState(() => user = null);
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'DOORA', debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true, scaffoldBackgroundColor: canvas,
      colorScheme: ColorScheme.fromSeed(seedColor: green, brightness: Brightness.light),
      appBarTheme: const AppBarTheme(backgroundColor: canvas, foregroundColor: ink, elevation: 0),
    ),
    home: restoring
      ? const Scaffold(body: Center(child: CircularProgressIndicator(color: green)))
      : DooraShell(user: user, onLogin: _openAuth, onSignOut: _signOut),
  );
}

class DooraShell extends StatefulWidget {
  const DooraShell({super.key, required this.user, required this.onLogin, required this.onSignOut});
  final Map<String, dynamic>? user;
  final VoidCallback onLogin, onSignOut;
  @override
  State<DooraShell> createState() => _DooraShellState();
}

class _DooraShellState extends State<DooraShell> {
  int tab = 0;
  @override
  Widget build(BuildContext context) {
    final pages = [
      DiscoverPage(user: widget.user, onLogin: widget.onLogin),
      const PlaceholderPage(title: 'İşlerim', icon: Icons.work_outline_rounded, description: 'Üstlendiğin işler ve verdiğin teklifler burada.'),
      const PlaceholderPage(title: 'Mesajlar', icon: Icons.chat_bubble_outline_rounded, description: 'DOORA konuşmaların burada görünecek.'),
      AccountPage(user: widget.user, onLogin: widget.onLogin, onSignOut: widget.onSignOut),
    ];
    return Scaffold(
      body: IndexedStack(index: tab, children: pages),
      bottomNavigationBar: NavigationBar(
        height: 72, backgroundColor: Colors.white, indicatorColor: const Color(0xFFE7F0EC),
        selectedIndex: tab, onDestinationSelected: (v) => setState(() => tab = v),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.grid_view_rounded), label: 'Keşfet'),
          NavigationDestination(icon: Icon(Icons.work_outline_rounded), label: 'İşlerim'),
          NavigationDestination(icon: Icon(Icons.chat_bubble_outline_rounded), label: 'Mesajlar'),
          NavigationDestination(icon: Icon(Icons.person_outline_rounded), label: 'Hesabım'),
        ],
      ),
    );
  }
}

class DiscoverPage extends StatefulWidget {
  const DiscoverPage({super.key, required this.user, required this.onLogin});
  final Map<String, dynamic>? user;
  final VoidCallback onLogin;
  @override
  State<DiscoverPage> createState() => _DiscoverPageState();
}

class _DiscoverPageState extends State<DiscoverPage> {
  final searchController = TextEditingController();
  List<DooraTask> tasks = [];
  bool loading = true;
  String? error;
  String category = 'Tümü';
  static const categories = ['Tümü', 'Alışveriş', 'Teslimat', 'Ev işleri', 'Taşıma', 'Tamir', 'Diğer'];

  @override
  void initState() { super.initState(); loadTasks(); }
  @override
  void dispose() { searchController.dispose(); super.dispose(); }

  Future<void> loadTasks() async {
    setState(() { loading = true; error = null; });
    try {
      final rows = await DooraApi.instance.getTasks(query: searchController.text, category: category);
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
      color: green, onRefresh: loadTasks,
      child: CustomScrollView(physics: const AlwaysScrollableScrollPhysics(), slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(21, 15, 21, 28),
          sliver: SliverList(delegate: SliverChildListDelegate([
            Row(children: [
              Container(width: 42, height: 42, decoration: BoxDecoration(color: ink, borderRadius: BorderRadius.circular(14)), alignment: Alignment.center,
                child: const Text('D', style: TextStyle(color: Colors.white, fontSize: 23, fontWeight: FontWeight.w800))),
              const SizedBox(width: 11),
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('DOORA', style: TextStyle(color: ink, fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 1.4)),
                SizedBox(height: 2), Text('Günlük işler, kolay çözümler.', style: TextStyle(fontSize: 11, color: muted)),
              ]),
              const Spacer(),
              IconButton(
                onPressed: widget.user == null ? widget.onLogin : () {},
                style: IconButton.styleFrom(backgroundColor: Colors.white, foregroundColor: ink),
                icon: Icon(widget.user == null ? Icons.login_rounded : Icons.notifications_none_rounded),
              ),
            ]),
            const SizedBox(height: 31),
            const Text('Bugün neye\nihtiyacın var?', style: TextStyle(fontSize: 31, height: 1.12, letterSpacing: -1.1, fontWeight: FontWeight.w800, color: ink)),
            const SizedBox(height: 10),
            const Text('İhtiyacını paylaş, yakındaki çözümleri keşfet.', style: TextStyle(color: muted, fontSize: 13, height: 1.45)),
            const SizedBox(height: 21),
            Container(height: 54, padding: const EdgeInsets.symmetric(horizontal: 15),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE9ECEA))),
              child: Row(children: [
                const Icon(Icons.search_rounded, color: muted, size: 21), const SizedBox(width: 9),
                Expanded(child: TextField(controller: searchController, textInputAction: TextInputAction.search, onSubmitted: (_) => loadTasks(),
                  decoration: const InputDecoration(border: InputBorder.none, hintText: 'Hangi hizmete ihtiyacın var?', hintStyle: TextStyle(color: Color(0xFF9A9F9D), fontSize: 13)))),
                IconButton(onPressed: loadTasks, icon: const Icon(Icons.arrow_forward_rounded, size: 19)),
              ]),
            ),
            const SizedBox(height: 27),
            const Text('Kategoriler', style: TextStyle(color: ink, fontSize: 17, fontWeight: FontWeight.w800)),
            const SizedBox(height: 13),
            SizedBox(height: 40, child: ListView.separated(
              scrollDirection: Axis.horizontal, itemCount: categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final item = categories[index];
                final selected = category == item;
                return ChoiceChip(
                  label: Text(item), selected: selected,
                  onSelected: (_) { setState(() => category = item); loadTasks(); },
                  selectedColor: const Color(0xFFE3EFE9), backgroundColor: Colors.white,
                  side: BorderSide(color: selected ? const Color(0xFFB7D4C6) : const Color(0xFFE7EAE8)),
                  labelStyle: TextStyle(color: selected ? green : const Color(0xFF4D5551), fontSize: 11, fontWeight: FontWeight.w600),
                  showCheckmark: false, padding: const EdgeInsets.symmetric(horizontal: 5),
                );
              },
            )),
            const SizedBox(height: 27),
            Row(children: [
              const Expanded(child: Text('Yakınındaki işler', style: TextStyle(color: ink, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -.3))),
              Text(tasks.length.toString() + ' ilan', style: const TextStyle(color: muted, fontSize: 11)),
            ]),
            const SizedBox(height: 14),
            if (loading) const Padding(padding: EdgeInsets.symmetric(vertical: 45), child: Center(child: CircularProgressIndicator(color: green)))
            else if (error != null) _StateMessage(icon: Icons.wifi_off_rounded, title: 'İlanlar yüklenemedi', message: error!, action: 'Tekrar dene', onTap: loadTasks)
            else if (tasks.isEmpty) const _StateMessage(icon: Icons.search_off_rounded, title: 'Henüz ilan bulunamadı', message: 'Aramanı veya kategori seçimini değiştirebilirsin.')
            else ...tasks.map((task) => Padding(
              padding: const EdgeInsets.only(bottom: 11),
              child: JobCard(task: task, onTap: () => showModalBottomSheet(
                context: context, isScrollControlled: true, backgroundColor: Colors.transparent,
                builder: (_) => TaskDetailSheet(task: task, signedIn: widget.user != null, onLogin: widget.onLogin),
              )),
            )),
          ])),
        ),
      ]),
    ),
  );
}

class JobCard extends StatelessWidget {
  const JobCard({super.key, required this.task, required this.onTap});
  final DooraTask task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white, borderRadius: BorderRadius.circular(18),
    child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(18),
      child: Container(padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFE9ECEA))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(width: 40, height: 40, decoration: BoxDecoration(color: const Color(0xFFF0F5F2), borderRadius: BorderRadius.circular(13)), child: Icon(categoryIcon(task.category), color: green, size: 20)),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(task.category.toUpperCase(), style: const TextStyle(color: green, fontSize: 9, letterSpacing: .8, fontWeight: FontWeight.w800)),
              const SizedBox(height: 3),
              Text(task.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: ink, fontSize: 14, fontWeight: FontWeight.w700)),
            ])),
            Text(task.formattedBudget, style: const TextStyle(color: ink, fontSize: 14, fontWeight: FontWeight.w800)),
          ]),
          const SizedBox(height: 11),
          Text(task.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: muted, fontSize: 12, height: 1.45)),
          const SizedBox(height: 13),
          Row(children: [
            const Icon(Icons.location_on_outlined, color: muted, size: 14), const SizedBox(width: 3),
            Expanded(child: Text(task.location, style: const TextStyle(color: muted, fontSize: 10))),
            const Icon(Icons.schedule_rounded, color: muted, size: 13), const SizedBox(width: 4),
            Text(task.time, style: const TextStyle(color: muted, fontSize: 10)),
            const SizedBox(width: 9), const Icon(Icons.chat_bubble_outline_rounded, color: muted, size: 13),
            const SizedBox(width: 3), Text(task.offers.toString(), style: const TextStyle(color: muted, fontSize: 10)),
          ]),
          const SizedBox(height: 13), Container(height: 1, color: const Color(0xFFF0F1F0)), const SizedBox(height: 11),
          Row(children: [
            CircleAvatar(radius: 12, backgroundColor: const Color(0xFFE8EFEB),
              child: Text(task.owner.isNotEmpty ? task.owner.substring(0, 1).toUpperCase() : 'D', style: const TextStyle(color: green, fontSize: 10, fontWeight: FontWeight.w800))),
            const SizedBox(width: 7),
            Expanded(child: Text(task.owner, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF4E5552), fontSize: 11, fontWeight: FontWeight.w600))),
            const Text('Detayları gör', style: TextStyle(color: green, fontSize: 11, fontWeight: FontWeight.w700)),
            const SizedBox(width: 3), const Icon(Icons.arrow_forward_rounded, size: 14, color: green),
          ]),
        ]),
      ),
    ),
  );
}

IconData categoryIcon(String category) {
  final value = category.toLowerCase();
  if (value.contains('alış')) return Icons.shopping_bag_outlined;
  if (value.contains('teslim')) return Icons.local_shipping_outlined;
  if (value.contains('taşı')) return Icons.move_to_inbox_outlined;
  if (value.contains('tamir')) return Icons.handyman_outlined;
  if (value.contains('ev') || value.contains('temiz')) return Icons.home_repair_service_outlined;
  return Icons.bolt_outlined;
}

class TaskDetailSheet extends StatelessWidget {
  const TaskDetailSheet({super.key, required this.task, required this.signedIn, required this.onLogin});
  final DooraTask task;
  final bool signedIn;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) => Container(
    padding: EdgeInsets.fromLTRB(22, 12, 22, MediaQuery.of(context).viewInsets.bottom + 25),
    decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(25))),
    child: SafeArea(top: false, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      Center(child: Container(width: 38, height: 4, decoration: BoxDecoration(color: const Color(0xFFDADFDA), borderRadius: BorderRadius.circular(8)))),
      const SizedBox(height: 23),
      Text(task.category.toUpperCase(), style: const TextStyle(color: green, fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.w800)),
      const SizedBox(height: 7),
      Text(task.title, style: const TextStyle(color: ink, fontSize: 23, fontWeight: FontWeight.w800)),
      const SizedBox(height: 13),
      Text(task.description, style: const TextStyle(color: muted, fontSize: 14, height: 1.55)),
      const SizedBox(height: 18),
      Row(children: [
        const Icon(Icons.location_on_outlined, color: green, size: 18), const SizedBox(width: 5),
        Text(task.location, style: const TextStyle(color: ink, fontSize: 12)),
        const Spacer(), Text(task.formattedBudget, style: const TextStyle(color: ink, fontSize: 18, fontWeight: FontWeight.w800)),
      ]),
      const SizedBox(height: 20),
      SizedBox(width: double.infinity, child: FilledButton(
        onPressed: () {
          Navigator.pop(context);
          if (!signedIn) onLogin();
          else ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Teklif gönderme ekranı sonraki geliştirme adımında bağlanacak.')));
        },
        style: FilledButton.styleFrom(backgroundColor: ink, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16)),
        child: Text(signedIn ? 'Ben yaparım' : 'Giriş yap ve teklif ver'),
      )),
    ])),
  );
}

class AuthPage extends StatefulWidget {
  const AuthPage({super.key});
  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final email = TextEditingController(), password = TextEditingController();
  final name = TextEditingController(), otp = TextEditingController();
  bool signup = false, verifying = false, busy = false;
  String? error;

  @override
  void dispose() { email.dispose(); password.dispose(); name.dispose(); otp.dispose(); super.dispose(); }

  Future<void> submit() async {
    setState(() { busy = true; error = null; });
    try {
      if (verifying) {
        await DooraAuth.instance.verifyEmail(email.text, otp.text);
        final user = await DooraAuth.instance.signIn(email.text, password.text);
        if (mounted) Navigator.pop(context, user);
      } else if (signup) {
        await DooraAuth.instance.signUp(name.text, email.text, password.text);
        if (mounted) setState(() { verifying = true; error = 'E-posta adresine gönderilen 6 haneli kodu gir.'; });
      } else {
        final user = await DooraAuth.instance.signIn(email.text, password.text);
        if (mounted) Navigator.pop(context, user);
      }
    } catch (e) {
      if (mounted) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(leading: IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.arrow_back_rounded))),
    body: SafeArea(child: ListView(padding: const EdgeInsets.fromLTRB(25, 25, 25, 35), children: [
      Container(width: 48, height: 48, alignment: Alignment.center, decoration: BoxDecoration(color: ink, borderRadius: BorderRadius.circular(15)),
        child: const Text('D', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800))),
      const SizedBox(height: 27),
      Text(verifying ? 'E-postanı doğrula.' : signup ? 'Aramıza katıl.' : 'Tekrar merhaba.', style: const TextStyle(color: ink, fontSize: 29, fontWeight: FontWeight.w800, letterSpacing: -.8)),
      const SizedBox(height: 9),
      Text(verifying ? 'E-posta adresine gönderilen 6 haneli kodu gir.' : 'DOORA hesabınla giriş yap veya yeni hesap oluştur.', style: const TextStyle(color: muted, fontSize: 13, height: 1.5)),
      const SizedBox(height: 29),
      if (signup && !verifying) _AuthField(label: 'Ad soyad', controller: name, icon: Icons.person_outline_rounded),
      _AuthField(label: 'E-posta', controller: email, icon: Icons.mail_outline_rounded, keyboard: TextInputType.emailAddress, enabled: !verifying),
      if (verifying) _AuthField(label: '6 haneli kod', controller: otp, icon: Icons.verified_outlined, keyboard: TextInputType.number, maxLength: 6)
      else _AuthField(label: 'Şifre', controller: password, icon: Icons.lock_outline_rounded, obscure: true),
      if (error != null) Container(margin: const EdgeInsets.only(top: 8, bottom: 10), padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFFFFF0EE), borderRadius: BorderRadius.circular(12)),
        child: Text(error!, style: const TextStyle(color: Color(0xFF9C3D32), fontSize: 12))),
      const SizedBox(height: 12),
      SizedBox(height: 52, child: FilledButton(
        onPressed: busy ? null : submit,
        style: FilledButton.styleFrom(backgroundColor: ink, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
        child: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
          : Text(verifying ? 'E-postayı doğrula' : signup ? 'Hesap oluştur' : 'Giriş yap'),
      )),
      if (!verifying) TextButton(
        onPressed: busy ? null : () => setState(() { signup = !signup; error = null; }),
        child: Text(signup ? 'Zaten hesabın var mı? Giriş yap' : 'Hesabın yok mu? Kayıt ol', style: const TextStyle(color: green, fontWeight: FontWeight.w700)),
      ),
    ])),
  );
}

class _AuthField extends StatelessWidget {
  const _AuthField({required this.label, required this.controller, required this.icon, this.keyboard, this.obscure = false, this.enabled = true, this.maxLength});
  final String label;
  final TextEditingController controller;
  final IconData icon;
  final TextInputType? keyboard;
  final bool obscure, enabled;
  final int? maxLength;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(color: ink, fontSize: 12, fontWeight: FontWeight.w700)),
      const SizedBox(height: 7),
      TextField(
        controller: controller, enabled: enabled, keyboardType: keyboard, obscureText: obscure, maxLength: maxLength,
        decoration: InputDecoration(
          counterText: '', prefixIcon: Icon(icon, size: 19, color: muted), filled: true, fillColor: Colors.white, hintText: label,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE6EAE7))),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE6EAE7))),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: green, width: 1.4)),
        ),
      ),
    ]),
  );
}

class AccountPage extends StatelessWidget {
  const AccountPage({super.key, required this.user, required this.onLogin, required this.onSignOut});
  final Map<String, dynamic>? user;
  final VoidCallback onLogin, onSignOut;

  @override
  Widget build(BuildContext context) {
    final name = user?['name']?.toString() ?? 'DOORA üyesi';
    final email = user?['email']?.toString() ?? '';
    return SafeArea(child: ListView(padding: const EdgeInsets.all(22), children: [
      const Text('Hesabım', style: TextStyle(color: ink, fontSize: 27, fontWeight: FontWeight.w800)),
      const SizedBox(height: 22),
      Container(padding: const EdgeInsets.all(18), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFE9ECEA))),
        child: Row(children: [
          CircleAvatar(radius: 25, backgroundColor: const Color(0xFFE7F0EC),
            child: Text(user == null ? 'D' : name.substring(0, 1).toUpperCase(), style: const TextStyle(color: green, fontWeight: FontWeight.w800, fontSize: 18))),
          const SizedBox(width: 13),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(user == null ? 'DOORA’ya hoş geldin' : name, style: const TextStyle(color: ink, fontSize: 15, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4), Text(user == null ? 'İşlerini tek yerden yönet.' : email, style: const TextStyle(color: muted, fontSize: 11)),
          ])),
        ]),
      ),
      const SizedBox(height: 17),
      if (user == null) FilledButton(onPressed: onLogin, style: FilledButton.styleFrom(backgroundColor: ink, padding: const EdgeInsets.symmetric(vertical: 15)), child: const Text('Giriş yap / Kayıt ol'))
      else OutlinedButton.icon(onPressed: onSignOut, icon: const Icon(Icons.logout_rounded), label: const Text('Çıkış yap'),
        style: OutlinedButton.styleFrom(foregroundColor: ink, padding: const EdgeInsets.symmetric(vertical: 15))),
    ]));
  }
}

class PlaceholderPage extends StatelessWidget {
  const PlaceholderPage({super.key, required this.title, required this.icon, required this.description});
  final String title, description;
  final IconData icon;

  @override
  Widget build(BuildContext context) => SafeArea(child: Center(child: Padding(
    padding: const EdgeInsets.all(32),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 68, height: 68, decoration: BoxDecoration(color: const Color(0xFFE7F0EC), borderRadius: BorderRadius.circular(22)), child: Icon(icon, size: 30, color: green)),
      const SizedBox(height: 18),
      Text(title, style: const TextStyle(color: ink, fontSize: 22, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8),
      Text(description, textAlign: TextAlign.center, style: const TextStyle(color: muted, fontSize: 13, height: 1.5)),
    ]),
  )));
}

class _StateMessage extends StatelessWidget {
  const _StateMessage({required this.icon, required this.title, required this.message, this.action, this.onTap});
  final IconData icon;
  final String title, message;
  final String? action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 35), child: Column(children: [
    Icon(icon, size: 30, color: muted), const SizedBox(height: 12),
    Text(title, style: const TextStyle(color: ink, fontWeight: FontWeight.w800)),
    const SizedBox(height: 6),
    Text(message, textAlign: TextAlign.center, style: const TextStyle(color: muted, fontSize: 12, height: 1.4)),
    if (action != null) TextButton(onPressed: onTap, child: Text(action!, style: const TextStyle(color: green, fontWeight: FontWeight.w700))),
  ]));
}

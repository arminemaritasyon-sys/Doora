import 'package:flutter/material.dart';

void main() => runApp(const DooraApp());

class DooraApp extends StatelessWidget {
  const DooraApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'DOORA',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          scaffoldBackgroundColor: const Color(0xFFF6F7F6),
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF28745F),
            brightness: Brightness.light,
          ),
          fontFamily: 'Roboto',
        ),
        home: const DooraShell(),
      );
}

class DooraShell extends StatefulWidget {
  const DooraShell({super.key});
  @override
  State<DooraShell> createState() => _DooraShellState();
}

class _DooraShellState extends State<DooraShell> {
  int tab = 0;
  static const pages = [DiscoverPage(), PlaceholderPage(title: 'İşlerim', icon: Icons.work_outline_rounded, description: 'Üstlendiğin işler ve verdiğin teklifler burada.'), PlaceholderPage(title: 'Mesajlar', icon: Icons.chat_bubble_outline_rounded, description: 'Konuşmaların burada görünecek.'), PlaceholderPage(title: 'Hesabım', icon: Icons.person_outline_rounded, description: 'Profilini, portföyünü ve hesap ayarlarını yönet.')];

  @override
  Widget build(BuildContext context) => Scaffold(
        body: IndexedStack(index: tab, children: pages),
        bottomNavigationBar: NavigationBar(
          height: 72,
          backgroundColor: Colors.white,
          indicatorColor: const Color(0xFFE7F0EC),
          selectedIndex: tab,
          onDestinationSelected: (value) => setState(() => tab = value),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.grid_view_rounded), label: 'Keşfet'),
            NavigationDestination(icon: Icon(Icons.work_outline_rounded), label: 'İşlerim'),
            NavigationDestination(icon: Icon(Icons.chat_bubble_outline_rounded), label: 'Mesajlar'),
            NavigationDestination(icon: Icon(Icons.person_outline_rounded), label: 'Hesabım'),
          ],
        ),
      );
}

class DiscoverPage extends StatelessWidget {
  const DiscoverPage({super.key});

  @override
  Widget build(BuildContext context) => SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(22, 16, 22, 30),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  Row(children: [
                    Container(
                      width: 42, height: 42,
                      decoration: BoxDecoration(color: const Color(0xFF171A1C), borderRadius: BorderRadius.circular(14)),
                      alignment: Alignment.center,
                      child: const Text('D', style: TextStyle(color: Colors.white, fontSize: 23, fontWeight: FontWeight.w800)),
                    ),
                    const SizedBox(width: 11),
                    const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('DOORA', style: TextStyle(color: Color(0xFF171A1C), fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 1.4)),
                      SizedBox(height: 2),
                      Row(children: [Icon(Icons.location_on_outlined, size: 13, color: Color(0xFF777E7B)), SizedBox(width: 3), Text('Konumun seçilmedi', style: TextStyle(fontSize: 11, color: Color(0xFF777E7B)))]),
                    ]),
                    const Spacer(),
                    IconButton(
                      onPressed: () {},
                      style: IconButton.styleFrom(backgroundColor: Colors.white, foregroundColor: const Color(0xFF171A1C)),
                      icon: const Icon(Icons.notifications_none_rounded),
                    ),
                  ]),
                  const SizedBox(height: 34),
                  const Text('Bugün neye\nihtiyacın var?', style: TextStyle(fontSize: 31, height: 1.12, letterSpacing: -1.1, fontWeight: FontWeight.w800, color: Color(0xFF171A1C))),
                  const SizedBox(height: 11),
                  const Text('İhtiyacını bul, güvenilir bir hizmet verenle buluş.', style: TextStyle(color: Color(0xFF777E7B), fontSize: 13, height: 1.45)),
                  const SizedBox(height: 22),
                  Container(
                    height: 54, padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE9ECEA))),
                    child: const Row(children: [Icon(Icons.search_rounded, color: Color(0xFF777E7B), size: 21), SizedBox(width: 10), Text('Hangi hizmete ihtiyacın var?', style: TextStyle(color: Color(0xFF9A9F9D), fontSize: 13))]),
                  ),
                  const SizedBox(height: 30),
                  const Text('Kategoriler', style: TextStyle(color: Color(0xFF171A1C), fontSize: 17, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 15),
                  const CategoryGrid(),
                  const SizedBox(height: 30),
                  const Text('Yakınındaki işler', style: TextStyle(color: Color(0xFF171A1C), fontSize: 17, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 14),
                  const JobCard(category: 'TEMİZLİK', title: '2+1 ev temizliği', detail: 'Boş ev · Yarın', price: '1.200 ₺', icon: Icons.cleaning_services_outlined),
                  const SizedBox(height: 12),
                  const JobCard(category: 'MONTAJ', title: 'Gardırop kurulumu', detail: '2 kapılı gardırop · Bugün', price: '750 ₺', icon: Icons.handyman_outlined),
                ]),
              ),
            ),
          ],
        ),
      );
}

class CategoryGrid extends StatelessWidget {
  const CategoryGrid({super.key});
  static const entries = [
    (Icons.cleaning_services_outlined, 'Temizlik'),
    (Icons.plumbing_outlined, 'Tesisat'),
    (Icons.electrical_services_outlined, 'Elektrik'),
    (Icons.format_paint_outlined, 'Boya'),
    (Icons.local_shipping_outlined, 'Nakliye'),
    (Icons.more_horiz_rounded, 'Diğer'),
  ];

  @override
  Widget build(BuildContext context) => GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: entries.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.12),
        itemBuilder: (context, index) => Container(
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(17), border: Border.all(color: const Color(0xFFE9ECEA))),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(entries[index].$1, size: 24, color: const Color(0xFF28745F)),
            const SizedBox(height: 9),
            Text(entries[index].$2, style: const TextStyle(color: Color(0xFF343A37), fontSize: 11, fontWeight: FontWeight.w600)),
          ]),
        ),
      );
}

class JobCard extends StatelessWidget {
  const JobCard({super.key, required this.category, required this.title, required this.detail, required this.price, required this.icon});
  final String category, title, detail, price;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFE9ECEA))),
        child: Row(children: [
          Container(width: 48, height: 48, decoration: BoxDecoration(color: const Color(0xFFF0F5F2), borderRadius: BorderRadius.circular(14)), child: Icon(icon, color: const Color(0xFF28745F), size: 22)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(category, style: const TextStyle(color: Color(0xFF28745F), fontSize: 9, letterSpacing: .8, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(title, style: const TextStyle(color: Color(0xFF171A1C), fontSize: 13, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(detail, style: const TextStyle(color: Color(0xFF858B88), fontSize: 10)),
          ])),
          Text(price, style: const TextStyle(color: Color(0xFF171A1C), fontSize: 13, fontWeight: FontWeight.w800)),
        ]),
      );
}

class PlaceholderPage extends StatelessWidget {
  const PlaceholderPage({super.key, required this.title, required this.icon, required this.description});
  final String title, description;
  final IconData icon;

  @override
  Widget build(BuildContext context) => SafeArea(
        child: Center(child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 68, height: 68, decoration: BoxDecoration(color: const Color(0xFFE7F0EC), borderRadius: BorderRadius.circular(22)), child: Icon(icon, size: 30, color: const Color(0xFF28745F))),
            const SizedBox(height: 18),
            Text(title, style: const TextStyle(color: Color(0xFF171A1C), fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(description, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF777E7B), fontSize: 13, height: 1.5)),
          ]),
        )),
      );
}

import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'services/api_client.dart';

const _ink = Color(0xFF20251F);
const _muted = Color(0xFF586357);
const _line = Color(0xFFE7ECE5);
const _paper = Color(0xFFF7F9F5);
const _green = Color(0xFF9DB99A);
const _forest = Color(0xFF648B65);

class ProviderProfilePage extends StatefulWidget {
  const ProviderProfilePage({
    super.key,
    required this.userId,
    required this.fallbackName,
    this.currentUserId,
  });

  final String userId;
  final String fallbackName;
  final String? currentUserId;

  @override
  State<ProviderProfilePage> createState() => _ProviderProfilePageState();
}

class _ProviderProfilePageState extends State<ProviderProfilePage> {
  Map<String, dynamic> profile = {};
  List<Map<String, dynamic>> portfolio = [];
  List<Map<String, dynamic>> openTasks = [];
  Map<String, dynamic> reviewData = {};
  bool loading = true;
  bool uploading = false;
  String? error;

  bool get isOwnProfile =>
      widget.currentUserId != null && widget.currentUserId == widget.userId;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    if (widget.userId.trim().isEmpty) {
      if (mounted) setState(() { loading = false; error = 'Hizmet veren bilgisi bulunamadı.'; });
      return;
    }
    if (mounted) setState(() { loading = true; error = null; });
    try {
      // Profil ana içeriktir. Portföy ve yorum servislerinden biri geçici
      // olarak hata verse bile hizmet veren sayfası tamamen kapanmamalı.
      final publicProfile = await DooraApi.instance.getPublicProfile(widget.userId);
      if (publicProfile.isEmpty) throw StateError('Hizmet veren profili bulunamadı.');
      List<Map<String, dynamic>> works = [];
      Map<String, dynamic> reviews = {};
      try { works = await DooraApi.instance.getPortfolio(widget.userId); } catch (_) {}
      try { reviews = await DooraApi.instance.getProviderReviews(widget.userId); } catch (_) {}
      if (!mounted) return;
      setState(() {
        profile = publicProfile;
        portfolio = works;
        final rawTasks = publicProfile['openTasks'];
        openTasks = rawTasks is List ? rawTasks.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : [];
        reviewData = reviews;
      });
    } catch (e) {
      if (mounted) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> addWork() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 82,
      maxWidth: 1440,
    );
    if (image == null || !mounted) return;

    final bytes = await File(image.path).readAsBytes();
    if (bytes.length > 1300000) {
      _toast('Görsel çok büyük. Daha küçük bir fotoğraf seç.');
      return;
    }

    final title = TextEditingController();
    final description = TextEditingController();
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
        ),
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Portföye çalışma ekle', style: TextStyle(
                  color: _ink, fontSize: 18, fontWeight: FontWeight.w900,
                )),
                const SizedBox(height: 14),
                TextField(controller: title, maxLength: 100,
                  decoration: const InputDecoration(labelText: 'Çalışma başlığı')),
                const SizedBox(height: 8),
                TextField(controller: description, maxLength: 500, maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Kısa açıklama')),
                const SizedBox(height: 14),
                SizedBox(width: double.infinity, child: FilledButton(
                  onPressed: () => Navigator.pop(sheetContext, true),
                  style: FilledButton.styleFrom(backgroundColor: _forest),
                  child: const Text('Portföye ekle'),
                )),
              ],
            ),
          ),
        ),
      ),
    );
    if (!mounted) return;
    if (confirmed != true) return;
    if (title.text.trim().length < 2) {
      title.dispose();
      description.dispose();
      _toast('Çalışma başlığı en az 2 karakter olmalı.');
      return;
    }

    setState(() => uploading = true);
    try {
      final extension = image.name.toLowerCase();
      final mime = extension.endsWith('.png')
          ? 'image/png'
          : extension.endsWith('.webp')
              ? 'image/webp'
              : 'image/jpeg';
      await DooraApi.instance.addPortfolioItem(
        title: title.text,
        description: description.text,
        imageData: 'data:$mime;base64,${base64Encode(bytes)}',
      );
      await load();
      if (mounted) _toast('Çalışman portföyüne eklendi.');
    } catch (e) {
      if (mounted) _toast(DooraApi.instance.errorMessage(e));
    } finally {
      title.dispose();
      description.dispose();
      if (mounted) setState(() => uploading = false);
    }
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      behavior: SnackBarBehavior.floating,
      backgroundColor: _ink,
    ));
  }

  ImageProvider? _avatarProvider(String raw) {
    if (raw.isEmpty) return null;
    if (raw.startsWith('data:image/')) {
      try { return MemoryImage(base64Decode(raw.substring(raw.indexOf(',') + 1))); } catch (_) { return null; }
    }
    return NetworkImage(DooraApi.instance.absoluteUrl(raw));
  }

  Widget _portfolioCard(Map<String, dynamic> item) {
    final raw = item['imageData']?.toString() ?? item['image_data']?.toString() ?? '';
    final encoded = raw.contains(',') ? raw.substring(raw.indexOf(',') + 1) : raw;
    Widget picture;
    try {
      picture = Image.memory(base64Decode(encoded), fit: BoxFit.cover);
    } catch (_) {
      picture = const ColoredBox(
        color: Color(0xFFEDF1E9),
        child: Center(child: Icon(Icons.image_outlined, color: _forest, size: 30)),
      );
    }
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _line),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        AspectRatio(aspectRatio: 1.18, child: picture),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 11, 12, 13),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(item['title']?.toString() ?? 'Çalışma',
              maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: _ink, fontSize: 12, fontWeight: FontWeight.w900)),
            if ((item['description']?.toString() ?? '').isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(item['description'].toString(), maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: _muted, fontSize: 9, height: 1.4)),
            ],
          ]),
        ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final name = profile['name']?.toString().trim().isNotEmpty == true
        ? profile['name'].toString()
        : widget.fallbackName;
    final bio = profile['bio']?.toString() ?? '';
    final district = profile['district']?.toString() ?? '';
    final verified = profile['isVerified'] == true;
    final summary = reviewData['summary'] is Map
        ? Map<String, dynamic>.from(reviewData['summary'] as Map)
        : <String, dynamic>{};
    final reviews = reviewData['reviews'] is List
        ? List<Map<String, dynamic>>.from((reviewData['reviews'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)))
        : <Map<String, dynamic>>[];
    final average = num.tryParse(summary['average']?.toString() ?? '') ?? 0;
    final reviewCount = int.tryParse(summary['count']?.toString() ?? '') ?? 0;
    final avatar = profile['avatarUrl']?.toString() ?? '';

    return Scaffold(
      backgroundColor: _paper,
      appBar: AppBar(
        backgroundColor: _paper,
        title: const Text('Hizmet veren profili', style: TextStyle(
          color: _ink, fontSize: 16, fontWeight: FontWeight.w900,
        )),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: _forest))
          : error != null
              ? Padding(
                  padding: const EdgeInsets.all(18),
                  child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.cloud_off_outlined, color: _muted, size: 32),
                    const SizedBox(height: 10),
                    Text(error!, textAlign: TextAlign.center,
                      style: const TextStyle(color: _muted, fontSize: 12)),
                    TextButton(onPressed: load, child: const Text('Tekrar dene')),
                  ])),
                )
              : RefreshIndicator(
                  color: _forest,
                  onRefresh: load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 30),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(color: _line),
                        ),
                        child: Column(children: [
                          CircleAvatar(
                            radius: 39,
                            backgroundColor: const Color(0xFFEDF1E9),
                            backgroundImage: _avatarProvider(avatar),
                            child: avatar.isEmpty
                                ? Text(name.isEmpty ? 'D' : name.characters.first.toUpperCase(),
                                    style: const TextStyle(color: _forest, fontSize: 25, fontWeight: FontWeight.w900))
                                : null,
                          ),
                          const SizedBox(height: 12),
                          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Flexible(child: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: _ink, fontSize: 17, fontWeight: FontWeight.w900))),
                            if (verified) ...[
                              const SizedBox(width: 6),
                              const Icon(Icons.verified, color: Color(0xFF86A989), size: 18),
                            ],
                          ]),
                          if (verified) const Padding(
                            padding: EdgeInsets.only(top: 4),
                            child: Text('Doğrulanmış kullanıcı', style: TextStyle(
                              color: Color(0xFF86A989), fontSize: 9, fontWeight: FontWeight.w800,
                            )),
                          ),
                          if (district.isNotEmpty) Padding(
                            padding: const EdgeInsets.only(top: 7),
                            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                              const Icon(Icons.location_on_outlined, color: _muted, size: 14),
                              const SizedBox(width: 3),
                              Text(district, style: const TextStyle(color: _muted, fontSize: 10)),
                            ]),
                          ),
                          if (bio.isNotEmpty) Padding(
                            padding: const EdgeInsets.only(top: 12),
                            child: Text(bio, textAlign: TextAlign.center,
                              style: const TextStyle(color: _muted, fontSize: 11, height: 1.5)),
                          ),
                        ]),
                      ),
                      const SizedBox(height: 16),
                      Row(children: [
                        Expanded(child: _profileMetric(
                          'Tamamlanan işler',
                          (profile['completedTasks'] ?? profile['completed_tasks'] ?? profile['completedCount'] ?? profile['completed_count'] ?? '—').toString(),
                        )),
                        const SizedBox(width: 9),
                        Expanded(child: _profileMetric('Değerlendirme', reviewCount.toString())),
                        const SizedBox(width: 9),
                        Expanded(child: _profileMetric('Portföy', portfolio.length.toString())),
                      ]),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(15),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: _line),
                        ),
                        child: Row(children: [
                          const Icon(Icons.star_rounded, color: Color(0xFFE0A83E), size: 25),
                          const SizedBox(width: 8),
                          Text(average.toStringAsFixed(1), style: const TextStyle(
                            color: _ink, fontSize: 20, fontWeight: FontWeight.w900,
                          )),
                          const SizedBox(width: 8),
                          Expanded(child: Text(
                            reviewCount == 0 ? 'Henüz değerlendirme yok' : '$reviewCount müşteri değerlendirmesi',
                            style: const TextStyle(color: _muted, fontSize: 10),
                          )),
                        ]),
                      ),
                      if (openTasks.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        Row(children: [
                          const Expanded(child: Text('Açık ilanları', style: TextStyle(
                            color: _ink, fontSize: 16, fontWeight: FontWeight.w900,
                          ))),
                          Text('${openTasks.length} ilan', style: const TextStyle(
                            color: _muted, fontSize: 10, fontWeight: FontWeight.w700,
                          )),
                        ]),
                        const SizedBox(height: 10),
                        ...openTasks.map((task) => Container(
                          margin: const EdgeInsets.only(bottom: 9),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(17),
                            border: Border.all(color: _line),
                          ),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            if (task['images'] is List && (task['images'] as List).isNotEmpty) ...[
                              ClipRRect(borderRadius: BorderRadius.circular(12),child: AspectRatio(aspectRatio: 2.2,child: Image.network(
                                DooraApi.instance.absoluteUrl(((task['images'] as List).first is Map ? ((task['images'] as List).first as Map)['url'] : (task['images'] as List).first).toString()),
                                fit: BoxFit.cover,width: double.infinity,
                                errorBuilder: (_,__,___) => const ColoredBox(color: Color(0xFFE4EDE0),child: SizedBox(height:110,child: Center(child: Icon(Icons.image_outlined,color: _forest,size:28)))),
                              ))),
                              const SizedBox(height:10),
                            ],
                            Row(children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                                decoration: BoxDecoration(color: const Color(0xFFE4EDE0), borderRadius: BorderRadius.circular(20)),
                                child: Text(task['category']?.toString() ?? 'Hizmet',
                                  style: const TextStyle(color: _ink, fontSize: 9, fontWeight: FontWeight.w800)),
                              ),
                              const Spacer(),
                              Text('${task['budget'] ?? ''} ₺', style: const TextStyle(
                                color: _ink, fontSize: 13, fontWeight: FontWeight.w900,
                              )),
                            ]),
                            const SizedBox(height: 8),
                            Text(task['title']?.toString() ?? 'İlan',
                              style: const TextStyle(color: _ink, fontSize: 12, fontWeight: FontWeight.w900)),
                            if ((task['description']?.toString() ?? '').isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(task['description'].toString(), maxLines: 2, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: _muted, fontSize: 10, height: 1.4)),
                            ],
                            const SizedBox(height: 7),
                            Row(children: [
                              const Icon(Icons.location_on_outlined, color: _muted, size: 13),
                              const SizedBox(width: 3),
                              Text('${task['location'] ?? task['city'] ?? district}', style: const TextStyle(color: _muted, fontSize: 9)),
                              const Spacer(),
                              Text('${task['offers'] ?? 0} teklif', style: const TextStyle(color: _forest, fontSize: 9, fontWeight: FontWeight.w800)),
                            ]),
                          ]),
                        )),
                      ],
                      if (reviews.isNotEmpty) ...[
                        const SizedBox(height: 18),
                        const Text('Müşteri yorumları', style: TextStyle(
                          color: _ink, fontSize: 15, fontWeight: FontWeight.w900,
                        )),
                        const SizedBox(height: 9),
                        ...reviews.take(5).map((review) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(13),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(15),
                            border: Border.all(color: _line),
                          ),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Expanded(child: Text(review['reviewer_name']?.toString() ?? 'DOORA üyesi',
                                style: const TextStyle(color: _ink, fontSize: 10, fontWeight: FontWeight.w800))),
                              Text('★ ${review['rating'] ?? 0}', style: const TextStyle(
                                color: Color(0xFFB17A20), fontSize: 10, fontWeight: FontWeight.w900,
                              )),
                            ]),
                            if ((review['comment']?.toString() ?? '').isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(review['comment'].toString(), style: const TextStyle(
                                color: _muted, fontSize: 10, height: 1.45,
                              )),
                            ],
                            if ((review['task_title']?.toString() ?? '').isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(review['task_title'].toString(), style: const TextStyle(
                                color: _forest, fontSize: 8, fontWeight: FontWeight.w700,
                              )),
                            ],
                          ]),
                        )),
                      ],
                      const SizedBox(height: 20),
                      Row(children: [
                        const Expanded(child: Text('Hizmet portföyü', style: TextStyle(
                          color: _ink, fontSize: 16, fontWeight: FontWeight.w900,
                        ))),
                        Text('${portfolio.length}/24', style: const TextStyle(
                          color: _muted, fontSize: 10, fontWeight: FontWeight.w700,
                        )),
                      ]),
                      const SizedBox(height: 11),
                      if (portfolio.isEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 18),
                          decoration: BoxDecoration(
                            color: Colors.white, borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: _line),
                          ),
                          child: const Column(children: [
                            Icon(Icons.photo_library_outlined, color: _green, size: 30),
                            SizedBox(height: 9),
                            Text('Henüz portföy çalışması yok', style: TextStyle(
                              color: _ink, fontSize: 12, fontWeight: FontWeight.w800,
                            )),
                            SizedBox(height: 4),
                            Text('Tamamlanan işlerini burada sergileyebilirsin.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: _muted, fontSize: 10)),
                          ]),
                        )
                      else
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: portfolio.length,
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10,
                            childAspectRatio: .84,
                          ),
                          itemBuilder: (_, index) => _portfolioCard(portfolio[index]),
                        ),
                      if (isOwnProfile && portfolio.length < 24) ...[
                        const SizedBox(height: 13),
                        OutlinedButton.icon(
                          onPressed: uploading ? null : addWork,
                          icon: uploading
                              ? const SizedBox(width: 15, height: 15, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.add_photo_alternate_outlined),
                          label: Text(uploading ? 'Ekleniyor…' : 'Portföye çalışma ekle'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: _forest,
                            side: const BorderSide(color: _line),
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }
}


class ReviewComposer extends StatefulWidget {
  const ReviewComposer({super.key, required this.taskId, this.onDone});
  final String taskId;
  final VoidCallback? onDone;
  @override
  State<ReviewComposer> createState() => _ReviewComposerState();
}

class _ReviewComposerState extends State<ReviewComposer> {
  int rating = 5;
  final comment = TextEditingController();
  bool busy = false;
  String? error;

  @override
  void dispose() { comment.dispose(); super.dispose(); }

  Future<void> submit() async {
    setState(() { busy = true; error = null; });
    try {
      await DooraApi.instance.submitReview(
        taskId: widget.taskId,
        rating: rating,
        comment: comment.text,
      );
      widget.onDone?.call();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Değerlendirmen yayınlandı.'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: _forest,
        ));
      }
    } catch (e) {
      if (mounted) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
    child: Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(25)),
      ),
      child: SafeArea(top: false, child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('İşi değerlendir', style: TextStyle(
            color: _ink, fontSize: 18, fontWeight: FontWeight.w900,
          )),
          const SizedBox(height: 5),
          const Text('Deneyimini paylaşarak DOORA topluluğuna katkı sağla.',
            style: TextStyle(color: _muted, fontSize: 10)),
          const SizedBox(height: 16),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (index) =>
            IconButton(
              onPressed: busy ? null : () => setState(() => rating = index + 1),
              icon: Icon(index < rating ? Icons.star_rounded : Icons.star_outline_rounded,
                color: const Color(0xFFE0A83E), size: 34),
            ),
          )),
          Center(child: Text('$rating / 5', style: const TextStyle(
            color: _ink, fontSize: 12, fontWeight: FontWeight.w800,
          ))),
          const SizedBox(height: 12),
          TextField(controller: comment, maxLength: 1000, maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Yorumun (isteğe bağlı)',
              hintText: 'İş deneyimini kısaca anlat…',
            )),
          if (error != null) Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(error!, style: const TextStyle(color: Colors.red, fontSize: 10)),
          ),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: FilledButton(
            onPressed: busy ? null : submit,
            style: FilledButton.styleFrom(backgroundColor: _forest, padding: const EdgeInsets.symmetric(vertical: 14)),
            child: Text(busy ? 'Gönderiliyor…' : 'Değerlendirmeyi gönder'),
          )),
        ],
      )),
    ),
  );
}


Widget _profileMetric(String label, String value) => Container(
  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 13),
  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(15), border: Border.all(color: _line)),
  child: Column(children: [
    Text(value, style: const TextStyle(color: _ink, fontSize: 17, fontWeight: FontWeight.w800)),
    const SizedBox(height: 4),
    Text(label, textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis,
      style: const TextStyle(color: _muted, fontSize: 8, fontWeight: FontWeight.w600)),
  ]),
);

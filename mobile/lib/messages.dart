import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'services/api_client.dart';

const _msgInk = Color(0xFF20251F);
const _msgMuted = Color(0xFF7A8474);
const _msgLine = Color(0xFFE8EDE4);
const _msgBg = Color(0xFFF7F8F5);
const _msgGreen = Color(0xFF263B2B);
const _msgMint = Color(0xFFE8EFDF);

Widget _personAvatar(String name, String url, {double radius = 23}) {
  final fallback = CircleAvatar(
    radius: radius,
    backgroundColor: _msgMint,
    child: Text(name.isEmpty ? 'D' : name.characters.first.toUpperCase(),
      style: TextStyle(color: _msgGreen, fontWeight: FontWeight.w900, fontSize: radius * .72)),
  );
  if (url.isEmpty) return fallback;
  if (url.startsWith('data:image/')) {
    try {
      final bytes = base64Decode(url.substring(url.indexOf(',') + 1));
      return ClipOval(child: SizedBox(width: radius * 2, height: radius * 2,
        child: Image.memory(bytes, fit: BoxFit.cover, errorBuilder: (_, __, ___) => fallback)));
    } catch (_) { return fallback; }
  }
  return ClipOval(child: SizedBox(width: radius * 2, height: radius * 2,
    child: Image.network(DooraApi.instance.absoluteUrl(url), fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => fallback,
      loadingBuilder: (_, child, progress) => progress == null ? child : fallback)));
}

Future<bool> _confirm(BuildContext context, String title, String body, String action) async =>
    await showDialog<bool>(context: context, builder: (dialogContext) => AlertDialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text(title, style: const TextStyle(color: _msgInk, fontSize: 16, fontWeight: FontWeight.w900)),
      content: Text(body, style: const TextStyle(color: _msgMuted, fontSize: 12, height: 1.45)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext, false),
          child: const Text('Vazgeç', style: TextStyle(color: _msgMuted))),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, true),
          style: FilledButton.styleFrom(backgroundColor: _msgGreen),
          child: Text(action)),
      ],
    )) ?? false;

Future<String?> _reportReason(BuildContext context) async {
  const options = ['Uygunsuz mesaj', 'Hakaret veya taciz', 'Dolandırıcılık şüphesi', 'Spam', 'Diğer'];
  return showModalBottomSheet<String>(
    context: context, backgroundColor: Colors.white, showDragHandle: true,
    builder: (sheet) => SafeArea(child: Padding(
      padding: const EdgeInsets.fromLTRB(18, 8, 18, 22),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Şikâyet nedeni', style: TextStyle(color: _msgInk, fontSize: 17, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          ...options.map((option) => ListTile(
            dense: true, title: Text(option, style: const TextStyle(color: _msgInk, fontSize: 12)),
            trailing: const Icon(Icons.chevron_right_rounded, color: _msgMuted),
            onTap: () => Navigator.pop(sheet, option),
          )),
        ],
      ),
    )),
  );
}

class MessagesInboxPage extends StatefulWidget {
  const MessagesInboxPage({super.key, required this.currentUserId});
  final String currentUserId;
  @override
  State<MessagesInboxPage> createState() => _MessagesInboxPageState();
}

class _MessagesInboxPageState extends State<MessagesInboxPage> {
  List<Map<String, dynamic>> conversations = [];
  bool loading = true, requestInFlight = false;
  String? error;
  Timer? poll;

  @override
  void initState() {
    super.initState();
    load();
    poll = Timer.periodic(const Duration(seconds: 2), (_) => load(silent: true));
  }

  @override
  void dispose() { poll?.cancel(); super.dispose(); }

  Future<void> load({bool silent = false}) async {
    if (requestInFlight) return;
    requestInFlight = true;
    if (!silent && mounted) setState(() { loading = true; error = null; });
    try {
      final rows = await DooraApi.instance.getConversations();
      if (mounted) setState(() { conversations = rows; error = null; });
    } catch (e) {
      if (mounted && !silent) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      requestInFlight = false;
      if (mounted && !silent) setState(() => loading = false);
    }
  }

  String _time(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '')?.toLocal();
    if (date == null) return '';
    final now = DateTime.now();
    if (now.year == date.year && now.month == date.month && now.day == date.day) {
      return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    }
    return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}';
  }

  Future<void> _safetyAction(Map<String, dynamic> item, String action) async {
    final peerId = item['peer_id']?.toString() ?? '';
    if (peerId.isEmpty) return;
    if (action == 'delete') {
      final ok = await _confirm(context, 'Sohbet silinsin mi?',
        'Bu sohbet yalnızca senin mesaj kutundan kaldırılacak. Karşı tarafın mesajları etkilenmez.', 'Sohbeti sil');
      if (!ok || !mounted) return;
      setState(() => conversations.remove(item));
      try {
        await DooraApi.instance.deleteConversation(peerId, taskId: item['task_id']?.toString());
        if (mounted) _toast('Sohbet mesaj kutundan kaldırıldı.');
      } catch (e) {
        await load();
        if (mounted) _toast(DooraApi.instance.errorMessage(e));
      }
    } else if (action == 'block') {
      final ok = await _confirm(context, 'Kullanıcı engellensin mi?',
        'Bu kullanıcıyla aranızdaki mesajlaşma durdurulur.', 'Engelle');
      if (!ok || !mounted) return;
      try {
        await DooraApi.instance.blockUser(peerId);
        if (mounted) {
          setState(() => conversations.removeWhere((c) => c['peer_id']?.toString() == peerId));
          _toast('Kullanıcı engellendi.');
        }
      } catch (e) { if (mounted) _toast(DooraApi.instance.errorMessage(e)); }
    } else if (action == 'report') {
      final reason = await _reportReason(context);
      if (reason == null || !mounted) return;
      try {
        await DooraApi.instance.reportUser(peerId, category: reason);
        if (mounted) _toast('Şikâyetin DOORA ekibine iletildi.');
      } catch (e) { if (mounted) _toast(DooraApi.instance.errorMessage(e)); }
    }
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message), behavior: SnackBarBehavior.floating, backgroundColor: _msgInk));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: _msgBg,
    appBar: AppBar(
      backgroundColor: _msgBg, scrolledUnderElevation: 0,
      title: const Text('Mesajlar', style: TextStyle(color: _msgInk, fontSize: 18, fontWeight: FontWeight.w900)),
      actions: [IconButton(onPressed: loading ? null : load,
        icon: const Icon(Icons.refresh_rounded, color: _msgInk))],
    ),
    body: loading
      ? const Center(child: CircularProgressIndicator(color: _msgGreen))
      : error != null
        ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(error!, textAlign: TextAlign.center, style: const TextStyle(color: _msgMuted, fontSize: 12)),
            TextButton(onPressed: load, child: const Text('Tekrar dene')),
          ]))
        : conversations.isEmpty
          ? Center(child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Container(width: 68, height: 68, decoration: const BoxDecoration(color: _msgMint, shape: BoxShape.circle),
                  child: const Icon(Icons.chat_bubble_outline_rounded, color: _msgGreen, size: 29)),
                const SizedBox(height: 14),
                const Text('Henüz mesajın yok', style: TextStyle(color: _msgInk, fontSize: 15, fontWeight: FontWeight.w900)),
                const SizedBox(height: 6),
                const Text('Bir ilan sahibine veya hizmet verene profilinden mesaj gönderebilirsin.',
                  textAlign: TextAlign.center, style: TextStyle(color: _msgMuted, fontSize: 11, height: 1.5)),
              ]),
            ))
          : RefreshIndicator(
              color: _msgGreen, onRefresh: load,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 26),
                itemCount: conversations.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final item = conversations[index];
                  final peerId = item['peer_id']?.toString() ?? '';
                  final name = item['peer_name']?.toString() ?? 'DOORA üyesi';
                  final avatar = item['peer_avatar']?.toString() ?? '';
                  final unread = int.tryParse(item['unread_count']?.toString() ?? '') ?? 0;
                  return Material(
                    color: Colors.white, borderRadius: BorderRadius.circular(17),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(17),
                      onTap: peerId.isEmpty ? null : () async {
                        await Navigator.push(context, MaterialPageRoute(builder: (_) => ConversationPage(
                          currentUserId: widget.currentUserId, peerId: peerId, peerName: name,
                          peerAvatar: avatar, taskId: item['task_id']?.toString(),
                          taskTitle: item['task_title']?.toString() ?? '',
                        )));
                        load();
                      },
                      child: Container(
                        padding: const EdgeInsets.fromLTRB(13, 12, 7, 12),
                        decoration: BoxDecoration(borderRadius: BorderRadius.circular(17), border: Border.all(color: _msgLine)),
                        child: Row(children: [
                          _personAvatar(name, avatar, radius: 23),
                          const SizedBox(width: 11),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(name, style: const TextStyle(color: _msgInk, fontSize: 11, fontWeight: FontWeight.w900)),
                            if ((item['task_title']?.toString() ?? '').isNotEmpty)
                              Padding(padding: const EdgeInsets.only(top: 2), child: Text(item['task_title'].toString(),
                                maxLines: 1, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: _msgGreen, fontSize: 8, fontWeight: FontWeight.w700))),
                            const SizedBox(height: 4),
                            Text(item['body']?.toString() ?? '', maxLines: 1, overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: _msgMuted, fontSize: 10)),
                          ])),
                          const SizedBox(width: 7),
                          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                            Text(_time(item['created_at']), style: const TextStyle(color: _msgMuted, fontSize: 8)),
                            const SizedBox(height: 5),
                            if (unread > 0) Container(
                              constraints: const BoxConstraints(minWidth: 19, minHeight: 19),
                              padding: const EdgeInsets.symmetric(horizontal: 5),
                              decoration: const BoxDecoration(color: _msgGreen, shape: BoxShape.circle),
                              child: Center(child: Text('$unread', style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900))),
                            ),
                          ]),
                          PopupMenuButton<String>(
                            tooltip: 'Sohbet seçenekleri',
                            icon: const Icon(Icons.more_vert_rounded, color: _msgMuted, size: 19),
                            onSelected: (value) => _safetyAction(item, value),
                            itemBuilder: (_) => const [
                              PopupMenuItem(value: 'delete', child: ListTile(dense: true, leading: Icon(Icons.delete_outline_rounded), title: Text('Sohbeti sil'))),
                              PopupMenuItem(value: 'block', child: ListTile(dense: true, leading: Icon(Icons.block_rounded), title: Text('Kullanıcıyı engelle'))),
                              PopupMenuItem(value: 'report', child: ListTile(dense: true, leading: Icon(Icons.flag_outlined), title: Text('Şikâyet et'))),
                            ],
                          ),
                        ]),
                      ),
                    ),
                  );
                },
              ),
            ),
  );
}

class ConversationPage extends StatefulWidget {
  const ConversationPage({
    super.key, required this.currentUserId, required this.peerId, required this.peerName,
    this.peerAvatar = '', this.taskId, this.taskTitle = '',
  });
  final String currentUserId, peerId, peerName, peerAvatar;
  final String? taskId;
  final String taskTitle;
  @override
  State<ConversationPage> createState() => _ConversationPageState();
}

class _ConversationPageState extends State<ConversationPage> {
  final controller = TextEditingController();
  final scroll = ScrollController();
  List<Map<String, dynamic>> messages = [];
  String peerAvatar = '';
  bool loading = true, sending = false, requestInFlight = false;
  String? error;
  Timer? poll;

  @override
  void initState() {
    super.initState();
    peerAvatar = widget.peerAvatar;
    load();
    // Push/realtime bağlantısı yapılandırılana kadar hızlı senkronizasyon:
    // yeni mesajlar sayfa yenilenmeden en geç yaklaşık 1 saniyede alınır.
    poll = Timer.periodic(const Duration(seconds: 1), (_) => load(silent: true));
  }

  @override
  void dispose() { poll?.cancel(); controller.dispose(); scroll.dispose(); super.dispose(); }

  Future<void> load({bool silent = false}) async {
    if (requestInFlight) return;
    requestInFlight = true;
    try {
      final data = await DooraApi.instance.getConversation(widget.peerId, taskId: widget.taskId);
      final incoming = data['messages'] as List<Map<String, dynamic>>;
      final peer = data['peer'] as Map<String, dynamic>;
      final changed = incoming.length != messages.length ||
          (incoming.isNotEmpty && messages.isNotEmpty && incoming.last['id'] != messages.last['id']);
      final wasNearBottom = !scroll.hasClients || scroll.position.maxScrollExtent - scroll.position.pixels < 100;
      if (mounted) setState(() {
        messages = incoming;
        final avatar = peer['avatar_url']?.toString() ?? '';
        if (avatar.isNotEmpty) peerAvatar = avatar;
        error = null;
        loading = false;
      });
      if (changed || loading) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (scroll.hasClients && (wasNearBottom || loading)) {
            scroll.animateTo(scroll.position.maxScrollExtent,
              duration: const Duration(milliseconds: 180), curve: Curves.easeOut);
          }
        });
      }
    } catch (e) {
      if (mounted && !silent) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      requestInFlight = false;
      if (mounted && !silent) setState(() => loading = false);
    }
  }

  Future<void> _safetyAction(String action) async {
    if (action == 'delete') {
      final ok = await _confirm(context, 'Sohbet silinsin mi?',
        'Bu sohbet yalnızca senin mesaj kutundan kaldırılacak.', 'Sohbeti sil');
      if (!ok || !mounted) return;
      try {
        await DooraApi.instance.deleteConversation(widget.peerId, taskId: widget.taskId);
        if (mounted) Navigator.pop(context);
      } catch (e) { if (mounted) _toast(DooraApi.instance.errorMessage(e)); }
    } else if (action == 'block') {
      final ok = await _confirm(context, 'Kullanıcı engellensin mi?',
        'Bu kullanıcıyla mesajlaşman durdurulur.', 'Engelle');
      if (!ok || !mounted) return;
      try {
        await DooraApi.instance.blockUser(widget.peerId);
        if (mounted) Navigator.pop(context);
      } catch (e) { if (mounted) _toast(DooraApi.instance.errorMessage(e)); }
    } else if (action == 'report') {
      final reason = await _reportReason(context);
      if (reason == null || !mounted) return;
      try {
        await DooraApi.instance.reportUser(widget.peerId, category: reason);
        if (mounted) _toast('Şikâyetin DOORA ekibine iletildi.');
      } catch (e) { if (mounted) _toast(DooraApi.instance.errorMessage(e)); }
    }
  }

  void _toast(String message) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(message), behavior: SnackBarBehavior.floating, backgroundColor: _msgInk));

  Future<void> send() async {
    final text = controller.text.trim();
    if (text.isEmpty || sending) return;
    controller.clear();
    final tempId = 'local-${DateTime.now().microsecondsSinceEpoch}';
    final optimistic = <String, dynamic>{
      'id': tempId, 'sender_id': widget.currentUserId, 'body': text,
      'created_at': DateTime.now().toUtc().toIso8601String(),
    };
    setState(() { sending = true; messages = [...messages, optimistic]; });
    _scrollToBottom();
    try {
      await DooraApi.instance.sendMessage(widget.peerId, text, taskId: widget.taskId);
      await load();
    } catch (e) {
      if (mounted) {
        setState(() => messages.removeWhere((m) => m['id'] == tempId));
        controller.text = text;
        _toast(DooraApi.instance.errorMessage(e));
      }
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (scroll.hasClients) scroll.animateTo(scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 180), curve: Curves.easeOut);
    });
  }

  String _time(dynamic raw) {
    final date = DateTime.tryParse(raw?.toString() ?? '')?.toLocal();
    if (date == null) return '';
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: _msgBg,
    appBar: AppBar(
      backgroundColor: _msgBg, scrolledUnderElevation: 0,
      titleSpacing: 0,
      title: Row(children: [
        _personAvatar(widget.peerName, peerAvatar, radius: 18),
        const SizedBox(width: 9),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.peerName, style: const TextStyle(color: _msgInk, fontSize: 13, fontWeight: FontWeight.w900)),
          if (widget.taskTitle.isNotEmpty) Text(widget.taskTitle, maxLines: 1, overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: _msgMuted, fontSize: 9)),
        ])),
      ]),
      actions: [
        PopupMenuButton<String>(
          tooltip: 'Sohbet seçenekleri',
          icon: const Icon(Icons.more_horiz_rounded, color: _msgInk),
          onSelected: _safetyAction,
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'delete', child: ListTile(dense: true, leading: Icon(Icons.delete_outline_rounded), title: Text('Sohbeti sil'))),
            PopupMenuItem(value: 'block', child: ListTile(dense: true, leading: Icon(Icons.block_rounded), title: Text('Kullanıcıyı engelle'))),
            PopupMenuItem(value: 'report', child: ListTile(dense: true, leading: Icon(Icons.flag_outlined), title: Text('Şikâyet et'))),
          ],
        ),
      ],
    ),
    body: Column(children: [
      Expanded(child: loading
        ? const Center(child: CircularProgressIndicator(color: _msgGreen))
        : error != null
          ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(error!, style: const TextStyle(color: _msgMuted, fontSize: 11)),
              TextButton(onPressed: load, child: const Text('Tekrar dene')),
            ]))
          : ListView.builder(
              controller: scroll, padding: const EdgeInsets.fromLTRB(12, 16, 12, 18),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final message = messages[index];
                final mine = message['sender_id']?.toString() == widget.currentUserId;
                final bubble = Container(
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * .76),
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.fromLTRB(13, 10, 13, 7),
                  decoration: BoxDecoration(
                    color: mine ? _msgGreen : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16), topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(mine ? 16 : 4),
                      bottomRight: Radius.circular(mine ? 4 : 16),
                    ),
                    border: mine ? null : Border.all(color: _msgLine),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text(message['body']?.toString() ?? '', style: TextStyle(
                      color: mine ? Colors.white : _msgInk, fontSize: 11, height: 1.4)),
                    const SizedBox(height: 4),
                    Text(_time(message['created_at']), style: TextStyle(
                      color: mine ? Colors.white70 : _msgMuted, fontSize: 8)),
                  ]),
                );
                return Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Row(
                    mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (!mine) ...[_personAvatar(widget.peerName, peerAvatar, radius: 13), const SizedBox(width: 6)],
                      Flexible(child: bubble),
                    ],
                  ),
                );
              },
            )),
      SafeArea(top: false, child: Container(
        padding: const EdgeInsets.fromLTRB(12, 9, 12, 9),
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: _msgLine))),
        child: Row(children: [
          Expanded(child: TextField(
            controller: controller, minLines: 1, maxLines: 4,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              hintText: 'Mesajını yaz…', filled: true, fillColor: _msgBg,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide.none),
            ),
            onSubmitted: (_) => send(),
          )),
          const SizedBox(width: 8),
          Material(
            color: _msgGreen, shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(), onTap: sending ? null : send,
              child: SizedBox(width: 43, height: 43, child: Center(
                child: sending
                  ? const SizedBox(width: 17, height: 17, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.arrow_upward_rounded, color: Colors.white, size: 21),
              )),
            ),
          ),
        ]),
      )),
    ]),
  );
}

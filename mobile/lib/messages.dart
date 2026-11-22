import 'package:flutter/material.dart';
import 'services/api_client.dart';

const _msgInk = Color(0xFF20251F);
const _msgMuted = Color(0xFF7A8474);
const _msgLine = Color(0xFFE8EDE4);
const _msgBg = Color(0xFFF7F8F5);
const _msgGreen = Color(0xFF263B2B);
const _msgMint = Color(0xFFE8EFDF);

class MessagesInboxPage extends StatefulWidget {
  const MessagesInboxPage({super.key, required this.currentUserId});
  final String currentUserId;
  @override
  State<MessagesInboxPage> createState() => _MessagesInboxPageState();
}

class _MessagesInboxPageState extends State<MessagesInboxPage> {
  List<Map<String, dynamic>> conversations = [];
  bool loading = true;
  String? error;

  @override
  void initState() { super.initState(); load(); }

  Future<void> load() async {
    setState(() { loading = true; error = null; });
    try {
      final rows = await DooraApi.instance.getConversations();
      if (mounted) setState(() => conversations = rows);
    } catch (e) {
      if (mounted) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      if (mounted) setState(() => loading = false);
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

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: _msgBg,
    appBar: AppBar(
      backgroundColor: _msgBg,
      title: const Text('Mesajlar', style: TextStyle(color: _msgInk, fontSize: 17, fontWeight: FontWeight.w900)),
      actions: [IconButton(onPressed: loading ? null : load, icon: const Icon(Icons.refresh_rounded, color: _msgInk))],
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
              color: _msgGreen,
              onRefresh: load,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 26),
                itemCount: conversations.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final item = conversations[index];
                  final peerId = item['peer_id']?.toString() ?? '';
                  final name = item['peer_name']?.toString() ?? 'DOORA üyesi';
                  final unread = int.tryParse(item['unread_count']?.toString() ?? '') ?? 0;
                  return Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(17),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(17),
                      onTap: peerId.isEmpty ? null : () async {
                        await Navigator.push(context, MaterialPageRoute(builder: (_) => ConversationPage(
                          currentUserId: widget.currentUserId,
                          peerId: peerId,
                          peerName: name,
                          taskId: item['task_id']?.toString(),
                          taskTitle: item['task_title']?.toString() ?? '',
                        )));
                        load();
                      },
                      child: Container(
                        padding: const EdgeInsets.all(13),
                        decoration: BoxDecoration(borderRadius: BorderRadius.circular(17), border: Border.all(color: _msgLine)),
                        child: Row(children: [
                          CircleAvatar(radius: 23, backgroundColor: _msgMint,
                            child: Text(name.isEmpty ? 'D' : name.characters.first.toUpperCase(),
                              style: const TextStyle(color: _msgGreen, fontWeight: FontWeight.w900))),
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
                          const SizedBox(width: 8),
                          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                            Text(_time(item['created_at']), style: const TextStyle(color: _msgMuted, fontSize: 8)),
                            const SizedBox(height: 7),
                            if (unread > 0) Container(
                              constraints: const BoxConstraints(minWidth: 19, minHeight: 19),
                              padding: const EdgeInsets.symmetric(horizontal: 5),
                              decoration: const BoxDecoration(color: _msgGreen, shape: BoxShape.circle),
                              child: Center(child: Text('$unread', style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900))),
                            ),
                          ]),
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
    super.key,
    required this.currentUserId,
    required this.peerId,
    required this.peerName,
    this.taskId,
    this.taskTitle = '',
  });
  final String currentUserId;
  final String peerId;
  final String peerName;
  final String? taskId;
  final String taskTitle;
  @override
  State<ConversationPage> createState() => _ConversationPageState();
}

class _ConversationPageState extends State<ConversationPage> {
  final controller = TextEditingController();
  final scroll = ScrollController();
  List<Map<String, dynamic>> messages = [];
  bool loading = true;
  bool sending = false;
  String? error;

  @override
  void initState() { super.initState(); load(); }
  @override
  void dispose() { controller.dispose(); scroll.dispose(); super.dispose(); }

  Future<void> load() async {
    try {
      final data = await DooraApi.instance.getConversation(widget.peerId, taskId: widget.taskId);
      if (mounted) setState(() { messages = data['messages'] as List<Map<String, dynamic>>; error = null; });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (scroll.hasClients) scroll.jumpTo(scroll.position.maxScrollExtent);
      });
    } catch (e) {
      if (mounted) setState(() => error = DooraApi.instance.errorMessage(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> send() async {
    final text = controller.text.trim();
    if (text.isEmpty || sending) return;
    controller.clear();
    setState(() => sending = true);
    try {
      await DooraApi.instance.sendMessage(widget.peerId, text, taskId: widget.taskId);
      await load();
    } catch (e) {
      controller.text = text;
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(DooraApi.instance.errorMessage(e)),
        behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => sending = false);
    }
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
      backgroundColor: _msgBg,
      title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(widget.peerName, style: const TextStyle(color: _msgInk, fontSize: 14, fontWeight: FontWeight.w900)),
        if (widget.taskTitle.isNotEmpty) Text(widget.taskTitle, style: const TextStyle(color: _msgMuted, fontSize: 9)),
      ]),
    ),
    body: Column(children: [
      Expanded(child: loading
        ? const Center(child: CircularProgressIndicator(color: _msgGreen))
        : error != null
          ? Center(child: Text(error!, style: const TextStyle(color: _msgMuted, fontSize: 11)))
          : ListView.builder(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(14, 16, 14, 18),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final message = messages[index];
                final mine = message['sender_id']?.toString() == widget.currentUserId;
                return Align(
                  alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * .78),
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
                        color: mine ? Colors.white : _msgInk, fontSize: 11, height: 1.4,
                      )),
                      const SizedBox(height: 4),
                      Text(_time(message['created_at']), style: TextStyle(
                        color: mine ? Colors.white70 : _msgMuted, fontSize: 8,
                      )),
                    ]),
                  ),
                );
              },
            )),
      SafeArea(top: false, child: Container(
        padding: const EdgeInsets.fromLTRB(12, 9, 12, 9),
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: _msgLine))),
        child: Row(children: [
          Expanded(child: TextField(
            controller: controller,
            minLines: 1, maxLines: 4,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              hintText: 'Mesajını yaz…',
              filled: true, fillColor: _msgBg,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide.none),
            ),
            onSubmitted: (_) => send(),
          )),
          const SizedBox(width: 8),
          Material(
            color: _msgGreen, shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: sending ? null : send,
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

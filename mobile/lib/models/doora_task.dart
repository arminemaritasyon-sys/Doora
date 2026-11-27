class DooraTask {
  const DooraTask({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.description,
    required this.category,
    required this.budget,
    required this.location,
    required this.time,
    required this.owner,
    required this.offers,
    this.status = 'open',
    this.ownerAvatar = '',
    this.imageUrls = const [],
  });

  final String id, ownerId, title, description, category, location, time, owner;
  final String status, ownerAvatar;
  final List<String> imageUrls;
  final num budget;
  final int offers;

  factory DooraTask.fromJson(Map<String, dynamic> json) => DooraTask(
    id: json['id']?.toString() ?? '',
    ownerId: json['owner_id']?.toString() ?? json['ownerId']?.toString() ?? '',
    title: json['title']?.toString() ?? 'İsimsiz ilan',
    description: json['description']?.toString() ?? '',
    category: json['category']?.toString() ?? 'Diğer',
    budget: _number(json['budget']),
    location: json['location']?.toString() ?? json['district']?.toString() ?? '',
    time: json['time']?.toString() ?? 'Yeni ilan',
    owner: json['owner']?.toString() ?? 'DOORA üyesi',
    offers: _number(json['offers']).toInt(),
    status: json['status']?.toString() ?? 'open',
    ownerAvatar: json['owner_avatar']?.toString() ?? '',
    imageUrls: _images(json),
  );

  static List<String> _images(Map<String, dynamic> json) {
    final raw = json['images'] ?? json['photos'] ?? json['attachments'];
    final values = raw is List ? raw : <dynamic>[];
    final urls = values.map((v) => v is Map
      ? (v['url'] ?? v['image_url'] ?? v['imageUrl'] ?? v['src'] ?? '').toString()
      : v.toString()).where((v) => v.startsWith('http') || v.startsWith('/')).toList();
    final single = (json['image_url'] ?? json['imageUrl'] ?? json['photo_url'] ?? json['cover_image'] ?? '').toString();
    if (single.isNotEmpty && !urls.contains(single)) urls.insert(0, single);
    return urls;
  }

  static num _number(dynamic value) {
    if (value is num) return value;
    return num.tryParse(value?.toString() ?? '') ?? 0;
  }

  String get formattedBudget =>
      budget.toStringAsFixed(budget % 1 == 0 ? 0 : 2) + ' ₺';
}

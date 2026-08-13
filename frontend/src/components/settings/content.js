export const STATUS_PRESETS = [
  { emoji: "🟢", label: "Онлайн", labelEn: "Online" },
  { emoji: "🔴", label: "Занят", labelEn: "Busy" },
  { emoji: "🟡", label: "Отошёл", labelEn: "Away" },
  { emoji: "🌙", label: "Не беспокоить", labelEn: "Do not disturb" },
  { emoji: "💼", label: "Работаю", labelEn: "Working" },
  { emoji: "🎓", label: "Учусь", labelEn: "Studying" },
  { emoji: "🏠", label: "Дома", labelEn: "At home" },
  { emoji: "📱", label: "В сети", labelEn: "On the grid" },
  { emoji: "✈️", label: "Путешествую", labelEn: "Traveling" },
  { emoji: "🎮", label: "Играю", labelEn: "Gaming" },
  { emoji: "📖", label: "Читаю", labelEn: "Reading" },
  { emoji: "❤️", label: "Влюблён", labelEn: "In love" },
];

export const FAQ_ITEMS = [
  {
    q: "Как обеспечивается безопасность?",
    qEn: "How is security ensured?",
    a: "Chaos Messenger использует сквозное шифрование (E2EE) на основе протокола Signal (X3DH + Double Ratchet). Все сообщения, медиафайлы и звонки шифруются на устройстве отправителя и расшифровываются только на устройстве получателя. Даже сервер не имеет доступа к содержимому.",
    aEn: "Chaos Messenger uses end-to-end encryption (E2EE) based on the Signal protocol (X3DH + Double Ratchet). All messages, media, and calls are encrypted on the sender's device and decrypted only on the recipient's device. Even the server cannot access the content.",
  },
  {
    q: "Какие данные хранятся на сервере?",
    qEn: "What data is stored on the server?",
    a: "Сервер хранит только зашифрованные сообщения и медиафайлы, а также метаданные, необходимые для доставки (отправитель, получатель, время). Все ключи шифрования генерируются и хранятся локально на вашем устройстве.",
    aEn: "The server only stores encrypted messages and media, plus delivery metadata (sender, recipient, time). All encryption keys are generated and stored locally on your device.",
  },
  {
    q: "Можно ли восстановить чаты при смене устройства?",
    qEn: "Can I restore chats when changing devices?",
    a: "Да. Используйте функцию резервного копирования в разделе Система → Резервное копирование. Создайте резервную копию на старом устройстве и восстановите её на новом. Резервная копия шифруется вашей фразой-паролем.",
    aEn: "Yes. Use the backup feature in System → Backup. Create a backup on your old device and restore it on the new one. The backup is encrypted with your passphrase.",
  },
  {
    q: "Поддерживаются ли групповые чаты?",
    qEn: "Are group chats supported?",
    a: "Да. Вы можете создавать групповые чаты, добавлять участников, назначать администраторов, настраивать права и использовать сквозное шифрование для всех участников группы.",
    aEn: "Yes. You can create group chats, add participants, assign admins, configure permissions, and use end-to-end encryption for all group members.",
  },
  {
    q: "Как удалить аккаунт?",
    qEn: "How do I delete my account?",
    a: "На данный момент удаление аккаунта производится через службу поддержки. Напишите нам, и мы поможем. Все ваши данные будут безвозвратно удалены с серверов.",
    aEn: "Currently, account deletion is handled through our support team. Contact us and we will help. All your data will be permanently deleted from our servers.",
  },
];

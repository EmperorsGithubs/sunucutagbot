const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const TOKEN = ''; // TOKEN GÜVENLİĞİ İÇİN GİZLİ TUTUN
const ROLE_ID = '';
const GUILD_ID = '';
const STATUS_CHANNEL_ID = '';
const LOG_CHANNEL_ID = '';
const TAG = "";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
});

// Tüm üyeleri kontrol et: tag varsa rol ver, yoksa kaldır
async function checkTags(guild, logChannel) {
  const members = await guild.members.fetch();
  for (const [_, member] of members) {
    if (member.user.bot) continue;
    await new Promise(r => setTimeout(r, 800));

    try {
      const userData = await client.rest.get(`/users/${member.id}`).catch(() => null);
      const currentTag = userData?.clan?.tag || 'No Tag';
      const hasTag = currentTag === TAG;
      const hasRole = member.roles.cache.has(ROLE_ID);

      if (hasTag && !hasRole) {
        await member.roles.add(ROLE_ID);
        if (logChannel) {
          await logChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🎉 Rol Eklendi')
                .setDescription(`<@${member.id}> clan tag değeri **${TAG}**, <@&${ROLE_ID}> rolü verildi.`)
                .setColor('Green')
                .setTimestamp(),
            ],
          });
        }
      } else if (!hasTag && hasRole) {
        await member.roles.remove(ROLE_ID);
        if (logChannel) {
          await logChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('⚠️ Rol Kaldırıldı')
                .setDescription(`<@${member.id}> clan tag değeri değişti, <@&${ROLE_ID}> rolü kaldırıldı.`)
                .setColor('Red')
                .setTimestamp(),
            ],
          });
        }
      }
    } catch (err) {
      console.log(`⚠️ Hata ${member.user.tag}:`, err?.message || err);
    }
  }
}

// Sadece tagı olup rolü olmayanlara rol ver
async function giveRoleToTagOnly(guild, logChannel) {
  const members = await guild.members.fetch();
  for (const [_, member] of members) {
    if (member.user.bot) continue;

    try {
      const userData = await client.rest.get(`/users/${member.id}`).catch(() => null);
      const currentTag = userData?.clan?.tag || 'No Tag';
      const hasTag = currentTag === TAG;
      const hasRole = member.roles.cache.has(ROLE_ID);

      if (hasTag && !hasRole) {
        await member.roles.add(ROLE_ID);
        if (logChannel) {
          await logChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🎯 Rol Eklendi')
                .setDescription(`<@${member.id}> clan tag değeri **${TAG}**, <@&${ROLE_ID}> rolü verildi.`)
                .setColor('Green')
                .setTimestamp(),
            ],
          });
        }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
}

// Tagı olmayanları etiketle
async function mentionTagless(guild, channel) {
  const members = await guild.members.fetch();
  const taglessMembers = [];

  for (const [id, member] of members) {
    if (member.user.bot) continue;

    try {
      const userData = await client.rest.get(`/users/${member.id}`).catch(() => null);
      const currentTag = userData?.clan?.tag || 'No Tag';
      if (currentTag !== TAG) taglessMembers.push(member);
    } catch {}
  }

  if (taglessMembers.length === 0) {
    return channel.send('🎉 Tüm üyelerin clan tag değeri eşleşiyor, tagsız üye yok.');
  }

  const pageSize = 50;
  const pages = Math.ceil(taglessMembers.length / pageSize);

  for (let i = 0; i < pages; i++) {
    const chunk = taglessMembers.slice(i * pageSize, (i + 1) * pageSize);
    const mentions = chunk.map(m => `<@${m.id}>`).join(' ');
    await channel.send(`⚠️ Clan tag değeri farklı olan üyeler (${i + 1}/${pages}):\n${mentions}`);
    await new Promise(res => setTimeout(res, 1000));
  }
}

// Say komutu: tag istatistikleri
async function getTagStatsEmbed(guild) {
  const members = await guild.members.fetch();
  const tagCount = (await Promise.all(
    members.filter(m => !m.user.bot).map(async m => {
      const userData = await client.rest.get(`/users/${m.id}`).catch(() => null);
      return userData?.clan?.tag === TAG;
    })
  )).filter(Boolean).length;

  const totalCount = members.filter(m => !m.user.bot).size;

  return new EmbedBuilder()
.setTitle('📊✨ **Clan Tag İstatistik Raporu** ✨📊')
.setColor('Aqua')
.setThumbnail(client.user.displayAvatarURL())
.setDescription(`
🔢 **Toplam Üye Sayısı:** \`${totalCount.toLocaleString()}\`
🏷️ **Tagı Eşleşen Üyeler:** \`${tagCount.toLocaleString()}\`
📈 **Tag Uyumluluk Oranı:** \`${((tagCount / totalCount) * 100).toFixed(2)}%\`

${tagCount === totalCount 
  ? "🎉 **Harika! Tüm üyeler tagı mükemmel kullanıyor!** 👏🔥" 
  : "📌 **Dikkat! Bazı üyeler hala tagı eksik veya yanlış kullanıyor olabilir!** ⚠️\n> Lütfen onları bilgilendir ve bu oranı yükselt!"}
💎 **İstatistik Detayları:**  
> • Rol verilen üye sayısı: \`${tagCount}\`
`)
.setFooter({ 
  text: `Son Güncelleme • ${new Date().toLocaleString('tr-TR', { dateStyle: 'full', timeStyle: 'short' })}`, 
  iconURL: client.user.displayAvatarURL() 
})
.setTimestamp()

}

// Bot hazır olduğunda
client.once('ready', async () => {
  console.log(`✅ Bot hazır: ${client.user.tag}`);
  const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
  if (!guild) return console.log('❌ Sunucu bulunamadı.');

  await guild.commands.set([
    {
      name: 'tag-kontrol',
      description: 'Clan tag bazlı işlemleri yapar.',
    },
    {
      name: 'say',
      description: 'Clan taglı üye sayısı ve toplam üye sayısını gösterir.',
    },
  ]);

  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (guild && logChannel) {
    await checkTags(guild, logChannel);
    setInterval(() => checkTags(guild, logChannel), 10 * 60 * 1000);
  }
});

// Komut ve menü etkileşimleri
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() && !interaction.isStringSelectMenu()) return;

  const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!guild) return interaction.reply({ content: '❌ Sunucu bulunamadı.', ephemeral: true });

  if (interaction.isCommand()) {
    if (interaction.commandName === 'tag-kontrol') {
      const embed = new EmbedBuilder()
.setTitle('💠・Clan Tag Kontrol Paneli')
.setDescription(`🛡️ Aşağıdaki menüden bir işlem seçerek **tag sistemini profesyonelce yönetebilirsiniz**:\n
> 🎯 **Rol Verme**  
> • Tagı olan ama <@&${ROLE_ID}> rolü olmayanlara otomatik olarak rol verilir.\n
> ✅ **Tam Kontrol**  
> • Tagı doğru olanlara rol verilir, yanlış olanlardan rol geri alınır.\n
> ⚠️ **Tag Farklıları**  
> • Tagı olmayan ya da farklı olan üyeler bu kanalda **etiketlenerek bildirilir**.`)
.setColor('Blurple')
.setThumbnail(client.user.displayAvatarURL())
.setFooter({ text: 'EmperorxD', iconURL: client.user.displayAvatarURL() })
.setTimestamp();


      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('tagMenu')
          .setPlaceholder('🔽 İşlem Seçin')
          .addOptions([
                        {
              label: 'Clan tagı olup rolü olmayanlara rol ver',
              description: 'Sadece rolü olmayanlara rol ekle',
              value: 'give_role',
              emoji: '🎯',
            },
            {
              label: 'Tüm sunucuyu kontrol et',
              description: 'Clan tag eşleşenlere rol ver, diğerlerinden rol al',
              value: 'check_all',
              emoji: '✅',
            },
            {
              label: 'Clan tagı farklı olanları etiketle',
              description: 'Tagı farklı üyeleri kanalda etiketle',
              value: 'mention_tagless',
              emoji: '⚠️',
            },
          ])
      );

      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } else if (interaction.commandName === 'say') {
      const embed = await getTagStatsEmbed(guild);
      await interaction.reply({ embeds: [embed] });
    }
  } else if (interaction.isStringSelectMenu() && interaction.customId === 'tagMenu') {
    await interaction.deferReply({ ephemeral: true });
    const choice = interaction.values[0];

    if (choice === 'check_all') {
      await checkTags(guild, logChannel);
      await interaction.editReply('✅ **Tam tarama tamamlandı!**\n> Tagı doğru olanlara rol verildi, yanlış olanlardan rol alındı.');
    } else if (choice === 'give_role') {
      await giveRoleToTagOnly(guild, logChannel);
      await interaction.editReply('🎯 **Rol dağıtımı tamamlandı!**\n> Tagı doğru olan ve rolü eksik üyeler güncellendi.');
    } else if (choice === 'mention_tagless') {
      await mentionTagless(guild, interaction.channel);
      await interaction.editReply('⚠️ **Tagı farklı olan üyeler etiketlendi.**\n> Lütfen tagı güncellemeleri için bilgilendirme yapınız.');
    } else {
      await interaction.editReply('❌ Geçersiz seçenek.');
    }
  }
});
client.login(TOKEN);

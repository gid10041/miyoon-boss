/* ===== 언어 설정: 한국어 / English =====
   data.js 다음, 나머지 스크립트보다 먼저 불러와요.
   TX(한국어, 영어, {값})  코드 안의 문장. 문장 속 {이름}은 값으로 바꾸고, 낱말은 영어로 바꿔요.
   LT(한국어)              data.js 의 대사·설명. PF 표에서 앞부분이 같은 항목을 찾아 번역해요.
   LN(낱말)                이름·스킬·아이템 낱말(EX 표).
   새 대사를 넣을 때는 PF 에 '앞 몇 글자': '영어 번역' 을 추가하면 돼요. */

const LANG_ASK_EVERY_LAUNCH = true; // true: 게임을 켤 때마다 시작 화면에서 언어를 물어봐요. false: 처음 한 번만

const Lang = {
  cur: 'ko', saved: false,
  load() {
    try { const v = localStorage.getItem('miyun_lang'); if (v === 'ko' || v === 'en') { this.cur = v; this.saved = true; } } catch (e) {}
  },
  set(v) {
    this.cur = v; this.saved = true;
    try { localStorage.setItem('miyun_lang', v); } catch (e) {}
    document.documentElement.lang = v;
    if (typeof applyStatic === 'function') applyStatic();
  }
};

/* 낱말 표: 이름·스킬·아이템·꼬리표(한 단어짜리 것만) */
const EX = {
  '파시아': 'Fascia', '듀크': 'Duke', '레이시': 'Lacie', '미윤': 'Miyoon', '소동물': 'Small creature',
  '폭발': 'Explode', '동료 호출': 'Call for help', '장악': 'Control', '구속': 'Bind',
  '붕대': 'Bandage', '회복약': 'Recovery potion', '커피': 'Coffee', '부활약': 'Revival potion',
  '공격력 ↑': 'ATK ↑', '공격하기': 'Attack', '파': 'F', '듀': 'D', '레': 'L',
  '마지막 전투': 'Final Battle', '크레딧': 'Credits', '제작': 'Created by', '메따': 'metta', '오코': 'oko',
  '엔딩1. 멸망': 'Ending 1. The End', '다시 하기': 'Play again', '다시 시도': 'Try again'
};

/* 긴 문장 표: 앞부분(접두어) → 영어. 긴 것부터 맞춰 봐요 */
const PF = {
  /* ── 1페이즈 미윤 대사 ── */
  '마지막 전투다.': "The Final Battle begins.",
  '이러고 있으면 다들 위험해': "This is dangerous for everyone... please run away.",
  '이제 멈출 수 없어': "I can't stop it anymore...",
  '울렁거려': "I feel nauseous...",
  '역시 그 때 죽었어야': "I should've died back then; I hesitated too long...",
  '방금까지 주변이 시끄러웠는데': "Everything was loud a moment ago... Now I can't tell anymore...",
  '제발, 나한테서 떨어져': "Please, get away from me...",
  '이러고 있으면 다친다니까': "I told you you're going to get hurt...!",
  '제발...': "Please...",

  /* ── 2페이즈 대사·도망가기 ── */
  '멸망이 임박한다.': "The end is near.",
  '아아, 이젠 틀렸어': "Ahh, it's done for...",
  '도망가.': "Run away.",
  '도망가, 제발.': "Run away, please.",
  '죽이고 싶지 않아.': "I don't want to kill them.",
  '날 죽여줘.': "Please kill me.",
  '아파.': "It hurts.",
  '싫어, 싫어': "Stop, stop. I never wanted this...!",
  '제발 부탁이야': "I'm begging you. Please run away.",
  '윽... 왜 아직도': "Ugh... Why haven't you guys left me yet..!",
  '도망가라고 하잖아': "I told you to run away...!",
  '아아...안돼, 이제': "Ahh...I can't, I can't stop it anymore...",
  '미윤의 눈이 공포로': "Miyoon's eyes grow wide with fear. His suppressed strength starts going out of control...!",
  '발밑이 쿵, 쿵': "You can feel the ground beneath you thumping. There's really no going back from this.",
  '뭔가 좋지 않은 예감': "You have a bad feeling about this... Failing to block this time might lead to fatal consequences.",
  '미윤을 혼자 두고 갈 순 없어': "I can't just leave Miyoon alone...!",
  '이제와서 빠지는 건': "Leaving now would make me look ridiculous.",
  '솔직히 그러고 싶지만': "Not gonna lie, escaping sounds nice~ but I shouldn't run any further.",
  '......미윤을 더이상': "......I don't want to hurt Miyoon any more than this. But we can't just leave him...",
  '그럴 순 없어. 나 혼자': "I won't. Are you saying I should just ignore it all for my own convenience? I feel like getting this over with would be better for him...",
  '...도망 가고': "...I want to run away. It hurts......But I can't when Miyoon is probably hurting more....",
  '파시아는 떨리는 손으로': "Fascia backed away with trembling hands... Are you sure you want to run away?",
  '미윤은 아직 저기서': "Miyoon is still suffering alone. Do you still want to run away?",
  '여기서 도망치면': "If you flee now, you might never see him again. Would you still run away?",

  /* ── 아이템·스킬 설명 ── */
  'HP를 소량 깎아': "Deals heavy damage at the cost of a little HP.",
  '소동물 2마리를 부른다.': "Summons 2 small creatures. They attack Miyoon or take hits for Fascia. For the next 2 turns, Fascia's ATK and DEF drop.",
  '눈으로 미윤을 장악해': "Dominates Miyoon with his gaze, greatly lowering his ATK and DEF.",
  '30% 확률로 성공하면': "If it succeeds (30% chance), Miyoon cannot attack this turn. Cannot be used on instant-kill attacks.",
  'HP 60% 이하에서': "Usable at 60% HP or less. Deals heavy damage.",
  'MP 중량 회복. 회피': "Restores a large amount of MP. Dodge +30% (this turn and the next).",
  'HP 소량 회복': "Restores a small amount of HP.",
  'HP 중량 회복': "Restores a large amount of HP.",
  '쓰러진 동료를 소량의': "Revives a fallen ally with a small amount of HP.",

  /* ── 회상 1 · 90% 파시아 ── */
  '천사는 무서워...': "Angels scare me...",
  '앗... 혹시 지금도': "Ah... is it still like that? Should I move away?",
  '아냐아냐! 파시아는': "No, no! You're fine, Fascia...",
  '천사는 무섭지만': "Angels scare me, but... being with Fascia makes me feel soft and at ease...",
  '그래? 다행이다': "Really? I'm glad...",
  '혹시 왜 그런지': "Do you mind if I ask why...?",
  '아...그냥 옛날 일': "Oh... It's just because of something that happened a long time ago... something bad.",
  '그렇구나...천사가': "I see... not every angel is nice, so I get what you mean.",
  '나만 해도...': "I myself know a certain angel who is very rude.",
  '하하...정말?': "Haha...Really? That's scary.",
  '그래도 나는 괜찮다니까': "I'm happy you're okay with me though... so, thanks.",
  '으응, 같이 있으면': "Mhm, It's fun with you around...",
  '그리고...여긴 어두운데': "And... this place is dark, but I can get around well since Fascia is so bright.",
  '응? 하하하, 그렇네': "Huh? Haha, right. I do glow, don't I...",
  '그래, 네가 원한다면': "Yes, you can always use me as your guiding light if you want.",
  '헤헤, 응...파시아': "Hehe, okay... Fascia, I hope we can see each other here again.",
  '다음에도 같이 놀자고': "We promised to play together next time, Miyoon...",

  /* ── 회상 2 · 79% 듀크 ── */
  '그러니까...이미 널': "So...you're telling me you're already living with another demon?",
  '응...어렸을 때부터': "Yes... Ever since I was little...",
  '허? 지금도 어리잖아': "Huh? You're already little.",
  '그러니까 더 전에': "I mean, far before that...",
  '후...아무튼 미안했다': "Hmph... anyways, I apologize. There's another angel that keeps making a fool out of me these days...",
  '저....왜 그렇게까지': "Um....Why do you want to catch them so badly?",
  '그야, 그러면 내 위상이': "Well, it would boost my status a little more.",
  '힉...그..그럼': "Eek...a-are you saying you'd catch and....kill...them?",
  '뭐? 그렇게까진 안해': "What? I wouldn't do all that. How cruel do you think I am?",
  '그..그치만 방금 막': "B-But you just chased me down with your eyes all red and...",
  '그건 미안하다니까': "I said I'm sorry...",
  '...잡아서 죽이기까진': "...I said I wouldn't go as far as killing. Didn't think things would turn out like this.",

  /* ── 회상 3 · 68% 레이시 ── */
  '와~이것도 예쁘네': "Ooh~ This one is pretty too. See, I told you you could pull it off!",
  '으응... 이런 옷': "Mm... I've never tried anything like this; it feels a little awkward...",
  '이제부터라도 입으려고': "You should start trying more often! I'd know you look good since I'm a professional.",
  '그래...? 고마워': "You think so...? Thank you...but isn't this a little too flashy...?",
  '아니, 내가 볼 땐': "No way, it's just the right amount of flashy to me!",
  '아, 파시아한테도': "Oh, you should keep this on and show Fascia! He's gonna freak out on the spot~! That would be a sight to see~",
  '으응... 뭔가 부끄럽다': "Ah...that's embarrassing...",
  '나는 뭘 입어볼까나': "What should I wear~ Humhm~...",
  '저...레이시.': "Um...Lacie.",
  '응?': "Yeah?",
  '으응...이런 옷': "Mm... I've never tried anything like this; it feels a little awkward...",
  '응...?': "Huh...?",
  '...파시아.': "...Fascia.",
  '헉- 허억...': "Hah- Huff...",
  '이거...': "Here, have this...",
  '뭐야, 이거. 꽃반지': "What's this, a flower ring? Did ya make it yourself?",
  '매번 이렇게 옷 골라줘서': "Thank you for picking out clothes for me all the time...",
  '나도 레이시에게 어울릴': "I wanted to choose something that would suit you too, but I figured you'd know better than me...so....",
  '지나가다 봤는데': "I saw this flower on my way and thought it would be nice on you...",
  '뭐야~ 그냥 내가 멋대로': "Huh, what~ Aww, I'm just doing this for fun; you didn't have to pay me back with anything, y'know?",
  '후후, 뭐 확실히': "Hehe, it is actually pretty on my finger. I'll keep it! Thank you, Miyoon~",
  '있지~ 이런 상황에서': "You know~ probably not the best time to say it, but I think I like this new form of yours too.",
  '벌써 잘 어울릴': "I can already think of a few outfits I want you to try on, although I'm not sure we have time for that anymore, haha.",

  /* ── 회상 4 · 58% 파시아 ── */
  '아하하, 네 반응은': "Ahaha, your reactions are always priceless!",
  '너무 놀리지 마': "Don't tease him too much, Lacie.",
  '난 괜찮아, 파시아': "I'm fine, Fascia...",
  '파시아, 너는 놀려도': "Fascia, you never seem to play along with my jokes~ that's no fun!",
  '글쎄...그건, 미윤은': "Well...does that mean it's fun with Miyoon because he's an easy target..?",
  '그런거야...?': "Is that true...?",
  '응? 아니, 아니아니': "What? Nuh-uh? Not true! Can you not twist my words? I meant it's way more fun to play WITH Miyoon, of course~",
  '또 그렇게 얼버무리고': "You're avoiding the question again...",
  '나도...레이시와': "I...like hanging out with Lacie too. It feels sparkly and bright.",
  '아하하! 말도 참': "Ahaha! What a flattering praise. I know, I know~ I'm quite the gem, aren't I?",
  '미윤도 재밌다잖아': "Miyoon says he's having fun too~ see?",
  '...네가 괜찮다면': "...If you're okay with it that's fine, but if you ever feel uneasy about anything he says, you can say so, Miyoon.",
  '괜찮아...파시아. 고마워': "I'm okay...Fascia. Thank you, I really don't mind.",
  '미윤, 내가 너무 놀려서': "Miyoon, is it because I teased you too much? Calm down, I apologize~",
  '...레이시가 사과한대': "...Lacie says he's sorry, Miyoon. He'll be good this time, please...",

  /* ── 회상 5 · 43% 듀크 ── */
  '으아아~! 잠만': "UAGghhh~! Come on, no fair!!!",
  '뭐가 이렇게 시끄러워': "What's all this fuss about?",
  '듀크~! 미윤이랑': "Duke~! You should try arm wrestling with Miyoon; this small guy is a BEAST!",
  '뭐? 뭣하러 내가': "Huh? Why should I?",
  '뭐야, 쫄았어?': "What, you scared of being wrecked?",
  '하? 그럴리가': "Hah? There's no way; you only lose to a child because you eat, sleep, and play all day. At least I put my hands to good use on the strings.",
  '정말 괜찮은거야': "Are you sure about this...? I heard cellists value their hands greatly...I'm scared I'll hurt you...",
  '뭐? 어린애 힘': "What? If my hands were fragile enough to crack under some kid's grip, I would've lost them already. Are you looking down on me too?",
  '아니...그런 게 아니라': "No...it's not that at all, I'm genuinely worried...",
  '하하하! 얕보는': "Hahaha! It's YOU who's looking down on him, Duke! Don't say I didn't warn you? Ready- GO!",
  '쾅!': "Thud!",
  '이...이게 무슨': "What...What the,",
  '괘, 괜찮아?': "A-Are you okay? That sounded pretty loud...",
  '한판 더 해.': "Again.",
  '왜...지?': "There's no...way.",
  '하하, 봐! 큰코': "HAHA, see! I told you you'd get wrecked!",
  '왜 네가 더 신난거야': "What are YOU so happy for!? SHUT UP!",
  '어쩐지, 그 때 알아봤어야': "No wonder, I should've known back then...that you were hiding such a huge power.",
  '그러면서도 넌 항상': "Yet you were always afraid to hurt someone. Even with that strength, you kept it hidden.",

  /* ── 회상 6 · 36% 레이시 ── */
  '아~ 재미없어. 누가': "Ugh, BORRRING. A certain someone said this show would be good to trust; guess he was wrong...",
  '글쎄, 난 나름': "Well, I think it's quite nice...",
  '이런게? 파시아': "Really? This? Fascia, you have very low standards, don't you?",
  '아~ 같이 나갈': "Sooo~ Anyone wanna dip with me? Staring into the sky would be much more fun than whatever's going on~",
  '야, 이거 표 값': "Hey- do you have any idea how much the tickets cost? YOU said you wanted to watch this.",
  '네네, 죄송해요': "Yeah yeah, sorry. Not my fault it was terrible!",
  '아! 미윤, 같이 갈래': "Oh! Miyoon, do you wanna go with me? You'd prefer getting some fresh air over this too, right?",
  '앗...으응..': "Oh...yes..",
  '그래! 바로 나가자': "Okay then! Right to it, we're out of here~",
  '야, 내 말 귓등으로': "Hey, are you listening to me? HEY!",
  '듀크, 목소리가 커': "Duke, you're being too loud...",
  '하암~ 아, 뻐근해라': "Yawn~ I felt so stiff back there. It feels nice to stand up~",
  '그냥 이렇게 나와도': "Was it okay to just leave like that...? Everyone seemed to stay in their seats...",
  '당연히 되지, 재미없는데': "Of course, silly! You don't expect me to sit around any longer for such a lame sight; my time is precious, you know~",
  '으응...나라면 재미없어도': "Oh...well, I wouldn't have had the courage to leave no matter how boring it was, so...that's cool of you...",
  '그래도 나왔잖아?': "You still left though, didn't you? It wasn't fun for you either, right?",
  '음...무슨 의도인지': "Um...I guess I didn't understand what the point of it all was...",
  '아하하! 그래그래, 역시': "Ahaha! Yes, of course, I knew it wasn't just me!",
  '그나저나, 예전부터': "Anyways, this is something I've been thinking about since before, but....",
  '넌 내 예전 친구를': "You remind me a lot of an old friend I had.",
  '...응?': "...Huh?",
  '있었거든, 너같이': "Someone like you. Obedient, following me around, and shy.",
  '칭찬이야...?': "Is that a compliment...?",
  '그럼~ 난 그때 걔랑': "Of course~ I had fun with him around back then. I like good listeners.",
  '외모는 파시아가': "Appearance-wise, that friend looked a lot like Fascia but... his personality is way off.",
  '그래...? 나랑 노는': "Really...? You like having me around?",
  '하하, 그럼! 미윤, 내가': "Haha, yeah! I'll show you more fun things to do, Miyoon! Let those guys stay bored there, and we'll do something way more exciting!",
  '앗, 으응..!': "Ah, okay..!",
  '진짜 예전 친구는': "Apparently that old friend was, in fact, Fascia. But you looked like you were having fun too...",
  '세상엔 아직 경험해': "There are a lot of things in this world that you haven't experienced yet. I'll show them all to you, so come with me?",

  /* ── 회상 7 · 29% 파시아 ── */
  '-스톨...': "-stol...",
  '파스톨!': "Fastol!",
  '응..?': "Yeah..?",
  '이거봐, 조개!': "Look, a seashell!",
  '우와...예쁘다.': "Wow...pretty.",
  '주웠어...! 자': "I picked it up for you...! Here..",
  '...나 주는거야?': "...For me?",
  '으응, 닮았어': "Mhm, it's just like you.. white!",
  '(보통 남들도': "(Angels are usually white, but...) Thank you...",
  '이걸 꼭 너한테': "He really wanted to give this to you...huhu.",
  '아.. 저한테요': "Oh... to me..?",
  '응, 너를 정말 좋아하는': "Yes, he seems to like you a lot. Because of a special condition, he didn't have any close friends before you...",
  '그래서 걱정했는데': "I was concerned for him...but it seems like he's gotten a lot happier after you came around.",
  '...아': "...I see.",
  '사실, 난 너랑 노는': "In truth, while I did enjoy my time playing with you, I liked being with this person.",
  '내겐 주어지지 않았던': "I felt like he granted me warmth and kindness I never got to experience....when I was with you.",
  '다행이네요...감사합니다': "That's good to hear...thank you...",
  '파스톨, 다음에도': "Fastol, come back soon, okay! I'll be waiting for you...",
  '...옛날부터 넌': "...You've always treated me with a pure heart, and yet I...",

  /* ── 회상 8 · 22% 듀크 ── */
  '가만보면, 넌': "Come to think of it, you don't seem to really do anything under your caretaker.",
  '볼 때 마다 그저': "You're always just staring into the void; I've never seen you do anything meaningful before. Don't you think you should do something about it?",
  '어...글쎄, 뭔가를': "Um...I'm not sure. Do I have to do something..?",
  '뭐라도 해야지. 자신의': "You should. If you want to prove yourself and make your mark.",
  '세상에 나를 알린다': "Make my mark...",
  '그러고 싶지 않아': "I don't want to do that...",
  '왜? 아무도 널': "Why not? You'd rather nobody know of you until you stop existing?",
  '으응...최대한 나의': "Yeah...I don't want people to know about me...it's better that way...",
  '이해할 수가 없네': "I don't get it. There's no meaning in life that way.",
  '...헤헤, 으응': "...Hehe, yeah. I guess so...Duke always seems to be in a rush.",
  '당연하지. 1분1초가': "Of course I am. Every minute and second counts. People are surpassing me even at this very moment.",
  '매순간을 열심히': "If you don't prove yourself by doing your very best every time, you'll be left in the dust.",
  '나는 세상에 내 이름을': "I want to put myself out there. So that there will be proof I existed even after my passing.",
  '신기해...멋지다': "That's interesting...and cool.",
  '뭐, 어떻게 살든': "Well, I guess however you live your life is yours to decide. Even then, why not consider a hobby or two?",
  '네가 세상에게서': "I didn't understand why you wanted to hide yourself from the world.",
  '이런 식으로 세상에': "You were afraid to be known like this.",
  '...이제와서 말하지만': "...I say this now, but I would've taught you how to play the cello if you wanted.",

  /* ── 회상 9 · 16% 레이시 (미윤 대사 = 미윤 엄마 설정 아님, 칵테일 바) ── */
  '웨이터! 매일': "Waiter! I'll have my usual~",
  '나도 그럼 그걸로': "Then I'll have that as well~",
  '응? 뭐야, 누구야?': "Huh? What, who are you?",
  '어머, 서운하네': "Aww, pity... You don't recognize me just because I got a little bigger?",
  '어.....그, 음?': "Uhhh.....Well, um? You do look closest to Miyoon among the people I know, at least....",
  '미안한데 미윤은': "Sorry, but Miyoon is like, this big and you're THIIISSSS big. Are you two brothers or something?",
  '아하하, 형제래': "Ahaha, brothers, he says~ I guess I can tell why you'd think that.",
  '미윤 맞아. 근데': "I'm Miyoon, alright. Just slightly different for today~",
  '(눈을 접어': "He narrows his eyes into a laugh. Quite not like his usual self.",
  '음....그래?': "Ah....I see? You do feel a lot different.",
  '근데 너, 이런거': "Apart from that, don't you normally avoid drinking?",
  '그랬나~?': "Did I~? Maybe so, but I'm not in a good mood today, you see.",
  '그래? 뭐 때문에': "Oh, are you? I'll hear you out. What makes you say that?",
  '흠... 어디까지': "Hmm... How much should I tell you?",
  '오늘은 특히 힘들었어': "I especially had a hard time today~",
  '힘을 제어하는 게': "Holding my strength in...I always try to keep it locked away.",
  '미처 억누르지 못한': "It felt as if the remaining strength I failed to restrain was trying to push its way out and hurt someone!",
  '그건 절대 싫다고': "Crying from the wounds forming on his body, and yet, little ol me refused to let anyone get harmed and endured it all.",
  '조금 다치게 하는 게': "What's wrong with hurting someone a little? If I keep it all inside, I'll always stay miserable...",
  '혼자 괴로워하고': "Suffering alone...Squeezing every ounce of strength in....",
  '...흐음.': "...Hm.",
  '(아까부터': "(His wording sounds off, doesn't it? It's as if he's describing someone else.)",
  '뭐, 내 생각도 그래': "Well, I think so too. It's not good to lose your peace while caring too much about others~",
  '남이 하라는 대로': "I would hate to rot myself trying to live like how others tell me to live my life..",
  '오, 너 나랑': "Ooh, I think we get along pretty well, no? Hehe.",
  '그래...나는 너무': "Exactly that...I care way too much about other people.",
  '평소에도 좀 해방': "It would be nice to have some freedom in my life....",
  '(기묘하군': "(Strange...) Hey- could you step back a bit?",
  '휴...내가 생각해도': "Phew...I also think you try too hard to cater to everyone, Miyoon.",
  '뭐, 그것 덕분에': "Well, though that makes it easier for me to pull you around to suggest activities I want.",
  '푸흐흣, 그래': "Pfft, yeah. I saw too. Why don't you try talking to him about it when it happens again...",
  '이렇게 살다간': "If this goes on any further...there will be no going back from that someday...",
  '이런 힘을 이제까지': "All this time keeping such strength in, I wonder how you felt enduring it all?",
  '가지고 싶지도 않았던': "Suffocated by power you've never wished for...and to think the only way out is death...that's too tragic.",

  /* ── 바다 회상 · 10% 파시아 ── */
  '나는...하늘과는': "I... don't deserve to be in the sky. Where I belong is probably...deep inside the ocean.",
  '그런 소리 하지마': "Don't say that...",
  '파시아...언젠가는': "Fascia...I must go someday. My life itself brings harm to this world...",
  '아니야...! 지금은': "No, it does not...! We're safe; you don't have to leave right now..!",
  '왜 자꾸 그렇게': "Why do you keep saying as if you'll just leave everything behind and disappear...What about me...how do you think I would feel..",
  '...파시아는, 나': "...You'll have much better friends than me, Fascia...",
  '너도 내 친구야': "You're my friend too..!",
  '고마워...그렇게': "Thank you...for saying that.",
  '나도 파시아는': "I also think you're a very good friend...",
  '분명 다른 모두에게도': "You'll surely be loved by everyone else...living happily and building good connections.",
  '그러니까...응?': "So...please? Just-",
  '난 평생 외톨이였어': "I'VE BEEN ALONE MY ENTIRE LIFE...!",
  '내가 다가갔던 모든': "Everyone I became close with, they all either disappear, die, or leave me behind...",
  '너까지, 떠난다고': "Not you too...",
  '파시아...울지마': "Fascia...don't cry...",
  '그냥 살아도 되잖아': "Nothing's wrong with living your life...",
  '네가 그렇게 울면': "If you cry like that...it makes me want to...",
  '가지마...! 가지말라고': "Don't go away...! Please..",
  '지금도 충분히 제어할': "You can still fight back; keep it in...It's too early to give up...",
  '돌아가자...응..?': "Let's go home...okay..?",
  '미윤...제발...': "Miyoon... please...",
  '파시아, 내가 만약에': "Fascia, if I...",
  '내가...산다고 하면': "If...I do choose to live, then...",
  '언젠가 내가...정말로': "Someday, when I eventually...become a threat to this world...",
  '네가...': "If that ever happens...",
  '그때는 네가': "I want you to...",
  '......그때는 정말': "...I want you to kill me.",
  '난... 난 못해': "I... I can't do it............",
  '파시아는 충격에': "Fascia is frozen in shock and cannot move.",
  '이제 할 수 있는 건': "All that's left to do... is run away.",

  /* ── 마지막 일격 ── */
  '윽....하아...헉': "Ack....Haah...Ha....",
  '아아...이제 끝이': "Ahh...I can feel the end drawing near...",
  '정말 이거 외에는': "Is there really no other way?... This doesn't sit right with me.",
  '이것밖에..멈출': "This... is the only way to stop it....just, just get rid of me...",
  '...잔인하네': "...How brutal. Am I supposed to kill my own friend?",
  '미안...미안해.....하지만': "I'm sorry...it's all my fault.....but...",
  '하....': "Hah....",
  '알겠어. 알겠다고': "Okay. Fine! I can't stand to look at you suffering anymore...",
  '네 얼굴을 보면': "Your face makes even me feel uncomfortable...!",
  '마치, 마치 내가': "It's like- like I'm seeing myself from the past, writhing in pain...",
  '네가 그것에서': "I wanted you to be free from it too....",
  '이제와서는 늦은': "I guess it's too late now, is it...",
  '...그나마 네가': "...At the very least, I hope you can earn some peace from this...",
  '윽...!': "Kh...!",
  '잘가....미윤': "Farewell....Miyoon. May you never have to suffer again.",
  '헉.....하아': "Hah.....Ahh....",
  '미윤.': "Miyoon.",
  '너랑 나랑은': "You and I are totally different people.",
  '내가 그 힘이': "If I had the power you had, I probably would've been boastful about it.",
  '너같은 애한테': "Maybe we're lucky you were the one to carry this fate...",
  '만약에 성정이': "Imagine someone with ill intentions had such power at hand instead.",
  '이제와서 이런 가정': "I'm not sure if these 'what ifs' matter anymore, but...",
  '적어도 네가 노력': "I wanted to at least let you know your efforts weren't in vain.",
  '세상에 자신을 드러나지': "Trying so hard to hide yourself from the world...I know how frustrating that is.",
  '나는....절대': "I... wouldn't have been able to do it.",
  '윽...헤헤, 듀크': "Ah...hehe, thank you...Duke...",
  '듀크한테 이런 말을': "I never thought I'd hear something like that... from you....",
  '너무 무리하지마': "Don't push yourself too hard.",
  '...수고 많았어': "...You did a good job.",
  '큭..! 허억': "Urk..! Hah...Ahh........",
  '파시아...': "Fascia...",
  '미안해...': "I'm sorry...",
  '.........미윤': "...Miyoon.",
  '나, 나는.....이런': "I-I....I can't..I can't do this...",
  '이젠 내 손으로': "I have to get rid of my dear friend with my own hands...?",
  '어떻게...어떻게 그럴': "How...How could I possibly do that........I...",
  '미안해...그런 얼굴': "I'm sorry...please don't get upset....",
  '왜 이렇게 되어야만': "Why did it have to be this way...",
  '싫어.....가지마': "No.....please don't go......",
  '싫어....! 왜 내가': "I won't accept this....! Why does everyone I care about end up this way....",
  '난 이제까지 다': "I've put up with it all.",
  '나를 드러내는 것도': "Not being able to be myself, losing friends, harassment, giving up on doing what I wanted...",
  '전부 참아만 왔어': "I've put up with everything....so do you know how happy I was to meet you and call you my friend?",
  '조금은 내가 원하는': "Can't you let me be a little selfish...this one time.",
  '파시아....날 그렇게까지': "Fascia....thank you for caring about me...so much.......",
  '날 그만큼 생각해주는': "Nobody has given me that much love...before......",
  '나도....파시아를': "Because I got to meet you...Fascia...",
  '어둑어둑했던 세상에': "My world, once dark...was filled with so many warm and happy memories...as if fireflies came to light the night.",
  '이 순간을 계속 이어가고': "I thought to myself...that I wanted to stay in this moment forever....",
  '계속 이어가면 되잖아': "We can...! If you're here with me, we can continue to....",
  '하지만...내가 이런 힘을': "But...as long as this power remains in me...",
  '영원히... 행복만': "I knew...I wouldn't be able to relish in happiness forever...",
  '으윽....하아': "Uu....Haah....Fascia, I...",
  '고작 나 하나가': "I think it's wrong to let the world end....just because I want to have my moment of joy a little longer.....",
  '네가 행복을 누린다고': "Just because you get to be happy doesn't mean the world should end...!",
  '아니, 결국엔': "No, it will eventually be like that....",
  '나 혼자...행복하고': "It's horrifying to think about.....harming everyone else in favor of my own interests.....",
  '그런 식으론....어차피': "I wouldn't be happy that way anyway....Fascia....",
  '그러니까....어쩔 수': "So....there's nothing else that can be done...",
  '이해해줘...': "Please understand...",
  '미안해, 마지막으로': "I'm sorry.. Can you do me one last favor...?",
  '너무 .... 죄책감': "You don't .... have to feel bad about it.... here,",
  '이제 정말 마지막': "This is the end....",
  '아.....윽': "Ah.....hhn...",
  '흑.....아아': "Sob.....Ahh.....",
  '웅웅거리는 소음이': "The droning noise overtakes everything around them.",
  '시간이 없어...파시아': "There's no time...Fascia....",
  '미윤....': "Miyoon....",
  '아, 아 역시 못하겠': "I-I can't do it any-",
  '헉, 미윤, 아 안돼': "Hah, Miyoon- Wait, NO...!",
  '허억...아....이제': "Hgh...Hahh... It...it is done-",
  '헤헤....미안해, 파시아': "Hehe....I'm sorry, Fascia....",
  '무리한 부탁': "I'm sorry I asked you to do that.....",
  '고마웠어......': "Thanks for everything......",
  '다음에....다음에도': "Next time....if we ever get to see each other again......",
  '언젠가 ...': "Someday ...",
  '네가...부르면': "I'll come running to you.. Whenever you call me...",
  '언젠가 꼭': "I promise.................",

  /* ── 엔딩 1 ── */
  '아, 안돼....! 안돼안돼': "Oh no....! No, nono,",
  '모두....나...나 때문에': "Everyone is....because of me...I...",
  '안돼... 일어나': "No...wake up, please..!",
  '아아아아아': "AAAAAAAAAAAAA",

  /* ── 엔딩 2 ── */
  '미윤이 사라지고 우리는': "After Miyoon disappeared, we just stared blankly and stood there for a long time.",
  '뒤늦게 파견된': "The high-rank angels and demons that belatedly arrived at the scene saw us standing where the blue star once was and asked if we had taken care of it.",
  '그렇다고 하니': "Upon answering yes, they took us to tend to our wounds.",
  '그 이후 갖가지': "Soon after, we were presented with many awards.",
  '우리에 관한 소문도': "News spread far and wide, rumors about us becoming the hot topic for everyone alive. People called Miyoon a monster, and us the brave heroes who defeated him.",
  '듀크는 사람들이': "Duke seemed to accept his newfound glory, albeit uncomfortably.",
  '레이시는 그렇게 말하는': "Lacie, on the other hand, openly expressed his disgust regarding the \"praise\" and would especially correct those who wronged Miyoon.",
  '천상계에는 내 이름이': "All of Heaven got to know my name. Not as the Figyel Family's representative, but as Lefkos Fastol.",
  '그토록 바래왔던': "It was the moment I've been yearning for; To be recognized as me and not someone else-",
  '맘 편히 기뻐할': "And yet, I couldn't bring myself to be happy.",
  '레프코스 파스톨은 너라는': "Lefkos Fastol was the hero, and you were the monster that died in my hands.",
  '이런 식으로 알려지길': "I didn't want to be known like this.",
  '사람들의 관심이': "As if it never happened, everybody quickly lost interest and went back to their daily lives.",
  '사상자가 없었기': "It was because there weren't any other casualties. That meant that, even with such power, Miyoon tried his best to keep his strength at bay until his very last breath.",
  '하지만 그 사실을': "But nobody cared to know.",
  '사람들은 미윤을 괴물 취급': "People still called him a monster, brushing him off as a minor inconvenience.",
  '그가 그 사람들을': "Nobody knew that he kept himself trapped in a cage his entire lifetime to protect those very people.",
  '그의 주변에 있었던': "Apart from the few who were close to him.",
  '나는 그 이후로 림보': "After everything settled, I started to visit Limbo more often.",
  '그 장소에 있으면': "Being there reminded me of the times I spent with you.",
  '온 곳이 흐릿하고': "Even through the foggy and dark atmosphere, I could instantly tell where we used to play.",
  '듀크와 레이시도': "I also occasionally brought Duke and Lacie along to cherish you together.",
  '그들과 림보에서': "It was quite enjoyable having them around in Limbo too.",
  '우리는 웃고 화내고': "We laughed, bickered, and had long talks.",
  '하지만 모두 마음': "But it seemed like none of us could truly forget the memories you left behind.",
  '왜그래, 파시아?': "What's wrong, Fascia?",
  '아, 아무것도 아니야': "Ah, it's nothing much. I think this little guy just tugged on my clothes...",
  '파란 눈...의 염소': "A goat...with blue eyes.",
  '하하하.': "Hahaha.",
  '언젠가 다시 보자': "If we get to see each other again...",
  '이런 뜻이었을까': "I wonder if this is what you meant.",

  /* ── 엔딩 3 ── */
  '덥썩-': "Grab-",
  '잠, 뭐야?': "W-Wait, what?",
  '허? 파시아?!': "Huh? Fascia?!",
  '잠깐, 이거 놔': "Wait, let go of me!",
  '갑자기 왜 도망치는': "Why are we running away? Why now!",
  '거의 다 됐는데': "We were almost there. Did you really have to run away at the last minute?",
  '미윤은 어떡하고': "What about Miyoon...! He's still in pain back there; are you just gonna leave him to it?",
  '나...나는 그러니까': "I...I just...",
  '도저히...도저히': "I just couldn't...bear to finish Miyoon off...with my own hands...",
  '네가 안될 것 같으면': "If you couldn't do it, you could've just run off on your own. Why did you bring us with you?",
  '미안해...': "I'm sorry...",
  '나..나는 너희까지': "I didn't want to lose you guys too..........",
  '쾅-!': "Kaboom-!",
  '그 순간, 미윤이 있던': "At that moment, a huge explosion came from the direction Miyoon stood, and the star that surrounded him glowed brightly before vanishing right after.",
  '그걸 멍하니 바라본': "We took a moment to process what happened before rushing back to where Miyoon was, but he was already gone.",
  '나중에 알고보니': "Later, we found out the high-rank angels and demons that arrived at the scene had attacked the already weakened Miyoon.",
  '한동안 미윤이 폭주한': "Miyoon's incident soon became trending news amongst everyone for a while.",
  '미윤이 사라질 때': "As we weren't there during his defeat, our names weren't mentioned as much.",
  '사람들은 미윤을 두고': "People made up all kinds of conspiracies and theories over Miyoon's existence.",
  '하지만 그것도 잠시': "That didn't last long, as they all lost interest shortly after and returned to their daily lives.",
  '그 일이 있고 난 후': "After the incident, Duke took a short break from practicing due to his injuries.",
  '그는 조금 기분이': "He seemed slightly down, spending most of his time with Lacie.",
  '레이시는 평소처럼': "Lacie looked the same as usual, but he started acting a little off towards me. Maybe he didn't like how I ran off at the end. I wouldn't be surprised.",
  '나는 천악계에': "I rarely visited Hell again. I never went back to Limbo. Keeping myself busy as the Figyel Family's representative seemed to clear my head.",
  '하지만 여전히 꿈': "But I still dream of you smiling at me in my dreams, scattering feathers that remind me of the deep blue sea.",
  '그러곤 이내': "Then, you disappear without a trace, only leaving your feathers behind.",
  '그럴 때마다': "And when that happens, I would awaken and couldn't fall asleep again.",
  '그 때 도망치지 않았더라면': "If I didn't run away back then, if I had stayed watching your final moments, would it have been any different?",
  '그 때 도망치며': "I thought I saw Miyoon surprised, then smile at me afterwards when I turned my back to look at him while running away.",
  '미윤이 바라는 걸': "I thought I granted him what he wished for.",
  '하지만 정말, 그게': "But was that truly the right choice for Miyoon?",
  '그의 마지막을': "I never got to see his last, so I will never know.",
  '나는 영원히, 답을': "Unknowing forever, I'll drown myself alongside you in my dreams.",

  /* ── 크레딧 ── */
  '제작': "Created by",
  '플레이해 주셔서': "Thank you for playing"
};
const PF_KEYS = Object.keys(PF).sort((a, b) => b.length - a.length);

/* 낱말 번역 (이름·스킬·아이템). 영어 모드가 아니면 그대로 */
function LN(x) { return Lang.cur === 'en' && EX[x] != null ? EX[x] : x; }

/* 짧은 문장: TX(한국어, 영어, {값}). {값}의 이름은 자동으로 영어 이름이 돼요 */
function TX(ko, en, v) {
  let s = Lang.cur === 'en' && en != null ? en : ko;
  if (v) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? LN(v[k]) : m));
  return s;
}

/* data.js 의 긴 대사·설명: 영어 모드에서만 번역 */
function LT(ko) {
  if (Lang.cur !== 'en' || typeof ko !== 'string' || !ko) return ko;
  if (EX[ko] != null) return EX[ko];
  if (PF[ko] != null) return PF[ko];
  const parts = ko.split(' ');                       // '도망가. 도망가. …' 처럼 같은 말이 반복되는 자동 대사
  if (parts.length > 1 && parts.every(p => p === parts[0]) && PF[parts[0]] != null)
    return parts.map(() => PF[parts[0]]).join(' ');
  for (const k of PF_KEYS) if (ko.startsWith(k)) return PF[k];
  return ko;
}

/* 엔딩 일러스트: 영어 모드면 _en 파일 */
const EN_IMG = {
  'img/ending2_3.png': 'img/ending2_3_en.png',
  'img/ending3_5.png': 'img/ending3_5_en.png'
};
function langImg(p) { return Lang.cur === 'en' && p && EN_IMG[p] ? EN_IMG[p] : p; }

/* 이름표 색: 영어 이름도 같은 색으로 칠해요 */
if (typeof NAME_COLORS !== 'undefined') {
  Object.assign(NAME_COLORS, {
    Fascia: NAME_COLORS['파시아'], Duke: NAME_COLORS['듀크'], Lacie: NAME_COLORS['레이시'], Miyoon: NAME_COLORS['미윤']
  });
}

/* 화면에 고정된 글자(data-tx="" 가 붙은 요소) 바꾸기 */
function applyStatic() {
  document.querySelectorAll('[data-tx]').forEach(el => {
    el.textContent = Lang.cur === 'en' ? el.dataset.en : el.dataset.ko;
  });
  document.title = Lang.cur === 'en' ? 'Miyoon Boss Battle' : '미윤 보스전';
  document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === Lang.cur));
}
